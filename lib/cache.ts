import Redis from "ioredis"

// Lazy-initialize Redis connection
let redisClient: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.warn("REDIS_URL not set, caching disabled")
    return null
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err)
    })

    redisClient.on("connect", () => {
      console.log("Redis connected")
    })
  }

  return redisClient
}

// Cache key prefixes
export const CACHE_KEYS = {
  LINEAGE: "lineage:",
  TABLES: "tables:",
  COLUMNS: "columns:",
  SCHEMAS: "schemas:",
  COMPONENT: "component:",
  SOURCE: "source:",
  CONFIG: "config:",
} as const

// Default TTL in seconds (1 hour)
const DEFAULT_TTL = 3600

export class CacheService {
  private redis: Redis | null

  constructor() {
    this.redis = getRedisClient()
  }

  private isConnected(): boolean {
    return this.redis !== null && this.redis.status === "ready"
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null

    try {
      const value = await this.redis.get(key)
      if (value) {
        return JSON.parse(value) as T
      }
      return null
    } catch (error) {
      console.error("Cache get error:", error)
      return null
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis) return false

    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized)
      } else {
        await this.redis.setex(key, DEFAULT_TTL, serialized)
      }
      return true
    } catch (error) {
      console.error("Cache set error:", error)
      return false
    }
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false

    try {
      await this.redis.del(key)
      return true
    } catch (error) {
      console.error("Cache delete error:", error)
      return false
    }
  }

  /**
   * Delete multiple cache entries by pattern
   */
  async deletePattern(pattern: string): Promise<boolean> {
    if (!this.redis) return false

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
      return true
    } catch (error) {
      console.error("Cache delete pattern error:", error)
      return false
    }
  }

  /**
   * Invalidate all lineage cache for a project
   */
  async invalidateProjectLineage(projectId: string): Promise<boolean> {
    return this.deletePattern(`${CACHE_KEYS.LINEAGE}${projectId}:*`)
  }

  /**
   * Invalidate all cache for a project
   */
  async invalidateProject(projectId: string): Promise<boolean> {
    const patterns = [
      `${CACHE_KEYS.LINEAGE}${projectId}:*`,
      `${CACHE_KEYS.TABLES}${projectId}:*`,
      `${CACHE_KEYS.COLUMNS}${projectId}:*`,
      `${CACHE_KEYS.SCHEMAS}${projectId}:*`,
    ]

    const results = await Promise.all(patterns.map((p) => this.deletePattern(p)))
    return results.every((r) => r)
  }

  /**
   * Get or set pattern - returns cached value or computes and caches
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await computeFn()
    await this.set(key, value, ttlSeconds)
    return value
  }

  /**
   * Generate cache key for lineage
   */
  static lineageKey(
    projectIds: string[],
    tableName: string,
    columnName?: string
  ): string {
    const projectKey = projectIds.sort().join("_")
    const colKey = columnName || "ALL"
    return `${CACHE_KEYS.LINEAGE}${projectKey}:${tableName}:${colKey}`
  }

  /**
   * Generate cache key for tables
   */
  static tablesKey(projectIds: string[]): string {
    const projectKey = projectIds.sort().join("_")
    return `${CACHE_KEYS.TABLES}${projectKey}`
  }

  /**
   * Generate cache key for schemas by app
   */
  static schemasByAppKey(appId: string): string {
    return `${CACHE_KEYS.SCHEMAS}app:${appId}`
  }

  /**
   * Generate cache key for component source
   */
  static componentSourceKey(componentId: string): string {
    return `${CACHE_KEYS.SOURCE}${componentId}`
  }
}

// Singleton instance
export const cacheService = new CacheService()
