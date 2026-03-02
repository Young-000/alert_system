# Alert System - 트러블슈팅

> 프로젝트 고유 이슈와 해결법. 공통 이슈는 workspace/.claude/docs/TROUBLESHOOTING.md 참조.

---
## Render Cold Start (해결됨)
**증상**: Backend 첫 요청 시 ~30초 지연
**원인**: Render Free Tier의 cold start
**해결**: AWS ECS Fargate + CloudFront로 전환 완료. 항상 실행 중인 컨테이너로 cold start 없음.

---
## HTTPS 미지원 (해결됨)
**증상**: ALB가 HTTP만 지원하여 브라우저 보안 경고
**원인**: ALB에 SSL 인증서 미설정
**해결**: CloudFront를 ALB 앞에 배치하여 자동 HTTPS 제공.

---
## In-Memory Scheduler 손실 (해결됨)
**증상**: 서버 재시작 시 모든 알림 스케줄 소실
**원인**: Node.js 메모리에 cron 스케줄 저장
**해결**: AWS EventBridge Scheduler로 영구 저장. 서버 상태와 무관하게 스케줄 유지.

---
## ElastiCache Redis 미활성
**증상**: BullMQ 큐가 동작하지 않아 비동기 작업 처리 불가
**원인**: ElastiCache Redis 인스턴스가 아직 프로비저닝되지 않음
**해결**: (미해결) Terraform으로 ElastiCache 인스턴스 생성 필요. 비용 고려하여 t3.micro 인스턴스 권장. 현재는 동기 처리로 우회 중.

---
## ECS 배포 후 Health Check 실패
**증상**: ECS 서비스 배포 후 태스크가 계속 재시작
**원인**: ALB Health Check 경로 미설정 또는 앱 시작 시간 초과
**해결**: NestJS에 `/health` 엔드포인트 추가. ALB Health Check 경로를 `/health`로 설정. Health Check 간격 및 타임아웃 조정 (interval: 30s, timeout: 10s, healthy threshold: 2).

---
## Docker 빌드 아키텍처 불일치
**증상**: 로컬(M1/M2 Mac)에서 빌드한 이미지가 ECS에서 실행 실패
**원인**: ARM64(Mac) vs AMD64(ECS) 아키텍처 차이
**해결**: 빌드 시 `--platform linux/amd64` 플래그 필수 사용.
```bash
docker build --platform linux/amd64 -t alert-system .
```

---
## SSM Parameter 접근 실패
**증상**: ECS 태스크에서 환경변수를 읽지 못함
**원인**: ECS Task Role에 SSM 읽기 권한 미부여
**해결**: Task Role의 IAM 정책에 `ssm:GetParameters` 권한 추가. SSM 파라미터 ARN 패턴: `arn:aws:ssm:ap-northeast-2:378898678278:parameter/alert-system/prod/*`

---
## EventBridge Scheduler 알림 미발송
**증상**: 설정된 시간에 알림이 발송되지 않음
**원인**: Scheduler가 호출하는 API Destination 인증 실패 또는 타겟 URL 오류
**해결**:
1. Schedule Group `alert-system-prod-alerts` 확인
2. API Destination `alert-system-prod-scheduler-api` 연결 설정 확인
3. CloudWatch Logs에서 DLQ 메시지 확인
4. Scheduler Role ARN 권한 확인

---
## Solapi 알림톡 발송 실패
**증상**: 카카오 알림톡이 수신자에게 도달하지 않음
**원인**: 템플릿 ID 미매칭, 변수 포맷 오류, 또는 수신자 카카오톡 미사용
**해결**:
1. Template ID (`KA01TP2601181035243285qjwlwSLm5X`) 확인
2. PF ID (`KA01PF260118103514818QktedIWetBs`) 확인
3. 메시지 변수가 템플릿 변수와 정확히 일치하는지 확인
4. 수신자 전화번호 형식: `01012345678` (하이픈 없이)

---
## JSX 조건부 렌더링 버그
**증상**: 특정 조건에서 UI 요소가 렌더링되지 않거나 잘못 표시됨
**원인**: 중첩된 모순 조건 (예: `!showForm && (...showForm && <Form/>...)`)
**해결**: CLAUDE.md의 "코드 품질 체크리스트 - JSX 조건부 렌더링 검증" 항목 참조. 조건부 렌더링은 컴포넌트 최상위에서 명확하게 분리.

---
## Backend 내 Render Dead Config
**증상**: Render 관련 설정 파일이 프로젝트에 남아있어 혼란 유발
**원인**: Render -> AWS 마이그레이션 후 설정 파일 미정리
**해결**: (미해결) `render.yaml`, Render 관련 환경변수 참조 등 제거 필요.

---
*마지막 업데이트: 2026-02-13*
