"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type P = {
  id: string;
  title: string;
  description: string | null;
  starter_code: string | null;
  difficulty: string;
  is_published: boolean;
};
type TestRow = { id?: string; input: string; expected_output: string; is_hidden: boolean };
type Draft = {
  id?: string;
  title: string;
  description: string;
  starter_code: string;
  difficulty: string;
  is_published: boolean;
  tests: TestRow[];
  origTestIds: string[];
};

const DIFF_LABEL: Record<string, string> = { easy: "ง่าย", medium: "ปานกลาง", hard: "ยาก" };
const blankTest = (): TestRow => ({ input: "", expected_output: "", is_hidden: false });
const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);

export default function TeacherProblemsPage() {
  const [auth, setAuth] = useState<"loading" | "denied" | "ok">("loading");
  const [problems, setProblems] = useState<P[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("problems")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) setMsg("โหลดโจทย์ไม่สำเร็จ: " + error.message);
    else setProblems((data ?? []) as P[]);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        if (data.session?.user.app_metadata?.role !== "teacher") return setAuth("denied");
        setAuth("ok");
        await load();
      } catch {
        setAuth("denied");
      }
    })();
  }, [load]);

  function startNew() {
    setMsg("");
    setDraft({
      title: "",
      description: "",
      starter_code: "",
      difficulty: "easy",
      is_published: false,
      tests: [blankTest()],
      origTestIds: [],
    });
  }

  async function startEdit(p: P) {
    setMsg("");
    const { data, error } = await getSupabase()
      .from("test_cases")
      .select("*")
      .eq("problem_id", p.id)
      .order("position");
    if (error) return setMsg("โหลดชุดทดสอบไม่สำเร็จ: " + error.message);
    const tests = ((data ?? []) as { id: string; input: string; expected_output: string; is_hidden: boolean }[]).map(
      (t) => ({
        id: t.id,
        input: t.input ?? "",
        expected_output: t.expected_output ?? "",
        is_hidden: !!t.is_hidden,
      })
    );
    setDraft({
      id: p.id,
      title: p.title,
      description: p.description ?? "",
      starter_code: p.starter_code ?? "",
      difficulty: p.difficulty,
      is_published: !!p.is_published,
      tests,
      origTestIds: tests.map((t) => t.id as string),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function togglePublish(p: P) {
    setMsg("");
    const { data, error } = await getSupabase()
      .from("problems")
      .update({ is_published: !p.is_published })
      .eq("id", p.id)
      .select("id");
    if (error) return setMsg("เปลี่ยนสถานะไม่สำเร็จ: " + error.message);
    if (!data || data.length === 0)
      return setMsg("ไม่มีสิทธิ์แก้ไข (ตรวจว่ารัน teacher_write_policies.sql แล้ว)");
    setProblems((list) => list.map((x) => (x.id === p.id ? { ...x, is_published: !p.is_published } : x)));
  }

  function patchDraft(patch: Partial<Draft>) {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  }
  function patchTest(i: number, patch: Partial<TestRow>) {
    setDraft((d) => (d ? { ...d, tests: d.tests.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) } : d));
  }
  function removeTest(i: number) {
    if (!draft) return;
    const t = draft.tests[i];
    if (t.id && !window.confirm("ลบชุดทดสอบนี้? (ถ้ามีประวัติผลตรวจอ้างอิงอยู่ ระบบอาจไม่ให้ลบ)")) return;
    patchDraft({ tests: draft.tests.filter((_, idx) => idx !== i) });
  }

  async function save() {
    if (!draft) return;
    const d = draft;
    if (!d.title.trim()) return setMsg("กรุณาใส่ชื่อโจทย์");
    if (d.tests.length === 0) return setMsg("ต้องมีชุดทดสอบอย่างน้อย 1 ชุด");
    if (d.tests.some((t) => t.expected_output.trim() === ""))
      return setMsg("ทุกชุดทดสอบต้องมี “ผลที่คาดหวัง”");

    setBusy(true);
    setMsg("");
    try {
      const sb = getSupabase();
      const fields = {
        title: d.title.trim(),
        description: d.description,
        starter_code: d.starter_code,
        difficulty: d.difficulty,
        is_published: d.is_published,
      };

      let pid = d.id;
      if (pid) {
        const r = await sb.from("problems").update(fields).eq("id", pid).select("id");
        if (r.error) throw r.error;
        if (!r.data || r.data.length === 0)
          throw new Error("ไม่มีสิทธิ์แก้ไขโจทย์ (ตรวจว่ารัน teacher_write_policies.sql แล้ว)");
      } else {
        // โจทย์ใหม่: สร้างแบบซ่อนไว้ก่อน เผยแพร่เมื่อบันทึกชุดทดสอบสำเร็จ
        const r = await sb
          .from("problems")
          .insert({ ...fields, is_published: false })
          .select("id")
          .single();
        if (r.error) throw r.error;
        pid = (r.data as { id: string }).id;
      }

      for (let i = 0; i < d.tests.length; i++) {
        const t = d.tests[i];
        const row = { input: t.input, expected_output: t.expected_output, is_hidden: t.is_hidden, position: i + 1 };
        if (t.id) {
          const r = await sb.from("test_cases").update(row).eq("id", t.id).select("id");
          if (r.error) throw r.error;
          if (!r.data || r.data.length === 0) throw new Error("ไม่มีสิทธิ์แก้ชุดทดสอบ (ตรวจนโยบาย RLS)");
        } else {
          const r = await sb.from("test_cases").insert({ ...row, problem_id: pid }).select("id");
          if (r.error) throw r.error;
        }
      }

      const keep = new Set(d.tests.map((t) => t.id).filter(Boolean) as string[]);
      const removed = d.origTestIds.filter((id) => !keep.has(id));
      if (removed.length) {
        const r = await sb.from("test_cases").delete().in("id", removed);
        if (r.error)
          throw new Error("ลบชุดทดสอบเดิมไม่สำเร็จ (อาจมีประวัติผลตรวจอ้างอิงอยู่): " + r.error.message);
      }

      if (!d.id && d.is_published) {
        const r = await sb.from("problems").update({ is_published: true }).eq("id", pid as string);
        if (r.error) throw r.error;
      }

      setDraft(null);
      await load();
      setMsg("บันทึกแล้ว ✓");
    } catch (e) {
      setMsg("บันทึกไม่สำเร็จ: " + errMsg(e));
    } finally {
      setBusy(false);
    }
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
      <div className="row spread">
        <h1>จัดการโจทย์</h1>
        <div className="row">
          <a href="/teacher">← กลับหน้าครู</a>
          <button onClick={startNew} disabled={busy}>
            + เพิ่มโจทย์ใหม่
          </button>
        </div>
      </div>

      {msg && <p className={msg.includes("ไม่") ? "error-text" : "muted"}>{msg}</p>}

      {draft && (
        <div className="card">
          <h2>{draft.id ? "แก้ไขโจทย์" : "เพิ่มโจทย์ใหม่"}</h2>

          <label className="muted">ชื่อโจทย์</label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => patchDraft({ title: e.target.value })}
            style={{ width: "100%" }}
          />

          <label className="muted">คำอธิบายโจทย์</label>
          <textarea
            rows={6}
            value={draft.description}
            onChange={(e) => patchDraft({ description: e.target.value })}
            style={{ width: "100%" }}
          />

          <label className="muted">โค้ดเริ่มต้น (ที่นักเรียนเห็นในช่องเขียนโค้ด)</label>
          <textarea
            className="code"
            rows={6}
            spellCheck={false}
            value={draft.starter_code}
            onChange={(e) => patchDraft({ starter_code: e.target.value })}
          />

          <div className="row" style={{ marginTop: 8 }}>
            <label className="muted">ระดับ</label>
            <select value={draft.difficulty} onChange={(e) => patchDraft({ difficulty: e.target.value })}>
              <option value="easy">ง่าย</option>
              <option value="medium">ปานกลาง</option>
            </select>
            <label>
              <input
                type="checkbox"
                checked={draft.is_published}
                onChange={(e) => patchDraft({ is_published: e.target.checked })}
              />{" "}
              เผยแพร่ให้นักเรียนเห็น
            </label>
          </div>

          <h3 style={{ marginTop: 16 }}>ชุดทดสอบ</h3>
          <p className="muted">
            Input คือข้อความที่ป้อนให้ input() (หลายบรรทัดได้) ส่วนผลที่คาดหวังคือสิ่งที่ print() ออกมา
            ชุดที่ติ๊ก “ซ่อน” นักเรียนจะไม่เห็น Input/ผลที่คาดหวังเมื่อทำไม่ผ่าน
          </p>

          {draft.tests.map((t, i) => (
            <div key={t.id ?? `new-${i}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginTop: 8 }}>
              <div className="row spread">
                <strong>ชุดที่ {i + 1}</strong>
                <div className="row">
                  <label>
                    <input
                      type="checkbox"
                      checked={t.is_hidden}
                      onChange={(e) => patchTest(i, { is_hidden: e.target.checked })}
                    />{" "}
                    ซ่อน
                  </label>
                  <button className="secondary" onClick={() => removeTest(i)}>
                    ลบ
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div className="muted">Input</div>
                  <textarea
                    className="code"
                    rows={3}
                    spellCheck={false}
                    value={t.input}
                    onChange={(e) => patchTest(i, { input: e.target.value })}
                  />
                </div>
                <div>
                  <div className="muted">ผลที่คาดหวัง</div>
                  <textarea
                    className="code"
                    rows={3}
                    spellCheck={false}
                    value={t.expected_output}
                    onChange={(e) => patchTest(i, { expected_output: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="row" style={{ marginTop: 12 }}>
            <button className="secondary" onClick={() => patchDraft({ tests: [...draft.tests, blankTest()] })}>
              + เพิ่มชุดทดสอบ
            </button>
            <button onClick={save} disabled={busy}>
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button className="secondary" onClick={() => setDraft(null)} disabled={busy}>
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {problems.length === 0 && <p className="muted">ยังไม่มีโจทย์</p>}
      {problems.map((p) => (
        <div key={p.id} className="card row spread">
          <div>
            <strong>{p.title}</strong>{" "}
            <span className={`badge ${p.difficulty}`}>{DIFF_LABEL[p.difficulty] ?? p.difficulty}</span>{" "}
            {!p.is_published && <span className="muted">(ซ่อนอยู่)</span>}
          </div>
          <div className="row">
            <button className="secondary" onClick={() => togglePublish(p)}>
              {p.is_published ? "ซ่อน" : "เผยแพร่"}
            </button>
            <button className="secondary" onClick={() => startEdit(p)}>
              แก้ไข
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
