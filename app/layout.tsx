import React, { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "DB Lineage | Database Column Lineage Tracker",
  description:
    "Trace how database columns are used across your source code. Upload repos, parse schemas, and visualize column lineage with AI-powered descriptions.",
}

export const viewport: Viewport = {
  themeColor: "#0EA5E9",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${_inter.variable} ${_jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Suspense fallback={null}>
            <Toaster />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
