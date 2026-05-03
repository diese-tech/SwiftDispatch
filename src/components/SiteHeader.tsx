import Link from "next/link";
import BrandMark from "@/components/BrandMark";

const navItems = [
  { href: "/#features", label: "Features" },
  { href: "/#workflow", label: "How It Works" },
  { href: "/#pricing", label: "Pricing" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <BrandMark href="/" />

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:inline-flex"
            href="/login"
          >
            Sign In
          </Link>
          <a
            className="inline-flex items-center rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            href="mailto:hello@swiftdispatch.app?subject=SwiftDispatch%20Demo"
          >
            Book Demo
          </a>
        </div>
      </div>
    </header>
  );
}