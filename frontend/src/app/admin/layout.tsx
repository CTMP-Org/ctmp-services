"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Header } from "@/components/layout/header"
import { RoleGuard } from "@/components/auth/role-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Avoid rendering sidebar/header and layout on the admin login page
  if (pathname === "/admin") {
    return <>{children}</>
  }

  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-50">
          <AppSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-zinc-800">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </RoleGuard>
  )
}
