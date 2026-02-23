import sql from 'mssql'
import ExcelJS from 'exceljs'
import { config } from './config.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TABLES = [
  // Core component tables
  'COMPONENT_MASTER',
  'COMPONENT_TRACE',
  'FUNCTION_CALL_HIERARCHY',
  'FUNCTION_CALL_MASTER',
  'FILE_MASTER',

  // Source and line metadata
  'COMPONENT_SOURCE',
  'COMPONENT_CODE_LINE_DETAILS',

  // Lineage storage
  'DB_LINEAGE_RESULT',
  'DB_LINEAGE_REPORT',
  'DB_LINEAGE_TABLE_FLOW_MASTER',

  // Configuration
  'SYSTEM_CONTROL',
]

async function exportSampleData() {
  console.log('📊 Exporting sample data (10 rows per table) to Excel...\n')

  let pool
  try {
    pool = await sql.connect(config)
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'DB Lineage System'
    workbook.created = new Date()

    for (const tableName of TABLES) {
      console.log(`  → Querying ${tableName}...`)

      try {
        // Fetch top 10 rows
        const result = await pool.request().query(`SELECT TOP 10 * FROM [${tableName}]`)
        const rows = result.recordset
        const columns = result.recordset.columns
          ? Object.keys(result.recordset.columns)
          : rows.length > 0
            ? Object.keys(rows[0])
            : []

        // Create worksheet (sheet name max 31 chars)
        const sheetName = tableName.length > 31 ? tableName.substring(0, 31) : tableName
        const worksheet = workbook.addWorksheet(sheetName)

        if (columns.length === 0) {
          worksheet.addRow(['(No columns or data found)'])
          console.log(`    ⚠ No data found in ${tableName}`)
          continue
        }

        // Add header row with styling
        const headerRow = worksheet.addRow(columns)
        headerRow.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          }
        })

        // Add data rows
        for (const row of rows) {
          const values = columns.map((col) => {
            const val = row[col]
            // Convert dates to readable strings, handle buffers
            if (val instanceof Date) return val.toISOString()
            if (Buffer.isBuffer(val)) return `<Buffer ${val.length} bytes>`
            if (val === null || val === undefined) return ''
            return val
          })
          const dataRow = worksheet.addRow(values)
          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            }
          })
        }

        // Auto-fit column widths (approximate)
        worksheet.columns.forEach((column) => {
          let maxLength = 10
          column.eachCell({ includeEmpty: true }, (cell) => {
            const cellLength = cell.value ? cell.value.toString().length : 0
            if (cellLength > maxLength) maxLength = cellLength
          })
          column.width = Math.min(maxLength + 2, 50) // cap at 50
        })

        // Freeze the header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }]

        // Add auto-filter
        if (columns.length > 0 && rows.length > 0) {
          worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: rows.length + 1, column: columns.length },
          }
        }

        console.log(`    ✅ ${rows.length} rows exported`)
      } catch (tableErr) {
        console.error(`    ❌ Error querying ${tableName}: ${tableErr.message}`)
        // Still add a sheet with the error message
        const worksheet = workbook.addWorksheet(
          tableName.length > 31 ? tableName.substring(0, 31) : tableName
        )
        worksheet.addRow([`Error: ${tableErr.message}`])
      }
    }

    // Add a summary sheet at the beginning
    const summarySheet = workbook.addWorksheet('SUMMARY', {
      properties: { tabColor: { argb: 'FF00B050' } },
    })
    workbook.moveWorksheet('SUMMARY', 0) // move to first position

    summarySheet.addRow(['Table Name', 'Category', 'Sheet Link'])
    summarySheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E75B6' },
      }
    })

    const categories = {
      COMPONENT_MASTER: 'Core Component',
      COMPONENT_TRACE: 'Core Component',
      FUNCTION_CALL_HIERARCHY: 'Core Component',
      FUNCTION_CALL_MASTER: 'Core Component',
      FILE_MASTER: 'Core Component',
      COMPONENT_SOURCE: 'Source & Line Metadata',
      COMPONENT_CODE_LINE_DETAILS: 'Source & Line Metadata',
      DB_LINEAGE_RESULT: 'Lineage Storage',
      DB_LINEAGE_REPORT: 'Lineage Storage',
      DB_LINEAGE_TABLE_FLOW_MASTER: 'Lineage Storage',
      SYSTEM_CONTROL: 'Configuration',
    }

    TABLES.forEach((table, idx) => {
      summarySheet.addRow([table, categories[table] || 'Unknown', `→ Click sheet tab`])
    })

    summarySheet.columns = [
      { width: 35 },
      { width: 25 },
      { width: 20 },
    ]

    // Write to file
    const outputPath = path.join(__dirname, 'sample-data-export.xlsx')
    await workbook.xlsx.writeFile(outputPath)

    console.log(`\n✅ Excel file saved to: ${outputPath}`)
    console.log(`   Sheets: SUMMARY + ${TABLES.length} table sheets`)
  } catch (err) {
    console.error('❌ Connection error:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    if (pool) await pool.close()
  }
}

exportSampleData()
