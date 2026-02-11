import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { getDb } from "./db"
import bcrypt from "bcryptjs"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "db-lineage-secret-key-change-in-production"
)

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Creates a session token and stores it in DB.
 * Returns the token and expiry so the Route Handler can set the cookie on the response.
 */
export async function createSession(
  userId: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET)

  const sql = getDb()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await sql`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
  `

  return { token, expiresAt }
}

/**
 * Helper to build Set-Cookie header value for the session
 */
export function buildSessionCookie(token: string, expiresAt: Date): string {
  const parts = [
    `session=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expiresAt.toUTCString()}`,
  ]
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure")
  }
  return parts.join("; ")
}

/**
 * Reads the current user from the session cookie.
 * Safe to call in Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string

    const sql = getDb()

    const sessions =
      await sql`SELECT id FROM sessions WHERE token = ${token} AND expires_at > NOW()`
    if (sessions.length === 0) return null

    const users =
      await sql`SELECT id, email, name FROM users WHERE id = ${userId}`
    if (users.length === 0) return null

    return users[0] as AuthUser
  } catch {
    return null
  }
}

/**
 * Deletes the session from DB. Returns a Set-Cookie header to clear the cookie.
 */
export async function signOut(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (token) {
    const sql = getDb()
    await sql`DELETE FROM sessions WHERE token = ${token}`
  }
  // Return a header to clear the cookie
  return "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
}
