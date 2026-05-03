import Link from "next/link";
import BrandMark from "@/components/BrandMark";

const navItems = [
  { href: "/#features", label: "Features" },
  { href: "/#product", label: "Product" },
  { href: "/#workflow", label: "How It Works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(7,25,39,0.86)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <BrandMark href="/" inverse />

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              className="text-sm font-medium text-slate-300 transition hover:text-white"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            className="hidden rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/8 sm:inline-flex"
            href="/login"
          >
            Sign In
          </Link>
          <Link
            className="inline-flex items-center rounded-full bg-orange-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            href="/demo"
          >
            Book Demo
          </Link>
        </div>
      </div>
    </header>
  );
}