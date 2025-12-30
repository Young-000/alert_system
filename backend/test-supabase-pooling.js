const { Client } = require('pg');
require('dotenv').config();

async function testPoolingConnection() {
  console.log('🔄 Testing Supabase Connection Pooling...');
  console.log('💡 Connection Pooling uses port 6543 and may have different network access');
  
  // Connection Pooling URL (포트 6543)
  // Supabase Dashboard > Settings > Database > Connection Pooling에서 확인
  const poolingUrl = process.env.SUPABASE_POOLING_URL || process.env.SUPABASE_URL?.replace(':5432', ':6543');
  
  if (!poolingUrl) {
    console.error('❌ SUPABASE_POOLING_URL not set');
    console.log('💡 Supabase Dashboard > Settings > Database > Connection Pooling에서 URL 복사');
    process.exit(1);
  }

  const url = new URL(poolingUrl);
  const password = decodeURIComponent(url.password);
  
  console.log(`📍 Trying Connection Pooling: ${url.hostname}:${url.port}`);
  
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    family: 4, // IPv4 강제
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Connection Pooling successful!');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('⏰ Current time:', result.rows[0].current_time);
    
    await client.end();
    console.log('\n✅ Use Connection Pooling URL in .env file!');
  } catch (error) {
    console.error('\n❌ Connection Pooling also failed:', error.message);
    console.error('Error code:', error.code);
    console.log('\n💡 원격 환경의 네트워크 제한으로 인해 연결이 불가능합니다.');
    console.log('💡 로컬 환경에서 테스트하거나, Supabase Dashboard에서 다른 연결 방법을 확인하세요.');
    process.exit(1);
  }
}

testPoolingConnection();
