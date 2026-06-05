"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signUp.email({ name, email, password });
      if (result.error) {
        setError(result.error.message ?? "Registration failed");
      } else {
        router.push("/overview");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-display)]">
          NextWorth
        </h1>
        <p className="text-neutral-400 mt-2">Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block mb-2 text-sm font-medium text-neutral-400">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-neutral-400">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-neutral-400">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Min. 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-neutral-900 font-bold rounded-xl shadow-lg shadow-white/20 hover:bg-white hover:shadow-white/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-neutral-500 text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
