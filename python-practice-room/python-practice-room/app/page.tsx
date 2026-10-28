"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Problem } from "@/lib/types";

const DIFF_LABEL: Record<string, string> = { easy: "ง่าย", medium: "ปานกลาง", hard: "ยาก" };
const DIFF_ORDER = ["easy", "medium", "hard"];
const rank = (d: string) => {
  const i = DIFF_ORDER.indexOf(d);
  return i === -1 ? 99 : i;
};

type StatusFilter = "all" | "todo" | "done";

export default function HomePage() {
  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [solved, setSolved] = useState<Set<string>>(new Set()); // ข้อที่เคยส่งแล้วผ่าน
  const [tried, setTried] = useState<Set<string>>(new Set()); // ข้อที่เคยส่ง
  const [diff, setDiff] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      try {
        const { data, error } = await sb
          .from("problems")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: true });
        if (error) throw error;
        setProblems(data as Problem[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return;
      }

      // ความคืบหน้าของนักเรียน (ถ้าล็อกอินอยู่) ดึงไม่ได้ก็ข้ามไป ไม่กระทบรายการโจทย์
      try {
        const { data: s } = await sb.auth.getSession();
        const uid = s.session?.user.id;
        if (!uid) return;
        setLoggedIn(true);
        const sub = await sb
          .from("submissions")
          .select("problem_id, status")
          .eq("user_id", uid)
          .limit(1000);
        if (sub.error || !sub.data) return;
        const t = new Set<string>();
        const ok = new Set<string>();
        for (const r of sub.data as { problem_id: string; status: string }[]) {
          t.add(String(r.problem_id));
          if (r.status === "passed") ok.add(String(r.problem_id));
        }
        setTried(t);
        setSolved(ok);
      } catch {}
    })();
  }, []);

  const difficulties = useMemo(() => {
    const set = new Set((problems ?? []).map((p) => String(p.difficulty)));
    return [...set].sort((a, b) => rank(a) - rank(b));
  }, [problems]);

  const visible = useMemo(
    () =>
      (problems ?? []).filter((p) => {
        if (diff !== "all" && String(p.difficulty) !== diff) return false;
        const done = solved.has(String(p.id));
        if (status === "done" && !done) return false;
        if (status === "todo" && done) return false;
        return true;
      }),
    [problems, diff, status, solved]
  );

  const solvedCount = (problems ?? []).filter((p) => solved.has(String(p.id))).length;

  return (
    <>
      <h1>เลือกโจทย์ที่จะฝึก</h1>
      <p className="muted">เขียนโค้ด Python แล้วกดส่ง ระบบจะรันและตรวจกับชุดทดสอบให้ทันที</p>

      {error && <div className="card error-text">เกิดข้อผิดพลาด: {error}</div>}
      {!problems && !error && <p className="muted">กำลังโหลด…</p>}
      {problems?.length === 0 && <p className="muted">ยังไม่มีโจทย์</p>}

      {problems && problems.length > 0 && (
        <>
          <div className="card">
            {loggedIn ? (
              <>
                ผ่านแล้ว <strong>{solvedCount}</strong> / {problems.length} ข้อ
              </>
            ) : (
              <span className="muted">
                <Link href="/login">เข้าสู่ระบบ</Link> เพื่อดูว่าทำข้อไหนผ่านแล้ว
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
            <Chip active={diff === "all"} onClick={() => setDiff("all")}>
              ทุกระดับ
            </Chip>
            {difficulties.map((d) => (
              <Chip key={d} active={diff === d} onClick={() => setDiff(d)}>
                {DIFF_LABEL[d] ?? d}
              </Chip>
            ))}
            {loggedIn && (
              <>
                <span style={{ width: 12 }} />
                <Chip active={status === "all"} onClick={() => setStatus("all")}>
                  ทั้งหมด
                </Chip>
                <Chip active={status === "todo"} onClick={() => setStatus("todo")}>
                  ยังไม่ผ่าน
                </Chip>
                <Chip active={status === "done"} onClick={() => setStatus("done")}>
                  ผ่านแล้ว
                </Chip>
              </>
            )}
          </div>
        </>
      )}

      {problems && problems.length > 0 && visible.length === 0 && (
        <p className="muted">ไม่มีโจทย์ตามตัวกรองนี้</p>
      )}

      {visible.map((p) => {
        const id = String(p.id);
        const d = String(p.difficulty);
        return (
          <div key={p.id} className="card row spread">
            <div>
              <Link href={`/problems/${p.id}`}>
                <strong>{p.title}</strong>
              </Link>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {solved.has(id) ? (
                <span className="badge passed">ผ่านแล้ว ✓</span>
              ) : tried.has(id) ? (
                <span className="badge failed">เคยลอง</span>
              ) : null}
              <span className={`badge ${p.difficulty}`}>{DIFF_LABEL[d] ?? d}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        font: "inherit",
        fontSize: 14,
        padding: "6px 14px",
        borderRadius: 999,
        cursor: "pointer",
        border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
        background: active ? "#2563eb" : "#fff",
        color: active ? "#fff" : "#334155",
      }}
    >
      {children}
    </button>
  );
}
