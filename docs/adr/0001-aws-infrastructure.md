# ADR 0001: AWS 인프라 선택

## 상태
승인됨 (2026-01-28)

## 컨텍스트
Alert System 백엔드 배포를 위한 인프라 선택이 필요했습니다. 초기에는 Render Free Tier를 사용했으나 다음 문제가 있었습니다:

1. **Cold Start 지연**: 무료 플랜에서 15분 비활성 시 슬립 → 첫 요청 30초+ 지연
2. **스케줄러 손실**: 서버 재시작 시 인메모리 스케줄 전체 손실
3. **확장성 제한**: 무료 플랜 리소스 제한

## 결정
AWS ECS Fargate + EventBridge Scheduler 조합을 선택했습니다.

### 선택된 아키텍처
```
CloudFront (HTTPS) → ALB → ECS Fargate (NestJS)
                              ↓
                    EventBridge Scheduler (알림)
                              ↓
                    Supabase PostgreSQL
```

## 대안 검토

| 옵션 | 장점 | 단점 | 결정 |
|------|------|------|------|
| Render Free | 무료, 간편 | Cold Start, 스케줄 손실 | ❌ 기각 |
| Railway | 저렴, 간편 | 스케줄링 미지원 | ❌ 기각 |
| AWS Lambda | 서버리스, 저렴 | Cold Start, NestJS 비적합 | ❌ 기각 |
| **AWS ECS Fargate** | 항상 실행, 확장성, 표준 | 비용 (월 ~$30) | ✅ 선택 |

## 근거

1. **업계 표준**: AWS는 가장 널리 사용되는 클라우드 플랫폼
2. **스케줄러 영속성**: EventBridge Scheduler로 서버 재시작과 무관하게 스케줄 유지
3. **Cold Start 없음**: Fargate Always Running으로 즉시 응답
4. **학습 가치**: AWS 경험은 이력서에 가치 있음
5. **확장성**: 트래픽 증가 시 Auto Scaling 가능

## 결과

### 긍정적
- API 응답 시간 30초 → 200ms 이하로 개선
- 알림 스케줄 100% 유지 (서버 재시작 무관)
- CloudFront로 HTTPS 자동 제공

### 부정적
- 월 비용 약 $30 발생
- 초기 설정 복잡도 증가

## 참조
- [AWS ECS 문서](https://docs.aws.amazon.com/ecs/)
- [EventBridge Scheduler 문서](https://docs.aws.amazon.com/eventbridge/latest/userguide/scheduler.html)
