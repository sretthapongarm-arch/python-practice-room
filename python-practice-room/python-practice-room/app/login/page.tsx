"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        setLoading(false);
        return;
      }
    } catch {
      setError("ระบบยังไม่พร้อมใช้งาน (ยังไม่ได้ตั้งค่า Supabase)");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push("/teacher");
    router.refresh();
  }

  return (
    <div className="login-wrap">
      <h1>เข้าสู่ระบบสำหรับครู</h1>
      <p className="login-sub">ล็อกอินเพื่อดูผลการส่งงานของนักเรียน</p>

      <form className="login-card" onSubmit={handleSubmit}>
        <label htmlFor="email">อีเมล</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="password">รหัสผ่าน</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
