"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Server, Users, DollarSign, Clock, TrendingUp } from "lucide-react"

interface StatsCardsProps {
  data?: {
    activeInstances: number
    totalStudents: number
    monthlySpend: number
    budgetLimit: number
    uptimePercent: number
  }
}

export function StatsCards({ data }: StatsCardsProps) {
  const stats = React.useMemo(() => {
    const active = data?.activeInstances ?? 0
    const students = data?.totalStudents ?? 0
    const spend = data?.monthlySpend ?? 0.0
    const budget = data?.budgetLimit ?? 500.00
    const uptime = data?.uptimePercent ?? 100.0

    const budgetUtilization = budget > 0 ? Math.round((spend / budget) * 100) : 0

    return [
      {
        title: "Active Instances",
        value: `${active} / 25`,
        description: active === 0 ? "Go to Sandboxes to provision a VM" : "Currently running EC2 VMs",
        icon: Server,
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      },
      {
        title: "Total Students",
        value: students.toString(),
        description: students === 0 ? "No student accounts created yet" : "Across active training sessions",
        icon: Users,
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      },
      {
        title: "Monthly Budget",
        value: `$${spend.toFixed(2)} / $${budget.toFixed(2)}`,
        description: spend === 0 ? "No spending. Start VMs to log costs" : `${budgetUtilization}% of limit utilized`,
        icon: DollarSign,
        color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      },
      {
        title: "System Uptime",
        value: `${uptime}%`,
        description: "AWS cloud connection online",
        icon: Clock,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      },
    ]
  }, [data])

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-zinc-400">{stat.title}</CardTitle>
            <div className={`p-2 rounded-lg border ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-zinc-50">{stat.value}</div>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-zinc-500" />
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
