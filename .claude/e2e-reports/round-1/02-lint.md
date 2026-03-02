# E2E Round 1 - Lint Report

**Date**: 2026-03-03
**Branch**: `feature/e2e-auto-review-20260303`

---

## Summary

| Check | Result | Details |
|-------|:------:|---------|
| 2-1 Frontend ESLint | PASS | 0 errors, 0 warnings |
| 2-2 Backend ESLint | PASS | 0 errors, 0 warnings |
| 2-3 Frontend Prettier | FIXED | 186 files reformatted |
| 2-4 Backend Prettier | FIXED | 264 files reformatted |
| 2-5 Re-verification | PASS | All lint + Prettier clean |

**Overall: PASS (after Prettier fix)**
**Total files fixed: 452 (Prettier formatting only)**

---

## 2-1. Frontend ESLint

```bash
$ cd frontend && npm run lint
> eslint "src/**/*.{ts,tsx}" --fix
# (exit 0 - clean)

$ cd frontend && npm run lint:check
> eslint "src/**/*.{ts,tsx}"
# (exit 0 - clean)
```

| Metric | Count |
|--------|------:|
| Errors | 0 |
| Warnings | 0 |
| Fixable errors | 0 |
| Fixable warnings | 0 |

---

## 2-2. Backend ESLint

```bash
$ cd backend && npm run lint
> eslint "{src,apps,libs,test}/**/*.ts" --fix
# (exit 0 - clean)

$ cd backend && npm run lint:check
> eslint "{src,apps,libs,test}/**/*.ts"
# (exit 0 - clean)
```

| Metric | Count |
|--------|------:|
| Errors | 0 |
| Warnings | 0 |
| Fixable errors | 0 |
| Fixable warnings | 0 |

---

## 2-3. Frontend Prettier

```bash
$ cd frontend && npx prettier --check "src/**/*.{ts,tsx}"
# Code style issues found in 186 files.

$ cd frontend && npx prettier --write "src/**/*.{ts,tsx}"
# 186 files reformatted
```

| Metric | Count |
|--------|------:|
| Files checked | ~213 |
| Files with issues | 186 |
| Action | `--write` applied, all fixed |

---

## 2-4. Backend Prettier

```bash
$ cd backend && npx prettier --check "src/**/*.ts"
# Code style issues found in 264 files.

$ cd backend && npx prettier --write "src/**/*.ts"
# 264 files reformatted
```

| Metric | Count |
|--------|------:|
| Files checked | ~339 |
| Files with issues | 264 |
| Action | `--write` applied, all fixed |

---

## 2-5. Re-verification (Post-fix)

All checks re-run after Prettier fix:

| Check | Result |
|-------|--------|
| `frontend lint:check` | PASS (0 errors) |
| `backend lint:check` | PASS (0 errors) |
| `frontend prettier --check` | PASS ("All matched files use Prettier code style!") |
| `backend prettier --check` | PASS ("All matched files use Prettier code style!") |

---

## Git Diff Summary

```
452 files changed, 7880 insertions(+), 5859 deletions(-)
```

All changes are Prettier formatting only (whitespace, trailing commas, line breaks, quote style). No logic changes.

---

## Execution Log

| Step | Command | Result |
|------|---------|--------|
| 1 | `cd frontend && npm run lint` | PASS (--fix, 0 changes) |
| 2 | `cd backend && npm run lint` | PASS (--fix, 0 changes) |
| 3 | `cd frontend && npm run lint:check` | PASS (0 errors) |
| 4 | `cd backend && npm run lint:check` | PASS (0 errors) |
| 5 | `cd frontend && npx prettier --check` | FAIL (186 files) |
| 6 | `cd frontend && npx prettier --write` | FIXED (186 files) |
| 7 | `cd backend && npx prettier --check` | FAIL (264 files) |
| 8 | `cd backend && npx prettier --write` | FIXED (264 files) |
| 9 | Re-run all checks | ALL PASS |
