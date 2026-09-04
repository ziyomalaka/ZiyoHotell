"use client";

type NavItem = { href: string; label: string; icon: string };

const icons: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  user: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14z",
  bed: "M3 18V8h2v4h14V8h2v10h-2v-2H5v2zm2-4h14v-2H5z",
  door: "M6 3h9a2 2 0 0 1 2 2v16H8V5a2 2 0 0 1 2-2h7M10 12h.01",
  pay: "M3 7h18v10H3zm0 4h18M7 15h4",
  chart: "M4 19V5m0 14h16M8 15v4m5-8v8m5-5v5",
  team: "M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-3 0-5 1.5-5 3.5V19h10v-1.5C13 15.5 11 14 8 14zm8 0c-.7 0-1.3.1-1.9.3 1.3.8 2.1 2 2.1 3.2V19h6v-1.5c0-2-2-3.5-6-3.5z",
  cog: "M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm8.5 4a7.6 7.6 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-1.7-1L16 3h-4l-.3 2.5a7.7 7.7 0 0 0-1.7 1L7.6 5.5l-2 3.5 2 1.5a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.7 7.7 0 0 0 1.7 1L12 21h4l.3-2.5a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5a7.6 7.6 0 0 0 .1-1z",
  shield: "M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6z",
  log: "M6 3h9l5 5v13H6zm9 0v5h5M8 13h8M8 17h8M8 9h4",
  save: "M5 3h11l3 3v15H5zm3 14h8m-8-4h8M8 3v6h7",
  users: "M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-7 8v-1.5C5 16 8 14 12 14s7 2 7 4.5V20",
  debt: "M12 3v18m-7-7c0 2.8 3.1 5 7 5s7-2.2 7-5-3.1-5-7-5-7-2.2-7-5 3.1-5 7-5 7 2.2 7 5",
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name] || icons.home} />
    </svg>
  );
}

export type { NavItem };
