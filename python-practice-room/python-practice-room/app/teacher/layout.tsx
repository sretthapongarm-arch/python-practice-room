"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// ครอบทุกหน้าใต้ /teacher: เข้าได้เฉพาะบัญชีที่มีสิทธิ์ครู
export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        const role = data.session?.user?.app_metadata?.role;
        if (cancelled) return;
        if (role === "teacher") {
          setAllowed(true);
        } else {
          router.replace("/teacher-login");
        }
      } catch {
        if (!cancelled) router.replace("/teacher-login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!allowed) return <p style={{ padding: 24 }}>กำลังตรวจสอบสิทธิ์...</p>;
  return <>{children}</>;
}
