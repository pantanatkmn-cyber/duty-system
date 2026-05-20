"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (res?.error) {
      // NextAuth ส่ง error เป็นข้อความที่ขว้างจาก authorize()
      setError(res.error);
    } else if (res?.ok) {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-brand-orange-50 px-4">
      <div className="w-full max-w-md">
        {/* โลโก้/ชื่อระบบ */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="วิทยาลัยเทคโนโลยีสันตพล"
            className="h-24 w-24 rounded-full object-cover shadow-lg mx-auto mb-4 border-4 border-brand-orange-400"
          />
          <h1 className="text-2xl font-bold text-gray-800">
            ระบบตรวจการเข้าเวร
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            วิทยาลัยเทคโนโลยีสันตพล
          </p>
        </div>

        {/* การ์ดฟอร์ม */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            เข้าสู่ระบบ
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            กรุณากรอกชื่อผู้ใช้และรหัสผ่าน
          </p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="username"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} วิทยาลัยเทคโนโลยีสันตพล
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>กำลังโหลด...</div>}>
      <LoginForm />
    </Suspense>
  );
}
