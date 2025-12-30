#!/bin/bash

echo "🔍 두 가지 비밀번호 테스트 중..."

# 첫 번째 비밀번호 테스트
echo ""
echo "📌 테스트 1: supaYje!230209"
cat > .env.test1 << EOF
SUPABASE_URL=postgresql://postgres:supaYje%21230209@db.ayibvijmjygujjieueny.supabase.co:5432/postgres
NODE_ENV=development
PORT=3000
EOF

export $(cat .env.test1 | xargs)
timeout 5 npm run test:supabase 2>&1 | grep -E "(✅|❌|연결)" || echo "타임아웃 또는 에러"

# 두 번째 비밀번호 테스트
echo ""
echo "📌 테스트 2: supaYje!090216"
cat > .env.test2 << EOF
SUPABASE_URL=postgresql://postgres:supaYje%21090216@db.ayibvijmjygujjieueny.supabase.co:5432/postgres
NODE_ENV=development
PORT=3000
EOF

export $(cat .env.test2 | xargs)
timeout 5 npm run test:supabase 2>&1 | grep -E "(✅|❌|연결)" || echo "타임아웃 또는 에러"

echo ""
echo "✅ 테스트 완료"
