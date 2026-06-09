"use client";

import { useState } from "react";
import { EyeOff, Eye, Lock, LogIn, ShieldCheck, User, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { clearAccessToken, loginWithBackend } from "@/lib/api-client";
import type { Role } from "@/lib/permissions";

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  remember:  z.boolean().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { language, setLanguage, setRole } = useAppStore();
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", remember: false },
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError("");
    
    const username = data.username.toLowerCase().trim();
    const password = data.password;

    clearAccessToken();

    try {
      const backendSession = await loginWithBackend(username, password, Boolean(data.remember));
      const userRole = backendSession.user.role as Role;
      setRole(userRole);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error 
          ? err.message.replace(/POST \/api\/auth\/login failed \(\d+\): /, "")
          : "Authentication failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-slate-900 font-sans">
      <div className="mx-auto my-auto grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-[1.1fr_0.9fr] min-h-[820px]">

        {/* ── Left panel (High-Fidelity Mockup) ── */}
        <section className="relative hidden overflow-hidden bg-gradient-to-b from-[#eef9ff] to-white lg:flex lg:flex-col lg:justify-between px-12 py-12 text-center border-r border-slate-100">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_35%)]" />
          
          <div className="relative z-10 space-y-8">
            {/* Custom Brand Logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex h-20 w-20 items-center justify-center">
                {/* Bulb Shape Icon */}
                <svg className="h-16 w-16 text-[#0091ff]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2 19c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-1h4v1z" />
                </svg>
                <span className="absolute text-2xl font-black text-white leading-none select-none" style={{ top: "30%" }}>B</span>
                {/* Small bus to the right of the bulb */}
                <div className="absolute bottom-1 -right-1 bg-white p-1 rounded-md border border-slate-200 shadow-sm flex items-center justify-center">
                  <svg className="h-5 w-5 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 16c0 .55.45 1 1 1h1v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2h4v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2h1c.55 0 1-.45 1-1V6c0-2-1.99-3-4-3H7C4.99 3 3 4 3 6v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </div>
              </div>
              <div className="text-center mt-2">
                <div className="text-3xl font-black tracking-[0.18em] text-[#0a2540]">BURUUJ</div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <div className="h-[2px] w-6 bg-[#0091ff]" />
                  <div className="text-xs font-bold tracking-[0.25em] text-[#0091ff]">SCHOOL BUS</div>
                  <div className="h-[2px] w-6 bg-[#0091ff]" />
                </div>
                <div className="text-[10px] font-bold tracking-[0.3em] text-[#0a2540] mt-1.5 uppercase">MANAGEMENT SYSTEM</div>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-[#0a2540] tracking-tight">Safe Students, Bright Futures</h1>
              <p className="text-sm font-medium text-slate-500">Smart Transportation, Better Education</p>
            </div>
          </div>

          {/* Yellow School Bus Photo */}
          <div className="relative my-4 flex justify-center w-full max-w-sm mx-auto">
            <img
              src="/school_bus.png"
              alt="Buruuj School Bus"
              className="rounded-3xl shadow-lg border border-slate-100 object-cover w-full h-[220px]"
            />
          </div>

          {/* Mission Card */}
          <div className="relative z-10 w-full max-w-sm mx-auto rounded-2xl bg-[#0b2240] p-5 text-left border border-slate-800 shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-sm">Our Mission</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  To provide safe, reliable and efficient transportation for every student.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right panel (Sign in Form) ── */}
        <section className="flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 bg-white relative">
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-md space-y-7">
            {/* Mobile Brand Logo */}
            <div className="lg:hidden flex justify-center mb-6">
              <div className="flex items-center gap-2">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#0091ff] text-white">
                  <span className="text-lg font-black">B</span>
                </div>
                <div className="text-left">
                  <div className="text-sm font-black tracking-widest text-[#0a2540]">BURUUJ</div>
                  <div className="text-[8px] font-bold text-slate-400 tracking-wider">SCHOOL BUS SYSTEM</div>
                </div>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Choose Language
              </span>
              <div className="flex gap-4">
                {/* English Pill */}
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-bold transition-all shadow-sm ${
                    language === "en"
                      ? "border-blue-500 bg-[#eef7fd] text-[#0066cc]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full overflow-hidden text-base select-none">
                    🇺🇸
                  </span>
                  English
                </button>
                {/* Somali Pill */}
                <button
                  type="button"
                  onClick={() => setLanguage("so")}
                  className={`flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-bold transition-all shadow-sm ${
                    language === "so"
                      ? "border-blue-500 bg-[#eef7fd] text-[#0066cc]"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[9px] select-none font-semibold">
                    ⭐
                  </span>
                  Somali
                </button>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center space-y-1.5">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#0a2540]">
                {language === "so" ? "Ku soo Dhawoow!" : "Welcome Back!"}
              </h2>
              <p className="text-sm font-medium text-slate-400">
                {language === "so"
                  ? "Gal akoonkaaga si aad u sii wadato"
                  : "Sign in to continue to your account"}
              </p>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-150 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0a2540] mb-2 uppercase tracking-wider">
                  {language === "so" ? "Email ama Magaca isticmaalaha" : "Username or Email"}
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                  <Input
                    className="h-12 pl-11 text-sm border-slate-200 rounded-xl focus:ring-blue-500"
                    {...form.register("username")}
                    placeholder={language === "so" ? "Gali magaca isticmaalaha" : "Enter username or email"}
                  />
                </div>
                {form.formState.errors.username && (
                  <p className="text-2xs font-bold text-rose-600 mt-1.5">{form.formState.errors.username.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0a2540] mb-2 uppercase tracking-wider">
                  {language === "so" ? "Furaha sirta" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                  <Input
                    className="h-12 pl-11 pr-12 text-sm border-slate-200 rounded-xl focus:ring-blue-500"
                    type={showPass ? "text" : "password"}
                    {...form.register("password")}
                    placeholder={language === "so" ? "Gali furaha sirta" : "Enter password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-2xs font-bold text-rose-600 mt-1.5">{form.formState.errors.password.message}</p>
                )}
              </div>

              {/* Remember / Forgot Password */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 font-bold text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...form.register("remember")}
                    className="h-4.5 w-4.5 accent-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{language === "so" ? "I xasuuso" : "Remember me"}</span>
                </label>
                <a href="#" className="font-bold text-[#0091ff] hover:underline">
                  {language === "so" ? "Ma ilaawday furaha sirta ah?" : "Forgot Password?"}
                </a>
              </div>
            </div>

            {/* Primary Action Button */}
            <Button
              className="h-12 w-full rounded-xl bg-[#0080ff] hover:bg-[#0073e6] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>{language === "so" ? "Waa la xaqiijinayaa..." : "Signing in..."}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4.5 w-4.5" />
                  <span>{language === "so" ? "Gal" : "Login"}</span>
                </span>
              )}
            </Button>

            {/* Secure Login Badge */}
            <div className="flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-400 py-2">
              <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
              <p>
                <span className="font-extrabold text-slate-600 mr-1">{language === "so" ? "Galitaan Ammaan ah" : "Secure Login"}</span>
                — {language === "so" ? "Xogtaada waa mid la ilaaliyo." : "Your data is protected and safe with us."}
              </p>
            </div>
          </form>
        </section>
      </div>

      {/* Outer Bottom Footer */}
      <footer className="text-center text-2xs font-semibold text-slate-400 mt-6 select-none">
        © 2024 Buruuj School Bus Management System. All rights reserved.
      </footer>
    </main>
  );
}
