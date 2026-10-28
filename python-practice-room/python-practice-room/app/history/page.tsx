"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Row = {
  id: string;
  problem_id: string;
  code: string;
  passed_count: number;
  total_count: number;
  status: "passed" | "failed";
  created_at: string;
};

// ปรับให้ตรงกับเส้นทางหน้าโจทย์ของเว็บคุณ
const problemPath = (id: string) => `/problems/${id}`;

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [needLogin, setNeedLogin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        const { data: s } = await sb.auth.getSession();
        const uid = s.session?.user.id;
        if (!uid) return setNeedLogin(true);

        const sub = await sb
          .from("submissions")
          .select("id, problem_id, code, passed_count, total_count, status, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(200);
        if (sub.error) throw sub.error;
        const list = (sub.data ?? []) as Row[];
        setRows(list);

        const ids = [...new Set(list.map((r) => r.problem_id))];
        if (ids.length) {
          const p = await sb.from("problems").select("id, title").in("id", ids);
          if (!p.error) setTitles(Object.fromEntries((p.data ?? []).map((x: any) => [x.id, x.title])));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const solved = new Set(list.filter((r) => r.status === "passed").map((r) => r.problem_id));
    const tried = new Set(list.map((r) => r.problem_id));
    return { total: list.length, solved: solved.size, tried: tried.size };
  }, [rows]);

  if (needLogin)
    return (
      <div className="card">
        กรุณา <a href="/login">เข้าสู่ระบบ</a> เพื่อดูประวัติการส่งโจทย์ของคุณ
      </div>
    );
  if (error) return <div className="card error-text">โหลดประวัติไม่สำเร็จ: {error}</div>;
  if (!rows) return <p className="muted">กำลังโหลด…</p>;

  return (
    <>
      <h1>ประวัติการส่งโจทย์ของฉัน</h1>
      <div className="card">
        ทำผ่านแล้ว <strong>{stats.solved}</strong> ข้อ · เคยลอง {stats.tried} ข้อ · ส่งทั้งหมด {stats.total} ครั้ง
      </div>

      {rows.length === 0 && <p className="muted">ยังไม่มีประวัติ ลองไปทำโจทย์แล้วกด “ส่งตรวจ” ดูครับ</p>}

      {rows.map((r) => (
        <div className="card" key={r.id}>
          <div className="row">
            <a href={problemPath(r.problem_id)}>
              <strong>{titles[r.problem_id] ?? "โจทย์"}</strong>
            </a>
            <span className={`badge ${r.status}`}>{r.status === "passed" ? "ผ่าน" : "ไม่ผ่าน"}</span>
            <span>
              {r.passed_count}/{r.total_count} ข้อ
            </span>
            <span className="muted">{new Date(r.created_at).toLocaleString("th-TH")}</span>
          </div>
          <details style={{ marginTop: 8 }}>
            <summary className="muted">ดูโค้ดที่ส่ง</summary>
            <pre>{r.code}</pre>
          </details>
        </div>
      ))}
    </>
  );
}

