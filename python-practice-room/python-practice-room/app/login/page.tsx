"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Mode = "login" | "signup";

// แปลข้อความ error ของ Supabase เป็นภาษาไทย
function thaiError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("rate limit")) return "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "อีเมลนี้สมัครไว้แล้ว ให้ไปที่หน้าเข้าสู่ระบบ";
  if (m.includes("signups not allowed")) return "ขณะนี้ปิดรับสมัครสมาชิก กรุณาติดต่อครู";
  if (m.includes("invalid login")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (m.includes("email not confirmed")) return "ยังไม่ได้ยืนยันอีเมล กรุณาติดต่อครู";
  if (m.includes("invalid email") || m.includes("unable to validate email"))
    return "รูปแบบอีเมลไม่ถูกต้อง";
  if (m.includes("password") && (m.includes("character") || m.includes("weak")))
    return "รหัสผ่านสั้นหรือง่ายเกินไป ต้องมีอย่างน้อย 6 ตัวอักษร";
  if (m.includes("fetch") || m.includes("network"))
    return "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่";
  return "เกิดข้อผิดพลาด: " + msg;
}

// หน้าล็อกอิน/สมัครสมาชิกสำหรับนักเรียน
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";
  const pwTooShort = isSignup && password.length > 0 && password.length < 6;
  const mismatch = isSignup && confirm.length > 0 && confirm !== password;

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setError("");
    setInfo("");
    setConfirm("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // กันกดซ้ำ
    setError("");
    setInfo("");

    if (isSignup) {
      if (name.trim().length < 2) {
        setError("กรุณากรอกชื่อ-นามสกุล หรือเลขที่/ห้อง");
        return;
      }
      if (password.length < 6) {
        setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        return;
      }
      if (password !== confirm) {
        setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
        return;
      }
    }

    setLoading(true);

    try {
      const supabase = getSupabase();

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        });
        if (error) {
          setError(thaiError(error.message));
          return;
        }
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setInfo("สมัครสำเร็จ กรุณาตรวจอีเมลเพื่อยืนยัน แล้วกลับมาเข้าสู่ระบบ");
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(thaiError(error.message));
        return;
      }
      const isTeacher = data.user?.app_metadata?.role === "teacher";
      router.push(isTeacher ? "/teacher" : "/");
      router.refresh();
    } catch {
      setError("ระบบยังไม่พร้อมใช้งาน (ยังไม่ได้ตั้งค่า Supabase)");
    } finally {
      setLoading(false);
    }
  }

  const hintStyle = { display: "block", margin: "-8px 0 12px", fontSize: 13, color: "#dc2626" } as const;

  return (
    <div className="login-wrap">
      <h1>{isSignup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>
      <p className="login-sub">
        {isSignup
          ? "สร้างบัญชีนักเรียนเพื่อเก็บประวัติการส่งโจทย์"
          : "ล็อกอินนักเรียนเพื่อเก็บประวัติการส่งโจทย์"}
      </p>

      <form className="login-card" onSubmit={handleSubmit}>
        {isSignup && (
          <>
            <label htmlFor="name">ชื่อ-นามสกุล (หรือ ห้อง/เลขที่)</label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              placeholder="เช่น สมชาย ใจดี ม.4/2 เลขที่ 5"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </>
        )}

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
        <div style={{ position: "relative" }}>
          <input
            id="password"
            type={showPw ? "text" : "password"}
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ paddingRight: 64 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              font: "inherit",
              fontSize: 14,
              color: "#2563eb",
              background: "none",
              border: 0,
              padding: 0,
              cursor: "pointer",
            }}
          >
            {showPw ? "ซ่อน" : "แสดง"}
          </button>
        </div>
        {pwTooShort && (
          <small style={hintStyle}>
            ต้องมีอย่างน้อย 6 ตัวอักษร (ตอนนี้ {password.length})
          </small>
        )}

        {isSignup && (
          <>
            <label htmlFor="confirm">ยืนยันรหัสผ่าน</label>
            <input
              id="confirm"
              type={showPw ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {mismatch && <small style={hintStyle}>รหัสผ่านไม่ตรงกัน</small>}
          </>
        )}

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

        {!isSignup && (
          <p style={{ margin: "12px 0 0", fontSize: 13, textAlign: "center", color: "#6b7280" }}>
            ลืมรหัสผ่าน? กรุณาแจ้งครูเพื่อตั้งรหัสผ่านใหม่ให้
          </p>
        )}

        <p style={{ margin: "12px 0 0", fontSize: 13, textAlign: "center" }}>
          <a href="/teacher-login" style={{ color: "#6b7280" }}>
            เข้าสู่ระบบสำหรับครู
          </a>
        </p>
      </form>
    </div>
  );
}
