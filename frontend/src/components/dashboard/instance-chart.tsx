"use client"

import * as React from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Cpu } from "lucide-react"

const chartConfig = {
  active: {
    label: "Running",
    color: "#818cf8", // indigo-400
  },
  stopped: {
    label: "Stopped",
    color: "#f87171", // red-400
  },
}

interface InstanceChartProps {
  data?: Array<{ day: string; active: number; stopped: number }>
}

export function InstanceChart({ data = [] }: InstanceChartProps) {
  const isEmpty = data.length === 0 || data.every(d => d.active === 0 && d.stopped === 0)

  return (
    <Card className="bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80">
      <CardHeader className="flex flex-col gap-1 pb-4">
        <CardTitle className="text-base font-semibold text-zinc-50">EC2 Lifecycle Trends</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Daily running and stopped cloud training instances.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="h-[280px] w-full flex flex-col items-center justify-center border border-dashed border-zinc-800/60 rounded-xl p-6 text-center bg-zinc-950/20">
            <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 mb-3 text-zinc-400">
              <Cpu className="h-6 w-6 text-indigo-400 animate-pulse" />
            </div>
            <h4 className="font-semibold text-sm text-zinc-200 mb-1">No instance lifecycle data available</h4>
            <p className="text-xs text-zinc-500 max-w-sm">
              Please launch a virtual machine in the student sandbox portal to start generating lifecycle metrics and trends.
            </p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="stoppedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="day"
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
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#activeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="stopped"
                    stroke="#f87171"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#stoppedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
