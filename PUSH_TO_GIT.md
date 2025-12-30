# Git에 Push하기

## 현재 상태

- ✅ 로컬에 모든 파일이 있음
- ⚠️ Git에는 아직 Push되지 않음
- 📦 약 100개 파일이 커밋 대기 중

## Git에 올리기

### 방법 1: 한 번에 모든 변경사항 커밋 및 푸시

```bash
cd /Users/Young/Desktop/alert_system

# 모든 변경사항 추가
git add -A

# 커밋
git commit -m "Complete implementation: Clean Architecture + TDD 기반 Alert System

- Backend: Domain, Application, Infrastructure, Presentation 레이어 구현
- Frontend: React + TypeScript + PWA 구조 설정
- Supabase 연동 설정
- 미세먼지 API 구현 및 테스트 완료
- 모바일 개발 워크플로우 가이드 추가
- Docker Compose 설정 (PostgreSQL, Redis)
- TDD 기반 테스트 코드 작성"

# Push
git push origin main
```

### 방법 2: 단계별 커밋 (권장)

```bash
# 1. Backend 코드
git add backend/
git commit -m "Backend: Clean Architecture + TDD 구현"

# 2. Frontend 코드
git add frontend/
git commit -m "Frontend: React + TypeScript + PWA 구조"

# 3. 설정 파일
git add docker-compose.yml setup-mobile.sh cursor-sync.sh
git commit -m "Infrastructure: Docker 및 개발 도구 설정"

# 4. 문서
git add *.md
git commit -m "Docs: 설정 가이드 및 문서 추가"

# 5. Push
git push origin main
```

## 주의사항

### .env 파일은 커밋되지 않습니다
- `.gitignore`에 포함되어 있어 안전합니다
- 비밀번호는 Git에 올라가지 않습니다

### 커밋 전 확인

```bash
# 커밋할 파일 확인
git status

# .env 파일이 포함되지 않았는지 확인
git status | grep .env
# 아무것도 나오지 않으면 안전합니다
```

## 문제 해결

### Git 사용자 정보가 설정되지 않았다면

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 인증 오류가 발생하면

```bash
# Personal Access Token 사용
git remote set-url origin https://YOUR_TOKEN@github.com/Young-000/alert_system.git
```

## 확인

Push 후 GitHub에서 확인:
https://github.com/Young-000/alert_system

