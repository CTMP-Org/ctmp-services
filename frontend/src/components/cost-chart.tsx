"use client"

import * as React from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

const costData = [
  { month: "Jan", compute: 450, storage: 120, network: 50 },
  { month: "Feb", compute: 680, storage: 150, network: 80 },
  { month: "Mar", compute: 920, storage: 180, network: 110 },
  { month: "Apr", compute: 850, storage: 170, network: 90 },
  { month: "May", compute: 1120, storage: 210, network: 140 },
  { month: "Jun", compute: 1240, storage: 250, network: 160 },
]

const chartConfig = {
  compute: {
    label: "Compute (EC2)",
    color: "#6366f1", // indigo-500
  },
  storage: {
    label: "Storage (EBS/S3)",
    color: "#3b82f6", // blue-500
  },
  network: {
    label: "Data Transfer",
    color: "#06b6d4", // cyan-500
  },
}

export function CostChart() {
  return (
    <Card className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80">
      <CardHeader className="flex flex-col gap-1 pb-4">
        <CardTitle className="text-base font-semibold text-zinc-50">AWS Resource Spending</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Monthly expenditure categorized by AWS infrastructure service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={costData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                stackOffset="none"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="compute"
                  stackId="a"
                  fill="#6366f1"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="storage"
                  stackId="a"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="network"
                  stackId="a"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
