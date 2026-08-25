-- =========================================================
-- MoodWall - Realtime Anonymous Confession Wall Database Schema
-- รันโค้ดทั้งหมดนี้ในปุ่มเดียวที่ SQL Editor ของ Supabase
-- =========================================================

-- 1. สร้างตาราง posts สำหรับเก็บข้อความอารมณ์/ระบาย
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  mood TEXT NOT NULL DEFAULT 'happy',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. เปิดใช้งาน Row Level Security (RLS) เพื่อความปลอดภัย
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 3. ตั้งค่า Policy ให้อ่าน เขียน อัปเดต และลบได้ (สำหรับใช้งานทั่วไปและระบบหลังบ้าน)
DROP POLICY IF EXISTS "Allow public read access" ON public.posts;
CREATE POLICY "Allow public read access" 
  ON public.posts 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Allow public insert access" ON public.posts;
CREATE POLICY "Allow public insert access" 
  ON public.posts 
  FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update likes" ON public.posts;
DROP POLICY IF EXISTS "Allow public update access" ON public.posts;
CREATE POLICY "Allow public update access" 
  ON public.posts 
  FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Allow public delete access" ON public.posts;
CREATE POLICY "Allow public delete access" 
  ON public.posts 
  FOR DELETE 
  USING (true);

-- 4. ตั้งค่า REPLICA IDENTITY FULL เพื่อให้ Realtime ส่งข้อมูลแถวที่ถูกลบ (DELETE) ครบถ้วน
ALTER TABLE public.posts REPLICA IDENTITY FULL;

-- 5. ★★★ เปิดใช้งาน Realtime ให้ตาราง posts ทันทีด้วยคำสั่ง SQL ★★★
-- (คำสั่งนี้แทนการไปเปิดในหน้าเมนู Replication ได้เลย 100%)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;
END $$;
