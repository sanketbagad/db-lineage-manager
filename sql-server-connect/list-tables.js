import sql from 'mssql'
import { config } from './config.js'

async function listTables() {
  console.log('📋 Fetching tables from SQL Server...\n')

  try {
    const pool = await sql.connect(config)
    
    // Get all tables with row counts
    const result = await pool.request().query(`
      SELECT 
        s.name as schema_name,
        t.name as table_name,
        p.rows as row_count,
        SUM(a.total_pages) * 8 as total_space_kb
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      INNER JOIN sys.indexes i ON t.object_id = i.object_id
      INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
      WHERE t.is_ms_shipped = 0
      GROUP BY s.name, t.name, p.rows
      ORDER BY s.name, t.name
    `)

    console.log(`Found ${result.recordset.length} tables:\n`)
    console.log('Schema'.padEnd(20) + 'Table'.padEnd(40) + 'Rows'.padStart(12) + 'Size (KB)'.padStart(12))
    console.log('-'.repeat(84))
    
    for (const row of result.recordset) {
      console.log(
        row.schema_name.padEnd(20) +
        row.table_name.padEnd(40) +
        row.row_count.toString().padStart(12) +
        row.total_space_kb.toString().padStart(12)
      )
    }

    await pool.close()
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

listTables()
