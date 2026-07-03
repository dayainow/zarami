# 🛠️ Claude Code × Jira 연동 가이드 및 워크플로우

> **AI 페어 프로그래밍(Claude Code)**으로 Jira 이슈를 자동 생성하고, GitHub과 매끄럽게 연결하는 자동화 워크플로우 규칙입니다.

## 📌 1. 전체 워크플로우 흐름

1. 기획서 `.md` 작성 ➡️ Claude Code 프롬프트 실행
2. `CLAUDE.md` 및 `agent/` 폴더 내 목업/상태 보드 자동 생성
3. Jira에 에픽 ➡️ 스토리 ➡️ 태스크 이슈 일괄 자동 생성 (Jira API 사용)
4. "Story X-X 시작할게" ➡️ 브랜치 생성 및 Jira '진행 중' 변경
5. 기능 구현 및 `/code-review` 실행
6. 커밋 메시지 자동 생성 및 GitHub PR 생성
7. "완료" ➡️ Jira 상태 '완료' 변경 및 대시보드 업데이트

## 💬 2. Claude Code 프롬프트 모음

필요할 때 아래 프롬프트를 복사해서 Claude Code에 입력하세요.

### 🚀 프로젝트 최초 세팅
```text
기획서 md 파일을 줄게. 아래를 자동으로 만들어줘:
1. CLAUDE.md (기술스택, DB 스키마, 디렉토리 구조, 워크플로우 규칙)
2. agent/index.html (에픽/스토리별 이슈 목록 + 완료 여부 + 화면 링크)
3. agent/ 폴더 아래 에픽/스토리별 화면 HTML (상태별 목업 포함)
4. Jira에 에픽 → 스토리 → 태스크 이슈 자동 생성
   (Jira 인증은 .env에서 읽어줘)
```

### 📝 Jira 이슈 일괄 생성
```text
.env의 Jira 인증 정보를 사용해서 아래 구조로 Jira 이슈를 만들어줘.

에픽:
- [Epic 1] 기능명

스토리 (에픽 하위):
- [Story 1-1] 스토리명

태스크 (스토리 하위 Subtask):
- FE: 태스크명
- BE: 태스크명

이슈 타입 ID는 아래와 같아:
- 에픽: 10001
- 스토리: 10004
- Subtask: 10002
- 버그: 10007
```

### 🎬 이슈 작업 시작
```text
Story 1-3 시작할게.
1. git checkout -b story/1-3-filter-sort 브랜치 생성
2. KAN-6 Jira 이슈 상태를 "진행 중"으로 변경
3. 구현 시작
```

### 🎉 이슈 작업 완료 (커밋 + PR)
```text
Story 1-3 구현 완료했어.
1. 변경사항 분석해서 커밋 메시지 만들어줘 (feat prefix, [KAN-6] 포함)
2. /code-review 실행
3. agent/index.html 상태 업데이트 (⬜ → ✅)
4. PR 생성 (제목: [KAN-6] Story 1-3 필터 칩 / 정렬 구현)
5. Jira KAN-6 상태를 "완료"로 변경
```

### ⚡ 기획 변경 대응
```text
Story 1-3 기획 바꿀게. [변경 내용 설명]
1. agent/index.html 이슈 내용 수정
2. 해당 화면 HTML 수정
3. CLAUDE.md 관련 섹션 업데이트
4. Jira KAN-6 이슈 설명 업데이트
```

### 🔧 간단한 상태 변경
```text
KAN-6 상태를 "진행 중"으로 바꿔줘.
(.env의 Jira 인증 정보 사용)
```

## 📋 3. 커밋 및 PR 규칙

### 커밋 메시지 템플릿
```text
feat: 기능 추가 [KAN-이슈번호]
fix: 버그 수정 [KAN-이슈번호]
refactor: 리팩토링 [KAN-이슈번호]
```
- 작성 예시:
  - `feat: 필터 칩 데이터 쿼리 연결 [KAN-18]`
  - `fix: 핫스팟 핀 좌표 오프셋 수정 [KAN-26]`

### PR(Pull Request) 제목
```text
[KAN-6] Story 1-3 필터 칩 / 정렬 구현
```

## 🔢 4. Jira 이슈 타입 ID 참고 표
| 이슈 타입 | ID | 용도 |
| --- | --- | --- |
| 에픽 (Epic) | 10001 | 큰 단위의 기능 블록 |
| 스토리 (Story) | 10004 | 사용자 관점의 세부 요구사항 |
| 하위 작업 (Subtask) | 10002 | 개발자 관점의 구체적인 FE/BE 태스크 |
| 작업 (Task) | 10003 | 일반적인 업무 및 인프라 설정 등 |
| 버그 (Bug) | 10007 | 결함 수정 |
