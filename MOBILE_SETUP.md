# 모바일에서 개발하기 위한 가이드

## 1. 필수 앱 설치

### iOS (iPad/iPhone)
- **Working Copy** 또는 **GitHub Mobile**: Git 저장소 관리
- **CodeSandbox** 또는 **Expo Go**: React 개발 환경 (선택사항)
- **Termius** 또는 **Blink Shell**: SSH 터미널 (선택사항)

### Android
- **GitHub Mobile**: Git 저장소 관리
- **Termux**: 터미널 환경 (강력 추천!)
- **Acode**: 코드 에디터

## 2. Termux 사용 (Android - 가장 추천)

### 설치 및 설정
```bash
# Termux 설치 후
pkg update && pkg upgrade
pkg install git nodejs-lts
pkg install proot-distro
proot-distro install ubuntu
proot-distro login ubuntu
```

### 프로젝트 클론
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/alert_system.git
cd alert_system
```

### 개발 환경 설정
```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (새 터미널)
cd frontend
npm install
npm run dev
```

## 3. GitHub Mobile 사용 (iOS/Android 공통)

### 설정 방법
1. GitHub Mobile 앱 설치
2. GitHub 계정 로그인
3. 저장소 클론 또는 기존 저장소 연결
4. 파일 편집 및 커밋 가능
5. Push/Pull 간편하게 수행

### 작업 흐름
```
1. GitHub Mobile에서 파일 편집
2. 변경사항 커밋
3. Push to origin
4. 다른 기기에서 Pull
```

## 4. VS Code Remote (가장 강력한 방법)

### VS Code Server 사용
```bash
# 서버에 VS Code Server 설치
curl -fsSL https://code-server.dev/install.sh | sh

# 실행
code-server --bind-addr 0.0.0.0:8080
```

### 모바일에서 접속
- 브라우저에서 `http://YOUR_SERVER_IP:8080` 접속
- VS Code 웹 인터페이스 사용 가능
- 모든 VS Code 기능 사용 가능

## 5. Cursor Mobile (권장)

### Cursor는 모바일 앱이 없지만:
1. **GitHub Codespaces** 사용
   - 브라우저에서 VS Code 환경 제공
   - 모바일 브라우저에서도 사용 가능

2. **Gitpod** 사용
   - GitHub 저장소 기반 클라우드 IDE
   - 모바일 브라우저에서 완전한 개발 환경

### 설정 방법
```bash
# GitHub 저장소에 .gitpod.yml 추가
image: gitpod/workspace-full

tasks:
  - init: npm install
    command: npm run dev
```

## 6. 실전 워크플로우 추천

### 방법 1: GitHub Mobile + Cloud IDE
```
1. GitHub Mobile에서 코드 리뷰 및 간단한 수정
2. 복잡한 작업은 Gitpod/Codespaces에서
3. 로컬 테스트는 집에서만
```

### 방법 2: Termux (Android) + GitHub
```
1. Termux에서 git clone
2. Termux에서 코드 편집 (vim/nano)
3. git commit && git push
4. 집에서 Pull 받아서 테스트
```

### 방법 3: SSH + 원격 서버
```
1. 집에 개발 서버 구축 (Raspberry Pi 등)
2. 모바일에서 SSH 접속
3. 원격에서 개발 및 테스트
```

## 7. 빠른 시작 스크립트

### setup-mobile.sh 생성
```bash
#!/bin/bash
# 모바일 개발 환경 자동 설정

echo "🚀 Alert System 모바일 개발 환경 설정 중..."

# Git 설정 확인
if [ -z "$(git config user.name)" ]; then
    echo "Git 사용자 정보를 설정해주세요:"
    read -p "이름: " git_name
    read -p "이메일: " git_email
    git config user.name "$git_name"
    git config user.email "$git_email"
fi

# 의존성 설치
echo "📦 Backend 의존성 설치 중..."
cd backend && npm install && cd ..

echo "📦 Frontend 의존성 설치 중..."
cd frontend && npm install && cd ..

echo "✅ 설정 완료!"
echo ""
echo "다음 명령어로 시작하세요:"
echo "  Backend:  cd backend && npm run start:dev"
echo "  Frontend: cd frontend && npm run dev"
```

## 8. 모바일에서 Git 작업 팁

### 자주 사용하는 명령어
```bash
# 변경사항 확인
git status

# 변경사항 추가 및 커밋
git add .
git commit -m "작업 내용"

# Push
git push origin main

# Pull
git pull origin main

# 브랜치 생성 및 전환
git checkout -b feature/new-feature
```

### .gitconfig 설정 (편의성 향상)
```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
```

## 9. 문제 해결

### Git 인증 문제
```bash
# Personal Access Token 사용
git remote set-url origin https://YOUR_TOKEN@github.com/USERNAME/REPO.git

# 또는 SSH 키 사용 (Termux)
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# GitHub에 SSH 키 추가
```

### 네트워크 문제
- 모바일 데이터 사용 시 npm install이 느릴 수 있음
- WiFi 환경에서 의존성 설치 권장

## 10. 추천 도구 조합

### 최고의 조합 (Android)
- **Termux** + **GitHub Mobile** + **Acode**
- 완전한 로컬 개발 환경

### 최고의 조합 (iOS)
- **GitHub Mobile** + **Gitpod** (브라우저)
- 클라우드 기반 개발 환경

### 최고의 조합 (양쪽 모두)
- **GitHub Codespaces** 또는 **Gitpod**
- 브라우저만 있으면 완전한 개발 환경

