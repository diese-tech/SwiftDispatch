"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import BrandMark from "@/components/BrandMark";

const navItems = [
  { href: "/#workflow", label: "Workflow" },
  { href: "/#product", label: "Product" },
  { href: "/#fit", label: "Who it’s for" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[var(--c-signal-w)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <BrandMark href="/" />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              className="brand-link text-sm font-semibold text-[var(--navy)]"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:inline-flex"
            href="/login"
          >
            Sign In
          </Link>
          <Link
            aria-label="Book a demo"
            className="inline-flex min-h-11 items-center rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300 sm:min-h-0 sm:px-5 sm:py-2.5"
            href="/demo"
          >
            <span className="sm:hidden">Demo</span>
            <span className="hidden sm:inline">Book a demo</span>
          </Link>
          {/* Hamburger — mobile only */}
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 md:hidden"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-slate-200 px-6 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <Link
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              href="/login"
              onClick={() => setOpen(false)}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
