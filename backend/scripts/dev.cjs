const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.PGPORT || 5432);
const USER = "ziyohotel";
const PASSWORD = "ziyohotel";
const DATABASE = "ziyohotel";
const DATA_DIR = path.join(__dirname, "..", "data", "pg");

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function ensurePostgres() {
  if (await portOpen(PORT)) {
    console.log(`PostgreSQL allaqachon ${PORT} portda ishlayapti.`);
    return null;
  }

  console.log("Local PostgreSQL yoqilmoqda (Docker kerak emas)...");
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });

  try {
    await pg.initialise();
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (/already exists|exists|already initialized/i.test(msg)) {
      console.log("Cluster mavjud, start qilinadi.");
    } else {
      throw err;
    }
  }

  await pg.start();
  try {
    await pg.createDatabase(DATABASE);
  } catch {
    /* database already exists */
  }
  console.log(`PostgreSQL tayyor: 127.0.0.1:${PORT}/${DATABASE}`);
  return pg;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true, cwd: path.join(__dirname, "..") });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  const pg = await ensurePostgres();
  if (process.argv.includes("--pg-only")) {
    console.log("PostgreSQL ishlayapti. To‘xtatish uchun Ctrl+C.");
    await new Promise(() => {});
  }
  await run("npx", ["prisma", "migrate", "deploy"]);
  try {
    await run("npm", ["run", "prisma:seed"]);
  } catch {
    console.log("Seed o‘tkazildi yoki ma’lumotlar allaqachon bor.");
  }

  const nest = spawn("npx", ["nest", "start", "--watch"], {
    stdio: "inherit",
    shell: true,
    cwd: path.join(__dirname, ".."),
  });

  const shutdown = async () => {
    nest.kill();
    if (pg) await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  nest.on("exit", async (code) => {
    if (pg) await pg.stop();
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
