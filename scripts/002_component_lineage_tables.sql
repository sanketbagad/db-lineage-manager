-- Migration: Add component-based lineage tables
-- Based on DB Lineage Feature Specification

-- ============================================
-- Applications table (for application-based selection)
-- ============================================
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add application_id to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE SET NULL;

-- ============================================
-- FILE_MASTER - Enhanced file metadata
-- ============================================
-- Note: We already have source_files, adding extra columns
ALTER TABLE source_files ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'UNKNOWN';
ALTER TABLE source_files ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE source_files ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT FALSE;

-- ============================================
-- COMPONENT_MASTER - All parsed components
-- ============================================
CREATE TABLE IF NOT EXISTS component_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_file_id UUID REFERENCES source_files(id) ON DELETE SET NULL,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL, -- TABLE, COLUMN, PROCEDURE, FUNCTION, QUERY, FUNCTION_CALL, etc.
  component_desc TEXT,
  display_name TEXT,
  parent_component_id UUID REFERENCES component_master(id) ON DELETE SET NULL,
  is_noise BOOLEAN DEFAULT FALSE,
  node_type TEXT, -- For visualization: TABLE, PROCEDURE, QUERY, FUNCTION
  color TEXT,
  order_seq INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_component_master_project_id ON component_master(project_id);
CREATE INDEX IF NOT EXISTS idx_component_master_type ON component_master(component_type);
CREATE INDEX IF NOT EXISTS idx_component_master_name ON component_master(component_name);
CREATE INDEX IF NOT EXISTS idx_component_master_parent ON component_master(parent_component_id);

-- ============================================
-- COMPONENT_TRACE - Parent-child relationships
-- ============================================
CREATE TABLE IF NOT EXISTS component_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fk_parent_component_id UUID NOT NULL REFERENCES component_master(id) ON DELETE CASCADE,
  fk_child_component_id UUID NOT NULL REFERENCES component_master(id) ON DELETE CASCADE,
  fk_parent_func_id UUID REFERENCES component_master(id) ON DELETE SET NULL,
  relationship_type TEXT, -- CONTAINS, CALLS, REFERENCES, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fk_parent_component_id, fk_child_component_id)
);

CREATE INDEX IF NOT EXISTS idx_component_trace_parent ON component_trace(fk_parent_component_id);
CREATE INDEX IF NOT EXISTS idx_component_trace_child ON component_trace(fk_child_component_id);

-- ============================================
-- FUNCTION_CALL_HIERARCHY - Hierarchical call graph
-- ============================================
CREATE TABLE IF NOT EXISTS function_call_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES component_master(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES component_master(id) ON DELETE CASCADE,
  hierarchy_level TEXT NOT NULL, -- L1, L2, L3, etc.
  call_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fch_parent ON function_call_hierarchy(parent_id);
CREATE INDEX IF NOT EXISTS idx_fch_child ON function_call_hierarchy(child_id);
CREATE INDEX IF NOT EXISTS idx_fch_level ON function_call_hierarchy(hierarchy_level);

-- ============================================
-- FUNCTION_CALL_MASTER - Maps function calls to definitions
-- ============================================
CREATE TABLE IF NOT EXISTS function_call_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_component_id UUID NOT NULL REFERENCES component_master(id) ON DELETE CASCADE,
  callee_component_id UUID REFERENCES component_master(id) ON DELETE SET NULL,
  function_def_id UUID REFERENCES component_master(id) ON DELETE SET NULL,
  is_dummy_call BOOLEAN DEFAULT FALSE,
  call_type TEXT, -- DIRECT, INDIRECT, DYNAMIC
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcm_caller ON function_call_master(caller_component_id);
CREATE INDEX IF NOT EXISTS idx_fcm_callee ON function_call_master(callee_component_id);
CREATE INDEX IF NOT EXISTS idx_fcm_func_def ON function_call_master(function_def_id);

-- ============================================
-- COMPONENT_SOURCE - Source code for components
-- ============================================
CREATE TABLE IF NOT EXISTS component_source (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES component_master(id) ON DELETE CASCADE,
  parent_component_id UUID REFERENCES component_master(id) ON DELETE SET NULL,
  source_code TEXT,
  start_line INTEGER,
  end_line INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_component_source_comp ON component_source(component_id);

-- ============================================
-- COMPONENT_CODE_LINE_DETAILS - Detailed line metadata
-- ============================================
CREATE TABLE IF NOT EXISTS component_code_line_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID NOT NULL REFERENCES component_master(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  line_content TEXT,
  line_type TEXT, -- DECLARATION, USAGE, DEFINITION, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccld_component ON component_code_line_details(component_id);
CREATE INDEX IF NOT EXISTS idx_ccld_line ON component_code_line_details(line_number);

-- ============================================
-- DB_LINEAGE_RESULT - Computed raw lineage rows
-- ============================================
CREATE TABLE IF NOT EXISTS db_lineage_result (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data_lineage_type TEXT NOT NULL, -- TABLE or COLUMN
  table_name TEXT NOT NULL,
  column_name TEXT,
  root_component_id UUID REFERENCES component_master(id) ON DELETE SET NULL,
  lineage_data JSONB, -- Serialized lineage tree
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlr_project ON db_lineage_result(project_id);
CREATE INDEX IF NOT EXISTS idx_dlr_table ON db_lineage_result(table_name);
CREATE INDEX IF NOT EXISTS idx_dlr_column ON db_lineage_result(column_name);
CREATE INDEX IF NOT EXISTS idx_dlr_type ON db_lineage_result(data_lineage_type);

-- ============================================
-- DB_LINEAGE_REPORT - Lineage generation reports
-- ============================================
CREATE TABLE IF NOT EXISTS db_lineage_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  column_name TEXT,
  lineage_json JSONB, -- Full serialized lineage response
  exception_stack_trace TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dlrpt_project ON db_lineage_report(project_id);
CREATE INDEX IF NOT EXISTS idx_dlrpt_status ON db_lineage_report(status);

-- ============================================
-- DB_LINEAGE_TABLE_FLOW_MASTER - ETL procedure flow
-- ============================================
CREATE TABLE IF NOT EXISTS db_lineage_table_flow_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_table TEXT NOT NULL,
  target_table TEXT,
  procedure_id UUID REFERENCES component_master(id) ON DELETE SET NULL,
  procedure_name TEXT,
  flow_sequence INTEGER,
  flow_type TEXT, -- ETL, TRANSFORM, LOAD, etc.
  parent_flow_id UUID REFERENCES db_lineage_table_flow_master(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dltfm_project ON db_lineage_table_flow_master(project_id);
CREATE INDEX IF NOT EXISTS idx_dltfm_source ON db_lineage_table_flow_master(source_table);
CREATE INDEX IF NOT EXISTS idx_dltfm_target ON db_lineage_table_flow_master(target_table);

-- ============================================
-- SYSTEM_CONTROL - Configuration settings
-- ============================================
CREATE TABLE IF NOT EXISTS system_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO system_control (config_key, config_value, description) VALUES
  ('ETL_DB_LINEAGE_FLAG', 'false', 'Enable ETL lineage extension'),
  ('COLUMN_COLORS', '{"TABLE": "#82c158", "QUERY": "#0a9ccd", "PROCEDURE": "#c34474", "FUNCTION": "#5283a2", "COLUMN": "#b2f1ca"}', 'Default colors for node types'),
  ('LINEAGE_CACHE_TTL', '3600', 'Cache TTL in seconds for lineage data'),
  ('MAX_HIERARCHY_DEPTH', '10', 'Maximum depth for hierarchy traversal')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- Additional indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_app_id ON projects(application_id);

-- ============================================
-- Views for common queries
-- ============================================

-- View: Tables with their columns for a project
CREATE OR REPLACE VIEW v_project_tables_columns AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  cm_table.id as table_id,
  cm_table.component_name as table_name,
  cm_col.id as column_id,
  cm_col.component_name as column_name,
  cm_col.component_desc as column_description
FROM projects p
JOIN component_master cm_table ON cm_table.project_id = p.id AND cm_table.component_type = 'TABLE'
LEFT JOIN component_master cm_col ON cm_col.parent_component_id = cm_table.id AND cm_col.component_type = 'COLUMN';

-- View: Component hierarchy
CREATE OR REPLACE VIEW v_component_hierarchy AS
SELECT 
  ct.id as trace_id,
  parent.id as parent_id,
  parent.component_name as parent_name,
  parent.component_type as parent_type,
  child.id as child_id,
  child.component_name as child_name,
  child.component_type as child_type,
  ct.relationship_type
FROM component_trace ct
JOIN component_master parent ON ct.fk_parent_component_id = parent.id
JOIN component_master child ON ct.fk_child_component_id = child.id;
