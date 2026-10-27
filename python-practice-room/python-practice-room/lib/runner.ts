import type { ExecutionResult, TestCase } from "./types";

const PER_TEST_TIMEOUT_MS = 5000;

/** เทียบ output แบบไม่สนช่องว่างท้ายบรรทัดและบรรทัดว่างท้ายสุด */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

type WorkerResult = {
  type: "result";
  id: number;
  status: "ok" | "error";
  stdout: string;
  stderr: string;
  runtimeMs: number;
};

/**
 * ตัวรันโค้ด Python ในเบราว์เซอร์ผ่าน Pyodide (Web Worker)
 * - โหลด Pyodide ครั้งแรกใช้เวลาไม่กี่วินาที
 * - ถ้าโค้ดวนลูปไม่จบ จะ terminate worker แล้วสร้างใหม่
 */
export class PythonRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private nextId = 1;

  private start(): Promise<void> {
    this.worker = new Worker("/pyodide-worker.js");
    const w = this.worker;
    this.ready = new Promise<void>((resolve, reject) => {
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === "ready") {
          w.removeEventListener("message", onMsg);
          resolve();
        } else if (e.data?.type === "init-error") {
          w.removeEventListener("message", onMsg);
          reject(new Error("โหลด Pyodide ไม่สำเร็จ: " + e.data.message));
        }
      };
      w.addEventListener("message", onMsg);
      w.addEventListener("error", () => reject(new Error("เริ่ม worker ไม่สำเร็จ")), { once: true });
    });
    return this.ready;
  }

  /** เรียกล่วงหน้าเพื่อโหลด Pyodide ระหว่างที่นักเรียนอ่านโจทย์ */
  warmUp(): Promise<void> {
    return this.ready ?? this.start();
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }

  private async runOne(code: string, input: string): Promise<WorkerResult | "timeout"> {
    await this.warmUp();
    const w = this.worker!;
    const id = this.nextId++;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        w.removeEventListener("message", onMsg);
        this.dispose(); // บังคับหยุดโค้ดที่วนไม่จบ
        resolve("timeout");
      }, PER_TEST_TIMEOUT_MS);
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === "result" && e.data.id === id) {
          clearTimeout(timer);
          w.removeEventListener("message", onMsg);
          resolve(e.data as WorkerResult);
        }
      };
      w.addEventListener("message", onMsg);
      w.postMessage({ id, code, input });
    });
  }

  async runTests(
    code: string,
    tests: TestCase[],
    onProgress?: (done: number, total: number) => void
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    for (let i = 0; i < tests.length; i++) {
      const t = tests[i];
      const r = await this.runOne(code, t.input);
      if (r === "timeout") {
        results.push({
          test_case_id: t.id,
          status: "timeout",
          actual_output: "",
          error_message: `ใช้เวลาเกิน ${PER_TEST_TIMEOUT_MS / 1000} วินาที (อาจมีลูปที่ไม่จบ)`,
          runtime_ms: PER_TEST_TIMEOUT_MS,
        });
      } else if (r.status === "error") {
        results.push({
          test_case_id: t.id,
          status: "error",
          actual_output: r.stdout,
          error_message: r.stderr,
          runtime_ms: r.runtimeMs,
        });
      } else {
        const ok = normalizeOutput(r.stdout) === normalizeOutput(t.expected_output);
        results.push({
          test_case_id: t.id,
          status: ok ? "passed" : "failed",
          actual_output: r.stdout,
          error_message: "",
          runtime_ms: r.runtimeMs,
        });
      }
      onProgress?.(i + 1, tests.length);
    }
    return results;
  }
}
