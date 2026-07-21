import Link from "next/link";
import BrandMark from "@/components/BrandMark";

type SiteFooterProps = {
  compact?: boolean;
};

export default function SiteFooter({ compact = false }: SiteFooterProps) {
  return (
    <footer className="border-t border-zinc-200 bg-white px-6 py-10 text-[var(--navy)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <BrandMark href="/" inverse size={compact ? "sm" : "md"} />
          <p className="mt-4 text-sm leading-6 text-zinc-500">
            Dispatch clarity for HVAC teams.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm text-zinc-500 sm:items-end">
          <div className="flex flex-wrap items-center gap-5">
            <Link className="transition hover:text-[var(--c-signal)]" href="/demo">
              Book a demo
            </Link>
            <Link className="transition hover:text-[var(--c-signal)]" href="/privacy">
              Privacy
            </Link>
            <Link className="transition hover:text-[var(--c-signal)]" href="/terms">
              Terms
            </Link>
            <a className="transition hover:text-[var(--c-signal)]" href="mailto:hello@swiftdispatch.app">
              hello@swiftdispatch.app
            </a>
          </div>
          <p>© {new Date().getFullYear()} SwiftDispatch. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
