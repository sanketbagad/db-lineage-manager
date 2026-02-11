import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { hashPassword, createSession, buildSessionCookie } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const sql = getDb()

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const users = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email}, ${passwordHash}, ${name || null})
      RETURNING id, email, name
    `

    const user = users[0]
    const { token, expiresAt } = await createSession(user.id as string)

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
    response.headers.set("Set-Cookie", buildSessionCookie(token, expiresAt))
    return response
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "An error occurred during signup" },
      { status: 500 }
    )
  }
}
