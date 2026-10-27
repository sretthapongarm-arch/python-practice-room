# 🐍 Python Practice Room

ห้องฝึกโจทย์ Python สำหรับผู้เริ่มต้น นักเรียนเลือกโจทย์ เขียนโค้ด และส่งตรวจได้ทันทีในเบราว์เซอร์ ครูล็อกอินเพื่อดูผลการส่งงานของนักเรียนทั้งห้อง

🌐 **Live Demo:** https://your-project.vercel.app

📋 **เอกสารความต้องการ:** [MVP Requirements](docs/MVP_REQUIREMENTS.md)

---

## ✨ ฟีเจอร์หลัก (MVP)

- เลือกโจทย์และเขียนโค้ด Python ได้ทันที ไม่ต้องสมัครสมาชิก
- กด "ลองรัน" เพื่อทดสอบกับตัวอย่าง และ "ส่งตรวจ" เพื่อตรวจกับชุดทดสอบทั้งหมด
- ตรวจโค้ดในเบราว์เซอร์ด้วย Pyodide (timeout 5 วินาที) ไม่ต้องมีเซิร์ฟเวอร์รันโค้ด
- ชุดทดสอบซ่อน นักเรียนเห็นแค่ ผ่าน หรือ ไม่ผ่าน
- บันทึกการส่งงานและผลรายข้อลงฐานข้อมูล
- ครูล็อกอินดูรายการส่งงาน โค้ด ผลรายข้อ และสรุปต่อโจทย์

## 🛠️ ภาษาและเทคโนโลยีที่ใช้

### ภาษา (Languages)

| ภาษา | ใช้ทำอะไร |
|------|-----------|
| TypeScript / JavaScript | เขียนหน้าเว็บและตรรกะฝั่งผู้ใช้ |
| Python | ภาษาที่นักเรียนเขียนในโจทย์ (ตรวจด้วย Pyodide) |
| SQL | โครงสร้างและการ query ฐานข้อมูล PostgreSQL |
| HTML / CSS | โครงสร้างและหน้าตาเว็บ |

### เทคโนโลยี (Tech Stack)

| ส่วน | เทคโนโลยี | หน้าที่ |
|------|-----------|---------|
| เฟรมเวิร์ก | Next.js 14 | routing, หน้าเว็บ, หน้า `/teacher` |
| UI | React 18 | สร้างส่วนต่อประสานผู้ใช้ |
| ภาษาเขียนโค้ด | TypeScript 5 | ตรวจชนิดข้อมูลตอนพัฒนา |
| ตัวตรวจโค้ด | Pyodide | รัน Python ในเบราว์เซอร์ |
| ฐานข้อมูล | Supabase (PostgreSQL) | เก็บโจทย์ ชุดทดสอบ และผลการส่งงาน |
| ล็อกอินครู | Supabase Auth | ปิดการสมัครสาธารณะ ใช้บัญชีที่ครูสร้างไว้ |
| โฮสต์ | Vercel | Deploy อัตโนมัติจาก GitHub |
| เก็บโค้ด | GitHub | Version control |

## 🧩 สถาปัตยกรรมโดยย่อ

```
นักเรียน ──► Next.js (Vercel) ──► Pyodide (รันในเบราว์เซอร์) ──► ผลตรวจ
                  │
                  └──► Supabase: problems, test_cases, submissions, execution_results
ครู ──► /teacher ──► Supabase Auth ──► ดูผลการส่งงาน
```

ฐานข้อมูลหลัก 4 ตาราง: `problems`, `test_cases`, `submissions`, `execution_results`

## 📁 โครงสร้างโปรเจกต์

```
python-practice-room/
├── docs/
│   └── MVP_REQUIREMENTS.md   # เอกสารความต้องการรุ่น MVP
├── app/ (หรือ pages/)        # หน้าเว็บของ Next.js
├── public/                   # ไฟล์สาธารณะ
├── .env.example              # ตัวอย่างตัวแปรสภาพแวดล้อม
├── package.json
└── README.md
```

> ปรับรายการไฟล์ให้ตรงกับโครงสร้างจริงของ repo

## 🚀 วิธีรันในเครื่อง

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
cp .env.example .env.local
npm run dev
```

เปิด http://localhost:3000

## 🔐 Environment Variables

สร้างไฟล์ `.env.local` แล้วใส่ค่าจากหน้า Settings → API ใน Supabase

| ตัวแปร | ความหมาย |
|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL ของโปรเจกต์ Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

> ห้าม commit ไฟล์ `.env.local` ขึ้น GitHub

## ☁️ การ Deploy

1. Push โค้ดขึ้น GitHub
2. Import repo ใน [Vercel](https://vercel.com)
3. ใส่ Environment Variables ตามตารางด้านบน
4. กด Deploy และทุกครั้งที่ push ระบบจะ deploy ใหม่ให้อัตโนมัติ

**ข้อควรรู้ของแผนฟรี:** Vercel Hobby ห้ามใช้เชิงพาณิชย์ และ Supabase Free จะพักโปรเจกต์ถ้าไม่มีคนใช้ราว 1 สัปดาห์ รายละเอียดดูใน [MVP Requirements](docs/MVP_REQUIREMENTS.md)

## 🗺️ Roadmap

- [x] เลือกโจทย์ ลองรัน และส่งตรวจด้วย Pyodide
- [x] ชุดทดสอบซ่อน
- [x] บันทึกผลลงฐานข้อมูล
- [x] หน้าครูดูผลการส่งงาน
- [ ] หน้าสร้างและแก้โจทย์สำหรับครู
- [ ] รหัสห้อง และกรองผลตามห้อง
- [ ] Export ผลเป็น CSV
- [ ] ชุดโจทย์ตั้งต้นภาษาไทย 15-20 ข้อ
- [ ] จำกัดจำนวนการส่งต่อนาที
- [ ] ตรวจฝั่งเซิร์ฟเวอร์ (ถ้าต้องใช้ให้คะแนนจริง)

## 📄 License

ยังไม่ระบุ เพิ่มไฟล์ `LICENSE` ก่อนเผยแพร่
