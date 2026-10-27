/* Web Worker: รันโค้ด Python ของนักเรียนด้วย Pyodide (ทำงานในเบราว์เซอร์ ไม่ต้องมีเซิร์ฟเวอร์) */
importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

const PY_HELPER = `
import sys, io, traceback

def _run_student(code, inp):
    old_in, old_out, old_err = sys.stdin, sys.stdout, sys.stderr
    out, err = io.StringIO(), io.StringIO()
    sys.stdin = io.StringIO(inp)
    sys.stdout = out
    sys.stderr = err
    status = "ok"
    try:
        exec(compile(code, "<student>", "exec"), {"__name__": "__main__"})
    except SystemExit:
        pass
    except BaseException:
        status = "error"
        try:
            etype, evalue, tb = sys.exc_info()
            # แสดงเฉพาะส่วนที่เกี่ยวกับโค้ดนักเรียน
            frames = [f for f in traceback.extract_tb(tb) if f.filename == "<student>"]
            lines = ["Traceback (most recent call last):"]
            for f in frames:
                lines.append('  line %d, in %s' % (f.lineno, f.name))
                if f.line:
                    lines.append("    " + f.line)
            lines.append("".join(traceback.format_exception_only(etype, evalue)).strip())
            err.write("\\n".join(lines))
        except BaseException:
            err.write(str(sys.exc_info()[1]))
    finally:
        sys.stdin, sys.stdout, sys.stderr = old_in, old_out, old_err
    return [status, out.getvalue(), err.getvalue()]
`;

const ready = (async () => {
  const pyodide = await loadPyodide();
  pyodide.runPython(PY_HELPER);
  return pyodide;
})();

ready
  .then(() => self.postMessage({ type: "ready" }))
  .catch((e) => self.postMessage({ type: "init-error", message: String(e) }));

self.onmessage = async (event) => {
  const { id, code, input } = event.data;
  const pyodide = await ready;
  const start = performance.now();
  try {
    const fn = pyodide.globals.get("_run_student");
    const proxy = fn(code, input);
    const [status, stdout, stderr] = proxy.toJs();
    proxy.destroy();
    fn.destroy();
    self.postMessage({
      type: "result",
      id,
      status,
      stdout,
      stderr,
      runtimeMs: Math.round(performance.now() - start),
    });
  } catch (e) {
    self.postMessage({
      type: "result",
      id,
      status: "error",
      stdout: "",
      stderr: String(e),
      runtimeMs: Math.round(performance.now() - start),
    });
  }
};
