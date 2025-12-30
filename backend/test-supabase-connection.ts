import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { UserEntity } from './src/infrastructure/persistence/typeorm/user.entity';
import { AlertEntity } from './src/infrastructure/persistence/typeorm/alert.entity';
import { AlertAlertTypeEntity } from './src/infrastructure/persistence/typeorm/alert-alert-type.entity';
import { PushSubscriptionEntity } from './src/infrastructure/persistence/typeorm/push-subscription.entity';

// .env 파일 로드
dotenv.config();

async function testConnection() {
  const supabaseUrl = process.env.SUPABASE_URL;
  
  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL 환경 변수가 설정되지 않았습니다.');
    console.log('💡 .env 파일에 SUPABASE_URL을 설정하세요.');
    console.log('   예: SUPABASE_URL=postgresql://postgres:[PASSWORD]@db.ayibvijmjygujjieueny.supabase.co:5432/postgres');
    process.exit(1);
  }

  // 비밀번호가 설정되지 않았는지 확인
  if (supabaseUrl.includes('[YOUR-PASSWORD]') || supabaseUrl.includes('[PASSWORD]')) {
    console.error('❌ 비밀번호를 설정해주세요.');
    console.log('💡 .env 파일의 SUPABASE_URL에서 [YOUR-PASSWORD] 또는 [PASSWORD]를 실제 비밀번호로 교체하세요.');
    process.exit(1);
  }

  console.log('🔄 Supabase 연결 테스트 중...');
  console.log(`📍 Host: db.ayibvijmjygujjieueny.supabase.co`);

  // URL 파싱하여 개별 옵션으로 설정
  const urlObj = new URL(supabaseUrl);
  const password = decodeURIComponent(urlObj.password);
  
  console.log(`🔍 연결 정보:`);
  console.log(`   Host: ${urlObj.hostname}`);
  console.log(`   Port: ${urlObj.port}`);
  console.log(`   Database: ${urlObj.pathname.slice(1)}`);
  console.log(`   Username: ${urlObj.username}`);
  console.log(`   Password: ${password.substring(0, 3)}*** (비밀번호 확인됨)`);
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: urlObj.hostname,
    port: parseInt(urlObj.port),
    username: urlObj.username,
    password: password,
    database: urlObj.pathname.slice(1), // '/' 제거
    ssl: { rejectUnauthorized: false },
    entities: [UserEntity, AlertEntity, AlertAlertTypeEntity, PushSubscriptionEntity],
    synchronize: false, // 테스트용이므로 false
  });

  try {
    await dataSource.initialize();
    console.log('✅ Supabase 연결 성공!');
    
    // 간단한 쿼리 테스트
    const result = await dataSource.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('⏰ 현재 시간:', result[0].current_time);
    console.log('📊 PostgreSQL 버전:', result[0].pg_version.split(' ')[0] + ' ' + result[0].pg_version.split(' ')[1]);
    
    await dataSource.destroy();
    console.log('\n✅ 연결 종료 완료');
    console.log('🎉 이제 서버를 시작할 수 있습니다: npm run start:dev');
  } catch (error: any) {
    console.error('\n❌ 연결 실패:', error.message);
    console.log('\n💡 확인사항:');
    console.log('   1. 비밀번호가 올바른지 확인하세요');
    console.log('   2. Supabase 프로젝트가 활성화되어 있는지 확인하세요');
    console.log('   3. 네트워크 연결을 확인하세요');
    console.log('   4. .env 파일의 SUPABASE_URL 형식이 올바른지 확인하세요');
    process.exit(1);
  }
}

testConnection();
