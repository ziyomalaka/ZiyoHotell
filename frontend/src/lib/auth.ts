import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "./constants";
import { homePath, normalizeRole } from "./roles";
import type { SessionUser } from "./session-types";

export type { SessionUser };
export { COOKIE_NAME, homePath };

const ACCESS_COOKIES = [COOKIE_NAME, "zh_access"];

function secret() {
  const raw = process.env.JWT_ACCESS_SECRET;
  if (!raw) throw new Error("JWT_ACCESS_SECRET frontend ENV da yo‘q.");
  return new TextEncoder().encode(raw);
}

export async function readToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id || payload.sub),
      login: String(payload.login || ""),
      fullName: String(payload.fullName || ""),
      role: normalizeRole(String(payload.role || "")),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  for (const name of ACCESS_COOKIES) {
    const token = store.get(name)?.value;
    if (!token) continue;
    const session = await readToken(token);
    if (session) return session;
  }
  return null;
}
