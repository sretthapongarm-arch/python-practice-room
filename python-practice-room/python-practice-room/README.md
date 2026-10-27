# Python Practice Room (MVP)

ห้องฝึกโจทย์ Python ระดับต้น: ครูเตรียมโจทย์ + ชุดทดสอบ → นักเรียนส่งโค้ด → ระบบรันและตรวจอัตโนมัติ → ครูดูผลการส่งงาน

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Database/Auth:** Supabase (`problems`, `test_cases`, `submissions`, `execution_results`)
- **ตัวรันโค้ด:** Pyodide (Python ใน WebAssembly) ทำงานใน Web Worker บนเบราว์เซอร์ของนักเรียน
- **Deploy:** GitHub → Vercel

## เริ่มใช้งาน

1. **Supabase** — สร้างโปรเจกต์ → SQL Editor → วางไฟล์ `supabase/schema.sql` แล้ว Run (มีโจทย์ตัวอย่าง 3 ข้อ)
2. **ครู** — Authentication → Users → Add user (อีเมล+รหัสผ่าน) แล้ว **ปิด "Allow new users to sign up"** ใน Authentication → Sign In / Providers (ไม่เช่นนั้นใครก็สมัครเป็น "ครู" ได้)
3. **Env** — คัดลอก `.env.example` เป็น `.env.local` ใส่ URL และ anon key
4. รันในเครื่อง: `npm install && npm run dev` → http://localhost:3000
5. **GitHub → Vercel** — push ขึ้น GitHub, Import project ใน Vercel, ตั้ง Environment Variables สองตัวเดียวกัน, Deploy

## เพิ่มโจทย์

ใช้ Supabase Table Editor (หรือ SQL) เพิ่มแถวใน `problems` และ `test_cases`
- `input` = ข้อความที่ป้อนผ่าน `input()` (หลายบรรทัดได้)
- `expected_output` = สิ่งที่ต้อง `print` ออกมา (ไม่สนช่องว่างท้ายบรรทัด)
- `is_hidden = true` = ชุดทดสอบซ่อน (นักเรียนเห็นแค่ผ่าน/ไม่ผ่าน)

## ข้อจำกัดที่ต้องรู้ก่อนเอาไปขาย

1. **ตรวจฝั่งเบราว์เซอร์ = ไม่เหมาะกับการสอบ/ให้คะแนนจริง** นักเรียนที่เก่งสามารถแก้ผลที่ส่งเข้า DB หรือเปิดดู hidden test จาก Network tab ได้ เหมาะกับ "ห้องฝึก" ที่ไม่ใช่การให้เกรด
   ทางอัพเกรด: ย้ายการรันไปที่ worker ฝั่งเซิร์ฟเวอร์ (Judge0/Piston หรือ Docker เอง) แล้วให้เซิร์ฟเวอร์เป็นคนเขียน `execution_results`
2. **ไม่มีระบบบัญชีนักเรียน** ใช้แค่ชื่อที่กรอกเอง (เก็บใน localStorage) ถ้าลูกค้าต้องการผูกกับรายชื่อห้อง ให้เพิ่ม Supabase Auth สำหรับนักเรียน + ตาราง classes/enrollments
3. **RLS เปิดให้ anon insert submissions ได้** ควรเพิ่ม rate limit (เช่น Vercel/Cloudflare) ก่อนเปิดใช้งานจริง
4. Pyodide โหลดจาก CDN (jsDelivr) ครั้งแรก ~10 MB ต้องมีอินเทอร์เน็ต; รองรับเฉพาะ stdin/stdout และ standard library

## ไอเดียส่วนที่ต่อยอดเป็นจุดขาย

โจทย์ภาษาไทย, รายงานรายห้องให้ครู export CSV, ชุดโจทย์ตามหลักสูตร (ม.ปลาย/ปี 1), ติดตั้งและดูแลให้โรงเรียน
