"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Step = {
  target: string;
  title: string;
  body: string;
};

const ALL_STEPS: Step[] = [
  {
    target: "brand",
    title: "Welcome to SwiftDispatch",
    body: "This is a private preview — feel free to click around. Nothing here is a real customer, and it resets on its own.",
  },
  {
    target: "nav-dispatch",
    title: "Dispatch board",
    body: "Jobs move through new → assigned → en route → in progress → quote → completed. Click a job to see its full timeline.",
  },
  {
    target: "nav-analytics",
    title: "Analytics",
    body: "Response times, technician load, and job volume roll up here.",
  },
  {
    target: "nav-admin",
    title: "Admin",
    body: "Manage technicians, users, and SMS templates for the company.",
  },
  {
    target: "reset-demo",
    title: "Reset anytime",
    body: "This sandbox resets nightly on its own — or click here to wipe it back to sample data whenever you want a clean slate.",
  },
];

const DESKTOP_BREAKPOINT_PX = 1024;

type Props = {
  storageKey: string;
  hasAdminNav: boolean;
};

export default function DemoTutorial({ storageKey, hasAdminNav }: Props) {
  const dismissKey = `swiftdispatch_tutorial_dismissed_${storageKey}`;
  const steps = useMemo(
    () => (hasAdminNav ? ALL_STEPS : ALL_STEPS.filter((s) => s.target !== "nav-admin")),
    [hasAdminNav],
  );

  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(dismissKey)) return;
    } catch {
      return;
    }
    if (window.innerWidth < DESKTOP_BREAKPOINT_PX) return;
    setVisible(true);
  }, [dismissKey]);

  useEffect(() => {
    if (!visible) return;
    const step = steps[stepIndex];
    if (!step) return;

    const update = () => {
      const el = document.querySelector(`[data-tutorial="${step.target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [visible, stepIndex, steps]);

  // The anchored tour only makes sense at desktop widths (see the mount
  // check above) -- if the viewport narrows while it's open (resize, device
  // rotation), the sidebar it's pointing at can disappear entirely. Suspend
  // rather than dismiss-and-remember, so it can still show next time they're
  // back on desktop.
  useEffect(() => {
    if (!visible) return;
    function onResize() {
      if (window.innerWidth < DESKTOP_BREAKPOINT_PX) setVisible(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    cardRef.current?.focus();
    return () => {
      previouslyFocusedRef.current?.focus?.();
    };
  }, [visible]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      // Private browsing / blocked storage: the tutorial just re-shows next launch.
    }
  }

  function onCardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      dismiss();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function next() {
    if (stepIndex >= steps.length - 1) {
      dismiss();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  if (!visible) return null;
  const step = steps[stepIndex];
  if (!step) return null;

  const cardWidth = 300;
  const cardTop = rect ? rect.bottom + 12 : window.innerHeight / 2 - 90;
  const cardLeft = rect
    ? Math.min(Math.max(rect.left, 16), window.innerWidth - cardWidth - 16)
    : window.innerWidth / 2 - cardWidth / 2;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" onClick={dismiss} />
      {rect && (
        <div
          className="pointer-events-none fixed z-[71] rounded-md ring-2 ring-teal-400 transition-all duration-200"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-tutorial-title"
        tabIndex={-1}
        onKeyDown={onCardKeyDown}
        className="fixed z-[72] rounded-lg border border-[var(--c-line)] bg-[var(--c-paper)] p-4 shadow-xl outline-none"
        style={{ top: cardTop, left: cardLeft, width: cardWidth }}
      >
        <p className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-teal-700">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 id="demo-tutorial-title" className="mt-1 text-[14px] font-semibold text-[var(--c-text)]">
          {step.title}
        </h3>
        <p className="mt-1 text-[12.5px] leading-snug text-[var(--c-text-3)]">{step.body}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="font-mono text-[10px] text-[var(--c-text-4)] underline-offset-2 hover:underline"
          >
            Skip tutorial
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="rounded-full border border-[var(--c-line)] px-3 py-1 font-mono text-[10px] text-[var(--c-text-3)] transition hover:border-[var(--c-line-2)]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-teal-700 px-3 py-1 font-mono text-[10px] font-medium text-white transition hover:bg-teal-800"
            >
              {stepIndex === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
