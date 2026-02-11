"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"
import { Database, GitBranch, ArrowRight } from "lucide-react"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup"
      const body = isLogin ? { email, password } : { email, password, name }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Something went wrong")
        return
      }

      toast.success(isLogin ? "Welcome back!" : "Account created!")
      // Small delay to let the browser register the Set-Cookie header
      await new Promise((resolve) => setTimeout(resolve, 100))
      window.location.href = "/dashboard"
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Database className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              DB Lineage
            </h1>
            <p className="text-sm text-muted-foreground">
              Database column lineage tracker
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Trace column usage
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" />
            Flow diagrams
          </span>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{isLogin ? "Sign in" : "Create account"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your credentials to continue"
              : "Get started with DB Lineage"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-2">
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "No account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary underline-offset-4 hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
