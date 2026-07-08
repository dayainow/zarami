-- ==========================================
-- [KAN-7] 개인화된 스킬 트리 저장소
-- '내 트리 관리' 화면(ManageTreeClient)에서 편집한 노드/엣지를
-- 계정별로 저장하기 위한 테이블. React Flow의 nodes/edges 배열을
-- 그대로 JSONB로 보관하는 단일 문서 저장 방식(옵션 A와 동일한 MVP 전략).
-- ==========================================

CREATE TABLE public.user_trees (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_trees_select_own"
  ON public.user_trees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_trees_upsert_own"
  ON public.user_trees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_trees_update_own"
  ON public.user_trees FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
