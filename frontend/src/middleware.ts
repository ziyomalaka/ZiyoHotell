import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@/lib/constants";
import { homePath, normalizeRole, ROLES } from "@/lib/roles";

function secret() {
  return new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || "");
}

const knownRoles = new Set<string>([ROLES.SYSTEM_ADMIN, ROLES.RECEPTION, ROLES.MANAGER]);
const receptionPages = ["/register", "/customers", "/rooms", "/stays", "/payments", "/reports"];

async function sessionFrom(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value || req.cookies.get("zh_access")?.value;
  if (!token || !process.env.JWT_ACCESS_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { role: normalizeRole(String(payload.role || "")) };
  } catch {
    return null;
  }
}

function toLogin(req: NextRequest, clearCookie = false) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  if (clearCookie) {
    res.cookies.delete(COOKIE_NAME);
    res.cookies.delete("zh_access");
  }
  return res;
}

function to(req: NextRequest, dest: string) {
  if (req.nextUrl.pathname === dest) return NextResponse.next();
  return NextResponse.redirect(new URL(dest, req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const session = await sessionFrom(req);
  const role = session?.role || "";
  const isLogin = pathname === "/login";

  if (isLogin) {
    if (session && !knownRoles.has(role)) return toLogin(req, true);
    if (session && knownRoles.has(role)) return to(req, homePath(role));
    return NextResponse.next();
  }

  if (!session) return toLogin(req);
  if (!knownRoles.has(role)) return toLogin(req, true);

  if (pathname === "/") return to(req, homePath(role));
  if (pathname.startsWith("/admin") && role !== ROLES.SYSTEM_ADMIN) return to(req, homePath(role));
  if (pathname.startsWith("/manager") && role !== ROLES.MANAGER) return to(req, homePath(role));
  if (receptionPages.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && role !== ROLES.RECEPTION) {
    return to(req, homePath(role));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/register/:path*",
    "/customers",
    "/customers/:path*",
    "/rooms",
    "/rooms/:path*",
    "/stays",
    "/stays/:path*",
    "/payments",
    "/payments/:path*",
    "/reports",
    "/reports/:path*",
    "/admin",
    "/admin/:path*",
    "/manager",
    "/manager/:path*",
  ],
};
