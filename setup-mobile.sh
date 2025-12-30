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
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Backend 의존성 설치 중..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Frontend 의존성 설치 중..."
    cd frontend && npm install && cd ..
fi

echo "✅ 설정 완료!"
echo ""
echo "다음 명령어로 시작하세요:"
echo "  Backend:  cd backend && npm run start:dev"
echo "  Frontend: cd frontend && npm run dev"

