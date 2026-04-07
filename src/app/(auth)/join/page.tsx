"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { motion } from "framer-motion";

const CODE_LENGTH = 6;

function InviteCodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback(
    (index: number, char: string) => {
      const sanitized = char.replace(/[^A-Z0-9]/gi, "").toUpperCase();
      if (!sanitized && char !== "") return;

      const chars = value.split("");
      chars[index] = sanitized.slice(-1);
      const newValue = chars.join("");
      onChange(newValue);

      if (sanitized && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const chars = value.split("");
        chars[index - 1] = "";
        onChange(chars.join(""));
      }
    },
    [value, onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/[^A-Z0-9]/gi, "")
        .toUpperCase()
        .slice(0, CODE_LENGTH);
      onChange(pasted.padEnd(CODE_LENGTH, " ").slice(0, CODE_LENGTH).trimEnd());
      const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
    },
    [onChange]
  );

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length: CODE_LENGTH }).map((_, i) => (
        <motion.input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
          className="h-14 w-11 rounded-lg border border-zinc-700 bg-zinc-800/50 text-center text-xl font-mono font-bold text-white uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 transition-all duration-150 focus:border-indigo-500 focus:bg-zinc-800"
        />
      ))}
    </div>
  );
}

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
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-600/25"
        >
          PF
        </motion.div>
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
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label htmlFor="code" className="mb-3 block text-sm font-medium text-zinc-300 text-center">
                  Invite Code
                </label>
                <InviteCodeInput value={inviteCode} onChange={setInviteCode} />
              </div>
              <Button type="submit" className="w-full" disabled={loading || inviteCode.length < CODE_LENGTH}>
                {loading ? <><Spinner size="sm" className="mr-2" /> Verifying...</> : "Verify Code"}
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
                {loading ? <><Spinner size="sm" className="mr-2" /> Joining...</> : "Join Team"}
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
