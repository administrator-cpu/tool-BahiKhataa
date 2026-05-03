"use client";

import React, { useState } from "react";
import { Mail, Key, LogIn, ShieldCheck, Eye, EyeOff } from "lucide-react";

import InputField from "../common/components/InputField";
import Button from "../common/components/Button";
import { useAsyncAction } from "../common/hooks/useAsyncAction";

import { authService } from "../modules/auth/auth.service";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const { execute, isLoading } = useAsyncAction();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await execute(() => authService.login(formData), {
      loadingMessage: "Authenticating...",
      successMessage: "Login successful!",
      errorMessage: "Invalid credentials. Please try again.",
      onSuccess: (response) => {
        const user = response?.data?.user || response?.user;
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        // 3. Hard redirect to the dashboard so Middleware runs freshly
        window.location.href = "/dashboard";
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* BRANDING HEADER */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 w-64 h-64 bg-blue-500 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 opacity-20" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 mx-auto mb-4">
              <ShieldCheck size={32} className="text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {" "}
              Login
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Secure access to your enterprise ledger.
            </p>
          </div>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <InputField
            icon={Mail}
            label="Work Email"
            type="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="name@company.com"
          />

          <div className="relative">
            <InputField
              icon={Key}
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 bottom-3.5 text-slate-400 hover:text-blue-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-600">
                Remember me
              </span>
            </label>

            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all"
            >
              Reset Password?
            </button>
          </div>

          <div className="pt-4 mt-2">
            <Button
              type="submit"
              isLoading={isLoading}
              icon={LogIn}
              variant="primary"
              className="w-full"
            >
              Sign In
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
