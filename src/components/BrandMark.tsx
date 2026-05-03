import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  inverse?: boolean;
  labelClassName?: string;
  size?: "sm" | "md";
};

export default function BrandMark({
  href = "/",
  inverse = false,
  labelClassName = "",
  size = "md",
}: BrandMarkProps) {
  const markSize = size === "sm" ? "h-10 w-10" : "h-11 w-11";
  const textSize = size === "sm" ? "text-base" : "text-lg";
  const textClass = inverse ? "text-white" : "text-slate-950";
  const subClass = inverse ? "text-slate-300" : "text-slate-500";

  return (
    <Link className="inline-flex items-center gap-3" href={href}>
      <span className={`relative grid ${markSize} place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#0b2235_0%,#133856_100%)] shadow-[0_12px_26px_rgba(8,26,40,0.24)]`}>
        <span className="text-sm font-black tracking-[0.18em] text-white">SD</span>
        <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_12px_rgba(240,138,36,0.8)]" />
      </span>
      <span className="flex flex-col">
        <span className={`${textSize} font-semibold tracking-tight ${textClass} ${labelClassName}`}>SwiftDispatch</span>
        <span className={`text-xs font-medium uppercase tracking-[0.18em] ${subClass}`}>Field operations</span>
      </span>
    </Link>
  );
}