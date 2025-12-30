const { Client } = require('pg');
require('dotenv').config();

async function testDirectConnection() {
  const supabaseUrl = process.env.SUPABASE_URL;
  
  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL not set');
    process.exit(1);
  }

  console.log('🔄 Testing direct PostgreSQL connection...');
  
  // URL 파싱
  const url = new URL(supabaseUrl);
  const password = decodeURIComponent(url.password);
  
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
    // IPv4 강제
    family: 4,
    // 연결 옵션
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
  });

  try {
    console.log(`📍 Connecting to ${url.hostname}:${url.port}...`);
    await client.connect();
    console.log('✅ Connection successful!');
    
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('⏰ Current time:', result.rows[0].current_time);
    console.log('📊 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
    
    await client.end();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testDirectConnection();
