import sql from 'mssql'
import { config } from './config.js'
import { writeFileSync } from 'fs'

async function exportSchema() {
  console.log('📊 Exporting database schema...\n')

  try {
    const pool = await sql.connect(config)
    
    // Get all columns with their table info
    const result = await pool.request().query(`
      SELECT 
        s.name as schema_name,
        t.name as table_name,
        c.name as column_name,
        ty.name as data_type,
        c.max_length,
        c.precision,
        c.scale,
        c.is_nullable,
        c.is_identity,
        ISNULL(pk.is_primary_key, 0) as is_primary_key,
        ISNULL(fk.is_foreign_key, 0) as is_foreign_key,
        fk.referenced_table,
        fk.referenced_column,
        ep.value as column_description
      FROM sys.columns c
      INNER JOIN sys.tables t ON c.object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
      LEFT JOIN (
        SELECT ic.object_id, ic.column_id, 1 as is_primary_key
        FROM sys.index_columns ic
        INNER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        WHERE i.is_primary_key = 1
      ) pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id
      LEFT JOIN (
        SELECT 
          fkc.parent_object_id as object_id,
          fkc.parent_column_id as column_id,
          1 as is_foreign_key,
          OBJECT_NAME(fkc.referenced_object_id) as referenced_table,
          COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as referenced_column
        FROM sys.foreign_key_columns fkc
      ) fk ON c.object_id = fk.object_id AND c.column_id = fk.column_id
      LEFT JOIN sys.extended_properties ep ON ep.major_id = c.object_id 
        AND ep.minor_id = c.column_id 
        AND ep.name = 'MS_Description'
      WHERE t.is_ms_shipped = 0
      ORDER BY s.name, t.name, c.column_id
    `)

    // Group by table
    const tables = {}
    for (const row of result.recordset) {
      const fullTableName = `${row.schema_name}.${row.table_name}`
      if (!tables[fullTableName]) {
        tables[fullTableName] = {
          schema: row.schema_name,
          name: row.table_name,
          columns: []
        }
      }
      tables[fullTableName].columns.push({
        name: row.column_name,
        type: row.data_type,
        maxLength: row.max_length,
        precision: row.precision,
        scale: row.scale,
        nullable: row.is_nullable,
        identity: row.is_identity,
        primaryKey: row.is_primary_key === 1,
        foreignKey: row.is_foreign_key === 1 ? {
          table: row.referenced_table,
          column: row.referenced_column
        } : null,
        description: row.column_description
      })
    }

    const tableList = Object.values(tables)
    console.log(`Found ${tableList.length} tables`)
    
    // Calculate total columns
    const totalColumns = tableList.reduce((sum, t) => sum + t.columns.length, 0)
    console.log(`Total columns: ${totalColumns}`)

    // Save to JSON
    const output = {
      database: config.database,
      server: config.server,
      exportedAt: new Date().toISOString(),
      tables: tableList
    }
    
    writeFileSync('schema-export.json', JSON.stringify(output, null, 2))
    console.log('\n✅ Schema exported to schema-export.json')

    // Also generate SQL DDL
    let ddl = `-- Schema export for ${config.database}\n-- Exported at ${new Date().toISOString()}\n\n`
    
    for (const table of tableList) {
      ddl += `-- Table: ${table.schema}.${table.name}\n`
      ddl += `CREATE TABLE [${table.schema}].[${table.name}] (\n`
      
      const columnDefs = table.columns.map(col => {
        let def = `  [${col.name}] ${col.type.toUpperCase()}`
        if (['varchar', 'nvarchar', 'char', 'nchar'].includes(col.type)) {
          def += col.maxLength === -1 ? '(MAX)' : `(${col.maxLength})`
        } else if (['decimal', 'numeric'].includes(col.type)) {
          def += `(${col.precision}, ${col.scale})`
        }
        if (col.identity) def += ' IDENTITY'
        if (!col.nullable) def += ' NOT NULL'
        if (col.primaryKey) def += ' PRIMARY KEY'
        return def
      })
      
      ddl += columnDefs.join(',\n')
      ddl += '\n);\n\n'
    }
    
    writeFileSync('schema-export.sql', ddl)
    console.log('✅ DDL exported to schema-export.sql')

    await pool.close()
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

exportSchema()
