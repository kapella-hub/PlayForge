import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white mb-6">
        PF
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">PlayForge</h1>
      <p className="text-zinc-500 mb-8">Interactive Football Playbook Platform</p>
      <Link
        href="/login"
        className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Get Started
      </Link>
    </div>
  );
}
