type TechLayoutProps = {
  children: React.ReactNode;
};

export default function TechLayout({ children }: TechLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--c-paper-2)]">
      <div className="flex-1">{children}</div>
      <footer className="border-t border-[var(--c-line)] px-5 py-3 text-center">
        <p className="font-mono text-[10px] text-[var(--c-text-4)]">
          © {new Date().getFullYear()} SwiftDispatch
        </p>
      </footer>
    </div>
  );
}