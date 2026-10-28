"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// ตอนล็อกอินแล้ว: ปุ่ม "ออกจากระบบ" / ตอนยังไม่ล็อกอิน: ลิงก์ "เข้าสู่ระบบ"
export default function NavAuth() {
  const router = useRouter();
  // null = ยังตรวจไม่เสร็จ (ไม่แสดงอะไร เพื่อกันกะพริบ)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setLoggedIn(!!session);
      });
      return () => sub.subscription.unsubscribe();
    } catch {
      // ยังไม่ได้ตั้งค่า env ของ Supabase: แสดงลิงก์เข้าสู่ระบบไว้ก่อน
      setLoggedIn(false);
    }
  }, []);

  if (loggedIn === null) return null;

  if (!loggedIn) {
    return <Link href="/login">เข้าสู่ระบบ</Link>;
  }

  async function handleLogout() {
    await getSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

   return (
    <>
      <Link href="/history">ประวัติของฉัน</Link>
      <button type="button" className="logout-btn" onClick={handleLogout}>
        ออกจากระบบ
      </button>
    </>
  );
}
