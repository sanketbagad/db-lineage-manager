import sql from 'mssql'
import { config } from './config.js'

async function testConnection() {
  console.log('🔌 Attempting to connect to SQL Server...')
  console.log(`   Server: ${config.server}`)
  console.log(`   Database: ${config.database}`)
  console.log(`   User: ${config.user}`)
  console.log('')

  try {
    const pool = await sql.connect(config)
    console.log('✅ Connection successful!')
    
    // Test query
    const result = await pool.request().query('SELECT @@VERSION as version')
    console.log('\n📊 SQL Server Version:')
    console.log(result.recordset[0].version)
    
    // Get database info
    const dbInfo = await pool.request().query(`
      SELECT 
        DB_NAME() as database_name,
        SUSER_NAME() as login_name,
        USER_NAME() as user_name,
        @@SERVERNAME as server_name
    `)
    console.log('\n📋 Connection Info:')
    console.log(dbInfo.recordset[0])

    await pool.close()
    console.log('\n🔒 Connection closed.')
  } catch (err) {
    console.error('❌ Connection failed!')
    console.error(`   Error: ${err.message}`)
    
    if (err.code === 'ESOCKET') {
      console.error('\n💡 Possible causes:')
      console.error('   - Server IP not reachable (check VPN/network)')
      console.error('   - SQL Server not running on that IP')
      console.error('   - Firewall blocking port 1433')
    } else if (err.code === 'ELOGIN') {
      console.error('\n💡 Authentication failed - check username/password')
    }
    
    process.exit(1)
  }
}

testConnection()
