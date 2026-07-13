-- ==========================================
-- skills 테이블 읽기 권한 허용
-- 일부 Supabase 환경에서 RLS가 기본 활성화되어 
-- 익명 유저(anon)의 SELECT가 차단되는 현상 해결
-- ==========================================

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'skills' 
        AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users"
        ON public.skills FOR SELECT
        USING (true);
    END IF;
END
$$;
