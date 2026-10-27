"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Problem } from "@/lib/types";

export default function HomePage() {
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await getSupabase()
          .from("problems")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: true });
        if (error) throw error;
        setProblems(data as Problem[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return (
    <>
      <h1>เลือกโจทย์ที่จะฝึก</h1>
      <p className="muted">เขียนโค้ด Python แล้วกดส่ง ระบบจะรันและตรวจกับชุดทดสอบให้ทันที</p>
      {error && <div className="card error-text">เกิดข้อผิดพลาด: {error}</div>}
      {!problems && !error && <p className="muted">กำลังโหลด…</p>}
      {problems?.length === 0 && <p className="muted">ยังไม่มีโจทย์</p>}
      {problems?.map((p) => (
        <div key={p.id} className="card row spread">
          <div>
            <Link href={`/problems/${p.id}`}>
              <strong>{p.title}</strong>
            </Link>
          </div>
          <span className={`badge ${p.difficulty}`}>{p.difficulty === "easy" ? "ง่าย" : "ปานกลาง"}</span>
        </div>
      ))}
    </>
  );
}
