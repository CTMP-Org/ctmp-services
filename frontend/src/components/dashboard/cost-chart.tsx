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
import { DollarSign } from "lucide-react"

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

interface CostChartProps {
  data?: Array<{ month: string; compute: number; storage: number; network: number }>
}

export function CostChart({ data = [] }: CostChartProps) {
  const isEmpty = data.length === 0 || data.every(d => d.compute === 0 && d.storage === 0 && d.network === 0)

  return (
    <Card className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80">
      <CardHeader className="flex flex-col gap-1 pb-4">
        <CardTitle className="text-base font-semibold text-zinc-50">AWS Resource Spending</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Monthly expenditure categorized by AWS infrastructure service.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[280px] w-full flex flex-col items-center justify-center border border-dashed border-zinc-800/60 rounded-xl p-6 text-center bg-zinc-950/20">
            <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 mb-3 text-zinc-400">
              <DollarSign className="h-6 w-6 text-indigo-400 animate-pulse" />
            </div>
            <h4 className="font-semibold text-sm text-zinc-200 mb-1">No AWS spending recorded</h4>
            <p className="text-xs text-zinc-500 max-w-sm">
              Live cost telemetry will populate here once the live cost management provider integration is completed.
            </p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
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
        )}
      </CardContent>
    </Card>
  )
}
