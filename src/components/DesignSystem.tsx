import type { ReactNode } from "react";

/* ─── Marketing components (keep teal accent) ───────────────────────────── */

export function SectionEyebrow({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  return (
    <p
      className={
        inverse
          ? "font-mono text-[11px] uppercase tracking-[0.06em] text-teal-300"
          : "font-mono text-[11px] uppercase tracking-[0.06em] text-teal-700"
      }
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
      <h2 className={`mt-4 text-4xl font-semibold tracking-[-0.025em] sm:text-5xl ${titleClass}`}>
        {title}
      </h2>
      {description ? (
        <p className={`mt-4 text-lg leading-8 ${descriptionClass}`}>{description}</p>
      ) : null}
    </div>
  );
}

/* ─── Surface ────────────────────────────────────────────────────────────── */

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
    : "border border-[var(--c-line)] bg-[var(--c-paper)] text-[var(--c-text)]";

  return (
    <div
      className={`relative rounded-xl ${base} p-6 shadow-[var(--shadow-sm)] ${accent && !dark ? "ring-0" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Metric tile ────────────────────────────────────────────────────────── */

export function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-paper)] p-4 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--c-text-4)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--c-text)]">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-[var(--c-text-3)]">{detail}</p> : null}
    </div>
  );
}

/* ─── Status components ──────────────────────────────────────────────────── */

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
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "blue" | "amber" | "red" | "green" | "violet";
}) {
  const dotClass = {
    neutral: "bg-[var(--c-text-4)]",
    blue: "bg-[var(--c-signal)]",
    amber: "bg-[var(--c-amber)]",
    red: "bg-[var(--c-red)]",
    green: "bg-[var(--c-green)]",
    violet: "bg-[var(--c-violet)]",
  }[tone];

  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--c-text-2)]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
      {children}
    </span>
  );
}

/* ─── Page header (replaces AppPageIntro in the product) ─────────────────── */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-[var(--c-line)] pb-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--c-text)]">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--c-text-3)]">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/* AppPageIntro kept as alias so existing call sites keep working.
   eyebrow prop is accepted but silently ignored. */
export function AppPageIntro({
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return <PageHeader title={title} description={description} actions={actions} />;
}

/* ─── App page intro (layout shell, not the product page header) ─────────── */

export function AppPageIntroShell({
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
          {description ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
