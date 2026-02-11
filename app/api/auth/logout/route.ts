import { NextResponse } from "next/server"
import { signOut } from "@/lib/auth"

export async function POST() {
  try {
    const clearCookie = await signOut()
    const response = NextResponse.json({ success: true })
    response.headers.set("Set-Cookie", clearCookie)
    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json(
      { error: "An error occurred during logout" },
      { status: 500 }
    )
  }
}
