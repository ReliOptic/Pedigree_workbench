# Pedigree Workbench — 작업 현황

> 갑자기 꺼질 때를 대비한 작업 상태 추적 파일

## 현재 날짜: 2026-04-12

## 작업 목록

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| 1 | 샘플 데이터 제거 + 빈 캔버스 시작 | 완료 | ensureSeeded() 제거, 빈 캔버스 + EmptyState |
| 2 | 프로젝트 시스템 (CSV별 별도 프로젝트) | 완료 | IndexedDB projects 스토어, 프로젝트 전환 UI |
| 3 | 저장 상태 표시 (saved/unsaved) | 완료 | TopBar + Footer에 Saving.../Saved 표시 |
| 4 | Export 기능 보완 | 완료 | UTF-8 BOM 추가, 헤더 따옴표, CRLF 줄바꿈 |
| 5 | STATUS.md 작성 | 완료 | 이 파일 |

## 검증 결과
- tsc --noEmit: 통과
- vitest run: 110 tests passed (14 files)
- vite build: 성공

## 변경된 파일
- `src/types/pedigree.types.ts` — Project 인터페이스 추가
- `src/types/translation.types.ts` — 새 번역 키 추가
- `src/translations.ts` — 한/영 번역 추가
- `src/services/pedigree-store.ts` — DB v2 (projects 스토어), ensureSeeded 제거
- `src/services/pedigree-export.ts` — BOM, 헤더 따옴표, CRLF
- `src/services/settings-store.ts` — activeProjectId 추가
- `src/hooks/use-pedigree.ts` — seed 제거, saveStatus 추가
- `src/hooks/use-projects.ts` — 새 프로젝트 관리 훅
- `src/components/TopBar.tsx` — 프로젝트 선택기 + 저장 표시
- `src/components/Footer.tsx` — 저장 상태 표시
- `src/components/ImportModal.tsx` — 임포트 시 프로젝트명 전달
- `src/App.tsx` — 프로젝트 시스템 통합, 자동 저장
- `tests/unit/pedigree-store.test.ts` — 프로젝트 테스트 추가
- `tests/integration/*.test.tsx` — 수동 seed 추가

## 완료된 이전 작업 (v1.0)
- Tauri 릴리즈 빌드 완료 (Windows NSIS + MSI)
- README v1.0 재작성
- ESMFold API CSP 허용
- 키보드 단축키 오버레이
- Undo/Redo 스냅샷 히스토리
- 다크 모드 + Settings 모달
- 부모 추가 컨텍스트 메뉴 + 자동 링크
- CSV 내보내기 + TopBar 다운로드 버튼
