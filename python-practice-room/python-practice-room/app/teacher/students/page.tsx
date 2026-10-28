"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Sub = {
  id: string;
  problem_id: string;
  user_id: string | null;
  student_name: string;
  passed_count: number;
  total_count: number;
  status: string;
  created_at: string;
};

type SortKey = "name" | "last" | "passed";

const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH");

// ---------- CSV ----------
function csvCell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // กันสูตร Excel ที่แฝงมากับชื่อ
  return `"${s.replace(/"/g, '""')}"`;
}
function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"); // BOM ให้ Excel อ่านไทยได้
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Supabase คืนได้สูงสุด 1000 แถวต่อครั้ง จึงดึงเป็นหน้า ๆ
async function fetchAllSubmissions(): Promise<Sub[]> {
  const sb = getSupabase();
  const out: Sub[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await sb
      .from("submissions")
      .select("id, problem_id, user_id, student_name, passed_count, total_count, status, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as Sub[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export default function TeacherStudentsPage() {
  const [auth, setAuth] = useState<"loading" | "denied" | "ok">("loading");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [problemFilter, setProblemFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb.auth.getSession();
        if (data.session?.user.app_metadata?.role !== "teacher") {
          setAuth("denied");
          return;
        }
        setAuth("ok");
        const [list, p] = await Promise.all([
          fetchAllSubmissions(),
          sb.from("problems").select("id, title"),
        ]);
        setSubs(list);
        if (!p.error) {
          setTitles(Object.fromEntries((p.data ?? []).map((x: { id: string; title: string }) => [String(x.id), x.title])));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const titleOf = (id: string) => titles[String(id)] ?? "โจทย์ (ไม่พบชื่อ)";

  const problemOptions = useMemo(() => {
    const ids = new Set(subs.map((s) => String(s.problem_id)));
    return [...ids].map((id) => ({ id, title: titleOf(id) })).sort((a, b) => a.title.localeCompare(b.title, "th"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs, titles]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return subs.filter(
      (s) =>
        (problemFilter === "all" || String(s.problem_id) === problemFilter) &&
        (!needle || s.student_name.toLowerCase().includes(needle))
    );
  }, [subs, q, problemFilter]);

  const rows = useMemo(() => {
    const m = new Map<string, Sub[]>();
    for (const s of filtered) {
      const key = s.user_id ?? `name:${s.student_name.trim()}`;
      const arr = m.get(key);
      if (arr) arr.push(s);
      else m.set(key, [s]);
    }
    const list = [...m.entries()].map(([key, arr]) => {
      const tried = new Set(arr.map((s) => s.problem_id));
      const passed = new Set(arr.filter((s) => s.status === "passed").map((s) => s.problem_id));
      return {
        key,
        name: arr[0].student_name, // แถวแรกคือล่าสุด (เรียงจากใหม่ไปเก่า)
        attempts: arr.length,
        tried: tried.size,
        passed: passed.size,
        last: arr[0].created_at,
        subs: arr,
      };
    });
    list.sort((a, b) => {
      if (sort === "last") return b.last.localeCompare(a.last);
      if (sort === "passed") return b.passed - a.passed || a.name.localeCompare(b.name, "th");
      return a.name.localeCompare(b.name, "th");
    });
    return list;
  }, [filtered, sort]);

  async function toggleCode(id: string) {
    if (codes[id] !== undefined) {
      setCodes((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
      return;
    }
    setCodes((p) => ({ ...p, [id]: "กำลังโหลด…" }));
    const { data, error } = await getSupabase().from("submissions").select("code").eq("id", id).single();
    setCodes((p) => ({
      ...p,
      [id]: error ? "โหลดโค้ดไม่สำเร็จ: " + error.message : (data as { code: string }).code,
    }));
  }

  function exportSummary() {
    downloadCsv("สรุปรายคน.csv", [
      ["ชื่อ", "ส่งทั้งหมด (ครั้ง)", "ลองกี่ข้อ", "ผ่านกี่ข้อ", "ส่งล่าสุด"],
      ...rows.map((r) => [r.name, r.attempts, r.tried, r.passed, fmt(r.last)]),
    ]);
  }
  function exportAll() {
    downloadCsv("รายการส่งทั้งหมด.csv", [
      ["ชื่อ", "โจทย์", "ผล", "ผ่าน", "ทั้งหมด", "เวลาที่ส่ง"],
      ...filtered.map((s) => [
        s.student_name,
        titleOf(s.problem_id),
        s.status === "passed" ? "ผ่าน" : "ไม่ผ่าน",
        s.passed_count,
        s.total_count,
        fmt(s.created_at),
      ]),
    ]);
  }

  if (auth === "loading") return <p className="muted">กำลังตรวจสิทธิ์…</p>;
  if (auth === "denied")
    return (
      <div className="card">
        หน้านี้สำหรับครูเท่านั้น <a href="/teacher-login">เข้าสู่ระบบสำหรับครู</a>
      </div>
    );

  return (
    <>
      <h1>สรุปผลรายคน</h1>

      {error && <div className="card error-text">โหลดข้อมูลไม่สำเร็จ: {error}</div>}

      <div className="card">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="ค้นหาชื่อ หรือห้อง เช่น ม.4/2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }}
          />
          <select value={problemFilter} onChange={(e) => setProblemFilter(e.target.value)}>
            <option value="all">ทุกโจทย์</option>
            {problemOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="name">เรียงตามชื่อ</option>
            <option value="last">เรียงตามส่งล่าสุด</option>
            <option value="passed">เรียงตามผ่านมากสุด</option>
          </select>
          <button className="secondary" onClick={exportSummary} disabled={rows.length === 0}>
            ⬇ ส่งออกสรุป (CSV)
          </button>
          <button className="secondary" onClick={exportAll} disabled={filtered.length === 0}>
            ⬇ ส่งออกรายการส่งทั้งหมด (CSV)
          </button>
        </div>
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {loading ? "กำลังโหลด…" : `${rows.length} คน · ${filtered.length} ครั้งที่ส่ง`}
        </p>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: 8 }}>ชื่อ</th>
              <th style={{ padding: 8 }}>ลองกี่ข้อ</th>
              <th style={{ padding: 8 }}>ผ่านกี่ข้อ</th>
              <th style={{ padding: 8 }}>ส่งทั้งหมด</th>
              <th style={{ padding: 8 }}>ส่งล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="muted" style={{ padding: 12 }}>
                  ไม่พบข้อมูลตามตัวกรอง
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <RowGroup
                key={r.key}
                r={r}
                open={openKey === r.key}
                onToggle={() => setOpenKey(openKey === r.key ? null : r.key)}
                titleOf={titleOf}
                codes={codes}
                toggleCode={toggleCode}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RowGroup({
  r,
  open,
  onToggle,
  titleOf,
  codes,
  toggleCode,
}: {
  r: { key: string; name: string; attempts: number; tried: number; passed: number; last: string; subs: Sub[] };
  open: boolean;
  onToggle: () => void;
  titleOf: (id: string) => string;
  codes: Record<string, string>;
  toggleCode: (id: string) => void;
}) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
        <td style={{ padding: 8 }}>
          <strong>{open ? "▾ " : "▸ "}</strong>
          {r.name}
        </td>
        <td style={{ padding: 8 }}>{r.tried}</td>
        <td style={{ padding: 8 }}>{r.passed}</td>
        <td style={{ padding: 8 }}>{r.attempts}</td>
        <td style={{ padding: 8 }}>{fmt(r.last)}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} style={{ padding: "4px 8px 16px 24px", background: "#f8fafc" }}>
            {r.subs.map((s) => (
              <div key={s.id} style={{ marginTop: 10 }}>
                <div className="row">
                  <strong>{titleOf(s.problem_id)}</strong>
                  <span className={`badge ${s.status}`}>{s.status === "passed" ? "ผ่าน" : "ไม่ผ่าน"}</span>
                  <span>
                    {s.passed_count}/{s.total_count} ข้อ
                  </span>
                  <span className="muted">{fmt(s.created_at)}</span>
                  <button
                    className="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCode(s.id);
                    }}
                  >
                    {codes[s.id] !== undefined ? "ซ่อนโค้ด" : "ดูโค้ด"}
                  </button>
                </div>
                {codes[s.id] !== undefined && <pre>{codes[s.id]}</pre>}
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
