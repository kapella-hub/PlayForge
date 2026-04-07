"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState<"code" | "profile">("code");
  const [inviteCode, setInviteCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [form, setForm] = useState({ name: "", email: "", position: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/verify-invite?code=${inviteCode}`);
      if (res.ok) {
        const data = await res.json();
        setOrgName(data.orgName);
        setStep("profile");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid invite code.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, inviteCode }),
      });
      if (res.ok) {
        router.push("/login");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to join team. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
          PF
        </div>
        <h1 className="text-2xl font-bold text-white">Join a team</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {step === "code"
            ? "Enter the invite code from your coach"
            : `Joining ${orgName}`}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {step === "code" ? (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Invite Code
                </label>
                <Input
                  id="code"
                  placeholder="ABC123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.3em]"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Your name
                </label>
                <Input
                  id="name"
                  placeholder="Marcus Johnson"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="marcus@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="position" className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Position
                </label>
                <Input
                  id="position"
                  placeholder="WR, QB, MLB, etc."
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Joining..." : "Join Team"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
