"use client";
 
import { useCallback, useEffect, useRef, useState } from "react";
 
/**
 * เก็บร่างโค้ดไว้ในเบราว์เซอร์อัตโนมัติ (localStorage) กันโค้ดหายเมื่อปิดแท็บ
 *
 * key ควรแยกตามผู้ใช้และโจทย์ เช่น `draft:${userId}:${problemId}`
 * ใช้: const [code, setCode, clearDraft, restored] = useDraft(key, starterCode);
 */
export function useDraft(key: string, initial: string, delayMs = 600) {
  const [code, setCode] = useState(initial);
  const [restored, setRestored] = useState(false); // true = โหลดร่างเก่ากลับมา
  const loadedKey = useRef<string | null>(null);
 
  // โหลดร่างเมื่อเปลี่ยนโจทย์/ผู้ใช้ (ทำใน useEffect เพื่อไม่ให้ SSR ไม่ตรงกัน)
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(key);
    } catch {}
    if (saved !== null && saved !== "" && saved !== initial) {
      setCode(saved);
      setRestored(true);
    } else {
      setCode(initial);
      setRestored(false);
    }
    loadedKey.current = key;
  }, [key, initial]);
 
  // บันทึกหลังหยุดพิมพ์ครู่หนึ่ง
  useEffect(() => {
    if (loadedKey.current !== key) return; // ยังโหลดร่างเก่าไม่เสร็จ ห้ามเขียนทับ
    const t = setTimeout(() => {
      try {
        // ถ้าโค้ดเท่ากับโค้ดเริ่มต้น ไม่ต้องเก็บ (กันเก็บค่าว่างตอนโจทย์ยังโหลดไม่เสร็จ)
        if (code === initial || code === "") window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, code);
      } catch {}
    }, delayMs);
    return () => clearTimeout(t);
  }, [code, key, initial, delayMs]);
 
  // เรียกหลังส่งโจทย์สำเร็จ หรือเมื่อต้องการล้างร่าง
  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    setRestored(false);
  }, [key]);
 
  return [code, setCode, clearDraft, restored] as const;
}
