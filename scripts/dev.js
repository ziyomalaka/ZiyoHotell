const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(name, cwd) {
  const child = spawn("npm", ["run", "dev"], {
    cwd,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exit(code);
    }
  });
}

run("backend", path.join(root, "backend"));
run("frontend", path.join(root, "frontend"));
