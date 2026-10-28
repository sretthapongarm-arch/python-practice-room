"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Problem, StoredExecutionResult, Submission } from "@/lib/types";

// เป็นครูเมื่อบัญชีมี app_metadata.role = "teacher" (ตั้งไว้ด้วย SQL ฝั่งแอดมิน ผู้ใช้แก้เองไม่ได้)
function isTeacher(session: { user?: { app_metadata?: { role?: unknown } } } | null): boolean {
  return session?.user?.app_metadata?.role === "teacher";
}

export default function TeacherPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, StoredExecutionResult[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const sb = getSupabase();
      sb.auth.getSession().then(({ data }) => setSignedIn(isTeacher(data.session)));
      const { data } = sb.auth.onAuthStateChange((_e, s) => setSignedIn(isTeacher(s)));
      return () => data.subscription.unsubscribe();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const sb = getSupabase();
      const [p, s] = await Promise.all([
        sb.from("problems").select("*").order("created_at"),
        sb.from("submissions").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      if (p.error) throw p.error;
      if (s.error) throw s.error;
      setProblems(p.data as Problem[]);
      setSubs(s.data as Submission[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (signedIn) load();
  }, [signedIn, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return setAuthError(error.message);
    if (!isTeacher(data.session)) {
      await getSupabase().auth.signOut();
      setAuthError("บัญชีนี้ไม่มีสิทธิ์ครู");
    }
  }

  async function toggle(id: string) {
    if (open === id) return setOpen(null);
    setOpen(id);
    if (!details[id]) {
      const { data, error } = await getSupabase().from("execution_results").select("*").eq("submission_id", id);
      if (error) setError(error.message);
      else setDetails((d) => ({ ...d, [id]: data as StoredExecutionResult[] }));
    }
  }

  const title = (pid: string) => problems.find((p) => p.id === pid)?.title ?? "—";
  const shown = filter === "all" ? subs : subs.filter((s) => s.problem_id === filter);

  // สรุปต่อโจทย์
  const stats = problems.map((p) => {
    const list = subs.filter((s) => s.problem_id === p.id);
    const students = new Set(list.map((s) => s.student_name));
    const solved = new Set(list.filter((s) => s.status === "passed").map((s) => s.student_name));
    return { p, attempts: list.length, students: students.size, solved: solved.size };
  });

  if (error) return <div className="card error-text">เกิดข้อผิดพลาด: {error}</div>;
  if (signedIn === null) return <p className="muted">กำลังโหลด…</p>;

  if (!signedIn) {
    return (
      <form onSubmit={login} className="card" style={{ maxWidth: 380 }}>
        <h2>เข้าสู่ระบบครู</h2>
        <div className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <input type="email" placeholder="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            type="password"
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">เข้าสู่ระบบ</button>
          {authError && <span className="error-text">{authError}</span>}
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="row spread">
        <h1>ภาพรวมการส่งงาน</h1>
        <div className="row">
          <button className="secondary" onClick={load}>รีเฟรช</button>
          <button className="secondary" onClick={() => getSupabase().auth.signOut()}>ออกจากระบบ</button>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 12 }}>
        <a href="/teacher/students">📊 สรุปผลรายคน / ส่งออก CSV</a>
        <a href="/teacher/problems">📝 จัดการโจทย์</a>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>โจทย์</th><th>ผู้ส่ง</th><th>ผ่านแล้ว</th><th>ครั้งที่ส่งทั้งหมด</th></tr>
          </thead>
          <tbody>
            {stats.map(({ p, attempts, students, solved }) => (
              <tr key={p.id}>
                <td>{p.title}</td><td>{students}</td><td>{solved}</td><td>{attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ marginBottom: 8 }}>
        <label className="muted">กรองตามโจทย์</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">ทั้งหมด</option>
          {problems.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>เวลา</th><th>นักเรียน</th><th>โจทย์</th><th>ผล</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td>{new Date(s.created_at).toLocaleString("th-TH")}</td>
                  <td>{s.student_name}</td>
                  <td>{title(s.problem_id)}</td>
                  <td>
                    <span className={`badge ${s.status}`}>{s.passed_count}/{s.total_count}</span>
                  </td>
                  <td><button className="secondary" onClick={() => toggle(s.id)}>{open === s.id ? "ซ่อน" : "ดูโค้ด"}</button></td>
                </tr>
                {open === s.id && (
                  <tr>
                    <td colSpan={5}>
                      <pre>{s.code}</pre>
                      {(details[s.id] ?? []).map((r, i) => (
                        <div key={r.id} className="muted">
                          ชุดทดสอบ {i + 1}: <span className={`badge ${r.status}`}>{r.status}</span> {r.runtime_ms} ms
                          {r.error_message ? ` — ${r.error_message.split("\n").slice(-1)[0]}` : ""}
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="muted">ยังไม่มีการส่งงาน</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
