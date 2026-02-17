# F-6: Tailwind CSS + 디자인 시스템 마이그레이션

> **작성일**: 2026-02-17
> **상태**: BACKLOG
> **예상 공수**: 2 cycles

---

## 📌 목표 (Goal)

Alert System 프로젝트의 스타일링 시스템을 **커스텀 CSS → Tailwind CSS + shadcn/ui**로 점진적 마이그레이션하여 전역 컨벤션(`~/.claude/CLAUDE.md`)을 준수하고, 유지보수성과 개발 속도를 개선한다.

**핵심 원칙**:
- ✅ **점진적 마이그레이션**: Big-bang 리팩토링 금지. 기존 CSS와 Tailwind 공존.
- ✅ **제로 리그레션**: 기존 UI 깨짐 없음. 시각적 변화 최소화.
- ✅ **증명된 가치 우선**: 작은 POC로 효과 입증 후 확장.

---

## 🧮 현황 분석 (Current State)

### CSS 규모
```
base.css                    221 lines
components.css            3,278 lines  ⚠️ 대용량
pages/home.css            3,559 lines  ⚠️ 대용량
pages/routes.css          3,786 lines  ⚠️ 대용량
pages/commute.css         3,789 lines  ⚠️ 대용량
pages/alerts.css          2,220 lines
pages/settings.css          445 lines
pages/auth.css              376 lines
pages/notification-history  243 lines
──────────────────────────────────
총합                     17,927 lines  🔥
```

### 문제점
1. **유지보수 부담**: 페이지별 3000+ 줄 CSS 파일 → 수정 시 side-effect 위험 ⬆️
2. **중복 패턴**: `.btn-primary`, `.card`, `.input` 등 반복되는 스타일 → DRY 위반
3. **컨벤션 불일치**: 전역 규칙은 Tailwind 강제, 이 프로젝트만 예외 → 팀 온보딩 비용 ⬆️
4. **번들 사이즈**: 미사용 CSS도 번들에 포함 (일부 페이지만 사용하는 스타일도 전역 로드)

### 장점 (보존해야 할 것)
1. **세밀한 디자인 토큰**: CSS 변수(`--bg`, `--primary`, `--radius-xl` 등) 잘 정의됨
2. **접근성 고려**: `prefers-reduced-motion`, `forced-colors` 미디어 쿼리 적용 ✅
3. **애니메이션**: 부드러운 `fadeInUp`, `modalSlideIn`, `skeleton-shimmer` 등

---

## 🎯 Scope (범위)

### Phase 1: 기반 구축 (This Cycle)
```
[X] 1. Tailwind CSS v3 설치 + 설정
[X] 2. PostCSS 설정 (autoprefixer 포함)
[X] 3. CSS 변수 → Tailwind theme 매핑
[X] 4. cn() 유틸리티 함수 추가
[X] 5. POC: 작은 컴포넌트 2개 마이그레이션
    - Toast 컴포넌트 (50줄, 독립적)
    - EmptyState 컴포넌트 (80줄, 독립적)
[X] 6. 빌드 사이즈 비교 (Before/After)
[X] 7. 시각적 회귀 테스트 (Playwright 스크린샷)
```

### Phase 2: 점진적 확산 (Future Cycles)
- **새 컴포넌트**: 100% Tailwind로 작성
- **기존 컴포넌트**: 수정 시 Tailwind로 전환 (Opportunistic Refactoring)
- **페이지별 마이그레이션**: 작은 페이지부터 (`SettingsPage` → `AuthPage` → ...)
- **최종 목표**: `components.css` 완전 제거, 페이지 CSS 80% 감소

---

## 📦 설치 및 설정 (Installation & Configuration)

### 1. 패키지 설치
```bash
cd frontend
npm install -D tailwindcss@^3.4.0 postcss autoprefixer
npm install clsx tailwind-merge
npx tailwindcss init -p
```

### 2. `tailwind.config.ts` 설정
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // 기존 CSS 변수 매핑
      colors: {
        // Base colors
        'bg': 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-card-hover': 'var(--bg-card-hover)',
        'bg-subtle': 'var(--bg-subtle)',
        'border': 'var(--border)',
        'border-hover': 'var(--border-hover)',

        // Text colors
        'ink': 'var(--ink)',
        'ink-secondary': 'var(--ink-secondary)',
        'ink-muted': 'var(--ink-muted)',

        // Brand
        'primary': {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
          glow: 'var(--primary-glow)',
        },

        // Status
        'success': {
          DEFAULT: 'var(--success)',
          light: 'var(--success-light)',
        },
        'warning': {
          DEFAULT: 'var(--warning)',
          light: 'var(--warning-light)',
        },
        'error': {
          DEFAULT: 'var(--error)',
          light: 'var(--error-light)',
        },
      },
      borderRadius: {
        'xl': 'var(--radius-xl)',   // 20px
        'lg': 'var(--radius-lg)',   // 14px
        'md': 'var(--radius-md)',   // 10px
        'sm': 'var(--radius-sm)',   // 6px
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'primary': 'var(--shadow-primary)',
      },
      fontFamily: {
        sans: 'var(--font)',
      },
      spacing: {
        // Safe area 헬퍼
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### 3. `postcss.config.js` (Vite가 자동 생성)
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 4. `src/presentation/styles/index.css` 수정
```css
/* Tailwind 기본 레이어 임포트 (최상단) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 기존 CSS 파일 임포트 (Tailwind 아래) */
@import './base.css';
@import './components.css';
/* ... 나머지 ... */
```

### 5. `cn()` 유틸리티 함수 추가
**`src/presentation/utils/cn.ts`** (새 파일)
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind 클래스 병합 유틸리티
 * - clsx: 조건부 클래스 조합
 * - twMerge: Tailwind 충돌 해결 (나중 클래스 우선)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

**`tsconfig.json`에 경로 별칭 추가**
```json
{
  "compilerOptions": {
    "paths": {
      "@domain/*": ["./src/domain/*"],
      "@application/*": ["./src/application/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@presentation/*": ["./src/presentation/*"],
      "@utils/*": ["./src/presentation/utils/*"]  // 추가
    }
  }
}
```

---

## 🧪 POC 마이그레이션 (Proof of Concept)

### 후보 컴포넌트 선정 기준
1. **작은 규모**: 100줄 이하
2. **독립적**: 다른 컴포넌트/페이지와 의존성 낮음
3. **시각적 검증 용이**: 스토리북 없이도 브라우저에서 확인 가능
4. **재사용 빈도 높음**: 여러 페이지에서 사용

### 선정된 컴포넌트
1. **Toast** (`Toast.tsx` + `.toast` CSS)
   - 현재: `components.css` 라인 1407-1528 (121줄)
   - 이유: 독립적, 전역 사용, 애니메이션 포함 → Tailwind의 `transition`, `animate` 클래스 효과 확인

2. **EmptyState** (`EmptyState.tsx` + `.empty-state` CSS)
   - 현재: `components.css` 라인 2344-2399 (55줄)
   - 이유: 간단한 레이아웃, 여러 페이지 공통 사용

---

## 🎨 디자인 토큰 매핑 (Design Tokens Mapping)

| CSS 변수 | Tailwind 클래스 | 비고 |
|---------|----------------|------|
| `var(--bg)` | `bg-bg` | 커스텀 색상 `colors.bg` |
| `var(--bg-card)` | `bg-bg-card` | 커스텀 색상 |
| `var(--primary)` | `bg-primary` / `text-primary` | 커스텀 색상 |
| `var(--radius-xl)` | `rounded-xl` | 커스텀 반경 (20px) |
| `var(--shadow-md)` | `shadow-md` | 커스텀 그림자 |
| `display: flex; gap: 12px;` | `flex gap-3` | Tailwind 기본 (12px = 3 * 4px) |
| `padding: 24px;` | `p-6` | Tailwind 기본 (24px = 6 * 4px) |
| `font-size: 0.9rem;` | `text-sm` | Tailwind 기본 |

### 애니메이션 매핑
- **기존 CSS**: `@keyframes toastSlideIn { ... }`
- **Tailwind 방식**: `tailwind.config.ts`의 `extend.keyframes` + `animation` 정의
  ```typescript
  extend: {
    keyframes: {
      'toast-slide-in': {
        'from': { opacity: '0', transform: 'translateX(100%)' },
        'to': { opacity: '1', transform: 'translateX(0)' },
      },
    },
    animation: {
      'toast-slide': 'toast-slide-in 0.3s ease',
    },
  }
  ```

---

## 🔄 마이그레이션 전략 (Migration Strategy)

### 원칙
1. **공존 모드**: Tailwind와 커스텀 CSS가 동시에 작동
2. **점진적 교체**: 한 번에 한 컴포넌트씩
3. **기존 CSS 유지**: 마이그레이션 전까지 삭제 금지 (충돌 방지)
4. **테스트 필수**: 시각적 회귀 테스트 통과해야 머지

### Phase 1 작업 순서
```
1. Tailwind 설치 + 설정
   └─> npm run dev 정상 작동 확인

2. Toast 컴포넌트 마이그레이션
   ├─> Toast.tsx 파일에서 className을 Tailwind로 변경
   ├─> 기존 .toast CSS는 주석 처리 (삭제 X)
   ├─> 브라우저 확인: 스타일 동일한지 육안 검증
   └─> Playwright 스크린샷 비교

3. EmptyState 컴포넌트 마이그레이션
   └─> 동일 프로세스 반복

4. 빌드 사이즈 측정
   ├─> Before: npm run build && du -sh dist
   └─> After: 동일 명령 실행 → 비교

5. PR 생성 전 체크리스트
   ├─> [ ] npm run lint 통과
   ├─> [ ] npm run type-check 통과
   ├─> [ ] npm run test 통과
   ├─> [ ] npm run build 성공
   └─> [ ] Playwright E2E 통과
```

### 마이그레이션 예시: Toast 컴포넌트

**Before (커스텀 CSS)**
```tsx
<div className="toast toast-success">
  <span className="toast-icon">✓</span>
  <span className="toast-message">저장되었습니다</span>
  <button className="toast-close" onClick={onClose}>×</button>
</div>
```
```css
/* components.css */
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: toastSlideIn 0.3s ease;
}
.toast-success::after { background: var(--success); }
```

**After (Tailwind)**
```tsx
<div className={cn(
  "fixed top-4 left-1/2 -translate-x-1/2",
  "flex items-center gap-3 px-4 py-3.5",
  "bg-bg-card border border-border rounded-lg shadow-lg",
  "animate-toast-slide z-[1003]",
  // 타입별 스타일
  type === 'success' && "border-l-4 border-l-success"
)}>
  <span className="text-xl flex-shrink-0" aria-hidden="true">
    {icons[type]}
  </span>
  <span className="flex-1 text-sm text-ink">{message}</span>
  <button
    onClick={onClose}
    className={cn(
      "w-6 h-6 grid place-items-center",
      "rounded-sm text-ink-muted",
      "hover:bg-bg-subtle hover:text-ink",
      "transition-colors"
    )}
    aria-label="닫기"
  >
    ×
  </button>
</div>
```

---

## 🧪 테스트 전략 (Testing)

### 1. 시각적 회귀 테스트 (Playwright)
**`tests/visual-regression.spec.ts`** (새 파일)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Toast Component Visual Regression', () => {
  test('renders success toast correctly', async ({ page }) => {
    await page.goto('/');

    // 토스트 트리거 (예: 저장 버튼 클릭)
    await page.click('[data-testid="save-button"]');

    // 토스트 나타날 때까지 대기
    await page.waitForSelector('.toast-success', { state: 'visible' });

    // 스크린샷 촬영
    const toast = page.locator('.toast-success');
    await expect(toast).toHaveScreenshot('toast-success.png');
  });
});
```

### 2. 기존 단위 테스트 유지
```bash
npm run test  # Vitest 실행
# 모든 테스트 통과 확인 (Toast, EmptyState 포함)
```

### 3. 빌드 사이즈 비교
```bash
# Before
npm run build
du -sh dist/assets/*.css  # 예: 87KB

# After (Tailwind 도입 후)
npm run build
du -sh dist/assets/*.css  # 예: 45KB (PurgeCSS로 미사용 클래스 제거)
```

**목표**: CSS 번들 크기 30-50% 감소 (미사용 커스텀 CSS 제거 효과)

---

## 📊 성공 기준 (Success Criteria)

| 항목 | 기준 | 측정 방법 |
|------|------|----------|
| **제로 리그레션** | 기존 UI와 1px 차이 없음 | Playwright 픽셀 비교 |
| **빌드 성공** | `npm run build` 에러 없음 | CI 파이프라인 |
| **테스트 통과** | 모든 Vitest 테스트 PASS | CI 파이프라인 |
| **번들 감소** | CSS 크기 30% 이상 감소 | `du -sh dist/assets/*.css` |
| **접근성 유지** | 기존 a11y 속성 보존 | Axe DevTools 검사 |

---

## 🚨 리스크 및 대응 (Risks & Mitigation)

### Risk 1: 스타일 충돌
**문제**: Tailwind의 `reset` 레이어가 기존 CSS와 충돌
**대응**: `@layer base`에서 기존 리셋만 제외하고 임포트
```css
/* index.css */
@tailwind base;     /* Tailwind 기본 리셋 */
@tailwind components;
@tailwind utilities;

/* 기존 base.css는 Tailwind 아래 임포트 */
@import './base.css';
```

### Risk 2: CSS 변수 미지원 브라우저
**문제**: IE11 등 구형 브라우저 지원
**대응**: 이 프로젝트는 이미 CSS 변수 사용 중 → 추가 리스크 없음

### Risk 3: 개발자 학습 곡선
**문제**: 팀원이 Tailwind에 익숙하지 않음
**대응**:
- POC 2개 컴포넌트로 예제 제공
- 전역 컨벤션(`~/.claude/CLAUDE.md`) 참조 강제
- 새 컴포넌트만 Tailwind 사용 → 기존 코드는 건드리지 않음

### Risk 4: 빌드 시간 증가
**문제**: PostCSS 처리 오버헤드
**대응**: Vite의 HMR은 Tailwind JIT 모드로 빠름 (영향 미미)

---

## 📝 다음 단계 (Next Steps)

### Phase 1 완료 후
1. **팀 리뷰**: POC 결과 공유 → Tailwind 도입 여부 최종 결정
2. **컨벤션 업데이트**: 프로젝트 CLAUDE.md에 Tailwind 사용 규칙 명시
3. **Phase 2 계획**: 다음 마이그레이션 대상 컴포넌트 선정

### Phase 2 로드맵 (Future)
```
Cycle 18: BottomNavigation, PageHeader 마이그레이션
Cycle 19: SettingsPage 전체 마이그레이션
Cycle 20: AuthPage 전체 마이그레이션
Cycle 21: HomePage 일부 섹션 마이그레이션
Cycle 22: 나머지 페이지 점진적 마이그레이션
...
최종: components.css 완전 제거, base.css만 유지
```

---

## 📚 참고 자료 (References)

- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [shadcn/ui 컴포넌트](https://ui.shadcn.com/) (참고용, 직접 복사하여 사용)
- [전역 컨벤션: `~/.claude/CLAUDE.md`](../../.claude/CLAUDE.md) - "Styling Strategy" 섹션
- [Tailwind 마이그레이션 가이드](https://tailwindcss.com/docs/upgrade-guide)

---

## ✅ 체크리스트 (Implementation Checklist)

### 설치 및 설정
- [ ] Tailwind CSS, PostCSS, Autoprefixer 설치
- [ ] clsx, tailwind-merge 설치
- [ ] `tailwind.config.ts` 생성 및 CSS 변수 매핑
- [ ] `postcss.config.js` 확인
- [ ] `index.css`에 `@tailwind` 디렉티브 추가
- [ ] `cn()` 유틸리티 함수 작성
- [ ] `tsconfig.json` 경로 별칭 추가

### POC 마이그레이션
- [ ] Toast 컴포넌트 Tailwind로 변환
  - [ ] TSX className 수정
  - [ ] 기존 CSS 주석 처리
  - [ ] 브라우저 육안 검증
  - [ ] Playwright 스크린샷 비교
- [ ] EmptyState 컴포넌트 Tailwind로 변환
  - [ ] 동일 프로세스 반복

### 테스트 및 검증
- [ ] `npm run lint` 통과
- [ ] `npm run type-check` 통과
- [ ] `npm run test` 통과
- [ ] `npm run build` 성공
- [ ] Playwright E2E 테스트 통과
- [ ] 빌드 사이즈 측정 및 비교 (Before/After)
- [ ] Axe DevTools 접근성 검사

### 문서화
- [ ] PR 설명에 Before/After 스크린샷 첨부
- [ ] `CLAUDE.md`에 Tailwind 사용 규칙 추가
- [ ] 다음 마이그레이션 대상 컴포넌트 리스트업

---

**End of Spec**
