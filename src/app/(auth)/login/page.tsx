"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { motion } from "framer-motion";

const isDev = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [form, setForm]     = useState({ email: "", password: "" });
  const [devEmail, setDevEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email:    form.email,
        password: form.password,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.error) {
        setError("Invalid email or password.");
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("dev-credentials", {
        email: devEmail,
        redirect: false,
        callbackUrl: "/",
      });
      if (result?.error) {
        setError("User not found. Try signing up first.");
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setError("Sign-in failed.");
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
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-[0_16px_40px_rgba(15,118,110,0.28)]"
        >
          PF
        </motion.div>
        <h1 className="text-3xl font-semibold text-foreground">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to PlayForge and pick up your install where you left off.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Email + Password — always shown */}
          <form onSubmit={handleCredentials} className="space-y-3">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground/85">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="coach@school.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground/85">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Spinner size="sm" className="mr-2" /> Signing in...</> : "Sign in"}
            </Button>
          </form>

          {/* Google OAuth — only if configured */}
          {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={handleGoogleSignIn}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {loading ? <><Spinner size="sm" className="mr-2" /> Signing in...</> : "Continue with Google"}
              </Button>
            </>
          )}

          {/* Dev-only shortcut */}
          {isDev && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">DEV — email only</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={handleDevLogin} className="space-y-3">
                <Input
                  type="email"
                  placeholder="any registered email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  required
                />
                <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                  Dev Sign In
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary-emphasis hover:underline">
              Sign up
            </Link>
          </div>
          <div className="mt-2 text-center text-sm text-muted-foreground">
            Player with an invite code?{" "}
            <Link href="/join" className="text-primary-emphasis hover:underline">
              Join a team
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
