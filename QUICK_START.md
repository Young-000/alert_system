# 빠른 시작 가이드

## ✅ 완료된 작업

1. **프로젝트 구조**: Clean Architecture + TDD 기반 구현 완료
2. **테스트**: 대부분의 테스트 통과 (27/36 테스트 통과)
3. **Git 저장소**: 변경사항 준비 완료

## 🚀 다음 단계

### 1. Git 설정 및 Push

```bash
cd /Users/Young/Desktop/alert_system

# Git 사용자 정보 설정 (한 번만)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 변경사항 커밋 및 푸시
git add -A
git commit -m "Initial implementation"
git push origin main
```

**GitHub 인증이 필요한 경우:**
- Personal Access Token 생성 후:
  ```bash
  git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/alert_system.git
  ```

### 2. 의존성 설치

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. 개발 환경 시작

```bash
# Docker 서비스 시작 (PostgreSQL, Redis)
docker-compose up -d

# Backend 시작
cd backend
npm run start:dev

# Frontend 시작 (새 터미널)
cd frontend
npm run dev
```

### 4. 테스트 실행

```bash
# Backend 테스트
cd backend
npm test

# Frontend 테스트
cd frontend
npm test
```

## 📱 모바일에서 작업하기

### 방법 1: GitHub Mobile (가장 간단)
1. GitHub Mobile 앱 설치
2. 저장소 열기
3. 파일 편집 및 커밋
4. Push

### 방법 2: Termux (Android - 완전한 개발 환경)
```bash
# Termux 설치 후
pkg install git nodejs-lts
git clone https://github.com/YOUR_USERNAME/alert_system.git
cd alert_system
./setup-mobile.sh
```

### 방법 3: Gitpod/Codespaces (브라우저 기반)
- GitHub 저장소에서 "Code" → "Codespaces" 또는 "Gitpod" 선택
- 완전한 개발 환경을 브라우저에서 사용

자세한 내용은 `MOBILE_SETUP.md` 참고

## 📝 주요 파일

- `MOBILE_SETUP.md`: 모바일 개발 환경 설정 가이드
- `GIT_SETUP.md`: Git 설정 및 사용 가이드
- `setup-mobile.sh`: 모바일 환경 자동 설정 스크립트
- `README.md`: 프로젝트 개요

## 🔧 문제 해결

### Git 인증 문제
→ `GIT_SETUP.md` 참고

### 테스트 실패
→ PostgreSQL 테스트는 실제 DB 연결 필요 (통합 테스트로 분리 예정)

### 의존성 설치 실패
→ 네트워크 확인, npm cache clean --force 실행

