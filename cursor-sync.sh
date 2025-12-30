#!/bin/bash
# Cursor와 모바일 간 동기화 스크립트

cd /Users/Young/Desktop/alert_system

echo "🔄 Cursor 동기화 중..."

# 최신 변경사항 가져오기
echo "📥 Pulling latest changes..."
git pull origin main

# 로컬 변경사항 확인
if [ -n "$(git status --porcelain)" ]; then
    echo ""
    echo "⚠️  로컬 변경사항이 있습니다:"
    git status --short
    echo ""
    read -p "커밋하시겠습니까? (y/n): " response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        read -p "커밋 메시지: " commit_message
        git add -A
        git commit -m "$commit_message"
        echo "📤 Pushing changes..."
        git push origin main
    fi
else
    echo "✅ 로컬 변경사항 없음"
fi

echo ""
echo "✅ 동기화 완료!"

