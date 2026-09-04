"use client";

import { createContext, createElement, useContext, type ReactNode } from "react";
import type { SessionUser } from "./session-types";

export type { SessionUser };

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  return createElement(SessionContext.Provider, { value: user }, children);
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession faqat panel layout ichida ishlatiladi.");
  }
  return session;
}
