// อธิบาย error ของ Python เป็นภาษาไทยสำหรับนักเรียน
// ใช้: const h = explainPythonError(stderrText);

export type ErrorHint = {
  type: string;      // เช่น "NameError"
  line: number | null; // บรรทัดที่เกิดปัญหา (ถ้าหาได้)
  title: string;     // สรุปสั้น ๆ
  hint: string;      // คำแนะนำวิธีแก้
  raw: string;       // บรรทัด error ดั้งเดิม
};

export function explainPythonError(stderr: string): ErrorHint | null {
  const text = (stderr || "").trim();
  if (!text) return null;

  const lines = text.split("\n").map((l) => l.trimEnd()).filter(Boolean);
  const raw = lines[lines.length - 1];

  // บรรทัดสุดท้ายรูปแบบ "ErrorType: message"
  const m = raw.match(/^([A-Za-z_.]*(?:Error|Exception|Interrupt|Exit)):?\s*(.*)$/);
  const type = m ? m[1].split(".").pop()! : "Error";
  const msg = m ? m[2] : raw;

  // หาเลขบรรทัดของโค้ดนักเรียน (เอาตัวสุดท้ายที่เจอ)
  let line: number | null = null;
  for (const l of lines) {
    const lm = l.match(/line (\d+)/);
    if (lm) line = parseInt(lm[1], 10);
  }

  const q = (s: string) => `“${s}”`;
  let title = `เกิดข้อผิดพลาดชนิด ${type}`;
  let hint = "ลองอ่านข้อความ error บรรทัดสุดท้าย แล้วตรวจโค้ดตามบรรทัดที่บอก";

  switch (type) {
    case "SyntaxError": {
      title = "เขียนโค้ดผิดหลักไวยากรณ์";
      hint = "ตรวจว่าลืมปิดวงเล็บ ( ) หรือเครื่องหมายคำพูด \" \" ลืมเครื่องหมาย : หลัง if / for / while / def หรือสะกดคำสั่งผิดหรือไม่";
      if (/expected ':'/.test(msg)) hint = "ลืมใส่เครื่องหมาย : ท้ายบรรทัด if / for / while / def";
      else if (/unterminated string|EOL while scanning/.test(msg)) hint = "เครื่องหมายคำพูดเปิดแล้วแต่ไม่ได้ปิด";
      else if (/was never closed|unmatched|unexpected EOF/.test(msg)) hint = "วงเล็บเปิดกับปิดไม่ครบคู่ ตรวจ ( ) [ ] { }";
      break;
    }
    case "IndentationError":
    case "TabError": {
      title = "การย่อหน้า (เว้นวรรคหน้าบรรทัด) ไม่ถูกต้อง";
      hint = "โค้ดที่อยู่ใต้ if / for / while / def ต้องย่อหน้าเข้าไป (ปกติ 4 ช่องว่าง) และบรรทัดในบล็อกเดียวกันต้องย่อหน้าเท่ากัน อย่าใช้ Tab ปนกับเว้นวรรค";
      break;
    }
    case "NameError": {
      const n = msg.match(/name '(.+?)' is not defined/);
      title = n ? `ยังไม่ได้สร้างตัวแปรหรือฟังก์ชันชื่อ ${q(n[1])}` : "ใช้ชื่อที่ยังไม่ได้กำหนด";
      hint = "ตรวจว่าสะกดชื่อตัวแปรถูกต้อง (ตัวพิมพ์เล็ก/ใหญ่ต่างกัน) และกำหนดค่าตัวแปรก่อนนำไปใช้ ถ้าเป็นข้อความต้องใส่เครื่องหมายคำพูด";
      break;
    }
    case "TypeError": {
      title = "ใช้ข้อมูลผิดชนิดกับการดำเนินการนั้น";
      hint = "เช่น นำข้อความ (str) ไปบวกกับตัวเลข (int) ให้แปลงชนิดก่อนด้วย int() หรือ str() และจำไว้ว่า input() ให้ค่าเป็นข้อความเสมอ";
      if (/can only concatenate str/.test(msg) || /unsupported operand/.test(msg))
        hint = "กำลังบวก/คำนวณข้อมูลต่างชนิดกัน เช่น ข้อความกับตัวเลข ใช้ int(...) หรือ str(...) แปลงให้ชนิดเดียวกันก่อน";
      else if (/not callable/.test(msg))
        hint = "นำตัวแปรไปเรียกเหมือนฟังก์ชัน เช่น x(...) ตรวจว่าตั้งชื่อตัวแปรซ้ำกับชื่อฟังก์ชันหรือไม่ (เช่น ตั้งตัวแปรชื่อ print หรือ sum)";
      else if (/missing \d+ required positional argument|takes \d+ positional argument/.test(msg))
        hint = "ส่งค่าเข้าฟังก์ชันไม่ครบหรือเกินจำนวนที่กำหนด";
      break;
    }
    case "ValueError": {
      title = "ค่าที่ให้มาไม่เหมาะกับการใช้งาน";
      hint = "เช่น ใช้ int() กับข้อความที่ไม่ใช่ตัวเลข ตรวจว่าข้อมูลที่รับเข้ามาตรงกับที่คาดไว้";
      break;
    }
    case "ZeroDivisionError": {
      title = "หารด้วยศูนย์";
      hint = "ตัวหารมีค่าเป็น 0 ลองใช้ if ตรวจก่อนว่าตัวหารไม่ใช่ 0";
      break;
    }
    case "IndexError": {
      title = "เรียกตำแหน่งในลิสต์/สตริงที่ไม่มีอยู่";
      hint = "ตำแหน่ง (index) เริ่มที่ 0 และตำแหน่งสุดท้ายคือ len(ลิสต์) - 1 ตรวจว่าไม่ได้เรียกเกินขนาด";
      break;
    }
    case "KeyError": {
      title = `ไม่พบคีย์ ${q(msg)} ในดิกชันนารี`;
      hint = "ตรวจการสะกดคีย์ หรือใช้ .get(คีย์) แทนเพื่อไม่ให้เกิด error";
      break;
    }
    case "AttributeError": {
      title = "เรียกเมธอดหรือคุณสมบัติที่วัตถุนั้นไม่มี";
      hint = "ตรวจว่าสะกดชื่อเมธอดถูก และชนิดข้อมูลรองรับเมธอดนั้น เช่น .append() ใช้กับลิสต์ ไม่ใช่กับสตริง";
      break;
    }
    case "ModuleNotFoundError":
    case "ImportError": {
      title = "ไม่พบไลบรารีที่ต้องการ import";
      hint = "ตรวจการสะกดชื่อโมดูล ไลบรารีบางตัวอาจยังไม่รองรับบนเว็บนี้ ให้ใช้ไลบรารีมาตรฐาน เช่น math, random";
      break;
    }
    case "FileNotFoundError": {
      title = "ไม่พบไฟล์";
      hint = "โจทย์บนเว็บนี้ไม่ได้มีไฟล์ให้เปิด ให้รับข้อมูลด้วย input() แทน";
      break;
    }
    case "EOFError": {
      title = "โปรแกรมรออ่านข้อมูลจาก input() แต่ไม่มีข้อมูลให้";
      hint = "ตรวจว่าจำนวนครั้งที่เรียก input() ไม่มากกว่าจำนวนข้อมูลที่โจทย์ให้มา";
      break;
    }
    case "RecursionError": {
      title = "ฟังก์ชันเรียกตัวเองลึกเกินไป";
      hint = "ฟังก์ชันแบบเรียกตัวเอง (recursion) ต้องมีเงื่อนไขหยุด ตรวจว่าเงื่อนไขหยุดทำงานถูกต้อง";
      break;
    }
    case "TimeoutError":
    case "KeyboardInterrupt": {
      title = "โปรแกรมทำงานนานเกินไป";
      hint = "อาจเกิดลูปไม่รู้จบ เช่น while True ที่ไม่มี break หรือตัวแปรในเงื่อนไขไม่เปลี่ยนค่า";
      break;
    }
    case "UnboundLocalError": {
      title = "ใช้ตัวแปรในฟังก์ชันก่อนกำหนดค่า";
      hint = "ตัวแปรที่ถูกกำหนดค่าภายในฟังก์ชันเป็นตัวแปรเฉพาะฟังก์ชัน ต้องกำหนดค่าก่อนใช้ หรือส่งเข้าฟังก์ชันผ่านพารามิเตอร์";
      break;
    }
  }

  return { type, line, title, hint, raw };
}
