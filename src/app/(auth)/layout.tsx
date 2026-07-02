export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-8 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[14%] h-72 w-72 rounded-full bg-emerald-500/12 blur-[120px] sm:h-96 sm:w-96" />
        <div className="absolute right-[10%] bottom-[10%] h-72 w-72 rounded-full bg-amber-500/10 blur-[110px] sm:h-80 sm:w-80" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/6 to-transparent" />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
