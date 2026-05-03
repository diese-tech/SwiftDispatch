import Link from "next/link";
import BrandMark from "@/components/BrandMark";

type SiteFooterProps = {
  compact?: boolean;
};

export default function SiteFooter({ compact = false }: SiteFooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <BrandMark href="/" size={compact ? "sm" : "md"} />
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Dispatch, technician updates, and quote follow-through in one clean workflow.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm text-slate-500 sm:items-end">
          <div className="flex flex-wrap items-center gap-5">
            <Link className="transition hover:text-slate-900" href="/demo">
              Book a Demo
            </Link>
            <Link className="transition hover:text-slate-900" href="/privacy">
              Privacy
            </Link>
            <Link className="transition hover:text-slate-900" href="/terms">
              Terms
            </Link>
            <a
              className="transition hover:text-slate-900"
              href="mailto:hello@swiftdispatch.app"
            >
              hello@swiftdispatch.app
            </a>
          </div>
          <p>(c) {new Date().getFullYear()} SwiftDispatch. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
