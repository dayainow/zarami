-- ==========================================
-- 채용 공고 출처별 트렌드 근거 저장
-- 지금까지 update-trend.ts는 원티드+점핏 공고를 한 텍스트로 합쳐 분석해
-- High/Medium/Low 하나만 남기고 "어느 사이트에서 몇 건 언급됐는지"는
-- 버려졌음. "왜 이 스킬을 배워야 하는지" 화면에 실제 근거로 보여주기
-- 위해 사이트별 언급 건수와 분석 시점을 skills 테이블에 추가로 저장.
-- ==========================================

ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS wanted_mentions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jumpit_mentions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_postings_analyzed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trend_updated_at TIMESTAMPTZ;
