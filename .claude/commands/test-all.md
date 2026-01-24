# Full Stack Test Runner

Backend와 Frontend 테스트를 순차적으로 실행하고 결과를 리포트합니다.

## 실행 순서

1. **Backend Unit Tests**
   ```bash
   cd /Users/Young/Desktop/claude-workspace/projects/alert_system/backend && npm test
   ```

2. **Frontend Tests**
   ```bash
   cd /Users/Young/Desktop/claude-workspace/projects/alert_system/frontend && npm test
   ```

3. **Type Check (Both)**
   ```bash
   cd /Users/Young/Desktop/claude-workspace/projects/alert_system/backend && npm run type-check
   cd /Users/Young/Desktop/claude-workspace/projects/alert_system/frontend && npm run type-check
   ```

4. **Lint Check (Both)**
   ```bash
   cd /Users/Young/Desktop/claude-workspace/projects/alert_system/backend && npm run lint
   cd /Users/Young/Desktop/claude-workspace/projects/alert_system/frontend && npm run lint
   ```

## 결과 출력 형식

```
## Full Stack Test Results

| Category | Backend | Frontend |
|----------|---------|----------|
| Unit Tests | ✅/❌ (X passed) | ✅/❌ (X passed) |
| Type Check | ✅/❌ | ✅/❌ |
| Lint | ✅/❌ | ✅/❌ |

### Summary
- Total Tests: X passed
- Errors: X
```

## 사용법

```
/test-all
```
