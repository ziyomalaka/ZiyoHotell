const AUTH_LOGIN = "/api/v1/auth/login";
const AUTH_REFRESH = "/api/v1/auth/refresh";

let refreshInFlight: Promise<boolean> | null = null;

function isAuthEndpoint(path: string) {
  return path.includes("/auth/login") || path.includes("/auth/refresh") || path.includes("/auth/logout");
}

function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(AUTH_REFRESH, { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function goLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  window.location.replace("/login");
}

export async function api<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, credentials: "include" });
  } catch {
    throw new Error("Backend ishlamayapti. backend papkasida npm run dev ni ishga tushiring.");
  }
  if (res.status === 401 && retry && !isAuthEndpoint(path)) {
    const refreshed = await refreshSession();
    if (refreshed) return api<T>(path, init, false);
    goLogin();
    throw new Error("Sessiya tugadi. Qayta kiring.");
  }
  const json = await res.json().catch(() => null);
  if (!json) {
    throw new Error(
      "Backend yoki PostgreSQL ishlamayapti. Avval Postgres (5432), keyin backend (4000) ni yoqing.",
    );
  }
  if (!res.ok || json.ok === false) {
    if (res.status === 401 && path !== AUTH_LOGIN) goLogin();
    throw new Error(json.error || json.message || "Ma’lumotni saqlashda xatolik yuz berdi. Qayta urinib ko‘ring.");
  }
  return json.data as T;
}

export async function downloadExcel(path: string, fallbackName: string, retry = true) {
  const res = await fetch(path, { credentials: "include" });
  if (res.status === 401 && retry) {
    const refreshed = await refreshSession();
    if (refreshed) return downloadExcel(path, fallbackName, false);
    goLogin();
    throw new Error("Sessiya tugadi. Qayta kiring.");
  }
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error || "Hisobotni yuklashda xatolik yuz berdi.");
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename="([^"]+)"/);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = match?.[1] || fallbackName;
  a.click();
  URL.revokeObjectURL(a.href);
}
