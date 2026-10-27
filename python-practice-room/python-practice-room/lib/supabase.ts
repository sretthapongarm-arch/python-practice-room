import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** สร้าง client แบบ lazy เพื่อไม่ให้ build พังเมื่อยังไม่ได้ตั้งค่า env */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (ดู .env.example)"
    );
  }
  client = createClient(url, key);
  return client;
}
