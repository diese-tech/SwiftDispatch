import Link from "next/link";
import BrandMark from "@/components/BrandMark";

type SiteFooterProps = {
  compact?: boolean;
};

export default function SiteFooter({ compact = false }: SiteFooterProps) {
  return (
    <footer className="border-t border-white/10 bg-[linear-gradient(180deg,#0c2235_0%,#071927_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <BrandMark href="/" inverse size={compact ? "sm" : "md"} />
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Dispatch, technician updates, quote follow-through, and customer communication in one premium operating workflow.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm text-slate-300 sm:items-end">
          <div className="flex flex-wrap items-center gap-5">
            <Link className="transition hover:text-white" href="/demo">
              Book a Demo
            </Link>
            <Link className="transition hover:text-white" href="/privacy">
              Privacy
            </Link>
            <Link className="transition hover:text-white" href="/terms">
              Terms
            </Link>
            <a className="transition hover:text-white" href="mailto:hello@swiftdispatch.app">
              hello@swiftdispatch.app
            </a>
          </div>
          <p>(c) {new Date().getFullYear()} SwiftDispatch. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}