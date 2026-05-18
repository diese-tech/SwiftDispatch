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
  const markSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const textSize = size === "sm" ? "text-sm" : "text-base";
  const textClass = inverse ? "text-white" : "text-[var(--c-text)]";

  return (
    <Link className="inline-flex items-center gap-2.5" href={href}>
      <span
        className={`relative grid ${markSize} shrink-0 place-items-center overflow-hidden rounded-lg bg-[linear-gradient(145deg,#0b2235_0%,#133856_100%)]`}
      >
        <span className="text-[10px] font-black tracking-[0.12em] text-white">SD</span>
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-orange-400" />
      </span>
      <span className={`${textSize} font-semibold tracking-tight ${textClass} ${labelClassName}`}>
        SwiftDispatch
      </span>
    </Link>
  );
}
