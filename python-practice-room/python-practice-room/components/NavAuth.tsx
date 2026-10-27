"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// ปุ่ม "ออกจากระบบ" แสดงเฉพาะตอนที่ล็อกอินอยู่
export default function NavAuth() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    try {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setLoggedIn(!!session);
      });
      return () => sub.subscription.unsubscribe();
    } catch {
      // ยังไม่ได้ตั้งค่า env ของ Supabase: ไม่แสดงปุ่ม แต่ไม่ให้หน้าเว็บพัง
      setLoggedIn(false);
    }
  }, []);

  if (!loggedIn) return null;

  async function handleLogout() {
    await getSupabase().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" className="logout-btn" onClick={handleLogout}>
      ออกจากระบบ
    </button>
  );
}
