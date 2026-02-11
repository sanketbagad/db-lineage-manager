import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { verifyPassword, createSession, buildSessionCookie } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const sql = getDb()
    const users = await sql`
      SELECT id, email, name, password_hash FROM users WHERE email = ${email}
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const user = users[0]
    const valid = await verifyPassword(password, user.password_hash as string)

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const { token, expiresAt } = await createSession(user.id as string)

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
    response.headers.set("Set-Cookie", buildSessionCookie(token, expiresAt))
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    )
  }
}
