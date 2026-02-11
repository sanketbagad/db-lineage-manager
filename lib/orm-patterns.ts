/**
 * ORM and framework patterns for each language.
 * Each pattern has a regex to detect whether a line involves ORM usage,
 * and a method to extract column/field references from it.
 */

export interface OrmDetection {
  orm: string
  language: string
  /** Patterns that indicate this ORM is used in the file */
  fileIndicators: RegExp[]
  /** Patterns that detect column/field usage on a per-line basis.
   *  Each has: regex, and which usage type it implies */
  usagePatterns: {
    regex: RegExp
    usageType: "read" | "write" | "update" | "delete" | "join" | "filter" | "projection" | "definition"
    description: string
  }[]
  /** Patterns to extract model-to-table mappings from schema/model definitions */
  modelPatterns: {
    regex: RegExp
    tableGroup: number
    description: string
  }[]
  /** Patterns to extract field-to-column mappings (struct tags, decorators, etc.) */
  fieldPatterns: {
    regex: RegExp
    fieldGroup: number
    columnGroup: number
    description: string
  }[]
}

export const ORM_PATTERNS: OrmDetection[] = [
  // ========== PRISMA (TypeScript / JavaScript) ==========
  {
    orm: "Prisma",
    language: "typescript",
    fileIndicators: [
      /from\s+['"]@prisma\/client['"]/,
      /PrismaClient/,
      /prisma\.\w+\.(findMany|findUnique|findFirst|create|update|delete|upsert|aggregate|groupBy|count)/,
    ],
    usagePatterns: [
      { regex: /prisma\.\w+\.findMany|prisma\.\w+\.findFirst|prisma\.\w+\.findUnique/, usageType: "read", description: "Prisma read query" },
      { regex: /prisma\.\w+\.create|prisma\.\w+\.createMany/, usageType: "write", description: "Prisma create" },
      { regex: /prisma\.\w+\.update|prisma\.\w+\.updateMany|prisma\.\w+\.upsert/, usageType: "update", description: "Prisma update" },
      { regex: /prisma\.\w+\.delete|prisma\.\w+\.deleteMany/, usageType: "delete", description: "Prisma delete" },
      { regex: /select\s*:\s*\{/, usageType: "projection", description: "Prisma select" },
      { regex: /where\s*:\s*\{/, usageType: "filter", description: "Prisma where" },
      { regex: /include\s*:\s*\{/, usageType: "join", description: "Prisma include (relation join)" },
      { regex: /orderBy\s*:\s*\{/, usageType: "read", description: "Prisma orderBy" },
    ],
    modelPatterns: [
      { regex: /model\s+(\w+)\s*\{/, tableGroup: 1, description: "Prisma model definition" },
      { regex: /@@map\(["'](\w+)["']\)/, tableGroup: 1, description: "Prisma model-to-table mapping" },
    ],
    fieldPatterns: [
      { regex: /(\w+)\s+\w+.*@map\(["'](\w+)["']\)/, fieldGroup: 1, columnGroup: 2, description: "Prisma field-to-column mapping" },
    ],
  },
  // ========== SEQUELIZE (JavaScript) ==========
  {
    orm: "Sequelize",
    language: "javascript",
    fileIndicators: [
      /require\s*\(\s*['"]sequelize['"]\s*\)/,
      /from\s+['"]sequelize['"]/,
      /sequelize\.define/,
      /Model\.init\s*\(/,
    ],
    usagePatterns: [
      { regex: /\.findAll\s*\(|\.findOne\s*\(|\.findByPk\s*\(|\.findAndCountAll\s*\(/, usageType: "read", description: "Sequelize find" },
      { regex: /\.create\s*\(|\.bulkCreate\s*\(/, usageType: "write", description: "Sequelize create" },
      { regex: /\.update\s*\(|\.save\s*\(/, usageType: "update", description: "Sequelize update" },
      { regex: /\.destroy\s*\(/, usageType: "delete", description: "Sequelize destroy" },
      { regex: /attributes\s*:\s*\[/, usageType: "projection", description: "Sequelize select attributes" },
      { regex: /where\s*:\s*\{/, usageType: "filter", description: "Sequelize where" },
      { regex: /include\s*:\s*\[/, usageType: "join", description: "Sequelize include (join)" },
    ],
    modelPatterns: [
      { regex: /sequelize\.define\s*\(\s*['"](\w+)['"]/, tableGroup: 1, description: "Sequelize model define" },
      { regex: /tableName\s*:\s*['"](\w+)['"]/, tableGroup: 1, description: "Sequelize tableName" },
    ],
    fieldPatterns: [
      { regex: /(\w+)\s*:\s*\{\s*type\s*:.*field\s*:\s*['"](\w+)['"]/, fieldGroup: 1, columnGroup: 2, description: "Sequelize field mapping" },
    ],
  },
  // ========== TYPEORM (TypeScript) ==========
  {
    orm: "TypeORM",
    language: "typescript",
    fileIndicators: [
      /from\s+['"]typeorm['"]/,
      /@Entity\s*\(/,
      /@Column\s*\(/,
      /getRepository\s*\(/,
      /createQueryBuilder\s*\(/,
    ],
    usagePatterns: [
      { regex: /\.find\s*\(|\.findOne\s*\(|\.findOneBy\s*\(|\.findBy\s*\(/, usageType: "read", description: "TypeORM find" },
      { regex: /\.save\s*\(|\.insert\s*\(/, usageType: "write", description: "TypeORM save/insert" },
      { regex: /\.update\s*\(|\.merge\s*\(/, usageType: "update", description: "TypeORM update" },
      { regex: /\.delete\s*\(|\.remove\s*\(|\.softDelete\s*\(/, usageType: "delete", description: "TypeORM delete" },
      { regex: /\.select\s*\(|addSelect\s*\(/, usageType: "projection", description: "TypeORM select" },
      { regex: /\.where\s*\(|\.andWhere\s*\(|\.orWhere\s*\(/, usageType: "filter", description: "TypeORM where" },
      { regex: /\.leftJoin|\.innerJoin|\.leftJoinAndSelect|\.innerJoinAndSelect/, usageType: "join", description: "TypeORM join" },
      { regex: /createQueryBuilder/, usageType: "read", description: "TypeORM query builder" },
    ],
    modelPatterns: [
      { regex: /@Entity\s*\(\s*['"](\w+)['"]/, tableGroup: 1, description: "TypeORM entity table name" },
      { regex: /@Entity\s*\(\s*\{[^}]*name\s*:\s*['"](\w+)['"]/, tableGroup: 1, description: "TypeORM entity name option" },
    ],
    fieldPatterns: [
      { regex: /@Column\s*\(\s*\{[^}]*name\s*:\s*['"](\w+)['"][^}]*\}\s*\)\s*(\w+)/, fieldGroup: 2, columnGroup: 1, description: "TypeORM column mapping" },
      { regex: /@Column\s*\([^)]*\)\s*(\w+)/, fieldGroup: 1, columnGroup: 1, description: "TypeORM column (same name)" },
    ],
  },
  // ========== GORM (Go) ==========
  {
    orm: "GORM",
    language: "go",
    fileIndicators: [
      /"gorm\.io\/gorm"/,
      /"gorm\.io\/driver\//,
      /gorm\.Model/,
      /\.Preload\s*\(/,
    ],
    usagePatterns: [
      { regex: /\.Find\s*\(|\.First\s*\(|\.Last\s*\(|\.Take\s*\(|\.Scan\s*\(/, usageType: "read", description: "GORM find" },
      { regex: /\.Create\s*\(|\.Save\s*\(/, usageType: "write", description: "GORM create" },
      { regex: /\.Update\s*\(|\.Updates\s*\(|\.Save\s*\(/, usageType: "update", description: "GORM update" },
      { regex: /\.Delete\s*\(/, usageType: "delete", description: "GORM delete" },
      { regex: /\.Select\s*\(/, usageType: "projection", description: "GORM select" },
      { regex: /\.Where\s*\(|\.Or\s*\(|\.Not\s*\(/, usageType: "filter", description: "GORM where" },
      { regex: /\.Joins\s*\(|\.Preload\s*\(|\.Association\s*\(/, usageType: "join", description: "GORM join/preload" },
    ],
    modelPatterns: [
      { regex: /func\s*\(\s*\w+\s+(\w+)\s*\)\s*TableName\s*\(\s*\)\s*string\s*\{[^}]*return\s+["'](\w+)["']/, tableGroup: 2, description: "GORM TableName method" },
    ],
    fieldPatterns: [
      { regex: /(\w+)\s+\w+\s+`[^`]*gorm:"column:(\w+)/, fieldGroup: 1, columnGroup: 2, description: "GORM struct tag column" },
      { regex: /(\w+)\s+\w+\s+`[^`]*json:"(\w+)/, fieldGroup: 1, columnGroup: 2, description: "Go JSON tag (inferred column)" },
    ],
  },
  // ========== SQLALCHEMY (Python) ==========
  {
    orm: "SQLAlchemy",
    language: "python",
    fileIndicators: [
      /from\s+sqlalchemy/,
      /import\s+sqlalchemy/,
      /Base\.metadata/,
      /declarative_base\s*\(/,
      /mapped_column\s*\(/,
    ],
    usagePatterns: [
      { regex: /session\.query\s*\(|\.all\s*\(|\.first\s*\(|\.one\s*\(|\.scalars\s*\(|\.execute\s*\(.*select/, usageType: "read", description: "SQLAlchemy read" },
      { regex: /session\.add\s*\(|session\.add_all\s*\(|\.insert\s*\(/, usageType: "write", description: "SQLAlchemy add/insert" },
      { regex: /session\.merge\s*\(|\.update\s*\(/, usageType: "update", description: "SQLAlchemy merge/update" },
      { regex: /session\.delete\s*\(|\.delete\s*\(/, usageType: "delete", description: "SQLAlchemy delete" },
      { regex: /\.with_entities\s*\(|\.options\s*\(.*load_only/, usageType: "projection", description: "SQLAlchemy projection" },
      { regex: /\.filter\s*\(|\.filter_by\s*\(|\.where\s*\(/, usageType: "filter", description: "SQLAlchemy filter" },
      { regex: /\.join\s*\(|\.outerjoin\s*\(|relationship\s*\(/, usageType: "join", description: "SQLAlchemy join" },
    ],
    modelPatterns: [
      { regex: /__tablename__\s*=\s*['"](\w+)['"]/, tableGroup: 1, description: "SQLAlchemy tablename" },
    ],
    fieldPatterns: [
      { regex: /(\w+)\s*=\s*(?:Column|mapped_column)\s*\(/, fieldGroup: 1, columnGroup: 1, description: "SQLAlchemy column definition" },
      { regex: /(\w+)\s*=\s*Column\s*\(\s*['"](\w+)['"]/, fieldGroup: 1, columnGroup: 2, description: "SQLAlchemy explicit column name" },
    ],
  },
  // ========== HIBERNATE / JPA (Java) ==========
  {
    orm: "Hibernate",
    language: "java",
    fileIndicators: [
      /import\s+javax\.persistence\./,
      /import\s+jakarta\.persistence\./,
      /import\s+org\.hibernate\./,
      /@Entity/,
      /@Table/,
    ],
    usagePatterns: [
      { regex: /\.find\s*\(|\.get\s*\(|\.load\s*\(|\.createQuery\s*\(.*SELECT|entityManager\.find/, usageType: "read", description: "JPA/Hibernate read" },
      { regex: /\.persist\s*\(|\.save\s*\(|\.saveAndFlush\s*\(/, usageType: "write", description: "JPA persist" },
      { regex: /\.merge\s*\(|\.update\s*\(|\.saveAndFlush\s*\(/, usageType: "update", description: "JPA merge/update" },
      { regex: /\.remove\s*\(|\.delete\s*\(|\.deleteById\s*\(/, usageType: "delete", description: "JPA delete" },
      { regex: /\.createQuery\s*\(\s*["']SELECT\s+\w+\.\w+/, usageType: "projection", description: "JPQL projection" },
      { regex: /\.createQuery\s*\(\s*["'].*WHERE|\.setParameter\s*\(/, usageType: "filter", description: "JPQL where" },
      { regex: /JOIN\s+FETCH|@ManyToOne|@OneToMany|@ManyToMany|@OneToOne/, usageType: "join", description: "JPA relation/join" },
      { regex: /CriteriaBuilder|CriteriaQuery|Specification/, usageType: "read", description: "JPA Criteria API" },
    ],
    modelPatterns: [
      { regex: /@Table\s*\(\s*name\s*=\s*["'](\w+)["']/, tableGroup: 1, description: "JPA @Table name" },
    ],
    fieldPatterns: [
      { regex: /@Column\s*\(\s*name\s*=\s*["'](\w+)["']\s*\)[\s\S]*?private\s+\w+\s+(\w+)/, fieldGroup: 2, columnGroup: 1, description: "JPA @Column name" },
      { regex: /private\s+\w+\s+(\w+)\s*;/, fieldGroup: 1, columnGroup: 1, description: "JPA field (inferred column)" },
    ],
  },
  // ========== ACTIVE RECORD (Ruby) ==========
  {
    orm: "ActiveRecord",
    language: "ruby",
    fileIndicators: [
      /ActiveRecord::Base/,
      /ApplicationRecord/,
      /ActiveRecord::Migration/,
      /has_many\s+:/,
      /belongs_to\s+:/,
    ],
    usagePatterns: [
      { regex: /\.find\s*\(|\.find_by\s*\(|\.where\s*\(.*\)\.first|\.all\b|\.pluck\s*\(|\.select\s*\(/, usageType: "read", description: "ActiveRecord read" },
      { regex: /\.create\s*\(|\.create!\s*\(|\.new\s*\(.*\.save/, usageType: "write", description: "ActiveRecord create" },
      { regex: /\.update\s*\(|\.update!\s*\(|\.update_attribute/, usageType: "update", description: "ActiveRecord update" },
      { regex: /\.destroy\s*\(|\.delete\s*\(|\.destroy_all/, usageType: "delete", description: "ActiveRecord destroy" },
      { regex: /\.select\s*\(|\.pluck\s*\(/, usageType: "projection", description: "ActiveRecord select/pluck" },
      { regex: /\.where\s*\(|\.find_by\s*\(|\.having\s*\(/, usageType: "filter", description: "ActiveRecord where" },
      { regex: /\.joins\s*\(|\.includes\s*\(|\.eager_load\s*\(|has_many|belongs_to|has_one/, usageType: "join", description: "ActiveRecord joins/associations" },
    ],
    modelPatterns: [
      { regex: /self\.table_name\s*=\s*['"](\w+)['"]/, tableGroup: 1, description: "ActiveRecord table_name" },
    ],
    fieldPatterns: [],
  },
  // ========== DIESEL (Rust) ==========
  {
    orm: "Diesel",
    language: "rust",
    fileIndicators: [
      /use\s+diesel/,
      /diesel::table!/,
      /diesel::prelude/,
      /#\[derive\(.*Queryable/,
    ],
    usagePatterns: [
      { regex: /\.load\s*[:<]|\.first\s*[:<]|\.get_result\s*[:<]|\.select\s*\(/, usageType: "read", description: "Diesel load/query" },
      { regex: /diesel::insert_into|\.values\s*\(/, usageType: "write", description: "Diesel insert" },
      { regex: /diesel::update|\.set\s*\(/, usageType: "update", description: "Diesel update" },
      { regex: /diesel::delete/, usageType: "delete", description: "Diesel delete" },
      { regex: /\.select\s*\(|\.column\s*\(/, usageType: "projection", description: "Diesel select" },
      { regex: /\.filter\s*\(|\.find\s*\(/, usageType: "filter", description: "Diesel filter" },
      { regex: /\.inner_join\s*\(|\.left_join\s*\(/, usageType: "join", description: "Diesel join" },
    ],
    modelPatterns: [
      { regex: /diesel::table!\s*\{\s*(\w+)/, tableGroup: 1, description: "Diesel table! macro" },
      { regex: /#\[diesel\(table_name\s*=\s*"?(\w+)"?\)]/, tableGroup: 1, description: "Diesel table_name attribute" },
    ],
    fieldPatterns: [
      { regex: /#\[diesel\(column_name\s*=\s*"?(\w+)"?\)]\s*(?:pub\s+)?(\w+)/, fieldGroup: 2, columnGroup: 1, description: "Diesel column_name" },
    ],
  },
  // ========== ENTITY FRAMEWORK (C#) ==========
  {
    orm: "EntityFramework",
    language: "csharp",
    fileIndicators: [
      /using\s+Microsoft\.EntityFrameworkCore/,
      /using\s+System\.Data\.Entity/,
      /DbContext/,
      /DbSet\s*</,
    ],
    usagePatterns: [
      { regex: /\.ToList\s*\(|\.FirstOrDefault\s*\(|\.SingleOrDefault\s*\(|\.Find\s*\(|\.AsNoTracking\s*\(/, usageType: "read", description: "EF read" },
      { regex: /\.Add\s*\(|\.AddRange\s*\(|\.AddAsync\s*\(/, usageType: "write", description: "EF add" },
      { regex: /\.Update\s*\(|\.Entry\s*\(.*\.State\s*=\s*EntityState\.Modified/, usageType: "update", description: "EF update" },
      { regex: /\.Remove\s*\(|\.RemoveRange\s*\(/, usageType: "delete", description: "EF remove" },
      { regex: /\.Select\s*\(/, usageType: "projection", description: "EF select" },
      { regex: /\.Where\s*\(|\.Any\s*\(|\.All\s*\(/, usageType: "filter", description: "EF where" },
      { regex: /\.Include\s*\(|\.ThenInclude\s*\(|\.Join\s*\(/, usageType: "join", description: "EF include/join" },
    ],
    modelPatterns: [
      { regex: /\[Table\s*\(\s*["'](\w+)["']\s*\)]/, tableGroup: 1, description: "EF Table attribute" },
      { regex: /modelBuilder\.Entity<\w+>\s*\(\s*\)\s*\.ToTable\s*\(\s*["'](\w+)["']/, tableGroup: 1, description: "EF ToTable fluent" },
    ],
    fieldPatterns: [
      { regex: /\[Column\s*\(\s*["'](\w+)["']\s*\)]\s*public\s+\w+\s+(\w+)/, fieldGroup: 2, columnGroup: 1, description: "EF Column attribute" },
    ],
  },
  // ========== KNEX (JavaScript/TypeScript) ==========
  {
    orm: "Knex",
    language: "javascript",
    fileIndicators: [
      /require\s*\(\s*['"]knex['"]\s*\)/,
      /from\s+['"]knex['"]/,
      /knex\s*\(\s*['"]/,
    ],
    usagePatterns: [
      { regex: /knex\s*\(\s*['"]|\.select\s*\(/, usageType: "read", description: "Knex query" },
      { regex: /\.insert\s*\(/, usageType: "write", description: "Knex insert" },
      { regex: /\.update\s*\(/, usageType: "update", description: "Knex update" },
      { regex: /\.del\s*\(|\.delete\s*\(/, usageType: "delete", description: "Knex delete" },
      { regex: /\.select\s*\(/, usageType: "projection", description: "Knex select" },
      { regex: /\.where\s*\(|\.andWhere\s*\(|\.orWhere\s*\(/, usageType: "filter", description: "Knex where" },
      { regex: /\.join\s*\(|\.leftJoin\s*\(|\.innerJoin\s*\(/, usageType: "join", description: "Knex join" },
    ],
    modelPatterns: [],
    fieldPatterns: [],
  },
  // ========== DRIZZLE (TypeScript) ==========
  {
    orm: "Drizzle",
    language: "typescript",
    fileIndicators: [
      /from\s+['"]drizzle-orm/,
      /from\s+['"]drizzle-orm\/pg-core['"]/,
      /pgTable\s*\(/,
      /mysqlTable\s*\(/,
      /sqliteTable\s*\(/,
    ],
    usagePatterns: [
      { regex: /db\.select\s*\(|db\.query\.\w+\.findMany|db\.query\.\w+\.findFirst/, usageType: "read", description: "Drizzle select/query" },
      { regex: /db\.insert\s*\(/, usageType: "write", description: "Drizzle insert" },
      { regex: /db\.update\s*\(/, usageType: "update", description: "Drizzle update" },
      { regex: /db\.delete\s*\(/, usageType: "delete", description: "Drizzle delete" },
      { regex: /\.columns\s*\(|\.fields\s*\(/, usageType: "projection", description: "Drizzle projection" },
      { regex: /\.where\s*\(|eq\s*\(|and\s*\(|or\s*\(/, usageType: "filter", description: "Drizzle where" },
      { regex: /\.innerJoin\s*\(|\.leftJoin\s*\(|\.rightJoin\s*\(|with\s*:\s*\{/, usageType: "join", description: "Drizzle join" },
    ],
    modelPatterns: [
      { regex: /(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*['"](\w+)['"]/, tableGroup: 1, description: "Drizzle table definition" },
    ],
    fieldPatterns: [
      { regex: /(\w+)\s*:\s*(?:varchar|text|integer|serial|boolean|timestamp|uuid|numeric|real|bigint|smallint|json|jsonb)\s*\(/, fieldGroup: 1, columnGroup: 1, description: "Drizzle field definition" },
    ],
  },
]

/**
 * Detect which ORMs are used in a given file based on its content and language.
 */
export function detectOrmsInFile(content: string, language: string): OrmDetection[] {
  const detected: OrmDetection[] = []
  for (const orm of ORM_PATTERNS) {
    // Check language match (loose match for js/ts interchangeability)
    const langMatch =
      orm.language === language ||
      (orm.language === "javascript" && (language === "typescript" || language === "javascript")) ||
      (orm.language === "typescript" && (language === "typescript" || language === "javascript"))

    if (!langMatch) continue

    const hasIndicator = orm.fileIndicators.some((re) => re.test(content))
    if (hasIndicator) {
      detected.push(orm)
    }
  }
  return detected
}

/**
 * Extract model-to-table name mappings from file content using ORM patterns.
 * Returns a map of ModelName -> tableName
 */
export function extractModelTableMappings(content: string, orms: OrmDetection[]): Map<string, string> {
  const mappings = new Map<string, string>()
  for (const orm of orms) {
    for (const mp of orm.modelPatterns) {
      const matches = content.matchAll(new RegExp(mp.regex, "gm"))
      for (const match of matches) {
        const tableName = match[mp.tableGroup]
        if (tableName) {
          mappings.set(tableName, tableName.toLowerCase())
        }
      }
    }
  }
  return mappings
}

/**
 * Extract field-to-column name mappings (e.g. Go struct tags, JPA annotations).
 * Returns a map of fieldName -> columnName
 */
export function extractFieldColumnMappings(content: string, orms: OrmDetection[]): Map<string, string> {
  const mappings = new Map<string, string>()
  for (const orm of orms) {
    for (const fp of orm.fieldPatterns) {
      const matches = content.matchAll(new RegExp(fp.regex, "gm"))
      for (const match of matches) {
        const fieldName = match[fp.fieldGroup]
        const columnName = match[fp.columnGroup]
        if (fieldName && columnName) {
          mappings.set(fieldName.toLowerCase(), columnName.toLowerCase())
        }
      }
    }
  }
  return mappings
}

/**
 * Convert common naming conventions.
 * e.g. "userId" -> "user_id", "UserID" -> "user_id"
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
}

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export function toPascalCase(str: string): string {
  const camel = toCamelCase(str)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}
