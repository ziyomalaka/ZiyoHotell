"use client";

import { useEffect, type RefObject } from "react";

// Telefonda .data-table qatorlari kartochka bo‘lib chiqadi (globals.css). Sarlavha yashiriladi,
// shuning uchun har katakka ustun nomini data-label qilib yozamiz — CSS uni katak oldida ko‘rsatadi.
// Tugmali katak data-actions oladi: u yorliqsiz, butun kenglikda chiqadi.
export function useTableCardLabels(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const label = () => {
      el.querySelectorAll<HTMLTableElement>("table.data-table").forEach((table) => {
        const heads = Array.from(table.querySelectorAll("thead th"), (th) => th.textContent?.trim() || "");
        table.querySelectorAll("tbody tr").forEach((tr) => {
          let col = 0;
          for (const td of Array.from(tr.children) as HTMLTableCellElement[]) {
            const text = td.colSpan > 1 ? "" : heads[col] || "";
            if (td.dataset.label !== text) td.dataset.label = text;
            const actions = Boolean(td.querySelector("button"));
            if (td.hasAttribute("data-actions") !== actions) td.toggleAttribute("data-actions", actions);
            col += td.colSpan || 1;
          }
        });
      });
    };

    label();
    const observer = new MutationObserver(label);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [root]);
}
