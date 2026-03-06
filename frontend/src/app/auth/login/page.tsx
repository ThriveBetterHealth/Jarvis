"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useAuthStore } from "@/lib/store/auth";
import { api } from "@/lib/api";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password required"),
  totp_code: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", data);
      const { access_token, refresh_token } = response.data;
      setTokens(access_token, refresh_token);
      toast.success("Welcome back to Jarvis");
      router.push("/dashboard");
    } catch (error: any) {
      if (error.response?.headers?.["x-mfa-required"] === "true") {
        setRequiresMfa(true);
        toast("Enter your MFA code", { icon: "🔐" });
      } else {
        toast.error(error.response?.data?.detail || "Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-sora text-4xl font-bold text-white mb-2">Jarvis</h1>
          <p className="text-gray-400 text-sm">Personal AI Operating System</p>
          <div className="mt-3 w-16 h-0.5 bg-cyan-accent mx-auto" />
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="font-sora text-xl font-semibold mb-6">Sign in</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                {...register("email")}
                type="email"
                className="input-base w-full"
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input
                {...register("password")}
                type="password"
                className="input-base w-full"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {requiresMfa && (
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">MFA Code</label>
                <input
                  {...register("totp_code")}
                  type="text"
                  className="input-base w-full font-mono tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Jarvis v1.0 &mdash; Self-hosted &amp; secure
        </p>
      </div>
    </div>
  );
}
