# Git 설정 및 Push 가이드

## 1. Git 사용자 정보 설정

### 로컬 저장소에만 설정 (이 프로젝트만)
```bash
cd /Users/Young/Desktop/alert_system
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 전역 설정 (모든 Git 프로젝트에 적용)
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 2. GitHub 인증 설정

### 방법 1: Personal Access Token 사용 (권장)

1. GitHub에서 Personal Access Token 생성:
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - 권한: `repo` 체크
   - 토큰 복사

2. Git에 토큰 설정:
```bash
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/alert_system.git
```

3. Push:
```bash
git push origin main
```

### 방법 2: SSH 키 사용

1. SSH 키 생성:
```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
```

2. 공개키 복사:
```bash
cat ~/.ssh/id_ed25519.pub
```

3. GitHub에 SSH 키 추가:
   - GitHub → Settings → SSH and GPG keys → New SSH key
   - 공개키 붙여넣기

4. 원격 저장소 URL 변경:
```bash
git remote set-url origin git@github.com:YOUR_USERNAME/alert_system.git
```

5. Push:
```bash
git push origin main
```

## 3. 자동 Push 스크립트

### auto-push.sh 생성
```bash
#!/bin/bash
# 변경사항 자동 커밋 및 푸시

cd /Users/Young/Desktop/alert_system

# 변경사항 확인
if [ -z "$(git status --porcelain)" ]; then
    echo "변경사항이 없습니다."
    exit 0
fi

# 변경사항 추가
git add -A

# 커밋 메시지 입력
read -p "커밋 메시지: " commit_message

# 커밋
git commit -m "$commit_message"

# Push
git push origin main

echo "✅ Push 완료!"
```

### 사용법
```bash
chmod +x auto-push.sh
./auto-push.sh
```

## 4. 모바일에서 Git 작업

### GitHub Mobile 앱 사용
1. GitHub Mobile 앱 설치
2. 저장소 열기
3. 파일 편집 및 커밋
4. Push 버튼 클릭

### Termux 사용 (Android)
```bash
# Git 설정
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 변경사항 커밋
git add .
git commit -m "작업 내용"

# Push
git push origin main
```

## 5. 자주 사용하는 Git 명령어

```bash
# 상태 확인
git status

# 변경사항 추가
git add .
git add 파일명

# 커밋
git commit -m "메시지"

# Push
git push origin main

# Pull (다른 기기에서 작업한 내용 가져오기)
git pull origin main

# 브랜치 생성 및 전환
git checkout -b feature/new-feature

# 브랜치 목록
git branch

# 원격 저장소 확인
git remote -v
```

## 6. 문제 해결

### 인증 실패
```bash
# Personal Access Token 재설정
git remote set-url origin https://NEW_TOKEN@github.com/USERNAME/REPO.git
```

### 충돌 해결
```bash
# 최신 변경사항 가져오기
git pull origin main

# 충돌 해결 후
git add .
git commit -m "충돌 해결"
git push origin main
```

