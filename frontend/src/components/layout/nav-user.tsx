"use client"

import * as React from "react"
import { useMsal } from "@azure/msal-react"
import { useAuth } from "@/hooks/use-auth"
import { getInitials } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User, Shield, CreditCard, Sparkles, ChevronsUpDown } from "lucide-react"

export function NavUser() {
  const { instance } = useMsal()
  const { name, email, roles, isAdmin, isTrainer } = useAuth()

  const handleLogout = () => {
    if (typeof window !== "undefined" && localStorage.getItem("ctmp_token")) {
      localStorage.removeItem("ctmp_token");
      localStorage.removeItem("ctmp_user");
      window.location.href = "/";
      return;
    }

    instance.logoutRedirect().catch((e) => {
      console.error(e)
    })
  }

  const roleName = React.useMemo(() => {
    if (isAdmin) return "Administrator"
    if (isTrainer) return "Trainer"
    return "Student"
  }, [isAdmin, isTrainer])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm outline-none transition-colors hover:bg-zinc-900 focus-visible:ring-1 focus-visible:ring-zinc-300">
          <Avatar className="h-8 w-8 rounded-lg bg-indigo-950 border border-indigo-500/20 text-indigo-400">
            <AvatarFallback className="rounded-lg bg-indigo-950 text-indigo-400 font-bold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
            <span className="truncate font-semibold text-zinc-50">{name || "Loading..."}</span>
            <span className="truncate text-xs text-zinc-400">{roleName}</span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 text-zinc-400 group-data-[state=collapsed]:hidden" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[200px] bg-zinc-950 border border-zinc-800 text-zinc-50 shadow-md"
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-zinc-50">{name}</p>
            <p className="text-xs leading-none text-zinc-400 truncate">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuGroup>
          <DropdownMenuItem className="text-zinc-400 focus:bg-zinc-800 focus:text-zinc-50 gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem className="text-zinc-400 focus:bg-zinc-800 focus:text-zinc-50 gap-2 cursor-pointer">
              <Shield className="h-4 w-4" />
              Admin Access
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-400 focus:bg-red-500/10 focus:text-red-400 gap-2 cursor-pointer font-medium"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
