"use client";

import { useEffect, useState } from "react";
import { formatLongDate, greetingLabel, todayISO } from "@/lib/format";

export function CurrentDate({
  withYear = false,
  className = "",
}: {
  withYear?: boolean;
  className?: string;
}) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(formatLongDate(new Date(), withYear));
  }, [withYear]);
  return <span className={className}>{label ?? "\u00a0"}</span>;
}

export function CurrentGreeting({ className = "" }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(greetingLabel(new Date()));
  }, []);
  return <span className={className}>{label ?? "\u00a0"}</span>;
}

export function useTodayISO() {
  const [iso, setIso] = useState("");
  useEffect(() => {
    setIso(todayISO());
  }, []);
  return iso;
}
