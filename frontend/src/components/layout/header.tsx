"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sun, Moon } from "lucide-react"

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate breadcrumbs from pathname
  const breadcrumbs = React.useMemo(() => {
    if (!pathname) return []
    const paths = pathname.split("/").filter(Boolean)
    return paths.map((path, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/")
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace("-", " ")
      return { href, label, isLast: index === paths.length - 1 }
    })
  }, [pathname])

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900" />
        <Separator orientation="vertical" className="h-4 bg-zinc-800" />
        <nav className="flex items-center space-x-1.5 text-sm font-medium text-zinc-400">
          <span className="hover:text-zinc-100 cursor-pointer text-xs text-zinc-500">Portal</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              <span className="text-zinc-600 text-xs">/</span>
              <span
                className={
                  crumb.isLast
                    ? "text-zinc-100 font-semibold"
                    : "hover:text-zinc-100 cursor-pointer"
                }
              >
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}
      </div>
    </header>
  )
}
