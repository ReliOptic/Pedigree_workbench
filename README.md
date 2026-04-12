# Pedigree Workbench

오프라인 데스크톱 가계도(혈통) 분석 워크벤치. 축산/유전학 연구를 위해 개체 간 친자 관계를
시각화하고 유전 정보를 관리합니다. Tauri 기반 Windows/macOS/Linux 네이티브 앱.

<p align="center">
  <img src="docs/screenshot-workbench.png" alt="Workbench view" width="720" />
</p>

## 주요 기능

### 캔버스
- 인터랙티브 pan/zoom 가계도 캔버스 (마우스 휠 + 드래그 + 키보드)
- 성별 기반 노드 도형: □ 수컷, ○ 암컷, ◇ 미상 (♂/♀/? 글리프)
- 상태 배지: "교배예정돈" (초록), "폐사" (빨강) 등 자동 색상 분류
- 세대 라벨이 캔버스와 함께 이동 (F0/F1/F2 정렬 보장)
- Fit-to-screen 자동 배치 (F0 좌상단 기준)
- 실시간 검색 (`/` 단축키) + 매치 하이라이트 / 비매치 dimming

### 편집
- 노드 추가/편집/삭제 (Inspector 패널 + 우클릭 컨텍스트 메뉴)
- 우클릭 메뉴: Edit, Add child, Add sibling, Add parent, Copy ID, Delete
- Add child/sibling/parent 시 sire/dam/generation 자동 prefill
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z, 50단계 스냅샷 히스토리)
- sire/dam 드롭다운 선택 (기존 개체 목록, orphan 참조 방지)

### 데이터 임포트/익스포트
- **JSON** 붙여넣기 임포트 (Zod 스키마 검증, 5MB 상한)
- **CSV/TSV** 파일 임포트 (PapaParse, 열 매핑 UI, 한/영 헤더 자동 감지)
- 파일 드래그-드롭 + 파일 선택기
- 임포트 정합성 경고 (orphan 부모, 중복 ID, 자기참조)
- 샘플 CSV 템플릿 다운로드 (모든 컬럼 설명 + 주의사항 포함)
- CSV 내보내기 (모든 예약 필드 + 자유 필드, RFC 4180)

### PCR 시퀀스 + 구조 예측
- 개체별 DNA 염기서열 저장 (IUPAC 코드 검증, 최대 100k 자)
- **ESMFold** 단백질 구조 예측 (DNA → 3-frame ORF → 단백질 번역 → PDB)
- **3Dmol.js** 인터랙티브 3D 구조 뷰어 (cartoon view, spectrum coloring)
- PDB 파일 다운로드

### 논문 출력
- **Paper View** 탭: Mermaid 다이어그램으로 깔끔한 가계도 렌더링
- SVG / PNG 다운로드 + Mermaid 소스 복사

### UI/UX
- 다크 모드 (Light / Dark / System) + Settings 모달
- 영어 / 한국어 이중 언어
- 디자인 토큰 기반 일관된 색상 시스템 (`@theme` CSS 변수)
- 키보드 단축키 오버레이 (`?` 키)
- 전체 접근성: 시맨틱 랜드마크, aria-label, roving tabindex, focus-visible

## 아키텍처

```
src/
  components/     # 프레젠테이션 (PedigreeCanvas, NodeInspector, ContextMenu,
                  #   ImportModal, AddNodeModal, SettingsModal, PaperView,
                  #   StructureViewer, ColumnMapper, ShortcutOverlay, ...)
  hooks/          # use-pedigree (IndexedDB CRUD), use-settings (localStorage),
                  #   use-undo (스냅샷 히스토리)
  services/       # pedigree-store, pedigree-import, pedigree-import-csv,
                  #   pedigree-export, pedigree-layout, pedigree-mermaid,
                  #   sequence-utils, esmfold-api, settings-store, logger
  types/          # Individual, Translation, Error 계약
  config/         # 빌드 시점 설정
  ui/             # ErrorBoundary
src-tauri/        # Tauri 2 데스크톱 쉘 (Rust)
tests/
  unit/           # vitest + fake-indexeddb (14개 파일)
  integration/    # @testing-library/react E2E 플로우
```

## 기술 스택

| 항목 | 버전 |
|------|------|
| React | 19.0 |
| TypeScript | 5.8 (strict + noUncheckedIndexedAccess) |
| Vite | 6.2 |
| Tailwind CSS | 4.1 |
| Tauri | 2.10 |
| Vitest | 4.1 |
| PapaParse | CSV 파싱 |
| Mermaid | 다이어그램 렌더 |
| 3Dmol.js | 단백질 3D 뷰어 |
| Motion (Framer) | 애니메이션 |
| Zod | 스키마 검증 |
| idb | IndexedDB 래퍼 |

## 시작하기

### 개발 환경

```bash
# 필수: Node.js >= 20, npm >= 10
npm install
npm run dev          # http://localhost:3000
npm run lint         # tsc --noEmit
npm run test         # vitest (107 tests)
npm run build        # 프로덕션 빌드 (dist/)
```

### 데스크톱 빌드 (Tauri)

#### Windows
```powershell
# 필수: Rust stable, WebView2 (Win10/11 기본 포함), MSVC 빌드 도구
npm run tauri:build
# 결과: src-tauri\target\release\bundle\nsis\*.exe
```

#### macOS
```bash
# 필수: Xcode Command Line Tools, Rust stable
xcode-select --install
npm run tauri:build
# 결과: src-tauri/target/release/bundle/dmg/*.dmg
```

#### Linux
```bash
# 필수: webkit2gtk, build-essential, librsvg2-dev, patchelf
sudo apt install -y libwebkit2gtk-4.1-dev build-essential librsvg2-dev patchelf
npm run tauri:build
# 결과: src-tauri/target/release/bundle/deb/*.deb, appimage/*.AppImage
```

## 데이터 형식

### JSON 임포트
```json
[
  { "id": "SNUDB #1-1", "sex": "수컷", "generation": "F0", "label": "1-1",
    "group": "G1", "birth_date": "2025-07-13", "status": "교배예정돈",
    "CD163": "100.00%" },
  { "id": "F1-1", "sex": "M", "generation": "F1",
    "sire": "SNUDB #1-1", "dam": "SNUDB #2-1" }
]
```

### CSV 임포트
Upload 모달에서 "Download sample CSV"로 템플릿을 받아 포맷을 참고하세요.
열 매핑 UI가 자동으로 한/영 헤더를 감지합니다.

### 예약 필드

| 필드 | 설명 | 필수 |
|------|------|------|
| `id` | 고유 식별자 | ✓ |
| `label` | 캔버스 표시 이름 | |
| `sex` | 성별 (수컷/암컷/M/F/male/female) | |
| `generation` | 세대 (F0, F1, ...) | |
| `sire` | 아비 id | |
| `dam` | 어미 id | |
| `group` | 그룹/리터 | |
| `surrogate` | 대리모 | |
| `birth_date` | 생년월일 (YYYY-MM-DD) | |
| `status` | 상태 (교배예정돈, 폐사, ...) | |
| `sequence` | DNA 염기서열 (IUPAC) | |
| `sequence_source` | 시퀀스 출처 (PCR/Sanger/NGS/Other) | |

그 외 모든 열은 자유 필드로 자동 수집되어 Inspector에 표시됩니다.

## 키보드 단축키

| 키 | 동작 |
|----|------|
| Arrow keys | 캔버스 팬 |
| `+` / `-` | 줌 인/아웃 |
| `0` | Fit to screen |
| Scroll wheel | 커서 기준 줌 |
| `Escape` | 노드 선택 해제 / 메뉴 닫기 |
| `/` | 검색 포커스 |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `?` | 단축키 도움말 |
| Right-click | 컨텍스트 메뉴 |

## 테스트

```bash
npm run test         # 전체 107 테스트 실행
npm run test:watch   # 워치 모드
npm run test:ui      # 브라우저 UI 모드
```

테스트 환경: fake-indexeddb + Map 기반 localStorage shim (`tests/setup.ts`)

## 환경 변수

| 변수 | 범위 | 용도 |
|------|------|------|
| `VITE_APP_VERSION` | 빌드 시점 (옵션) | 버전 문자열 오버라이드 |
| `DISABLE_HMR` | 개발 서버 (옵션) | HMR 비활성화 (CI/에이전트 용) |

## 라이선스

Proprietary - (c) 2026 ReliOptic.
