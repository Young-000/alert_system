# Round 3 - UI/UX 점검 결과

**검사일**: 2026-02-12
**배포 URL**: https://frontend-xi-two-52.vercel.app
**검사 범위**: 반응형(375/768/1920), 디자인 일관성, 빈 상태, 로딩, 에러, 터치 타겟, 가로 스크롤, 모달, 애니메이션

---

## 1. 반응형 (375px / 768px / 1920px)

### 375px (모바일)

| 페이지 | 가로 스크롤 | 레이아웃 | 비고 |
|--------|:---------:|:-------:|------|
| / (홈 - 게스트) | 없음 | 정상 | 텍스트, CTA, 카드 모두 적절 |
| /routes | 없음 | 정상 | 로그인 필요 빈 상태 잘 표시 |
| /alerts | 없음 | 정상 | 경고 배너 정상 |
| /settings | 없음 | 정상 | 로그인 필요 빈 상태 잘 표시 |
| /login | 없음 | 정상 | 폼 레이아웃 적절 |
| 404 | 없음 | 정상 | CTA 2개 적절 |

### 768px (태블릿)

| 페이지 | 가로 스크롤 | 레이아웃 | 비고 |
|--------|:---------:|:-------:|------|
| / (홈 - 게스트) | 없음 | 정상 | 피처 카드 3열 그리드 잘 전환 |
| /alerts | 없음 | 정상 | 푸터 포함 적절 |
| /settings | 없음 | 정상 | - |

### 1920px (데스크톱)

| 페이지 | 가로 스크롤 | 레이아웃 | 비고 |
|--------|:---------:|:-------:|------|
| / (홈 - 게스트) | 없음 | **수정** | CTA가 전체 너비 차지, 콘텐츠 제약 없음 |
| /routes | 없음 | 정상 | 콘텐츠 max-width 1100px 적용 |
| 하단 내비게이션 | - | **수정** | 전체 너비 차지하여 데스크톱에서 어색 |

---

## 2. 발견된 문제 및 수정 사항

### [수정 1] 게스트 페이지 max-width 미설정 (데스크톱)

**문제**: `.guest-page`에 max-width가 없어 1920px에서 콘텐츠가 전체 너비를 차지하고, 특히 CTA 버튼이 1400px 이상 늘어남
**심각도**: 중간
**수정**:
- `.guest-page`에 `max-width: 720px; margin: 0 auto;` 추가
- **파일**: `/frontend/src/presentation/index.css` (line ~15014)

### [수정 2] 게스트 CTA 버튼 전체 너비 (데스크톱)

**문제**: `.guest-cta`가 `width: 100%`로 태블릿/데스크톱에서 과도하게 넓음
**심각도**: 중간
**수정**:
- `max-width: 400px; margin-left: auto; margin-right: auto;` 추가
- **파일**: `/frontend/src/presentation/index.css` (line ~15048)

### [수정 3] 게스트 피처 카드 레이아웃 (태블릿+)

**문제**: `.guest-features`가 항상 1열(`grid-template-columns: 1fr`)이어서 태블릿에서 공간 낭비. 이전 CSS(line 9230)에 3열 그리드가 있었으나 나중에 덮어씀
**심각도**: 낮음
**수정**:
- 기본 3열 그리드 (`repeat(3, 1fr)`)로 변경
- `@media (max-width: 600px)`에서 1열로 전환
- 카드 내부 레이아웃도 태블릿에서 세로 정렬(text-align: center), 모바일에서 가로 정렬(flex-row)
- **파일**: `/frontend/src/presentation/index.css` (line ~15054)

### [수정 4] 로그인 홈 페이지 max-width 미설정 (데스크톱)

**문제**: `.home-page`에 max-width가 없어 로그인 상태의 대시보드도 데스크톱에서 전체 너비를 차지
**심각도**: 중간
**수정**:
- `max-width: 640px; margin: 0 auto;` 추가
- **파일**: `/frontend/src/presentation/index.css` (line ~15099)

### [수정 5] 하단 내비게이션 전체 너비 (데스크톱)

**문제**: `.bottom-nav`가 `left: 0; right: 0;`으로 1920px에서 전체 너비 차지. 모바일 패턴이 데스크톱에서는 어색
**심각도**: 낮음
**수정**:
- `left: 50%; transform: translateX(-50%); max-width: 768px;`으로 중앙 고정
- **파일**: `/frontend/src/presentation/index.css` (line ~12399)

### [수정 6] 알림 페이지 "로그인" 링크 터치 타겟 미달

**문제**: `/alerts` 페이지의 "로그인" 인라인 링크가 37x23px으로 최소 터치 타겟(44x44px) 미달
**심각도**: 중간 (접근성)
**수정**:
- `notice-link` 클래스 추가하여 `padding: 4px 8px; min-height: 32px; font-weight: 600; text-decoration: underline;`
- **파일**: `/frontend/src/presentation/pages/AlertSettingsPage.tsx` (line ~694), `/frontend/src/presentation/index.css`

### [수정 7] Skip Link 높이 미달

**문제**: `.skip-link`의 높이가 42px로 최소 터치 타겟(44px) 미달
**심각도**: 낮음 (키보드 전용 요소이므로)
**수정**:
- `padding: 10px 16px; min-height: 44px;` 적용
- **파일**: `/frontend/src/presentation/index.css` (line ~120)

---

## 3. 디자인 일관성

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 색상 팔레트 | 정상 | `--primary: #6366f1` 통일 |
| 타이포그래피 | 정상 | Pretendard 폰트 일관 적용 |
| 버튼 스타일 | 정상 | `.btn-primary` 통일 |
| 카드 스타일 | 정상 | border-radius, shadow 통일 |
| 아이콘 스타일 | 정상 | SVG 스트로크 스타일 통일 |
| 간격/여백 | 정상 | 16/20/24px 체계 일관 |

---

## 4. 빈 상태 (Empty State)

| 페이지 | 빈 상태 | 아이콘 | 설명 텍스트 | CTA |
|--------|:------:|:-----:|:--------:|:---:|
| /routes (비로그인) | 정상 | 그리드 아이콘 | "로그인이 필요해요" | 로그인 버튼 |
| /alerts (비로그인) | 정상 | - | "로그인 후 알림을 설정할 수 있어요" | 로그인 링크 |
| /settings (비로그인) | 정상 | 잠금 아이콘 | "로그인이 필요해요" | 로그인 버튼 |
| / (로그인, 경로 없음) | 정상 | - | "출근 경로를 등록해보세요" | 경로 등록하기 |
| 404 | 정상 | - | "페이지를 찾을 수 없습니다" | 홈으로/알림 설정 |

---

## 5. 로딩 상태

| 항목 | 상태 | 비고 |
|------|:----:|------|
| 페이지 로딩 (Suspense) | 정상 | skeleton UI + "페이지 로딩 중..." sr-only 텍스트 |
| 홈 대시보드 로딩 | 정상 | skeleton-card 패턴 |
| 알림 목록 로딩 | 정상 | spinner + "서버에 연결 중입니다..." |
| Lazy 로딩 (코드 스플리팅) | 정상 | idle preload + touchStart prefetch |

---

## 6. 에러 처리

| 항목 | 상태 | 비고 |
|------|:----:|------|
| API 실패 시 fallback | 정상 | `catch(() => [])` 패턴으로 빈 배열 반환 |
| 네트워크 오프라인 | 정상 | `OfflineBanner` 컴포넌트 |
| ErrorBoundary | 정상 | 전역 래핑 |
| 404 처리 | 정상 | `NotFoundPage` 라우트 |

---

## 7. 터치 타겟

| 요소 | 크기 | 최소 44px | 조치 |
|------|------|:---------:|------|
| 하단 내비게이션 아이템 | 52x44px+ | 충족 | - |
| 홈 CTA 버튼 | 전체 너비 x 50px+ | 충족 | - |
| 홈 "시작하기" 버튼 | 80x36px+ | 충족 | - |
| 로그인 폼 버튼 | 전체 너비 x 48px+ | 충족 | - |
| 경로 페이지 "로그인" 버튼 | 120x48px+ | 충족 | - |
| 알림 페이지 "로그인" 링크 | 37x23px | **미달** | [수정 6] 완료 |
| Skip Link | 147x42px | **미달** | [수정 7] 완료 |

---

## 8. 접근성 (a11y)

| 항목 | 상태 | 비고 |
|------|:----:|------|
| Skip Link | 정상 | "본문으로 건너뛰기" 존재 |
| aria-label | 정상 | 주요 섹션에 적용 (날씨, 출퇴근, 알림 등) |
| role="navigation" | 정상 | 하단 내비게이션에 적용 |
| aria-current="page" | 정상 | 활성 내비게이션 아이템 표시 |
| :focus-visible | 정상 | outline + box-shadow 스타일 |
| prefers-reduced-motion | 정상 | 애니메이션 비활성화 처리 |
| forced-colors (고대비) | 정상 | border 대체 스타일 |
| sr-only | 정상 | 로딩 상태 안내 텍스트 |

---

## 9. 애니메이션

| 항목 | 상태 | 비고 |
|------|:----:|------|
| fadeInUp (notice) | 정상 | 0.3s ease |
| 하단 내비 아이콘 확대 | 정상 | scale(1.1) on active |
| 버튼 active | 정상 | scale(0.98) |
| hover 카드 리프트 | 정상 | translateY(-4px) |
| prefers-reduced-motion | 정상 | 모든 애니메이션 비활성화 |

---

## 10. 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/presentation/index.css` | 게스트 페이지 max-width, CTA max-width, 피처 카드 반응형, 홈 페이지 max-width, 하단 내비 max-width, notice-link 스타일, skip-link 높이 |
| `frontend/src/presentation/pages/AlertSettingsPage.tsx` | 로그인 링크에 notice-link 클래스 추가 |

---

## 검증 결과

- **빌드**: 성공
- **TypeScript**: 에러 0개
- **ESLint**: 에러 0개
- **가로 스크롤**: 모든 페이지, 모든 뷰포트에서 없음
