"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setError("");
    setInfo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const supabase = getSupabase();

      if (isSignup) {
        if (password.length < 6) {
          setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
          return;
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError("สมัครสมาชิกไม่สำเร็จ: " + error.message);
          return;
        }
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          // กรณีเปิดให้ยืนยันอีเมลใน Supabase
          setInfo("สมัครสำเร็จ กรุณาตรวจอีเมลเพื่อยืนยัน แล้วกลับมาเข้าสู่ระบบ");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("ระบบยังไม่พร้อมใช้งาน (ยังไม่ได้ตั้งค่า Supabase)");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <h1>{isSignup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>
      <p className="login-sub">
        {isSignup
          ? "สร้างบัญชีเพื่อเก็บประวัติการส่งโจทย์ของคุณ"
          : "ล็อกอินเพื่อเก็บประวัติการส่งโจทย์ของคุณ"}
      </p>

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
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="login-error">{error}</p>}
        {info && <p style={{ margin: "0 0 12px", fontSize: 14, color: "#16a34a" }}>{info}</p>}

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "กำลังดำเนินการ..." : isSignup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
        </button>

        <p style={{ margin: "16px 0 0", fontSize: 14, textAlign: "center", color: "#6b7280" }}>
          {isSignup ? "มีบัญชีอยู่แล้ว? " : "ยังไม่มีบัญชี? "}
          <button
            type="button"
            onClick={switchMode}
            style={{
              font: "inherit",
              color: "#2563eb",
              background: "none",
              border: 0,
              padding: 0,
              cursor: "pointer",
            }}
          >
            {isSignup ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </p>
      </form>
    </div>
  );
}
