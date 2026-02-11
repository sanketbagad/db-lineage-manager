-- Users table for custom auth
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  repo_url TEXT,
  blob_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source files found in the project
CREATE TABLE IF NOT EXISTS source_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'unknown',
  content TEXT,
  parsed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DB schemas extracted from project
CREATE TABLE IF NOT EXISTS db_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Columns in each schema table
CREATE TABLE IF NOT EXISTS db_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id UUID NOT NULL REFERENCES db_schemas(id) ON DELETE CASCADE,
  column_name TEXT NOT NULL,
  data_type TEXT,
  is_primary_key BOOLEAN DEFAULT FALSE,
  is_foreign_key BOOLEAN DEFAULT FALSE,
  foreign_table TEXT,
  foreign_column TEXT,
  ai_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Column usages - where each column is referenced in source files
CREATE TABLE IF NOT EXISTS column_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES db_columns(id) ON DELETE CASCADE,
  source_file_id UUID NOT NULL REFERENCES source_files(id) ON DELETE CASCADE,
  line_number INTEGER,
  usage_type TEXT NOT NULL DEFAULT 'read' CHECK (usage_type IN ('read', 'write', 'update', 'delete', 'join', 'filter', 'projection')),
  code_snippet TEXT,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('file_scan', 'schema_parse', 'lineage_trace', 'ai_describe')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table for auth
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_source_files_project_id ON source_files(project_id);
CREATE INDEX IF NOT EXISTS idx_source_files_language ON source_files(language);
CREATE INDEX IF NOT EXISTS idx_db_schemas_project_id ON db_schemas(project_id);
CREATE INDEX IF NOT EXISTS idx_db_columns_schema_id ON db_columns(schema_id);
CREATE INDEX IF NOT EXISTS idx_column_usages_column_id ON column_usages(column_id);
CREATE INDEX IF NOT EXISTS idx_column_usages_source_file_id ON column_usages(source_file_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_id ON processing_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
