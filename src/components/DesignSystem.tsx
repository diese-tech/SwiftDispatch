import type { ReactNode } from "react";

export function SectionEyebrow({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  return (
    <p
      className={inverse
        ? "text-sm font-semibold uppercase tracking-[0.24em] text-teal-300"
        : "text-sm font-semibold uppercase tracking-[0.24em] text-teal-700"}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  title,
  description,
  align = "left",
  inverse = false,
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
  inverse?: boolean;
}) {
  const titleClass = inverse ? "text-white" : "text-slate-950";
  const descriptionClass = inverse ? "text-slate-300" : "text-slate-600";
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={alignClass === "text-center mx-auto" ? `${alignClass} max-w-3xl` : "max-w-3xl"}>
      <h2 className={`mt-4 text-4xl font-semibold tracking-tight sm:text-5xl ${titleClass}`}>
        {title}
      </h2>
      {description ? <p className={`mt-4 text-lg leading-8 ${descriptionClass}`}>{description}</p> : null}
    </div>
  );
}

export function SurfaceCard({
  children,
  accent = false,
  dark = false,
  className = "",
}: {
  children: ReactNode;
  accent?: boolean;
  dark?: boolean;
  className?: string;
}) {
  const base = dark
    ? "border border-white/10 bg-white/5 text-white"
    : "border border-slate-200/90 bg-white text-slate-900";
  const accentBar = accent ? "before:absolute before:inset-x-0 before:top-0 before:h-1 before:rounded-t-[1.7rem] before:bg-gradient-to-r before:from-teal-500 before:via-cyan-400 before:to-orange-400" : "";

  return (
    <div className={`relative overflow-hidden rounded-[1.75rem] ${base} p-6 shadow-[var(--shadow-sm)] ${accentBar} ${className}`}>
      {children}
    </div>
  );
}

export function MetricTile({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <SurfaceCard accent className="h-full p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p> : null}
    </SurfaceCard>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "teal" | "warm" | "danger" | "success";
}) {
  const toneClass = {
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
    teal: "border-teal-200 bg-teal-50 text-teal-800",
    warm: "border-orange-200 bg-orange-50 text-orange-800",
    danger: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
      {children}
    </span>
  );
}

export function AppPageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 rounded-[2rem] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(11,34,53,0.98)_0%,rgba(17,45,65,0.98)_56%,rgba(11,34,53,0.95)_100%)] px-6 py-6 text-white shadow-[var(--shadow-md)] sm:px-8 sm:py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <SectionEyebrow inverse>{eyebrow}</SectionEyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          {description ? <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}