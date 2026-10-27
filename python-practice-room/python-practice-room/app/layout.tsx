import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import NavAuth from "@/components/NavAuth";

export const metadata: Metadata = {
  title: "Python Practice Room",
  description: "ห้องฝึกโจทย์ Python ระดับต้น ส่งโค้ดแล้วตรวจด้วยชุดทดสอบอัตโนมัติ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <header className="top">
          <div className="wrap">
            <strong>
              <Link href="/">🐍 Python Practice Room</Link>
            </strong>
            <nav>
              <Link href="/">โจทย์</Link>
              <Link href="/teacher">สำหรับครู</Link>
              <NavAuth />
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
