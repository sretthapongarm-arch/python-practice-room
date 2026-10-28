"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { PythonRunner } from "@/lib/runner";
import { explainPythonError } from "@/lib/pythonHints";
import { useDraft } from "@/hooks/useDraft";
import type { ExecutionResult, Problem, TestCase } from "@/lib/types";

const NAME_KEY = "ppr_student_name";

export default function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  // บันทึกร่างโค้ดอัตโนมัติ แยกตามผู้ใช้และโจทย์ (กันนักเรียนหลายคนใช้เครื่องเดียวกัน)
  const [code, setCode, clearDraft, restored] = useDraft(
    `draft:${userId ?? "guest"}:${id}`,
    problem?.starter_code ?? ""
  );
  const [name, setName] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [busy, setBusy] = useState<null | "run" | "submit">(null);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<ExecutionResult[] | null>(null);
  const [resultTests, setResultTests] = useState<TestCase[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const runner = useRef<PythonRunner | null>(null);

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
    runner.current = new PythonRunner();
    runner.current.warmUp().catch(() => {}); // โหลด Pyodide ล่วงหน้า
    return () => runner.current?.dispose();
  }, []);

  // ถ้าล็อกอินอยู่ ใช้ id ของบัญชีเป็นส่วนหนึ่งของคีย์ร่าง และเติมชื่อให้อัตโนมัติ
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        const u = data.session?.user;
        if (u) {
          setUserId(u.id);
          const full = u.user_metadata?.full_name;
          if (full) setName(full);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        const [p, t] = await Promise.all([
          sb.from("problems").select("*").eq("id", id).single(),
          sb.from("test_cases").select("*").eq("problem_id", id).order("position"),
        ]);
        if (p.error) throw p.error;
        if (t.error) throw t.error;
        setProblem(p.data as Problem);
        setTests(t.data as TestCase[]);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [id]);

  const sampleTests = useMemo(() => tests.filter((t) => !t.is_hidden), [tests]);
  const testById = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests]);

  async function execute(mode: "run" | "submit") {
    if (!runner.current || !problem) return;
    if (mode === "submit" && !name.trim()) {
      setNotice("กรุณากรอกชื่อก่อนส่งงาน");
      return;
    }
    setNotice(null);
    setBusy(mode);
    setResults(null);
    const toRun = mode === "run" ? sampleTests : tests;
    setResultTests(toRun);
    try {
      setProgress("กำลังเตรียม Python… (ครั้งแรกอาจใช้เวลาไม่กี่วินาที)");
      const res = await runner.current.runTests(code, toRun, (d, n) => setProgress(`ตรวจแล้ว ${d}/${n}`));
      setResults(res);
      if (mode === "submit") await save(res);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function save(res: ExecutionResult[]) {
    const sb = getSupabase();
    const passed = res.filter((r) => r.status === "passed").length;
    localStorage.setItem(NAME_KEY, name.trim());
    const sub = await sb
      .from("submissions")
      .insert({
        problem_id: id,
        student_name: name.trim(),
        code,
        passed_count: passed,
        total_count: res.length,
        status: passed === res.length ? "passed" : "failed",
      })
      .select("id")
      .single();
    if (sub.error) {
      setNotice("บันทึกการส่งงานไม่สำเร็จ: " + sub.error.message);
      return;
    }
    const rows = res.map((r) => ({ ...r, submission_id: sub.data.id }));
    const ins = await sb.from("execution_results").insert(rows);
    setNotice(ins.error ? "บันทึกผลรายข้อไม่สำเร็จ: " + ins.error.message : "บันทึกการส่งงานแล้ว ✓");
  }

  function resetCode() {
    if (!problem) return;
    if (!window.confirm("ล้างโค้ดที่เขียนไว้ และกลับไปใช้โค้ดเริ่มต้น?")) return;
    setCode(problem.starter_code);
    clearDraft();
  }

  if (loadError) return <div className="card error-text">โหลดโจทย์ไม่สำเร็จ: {loadError}</div>;
  if (!problem) return <p className="muted">กำลังโหลด…</p>;

  const passedCount = results?.filter((r) => r.status === "passed").length ?? 0;

  return (
    <>
      <h1>{problem.title}</h1>
      <div className="card desc">{problem.description}</div>

      <div className="card">
        <label className="muted" htmlFor="code">
          โค้ดของคุณ (อ่านจาก input() เขียนผลด้วย print())
        </label>
        <textarea
          id="code"
          className="code"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const el = e.currentTarget;
              const s = el.selectionStart;
              const v = code.slice(0, s) + "    " + code.slice(el.selectionEnd);
              setCode(v);
              requestAnimationFrame(() => (el.selectionStart = el.selectionEnd = s + 4));
            }
          }}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder="ชื่อของคุณ"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
          <button className="secondary" disabled={busy !== null} onClick={() => execute("run")}>
            ▶ ลองรัน (ตัวอย่าง)
          </button>
          <button disabled={busy !== null} onClick={() => execute("submit")}>
            ส่งตรวจ
          </button>
          <button className="secondary" disabled={busy !== null} onClick={resetCode}>
            ↺ เริ่มใหม่
          </button>
          {progress && <span className="muted">{progress}</span>}
        </div>
        {notice && <p className="muted">{notice}</p>}
        {restored && <p className="muted">💾 กู้คืนร่างโค้ดล่าสุดของคุณแล้ว (บันทึกอัตโนมัติในเครื่องนี้)</p>}
      </div>

      {results && (
        <div className="card">
          <div className="summary">
            ผ่าน {passedCount}/{results.length} ข้อ {passedCount === results.length ? "🎉" : ""}
          </div>
          {results.map((r, i) => {
            const t = testById.get(r.test_case_id) ?? resultTests[i];
            const reveal = t && !t.is_hidden;
            return (
              <div key={r.test_case_id} style={{ marginTop: 12 }}>
                <div className="row">
                  <strong>
                    ชุดทดสอบ {i + 1}
                    {t?.is_hidden ? " (ซ่อน)" : ""}
                  </strong>
                  <span className={`badge ${r.status}`}>{statusLabel(r.status)}</span>
                  <span className="muted">{r.runtime_ms} ms</span>
                </div>
                {r.status !== "passed" && reveal && t && (
                  <>
                    <div className="muted">Input</div>
                    <pre>{t.input || "(ว่าง)"}</pre>
                    <div className="muted">ผลที่คาดหวัง</div>
                    <pre>{t.expected_output}</pre>
                    <div className="muted">ผลจากโค้ดของคุณ</div>
                    <pre>{r.actual_output || "(ไม่มี output)"}</pre>
                  </>
                )}
                {r.error_message && <ErrorBox message={r.error_message} />}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function statusLabel(s: ExecutionResult["status"]) {
  return { passed: "ผ่าน", failed: "ไม่ตรง", error: "เกิดข้อผิดพลาด", timeout: "หมดเวลา" }[s];
}

// แสดง error พร้อมคำอธิบายภาษาไทย ถ้าอ่านชนิด error ไม่ออกจะแสดงข้อความดิบเหมือนเดิม
function ErrorBox({ message }: { message: string }) {
  const h = explainPythonError(message);
  if (!h || h.type === "Error") return <pre className="error-text">{message}</pre>;
  return (
    <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca" }}>
      <strong className="error-text">{h.title}</strong>
      {h.line && <span className="muted"> (บรรทัดที่ {h.line})</span>}
      <p style={{ margin: "6px 0" }}>💡 {h.hint}</p>
      <details>
        <summary className="muted">ข้อความ error ดั้งเดิม</summary>
        <pre className="error-text">{message}</pre>
      </details>
    </div>
  );
}
