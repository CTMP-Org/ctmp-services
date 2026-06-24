"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/layout/nav-user"
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileSpreadsheet,
  BarChart3,
  CreditCard,
  Cloud,
  Server,
  Terminal,
} from "lucide-react"

export function AppSidebar() {
  const pathname = usePathname()
  const { isAdmin, isTrainer, isStudent } = useAuth()

  const navItems = React.useMemo(() => {
    const items: Array<{
      title: string
      url: string
      icon: React.ComponentType<any>
      roles: string[]
    }> = []

    // Dashboard is common
    items.push({
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      roles: ["Admin", "Trainer", "Student"],
    })

    // Admin pages
    items.push({
      title: "Users",
      url: "/admin/users",
      icon: Users,
      roles: ["Admin"],
    })
    items.push({
      title: "Audit Log",
      url: isAdmin ? "/admin/audit" : "/trainer/audit",
      icon: FileSpreadsheet,
      roles: ["Admin", "Trainer"],
    })
    items.push({
      title: "Analytics",
      url: isAdmin ? "/admin/analytics" : "/trainer/analytics",
      icon: BarChart3,
      roles: ["Admin", "Trainer"],
    })
    items.push({
      title: "Billing",
      url: isAdmin ? "/admin/billing" : "/trainer/billing",
      icon: CreditCard,
      roles: ["Admin", "Trainer"],
    })

    // Trainer pages
    items.push({
      title: "Groups",
      url: "/trainer/groups",
      icon: FolderKanban,
      roles: ["Admin", "Trainer"],
    })
    items.push({
      title: "AWS OIDC Setup",
      url: "/trainer/aws-setup",
      icon: Cloud,
      roles: ["Trainer"],
    })
    items.push({
      title: "EC2 Instances",
      url: "/trainer/instances",
      icon: Server,
      roles: ["Admin", "Trainer"],
    })

    // Student pages
    if (isStudent && !isAdmin && !isTrainer) {
      items.push({
        title: "My Groups",
        url: "/student/groups",
        icon: FolderKanban,
        roles: ["Student"],
      })
      items.push({
        title: "My Instances",
        url: "/student/instances",
        icon: Server,
        roles: ["Student"],
      })
    }

    const userRoles: string[] = []
    if (isAdmin) userRoles.push("Admin")
    if (isTrainer) userRoles.push("Trainer")
    if (isStudent && !isAdmin && !isTrainer) userRoles.push("Student")

    return items.filter((item) =>
      item.roles.some((role) => userRoles.includes(role))
    )
  }, [isAdmin, isTrainer, isStudent])

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
            <Terminal className="h-5 w-5" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
            <span className="truncate font-bold tracking-tight text-zinc-100">Contoso Cloud</span>
            <span className="truncate text-xs text-zinc-500 font-medium">Training Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[state=collapsed]:hidden">Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                      <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
