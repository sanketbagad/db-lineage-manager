# 🗂️ DB Lineage Manager

**Database Column Lineage Tracker & Analyzer**

A powerful web-based tool that helps developers understand how database columns flow through their codebase. Upload your source code, and DB Lineage Manager will automatically trace where and how each database column is used across your application.

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-blue)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Time Estimates](#time-estimates)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

DB Lineage Manager is a comprehensive solution for tracking and visualizing database column usage across your entire codebase. It automatically parses SQL schemas, ORM models, and source code to create an interactive lineage graph showing where each database column is read, written, updated, or joined.

### Why DB Lineage Manager?

- **Impact Analysis**: Understand what code will be affected before changing a database column
- **Documentation**: Automatically generate documentation of database usage patterns
- **Onboarding**: Help new developers quickly understand data flow in your application
- **Refactoring**: Safely refactor database schemas with confidence
- **Debugging**: Trace data flow issues across multiple files and services

## ✨ Key Features

### 🔍 Intelligent Code Analysis

- **Multi-Language Support**: Analyzes Go, JavaScript, TypeScript, Python, Java, Ruby, Rust, C#, and more
- **ORM Detection**: Recognizes and parses ORM patterns:
  - **Prisma** (TypeScript/JavaScript)
  - **SQLAlchemy** (Python)
  - **GORM** (Go)
  - **JPA/Hibernate** (Java)
  - **Sequelize** (JavaScript/TypeScript)
  - **TypeORM** (TypeScript)
- **SQL Schema Parsing**: Automatically extracts table and column definitions from SQL files
- **Smart Name Matching**: Handles different naming conventions (snake_case, camelCase, PascalCase)

### 📊 Visual Lineage Tracking

- **Interactive Flow Diagrams**: React Flow-based visualization of column usage
- **Column Map View**: Comprehensive overview of all columns and their usage statistics
- **Schema Explorer**: Browse database tables and their relationships
- **File Browser**: Navigate through source code files with language highlighting
- **Usage Detail Panel**: Click on any usage to see the exact code snippet and context

### 🎨 Advanced Usage Classification

The system automatically classifies column references into:
- **Read**: SELECT queries, find operations
- **Write**: INSERT operations, create methods
- **Update**: UPDATE queries, modification operations
- **Delete**: DELETE queries, removal operations
- **Join**: JOIN clauses, relation loading
- **Filter**: WHERE clauses, filter conditions
- **Projection**: Column selection, field mapping

### 🚀 Modern User Experience

- **Real-time Processing**: Watch your code being analyzed with live progress updates
- **Dark/Light Mode**: Automatic theme switching
- **Responsive Design**: Works on desktop and mobile devices
- **Fast & Efficient**: Lazy loading and optimized rendering
- **AI-Powered Descriptions**: Generate natural language descriptions of columns (OpenAI integration ready)

## 🛠️ Technology Stack

### Frontend
- **Next.js 16.1.6** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript 5.7.3** - Type safety
- **Tailwind CSS 3.4.17** - Styling
- **shadcn/ui** - UI components
- **React Flow 11.11.4** - Interactive diagrams
- **SWR 2.3.3** - Data fetching and caching
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - RESTful API
- **Neon PostgreSQL** - Serverless database
- **Vercel Blob Storage** - File storage
- **JWT + bcrypt** - Authentication
- **JSZip** - Archive processing

### DevOps & Tools
- **Vercel** - Deployment platform
- **Git** - Version control
- **ESLint** - Code linting
- **PostCSS** - CSS processing

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Dashboard  │  │ Project View │  │ Lineage Flow │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │ Projects │  │  Upload  │  │ Lineage  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Neon DB    │  │ Vercel Blob  │  │  Processing  │
│  PostgreSQL  │  │   Storage    │  │    Engine    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Processing Pipeline

```
Upload ZIP → Extract Files → Parse Schemas → Trace Lineage → Generate Visualizations
     │            │               │              │                    │
     ▼            ▼               ▼              ▼                    ▼
  Blob      Source Files    DB Schemas    Column Usages        React Flow
 Storage      Table          Table           Table              Nodes/Edges
```

### Data Flow

1. **File Upload**: User uploads a ZIP archive of source code
2. **File Extraction**: System extracts and stores files in database
3. **Schema Detection**: Analyzes SQL files and ORM models to extract table/column definitions
4. **Lineage Tracing**: Scans all source files to find column references
5. **Usage Classification**: Determines read/write/update/delete/join/filter patterns
6. **Visualization**: Generates interactive diagrams and reports

## 📦 Installation

### Prerequisites

- Node.js 18+ or Node.js 20+
- PostgreSQL database (or Neon account)
- npm, yarn, or pnpm
- Git

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/sanketbagad/db-lineage-manager.git
   cd db-lineage-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database Connection
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   
   # Authentication
   JWT_SECRET=your-secure-random-secret-key-here
   
   # Optional: AI Features (for column descriptions)
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Initialize the database**
   
   Run the schema creation script:
   ```bash
   psql $DATABASE_URL -f scripts/001_create_tables.sql
   ```
   
   Or manually execute the SQL in your PostgreSQL client.

5. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## 🚀 Usage

### Quick Start Guide

1. **Sign Up / Sign In**
   - Create an account or log in at the home page
   - Your session is secured with JWT tokens

2. **Create a Project**
   - Click "New Project" on the dashboard
   - Enter a project name and optional description
   - Click "Create"

3. **Upload Source Code**
   - Prepare your source code as a ZIP archive
   - Include SQL schema files, ORM model files, and application code
   - Drag and drop the ZIP file or click to browse
   - Wait for processing to complete

4. **Explore Lineage**
   - **Lineage Flow**: Interactive graph showing column usage
   - **Column Map**: Table view with usage statistics
   - **Schema**: Browse database structure
   - **Files**: Explore uploaded source files
   - **Jobs**: Monitor processing status

5. **Generate AI Descriptions** (Optional)
   - Click "Generate AI Descriptions" to get natural language explanations
   - Requires OpenAI API key configuration

### Supported File Types

- **SQL**: `.sql` files with CREATE TABLE statements
- **Go**: `.go` files with GORM models
- **Python**: `.py` files with SQLAlchemy models
- **TypeScript/JavaScript**: `.ts`, `.tsx`, `.js`, `.jsx` files with Prisma/TypeORM/Sequelize
- **Java**: `.java` files with JPA entities
- **Ruby**: `.rb` files
- **Rust**: `.rs` files
- **C#**: `.cs` files
- **Others**: `.graphql`, `.proto`, `.prisma`

### Best Practices

- **Include Schema Files**: Always include SQL schema files or ORM model definitions
- **Use Consistent Naming**: Stick to one naming convention (snake_case or camelCase)
- **Exclude Dependencies**: Don't include `node_modules`, `vendor`, or build directories
- **Keep Archives Small**: Process 10-50 MB at a time for best performance
- **Review Results**: Check the schema tab to ensure all tables were detected

## 🗄️ Database Schema

### Core Tables

#### `users`
User authentication and profile information.

#### `projects`
Top-level container for each codebase analysis.
- `status`: `pending` → `processing` → `completed` | `failed`

#### `source_files`
Individual source code files extracted from uploaded archives.

#### `db_schemas`
Database table definitions detected in the project.

#### `db_columns`
Column definitions for each table.
- Includes primary key, foreign key relationships
- Stores AI-generated descriptions

#### `column_usages`
Individual references to columns in source code.
- Links columns to source files
- Includes line numbers and code snippets
- Classifies usage type (read/write/update/etc.)

#### `processing_jobs`
Background job tracking for async operations.
- Job types: `file_scan`, `schema_parse`, `lineage_trace`, `ai_describe`

#### `sessions`
User session management for JWT authentication.

### Relationships

```
users (1) ──→ (N) projects
projects (1) ──→ (N) source_files
projects (1) ──→ (N) db_schemas
projects (1) ──→ (N) processing_jobs
db_schemas (1) ──→ (N) db_columns
db_columns (1) ──→ (N) column_usages
source_files (1) ──→ (N) column_usages
```

## 📡 API Documentation

### Authentication

#### `POST /api/auth/signup`
Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### `POST /api/auth/login`
Authenticate a user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token"
}
```

#### `GET /api/auth/me`
Get current user information.

#### `POST /api/auth/logout`
Log out the current user.

### Projects

#### `GET /api/projects`
List all projects for the authenticated user.

#### `POST /api/projects`
Create a new project.

**Request:**
```json
{
  "name": "My Application",
  "description": "E-commerce backend"
}
```

#### `GET /api/projects/[id]`
Get project details including files, schemas, and processing jobs.

#### `POST /api/projects/[id]/upload`
Upload source code ZIP file for analysis.

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "success": true,
  "filesProcessed": 42,
  "tablesFound": 8,
  "blobUrl": "https://..."
}
```

#### `GET /api/projects/[id]/lineage`
Get lineage data including column usages and summaries.

**Response:**
```json
{
  "usages": [
    {
      "column_id": "uuid",
      "column_name": "user_id",
      "table_name": "orders",
      "file_path": "src/services/order.ts",
      "line_number": 42,
      "usage_type": "filter",
      "code_snippet": "...",
      "language": "typescript"
    }
  ],
  "columnSummaries": [...]
}
```

#### `POST /api/projects/[id]/describe`
Generate AI descriptions for all columns in the project.

## ⏱️ Time Estimates

### Development Timeline

#### Phase 1: Core Foundation (✅ Completed)
**Estimated: 2-3 weeks | Actual: ~3 weeks**

- [x] Project setup and architecture - 2 days
- [x] Database schema design - 2 days
- [x] Authentication system (JWT + bcrypt) - 3 days
- [x] User interface components (shadcn/ui) - 4 days
- [x] Project management (CRUD) - 2 days
- [x] File upload and storage - 2 days

#### Phase 2: Schema & ORM Parsing (✅ Completed)
**Estimated: 2-3 weeks | Actual: ~3 weeks**

- [x] SQL schema parser - 3 days
- [x] Prisma schema parser - 2 days
- [x] SQLAlchemy parser - 2 days
- [x] GORM parser - 2 days
- [x] JPA/Hibernate parser - 2 days
- [x] TypeORM/Sequelize support - 2 days
- [x] Testing and refinement - 2 days

#### Phase 3: Lineage Tracing Engine (✅ Completed)
**Estimated: 2-3 weeks | Actual: ~3 weeks**

- [x] Column name matching algorithm - 3 days
- [x] Usage type classification - 3 days
- [x] Context analysis (5-line window) - 2 days
- [x] ORM-aware detection - 3 days
- [x] Performance optimization - 3 days

#### Phase 4: Visualization & UI (✅ Completed)
**Estimated: 2 weeks | Actual: ~2 weeks**

- [x] React Flow integration - 3 days
- [x] Interactive lineage diagram - 3 days
- [x] Column map table view - 2 days
- [x] Schema explorer - 2 days
- [x] File browser - 2 days
- [x] Usage detail panel - 2 days

#### Phase 5: Polish & Features (✅ Completed)
**Estimated: 1 week | Actual: ~1 week**

- [x] AI description generation - 2 days
- [x] Real-time progress updates - 1 day
- [x] Error handling - 1 day
- [x] Performance optimization - 2 days
- [x] UI/UX refinements - 1 day

**Total Development Time: ~12 weeks (3 months)**

### Future Enhancements Timeline

#### Phase 6: Message Queue Integration (Planned)
**Estimated: 2-3 weeks**

##### RabbitMQ Integration
**Purpose**: Asynchronous job processing for large codebases

- [ ] RabbitMQ setup and configuration - 1 day
- [ ] Job queue architecture design - 1 day
- [ ] Worker service implementation - 3 days
- [ ] Job status tracking - 2 days
- [ ] Retry logic and error handling - 2 days
- [ ] Dead letter queue handling - 1 day
- [ ] Testing and monitoring - 2 days

**Benefits**:
- Process large projects (1000+ files) without timeout
- Horizontal scaling with multiple workers
- Better fault tolerance and retry logic
- Decouple processing from API requests

**Architecture**:
```
API → RabbitMQ Queue → Worker Pool → Database
                            ↓
                       Update Status
```

#### Phase 7: Caching Layer (Planned)
**Estimated: 1-2 weeks**

##### Redis Integration
**Purpose**: Performance optimization and caching

- [ ] Redis setup and configuration - 1 day
- [ ] Cache strategy design - 1 day
- [ ] Lineage data caching - 2 days
- [ ] Session storage migration - 1 day
- [ ] Query result caching - 2 days
- [ ] Cache invalidation logic - 2 days
- [ ] Performance benchmarking - 2 days

**Benefits**:
- Faster lineage retrieval (sub-second response times)
- Reduced database load
- Better scalability for concurrent users
- Session management improvements

**Cache Strategy**:
- Project metadata: 5 minutes TTL
- Lineage data: 1 hour TTL
- Schema data: 30 minutes TTL
- Invalidate on project update

#### Phase 8: Advanced Features (Planned)
**Estimated: 3-4 weeks**

- [ ] Diff view for schema changes - 3 days
- [ ] Multi-project comparison - 3 days
- [ ] Export to PDF/CSV - 2 days
- [ ] Webhook notifications - 2 days
- [ ] CLI tool for local analysis - 4 days
- [ ] VS Code extension - 5 days
- [ ] GitHub integration - 3 days
- [ ] Slack/Discord notifications - 2 days

#### Phase 9: Enterprise Features (Planned)
**Estimated: 4-6 weeks**

- [ ] Team collaboration - 5 days
- [ ] Role-based access control - 3 days
- [ ] Audit logging - 3 days
- [ ] Custom naming conventions - 3 days
- [ ] Private deployment guide - 2 days
- [ ] SSO integration (SAML/OAuth) - 5 days
- [ ] Advanced analytics dashboard - 5 days

**Total Future Development: ~10-15 weeks (2.5-4 months)**

### Infrastructure & Scaling Considerations

#### Current Setup
- **Database**: Neon PostgreSQL (Serverless)
- **Storage**: Vercel Blob Storage
- **Hosting**: Vercel Edge Network
- **Processing**: Synchronous API routes

#### Recommended Production Setup

##### Small Scale (1-10 users)
- Current setup is sufficient
- **Estimated Cost**: $20-50/month

##### Medium Scale (10-100 users)
- Add Redis for caching
- Implement RabbitMQ for async processing
- Upgrade to dedicated PostgreSQL
- **Estimated Cost**: $100-300/month

##### Large Scale (100-1000+ users)
- Kubernetes cluster for workers
- Redis cluster
- RabbitMQ cluster
- CDN for static assets
- Read replicas for database
- **Estimated Cost**: $500-2000+/month

### Technology Integration Details

#### RabbitMQ Details
**Why RabbitMQ?**
- Industry-standard message broker
- Excellent Node.js support (amqplib)
- Flexible routing and exchange patterns
- Built-in monitoring and management UI

**Implementation Plan**:
```typescript
// Job Producer (API)
await publishJob('lineage:trace', {
  projectId: '...',
  fileCount: 100
});

// Worker Consumer
channel.consume('lineage:trace', async (msg) => {
  const job = JSON.parse(msg.content);
  await processLineage(job);
  channel.ack(msg);
});
```

**Queue Structure**:
- `file_scan_queue`: File extraction jobs
- `schema_parse_queue`: Schema parsing jobs
- `lineage_trace_queue`: Lineage tracing jobs
- `ai_describe_queue`: AI description jobs

#### Redis Details
**Why Redis?**
- Extremely fast in-memory data store
- Perfect for caching and sessions
- Built-in data expiration
- Pub/Sub for real-time updates

**Implementation Plan**:
```typescript
// Cache lineage data
await redis.set(
  `lineage:${projectId}`,
  JSON.stringify(lineageData),
  'EX', 3600 // 1 hour
);

// Retrieve cached data
const cached = await redis.get(`lineage:${projectId}`);
```

**Cache Keys**:
- `project:{id}`: Project metadata
- `lineage:{projectId}`: Lineage data
- `schema:{projectId}`: Schema information
- `session:{userId}`: User sessions

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Keep PRs focused and atomic

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New ORM parsers (Django ORM, ActiveRecord, etc.)
- 🌐 Language support (PHP, Scala, Kotlin, etc.)
- 📊 New visualization types
- 🎨 UI/UX improvements
- 📝 Documentation improvements
- 🧪 Test coverage

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js Team** - Amazing React framework
- **shadcn/ui** - Beautiful component library
- **React Flow** - Interactive diagram library
- **Neon** - Serverless PostgreSQL
- **Vercel** - Hosting and deployment platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/sanketbagad/db-lineage-manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sanketbagad/db-lineage-manager/discussions)
- **Email**: sanketbagad@example.com

## 🗺️ Roadmap

### Short Term (Q1 2026)
- [ ] RabbitMQ integration
- [ ] Redis caching
- [ ] Export functionality
- [ ] CLI tool

### Medium Term (Q2 2026)
- [ ] VS Code extension
- [ ] GitHub integration
- [ ] Team collaboration
- [ ] Advanced analytics

### Long Term (Q3-Q4 2026)
- [ ] Enterprise features
- [ ] Multi-cloud support
- [ ] Advanced AI features
- [ ] Custom integrations

---

**Made with ❤️ by [Sanket Bagad](https://github.com/sanketbagad)**

⭐ Star this repository if you find it helpful!
