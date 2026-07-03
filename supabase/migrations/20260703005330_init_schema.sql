-- ==========================================
-- Zarami(자람이) MVP 데이터베이스 스키마
-- DBMS: PostgreSQL (Supabase)
-- ==========================================

-- ------------------------------------------
-- 1. `skills` 테이블 (마스터 기술 노드)
-- ------------------------------------------
CREATE TABLE public.skills (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  parent_id VARCHAR(50) REFERENCES public.skills(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL,
  trend_score VARCHAR(10) DEFAULT 'Low',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 하위 노드 탐색 성능 최적화
CREATE INDEX idx_skills_parent_id ON public.skills(parent_id);

-- ------------------------------------------
-- 2. `user_skills` 테이블 (유저별 학습 및 보유 상태)
-- ------------------------------------------
CREATE TABLE public.user_skills (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id VARCHAR(50) REFERENCES public.skills(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

-- 인덱스: 특정 유저의 마스터(완료) 기술 조회 최적화
CREATE INDEX idx_user_skills_composite ON public.user_skills(user_id, is_completed);

-- ------------------------------------------
-- 3. `quests` 테이블 (기술 노드별 실무 미션 캐싱)
-- ------------------------------------------
CREATE TABLE public.quests (
  id BIGSERIAL PRIMARY KEY,
  skill_id VARCHAR(50) REFERENCES public.skills(id) ON DELETE CASCADE UNIQUE,
  mission_title VARCHAR(255) NOT NULL,
  checklists JSONB NOT NULL,
  reference_urls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- [알고리즘] 기술 스킵(Skip) 및 하위 트리 연쇄 완료 쿼리
-- ==========================================
-- * 온보딩 시 유저가 특정 스택(예: 'react')을 마스터했다고 선택했을 때,
--   역방향으로 선행되어야 하는 기초 스킬 트리 전체를 추적하는 재귀 쿼리 (CTE)

WITH RECURSIVE skill_ancestors AS (
  -- 1) Anchor: 시작점 (유저가 선택한 기술)
  SELECT id, parent_id 
  FROM public.skills 
  WHERE id = 'react' 
  
  UNION ALL
  
  -- 2) Recursive: 시작 기술의 부모(선행) 기술을 연쇄적으로 역방향 추적
  SELECT s.id, s.parent_id 
  FROM public.skills s
  INNER JOIN skill_ancestors sa ON s.id = sa.parent_id
)
SELECT id FROM skill_ancestors;
