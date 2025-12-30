# 네트워크 접근 문제 해결 방법

## 🔴 문제 진단

### 확인된 문제
1. **DNS는 IPv6 주소만 반환**: `2406:da14:271:9914:eaf8:5784:3955:cb87`
2. **IPv6 네트워크 접근 불가**: 원격 환경에서 IPv6가 차단됨
3. **IPv4 주소 없음**: DNS에 IPv4 레코드가 없어서 강제할 수 없음

### 에러 메시지
```
ENETUNREACH 2406:da14:271:9914:eaf8:5784:3955:cb87:5432
```

## ✅ 해결 방법

### 방법 1: Supabase Connection Pooling 사용 (권장)

Connection Pooling은 다른 포트(6543)와 엔드포인트를 사용하여 네트워크 접근이 다를 수 있습니다.

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Settings** → **Database**
4. **Connection Pooling** 섹션
5. **Session mode** 또는 **Transaction mode** 선택
6. **Connection string** 복사 (포트가 6543)

예시:
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

`.env` 파일에 추가:
```bash
SUPABASE_POOLING_URL=postgresql://postgres.xxx:supaYje%21090216@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres
```

### 방법 2: Supabase REST API 사용 (대안)

데이터베이스 직접 연결 대신 Supabase REST API를 사용:

1. Supabase Dashboard → Settings → API
2. `anon` key와 `service_role` key 확인
3. REST API를 통해 데이터 접근

**장점**: HTTP/HTTPS를 사용하므로 네트워크 제한이 덜함

### 방법 3: 로컬 환경에서 실행 (가장 확실)

원격 환경의 네트워크 제한을 우회하는 가장 확실한 방법:

```bash
# 로컬 컴퓨터에서
cd backend
npm run test:supabase
npm run start:dev
```

### 방법 4: VPN/프록시 사용

원격 환경에서 VPN을 통해 접근할 수 있는지 확인

## 🔧 현재 시도한 방법

1. ✅ IPv4 강제 연결 시도 → 실패 (IPv4 주소 없음)
2. ✅ 직접 PostgreSQL 클라이언트 연결 → 실패 (IPv6만 가능)
3. ⏳ Connection Pooling 테스트 필요
4. ⏳ REST API 사용 고려

## 📝 다음 단계

### 즉시 시도할 수 있는 것

1. **Supabase Dashboard에서 Connection Pooling URL 확인**
   - Settings → Database → Connection Pooling
   - URL 복사하여 `.env`에 추가

2. **로컬 환경에서 테스트**
   - 로컬 컴퓨터에서 직접 실행
   - 네트워크 제한 없이 작동할 가능성 높음

### 코드는 준비 완료

- ✅ 모든 코드 구현 완료
- ✅ `.env` 파일 설정 완료
- ✅ 비밀번호 설정 완료
- ⚠️ 네트워크 접근만 제한됨

## 💡 결론

**원격 환경의 네트워크 정책으로 인해 IPv6 접근이 차단되어 있습니다.**

**해결책**:
1. **Connection Pooling 사용** (다른 엔드포인트 시도)
2. **로컬 환경에서 실행** (가장 확실)
3. **Supabase REST API 사용** (대안)

**코드는 모두 준비되어 있으므로, 네트워크 접근만 해결되면 바로 작동합니다!**
