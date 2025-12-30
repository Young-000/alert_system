# 네트워크 접근 진단

## 테스트 결과

원격 환경에서 Supabase 데이터베이스 서버에 대한 네트워크 접근을 확인 중입니다.

## 가능한 문제

### 1. 방화벽/네트워크 제한
- 원격 환경(Cursor 백그라운드 에이전트)에서 외부 네트워크 접근이 제한될 수 있음
- 포트 5432 (PostgreSQL) 접근이 차단될 수 있음

### 2. IPv6 vs IPv4
- 원격 환경이 IPv6만 지원하거나 IPv4만 지원할 수 있음
- Supabase 서버가 IPv6 주소로만 응답할 수 있음

### 3. 보안 그룹 설정
- Supabase 프로젝트의 보안 그룹에서 특정 IP만 허용할 수 있음

## 해결 방법

### 옵션 1: 로컬 환경에서 실행 (가장 확실)
로컬 컴퓨터에서 직접 실행하면 네트워크 접근이 가능합니다:

```bash
cd backend
npm run test:supabase
npm run start:dev
```

### 옵션 2: Supabase 보안 설정 확인
1. Supabase Dashboard → Settings → Database
2. **Connection pooling** 사용 (포트 6543)
3. 또는 **IP allowlist** 확인

### 옵션 3: VPN/프록시 사용
원격 환경에서 VPN을 통해 접근할 수 있는지 확인

## 확인 사항

- [ ] 로컬 환경에서 연결 테스트
- [ ] Supabase Dashboard에서 연결 정보 확인
- [ ] 보안 그룹/IP allowlist 확인

## 결론

**원격 환경에서는 네트워크 접근이 제한될 가능성이 높습니다.**

**권장 사항**: 로컬 환경에서 테스트하거나, Supabase Dashboard에서 Connection Pooling을 사용하세요.
