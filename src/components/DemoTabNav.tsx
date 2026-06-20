"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Dispatch", href: "/dispatch" },
  { label: "Analytics", href: "/analytics" },
];

export default function DemoTabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5">
      {TABS.map(({ label, href }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "rounded-full px-3 py-1 font-mono text-[10.5px] font-medium transition",
              active
                ? "bg-zinc-950 text-white"
                : "text-[var(--c-text-4)] hover:text-[var(--c-text)]",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
