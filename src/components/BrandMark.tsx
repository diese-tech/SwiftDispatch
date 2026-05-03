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
  const dotSize = size === "sm" ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm";
  const labelSize = size === "sm" ? "text-base" : "text-lg";
  const textClass = inverse ? "text-white" : "text-slate-950";

  return (
    <Link className="inline-flex items-center gap-3" href={href}>
      <span
        className={`grid ${dotSize} place-items-center rounded-full bg-teal-700 font-bold text-white shadow-sm`}
      >
        SD
      </span>
      <span className={`${labelSize} font-semibold tracking-tight ${textClass} ${labelClassName}`}>
        SwiftDispatch
      </span>
    </Link>
  );
}