import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { cacheService, CACHE_KEYS } from "@/lib/cache"

// GET /api/dbLineage/config - Get system configuration
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const configs = await sql`
      SELECT config_key, config_value, description, is_active
      FROM system_control
      ORDER BY config_key
    `

    const configMap: Record<string, { value: string; description: string; isActive: boolean }> = {}
    for (const c of configs) {
      configMap[c.config_key as string] = {
        value: c.config_value as string,
        description: c.description as string,
        isActive: c.is_active as boolean,
      }
    }

    return NextResponse.json({ config: configMap })
  } catch (error) {
    console.error("Error fetching config:", error)
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    )
  }
}

// PUT /api/dbLineage/config - Update system configuration
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { key, value, isActive } = await req.json()

    if (!key) {
      return NextResponse.json(
        { error: "Configuration key is required" },
        { status: 400 }
      )
    }

    const sql = getDb()

    // Update config
    const result = await sql`
      UPDATE system_control
      SET 
        config_value = COALESCE(${value}, config_value),
        is_active = COALESCE(${isActive}, is_active),
        updated_at = NOW()
      WHERE config_key = ${key}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Configuration key not found" },
        { status: 404 }
      )
    }

    // Invalidate config cache
    await cacheService.delete(`${CACHE_KEYS.CONFIG}lineage`)

    return NextResponse.json({ config: result[0] })
  } catch (error) {
    console.error("Error updating config:", error)
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    )
  }
}
