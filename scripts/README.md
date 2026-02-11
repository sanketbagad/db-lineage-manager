# Database Schema Migrations

This folder contains SQL migration scripts for the DB Lineage system.

## Migration Files

### 001_create_tables.sql
Initial schema with basic tables:
- `users` - User authentication
- `projects` - Project metadata
- `source_files` - Uploaded source files
- `db_schemas` - Database tables extracted
- `db_columns` - Table columns
- `column_usages` - Where columns are used in code
- `processing_jobs` - Background job tracking
- `sessions` - User sessions

### 002_component_lineage_tables.sql
Extended schema for component-based lineage (matching the docs.txt specification):

#### New Tables:
- `applications` - Group projects by application
- `component_master` - All parsed components (tables, procedures, functions, queries)
- `component_trace` - Parent-child relationships between components
- `function_call_hierarchy` - Hierarchical call graphs (L1, L2, etc.)
- `function_call_master` - Maps function calls to definitions
- `component_source` - Source code for components with line numbers
- `component_code_line_details` - Line-level metadata
- `db_lineage_result` - Computed lineage data (cached)
- `db_lineage_report` - Lineage generation reports with timing/errors
- `db_lineage_table_flow_master` - ETL procedure flows
- `system_control` - System configuration flags

#### Schema Changes:
- Added `application_id` to `projects` table
- Added `file_type`, `file_name`, `is_processed` to `source_files`

#### Default Configuration:
- `ETL_DB_LINEAGE_FLAG` - Enable/disable ETL lineage extension
- `COLUMN_COLORS` - Node colors for visualization
- `LINEAGE_CACHE_TTL` - Redis cache TTL in seconds
- `MAX_HIERARCHY_DEPTH` - Maximum lineage traversal depth

## Running Migrations

Execute the SQL files against your PostgreSQL database in order:

```bash
# Using psql
psql $DATABASE_URL -f scripts/001_create_tables.sql
psql $DATABASE_URL -f scripts/002_component_lineage_tables.sql

# Or via a migration tool
```

## Environment Variables

Add these to your `.env.local`:

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional - for caching
REDIS_URL=redis://localhost:6379
```

## Views

The migration creates helpful views:
- `v_project_tables_columns` - Tables and columns for a project
- `v_component_hierarchy` - Component parent-child relationships
