"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// หน้าล็อกอินสำหรับครู (ไม่มีปุ่มสมัคร)
export default function TeacherLoginPage() {
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
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
      if (data.user?.app_metadata?.role !== "teacher") {
        await supabase.auth.signOut();
        setError("บัญชีนี้ไม่มีสิทธิ์ครู (นักเรียนให้ใช้หน้าเข้าสู่ระบบของนักเรียน)");
        return;
      }
      router.push("/teacher");
      router.refresh();
    } catch {
      setError("ระบบยังไม่พร้อมใช้งาน (ยังไม่ได้ตั้งค่า Supabase)");
    } finally {
      setLoading(false);
    }
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

        <p style={{ margin: "16px 0 0", fontSize: 13, textAlign: "center" }}>
          <a href="/login" style={{ color: "#6b7280" }}>
            เข้าสู่ระบบสำหรับนักเรียน
          </a>
        </p>
      </form>
    </div>
  );
}
