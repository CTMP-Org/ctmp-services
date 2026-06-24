"use client"

import * as React from "react"
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react"
import { loginRequest } from "@/lib/msal-config"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Lock, ArrowRight } from "lucide-react"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { instance } = useMsal()
  const { isAuthenticated, roles, isAdmin } = useAuth()

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch((e) => {
      console.error(e)
    })
  }

  // Admin can bypass all role checks. Otherwise check if user's roles overlap with allowedRoles.
  const hasAccess = React.useMemo(() => {
    if (!allowedRoles || allowedRoles.length === 0) return true
    if (isAdmin) return true // Admins have master access
    return roles.some((role) => allowedRoles.includes(role))
  }, [allowedRoles, roles, isAdmin])

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
          <Lock className="h-10 w-10 text-indigo-400" />
          <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          Authentication Required
        </h1>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          To view this page, you need to sign in to the Cloud Training Management Portal.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => window.location.href = "/login"}
            className="bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-2"
          >
            Sign In Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {hasAccess ? (
        <>{children}</>
      ) : (
        <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <ShieldAlert className="h-10 w-10 text-red-500" />
            <div className="absolute inset-0 rounded-full bg-red-500/5 blur" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            Access Denied
          </h1>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            You do not have the required permissions ({allowedRoles?.join(", ")}) to access this page. Please contact your administrator if you think this is a mistake.
          </p>
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900"
            >
              Go Back
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
