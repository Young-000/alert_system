# 모바일에서 Cursor로 작업 이어가기

## 방법 1: GitHub Codespaces 사용 (가장 추천)

### 설정 방법
1. GitHub 저장소에서 "Code" 버튼 클릭
2. "Codespaces" 탭 선택
3. "Create codespace on main" 클릭
4. 브라우저에서 VS Code 환경 열림
5. 모바일 브라우저에서도 접속 가능!

### Cursor와 연동
- Codespaces에서 작업한 내용을 GitHub에 Push
- 로컬 Cursor에서 `git pull`로 동기화
- 또는 Codespaces에서 직접 Cursor 확장 사용 (제한적)

## 방법 2: Git 기반 워크플로우 (가장 실용적)

### 모바일에서 작업
```bash
# 1. 모바일에서 GitHub Mobile 또는 Termux로 코드 수정
# 2. 커밋 및 Push
git add .
git commit -m "작업 내용"
git push origin main
```

### Cursor에서 이어가기
```bash
# Cursor에서 Pull
git pull origin main

# 작업 계속...
# 완료 후 Push
git add .
git commit -m "작업 내용"
git push origin main
```

### 자동 동기화 스크립트
```bash
# sync.sh 생성
#!/bin/bash
echo "🔄 동기화 중..."
git pull origin main
echo "✅ 동기화 완료!"
```

## 방법 3: VS Code Server (자체 서버 필요)

### 서버에 설치
```bash
curl -fsSL https://code-server.dev/install.sh | sh
code-server --bind-addr 0.0.0.0:8080 --auth password
```

### 모바일에서 접속
- 브라우저에서 `http://YOUR_SERVER_IP:8080` 접속
- VS Code 웹 인터페이스 사용
- Cursor 확장은 사용 불가하지만, VS Code와 유사한 환경

## 방법 4: Cursor Cloud (향후 출시 예정)

- Cursor가 클라우드 버전을 출시하면 가장 이상적
- 현재는 베타 테스트 중일 수 있음

## 추천 워크플로우

### 일상적인 작업 흐름
```
1. 집/사무실: Cursor에서 작업
   → git commit && git push

2. 지하철/외부: 모바일에서 간단한 수정
   → GitHub Mobile로 커밋 & Push

3. 집/사무실: Cursor에서 Pull
   → git pull origin main
   → 작업 계속
```

### 자동화 스크립트
```bash
# cursor-sync.sh
#!/bin/bash
cd /Users/Young/Desktop/alert_system

echo "📥 최신 변경사항 가져오기..."
git pull origin main

echo "📤 로컬 변경사항 확인..."
if [ -n "$(git status --porcelain)" ]; then
    echo "변경사항이 있습니다. 커밋하시겠습니까? (y/n)"
    read -r response
    if [ "$response" = "y" ]; then
        git add -A
        git commit -m "Auto commit: $(date '+%Y-%m-%d %H:%M:%S')"
        git push origin main
    fi
fi

echo "✅ 동기화 완료!"
```

## 모바일 앱 추천

### iOS
- **GitHub Mobile**: 가장 간단한 Git 작업
- **Working Copy**: 고급 Git 기능
- **CodeSandbox**: 코드 편집 및 실행

### Android
- **GitHub Mobile**: 기본 Git 작업
- **Termux**: 완전한 터미널 환경
- **Acode**: 코드 에디터

## 팁

1. **작은 커밋**: 모바일에서 작업할 때는 작은 단위로 커밋
2. **브랜치 사용**: 모바일 작업은 별도 브랜치에서
3. **자동 동기화**: Cursor 시작 시 자동으로 Pull하는 스크립트 사용

