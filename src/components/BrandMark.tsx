import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  inverse?: boolean;
  labelClassName?: string;
  size?: "sm" | "md";
  variant?: "mark" | "primary" | "stacked";
};

const BRAND_ASSETS = {
  mark: {
    alt: "SwiftDispatch",
    height: 221,
    src: "/brand/swift-dispatch-mark.png",
    width: 325,
  },
  primary: {
    alt: "SwiftDispatch",
    height: 217,
    src: "/brand/swift-dispatch-primary.png",
    width: 1393,
  },
  stacked: {
    alt: "SwiftDispatch",
    height: 321,
    src: "/brand/swift-dispatch-stacked.png",
    width: 321,
  },
} as const;

export default function BrandMark({
  href = "/",
  inverse = false,
  labelClassName = "",
  size = "md",
  variant = "primary",
}: BrandMarkProps) {
  const asset = BRAND_ASSETS[variant];
  const sizeClass =
    variant === "stacked"
      ? size === "sm" ? "h-20 w-20" : "h-28 w-28"
      : variant === "mark"
        ? size === "sm" ? "h-7 w-10" : "h-8 w-12"
        : size === "sm" ? "h-7 w-auto max-w-[160px]" : "h-8 w-auto max-w-[196px]";

  return (
    <Link
      aria-label="SwiftDispatch home"
      className={`inline-flex shrink-0 items-center ${inverse ? "rounded-lg bg-white px-2 py-1" : ""} ${labelClassName}`}
      href={href}
    >
      <Image
        alt={asset.alt}
        className={`${sizeClass} object-contain`}
        height={asset.height}
        priority
        src={asset.src}
        width={asset.width}
      />
    </Link>
  );
}
