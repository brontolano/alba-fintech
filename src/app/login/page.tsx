"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Shield, Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("callbackUrl", callbackUrl);

    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError("Email atau password salah");
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const fillDemoAccount = (email: string) => {
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = "password123";
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-xl-custom shadow-sm border border-outline-variant p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl-custom mx-auto">
              <Shield className="w-10 h-10 text-on-primary" />
            </div>
            <h1 className="font-h2 text-h2 text-on-surface">ALBA Finance</h1>
            <p className="font-body text-body text-on-surface-variant">
              Sistem Keuangan Pesantren Al Basyariyyah
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => signIn("credentials", { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-outline-variant rounded-xl-custom text-on-surface font-medium hover:bg-surface-container-low hover:border-outline transition-all duration-200"
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.24c0-.77-.07-1.54-.2-2.29H12v4.5h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.34"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-surface-container-lowest px-3 text-on-surface-variant font-medium">
                  atau email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-error-container border border-error text-on-error-container px-4 py-3 rounded-xl-custom text-sm text-center flex items-center justify-center gap-2 animate-shake">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="nama@pesantren.or.id"
                    className="w-full px-4 py-3 pr-12 border border-outline-variant rounded-xl-custom text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-surface-container-lowest"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    autoComplete="current-password"
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 border border-outline-variant rounded-xl-custom text-sm placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-surface-container-lowest"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl-custom font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-target"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-outline-variant">
            <p className="font-caption text-caption text-on-surface-variant text-center mb-3">
              Akun Demo (klik untuk isi otomatis)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount("superadmin@alba.app")}
                className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-xl-custom text-on-surface-variant hover:text-on-surface transition-colors text-left"
              >
                <span className="font-medium text-on-surface">Superadmin</span>
                <br />
                <span className="font-mono bg-surface-container-high px-2 py-1 rounded text-[10px]">superadmin@alba.app</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("pimpinan@alba.app")}
                className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-xl-custom text-on-surface-variant hover:text-on-surface transition-colors text-left"
              >
                <span className="font-medium text-on-surface">Pimpinan</span>
                <br />
                <span className="font-mono bg-surface-container-high px-2 py-1 rounded text-[10px]">pimpinan@alba.app</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("manager.kantor@alba.app")}
                className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-xl-custom text-on-surface-variant hover:text-on-surface transition-colors text-left"
              >
                <span className="font-medium text-on-surface">Manager</span>
                <br />
                <span className="font-mono bg-surface-container-high px-2 py-1 rounded text-[10px]">manager.kantor@alba.app</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("staff.kantor@alba.app")}
                className="p-3 bg-surface-container-low hover:bg-surface-container-high rounded-xl-custom text-on-surface-variant hover:text-on-surface transition-colors text-left sm:col-span-2"
              >
                <span className="font-medium text-on-surface">Staff</span>
                <br />
                <span className="font-mono bg-surface-container-high px-2 py-1 rounded text-[10px]">staff.kantor@alba.app</span>
              </button>
            </div>
            <p className="font-caption text-caption text-on-surface-variant text-center mt-3">
              Password: <span className="font-mono bg-surface-container-high px-2 py-1 rounded">password123</span>
            </p>
          </div>

          <div className="pt-4 text-center">
            <p className="font-caption text-caption text-on-surface-variant">
              © 2026 ALBA Finance. Pesantren Al Basyariyyah.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}