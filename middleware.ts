import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session")?.value
  const { pathname } = request.nextUrl

  const protectedPaths = ["/dashboard", "/project"]
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (pathname === "/" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/project/:path*"],
}
