"use client"

import * as React from "react"
import { useApiClient } from "@/hooks/use-api-client"
import { InstanceChart } from "@/components/dashboard/instance-chart"
import { CostChart } from "@/components/dashboard/cost-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, TrendingDown, Users, Award, Percent, RefreshCw } from "lucide-react"

interface AnalyticsDashboardResponse {
  active_instances: number;
  total_users: number;
  cpu_utilization_avg: number;
  active_groups: number;
  total_spend_usd: number;
}

interface InstanceMetricsPoint {
  timestamp: string;
  running_count: number;
  stopped_count: number;
}

interface CostMetricsPoint {
  timestamp: string;
  cumulative_cost_usd: number;
}

export default function AdminAnalyticsPage() {
  const api = useApiClient()
  const [loading, setLoading] = React.useState(true)
  const [metrics, setMetrics] = React.useState<AnalyticsDashboardResponse | null>(null)
  const [instanceData, setInstanceData] = React.useState<any[]>([])
  const [costData, setCostData] = React.useState<any[]>([])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const metricsData = await api.get<AnalyticsDashboardResponse>("/api/analytics/dashboard")
      setMetrics(metricsData)

      const instanceMetrics = await api.get<InstanceMetricsPoint[]>("/api/analytics/metrics/instances")
      if (instanceMetrics && Array.isArray(instanceMetrics)) {
        const formatted = instanceMetrics.map((p) => {
          const date = new Date(p.timestamp)
          return {
            day: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            active: p.running_count,
            stopped: p.stopped_count,
          }
        })
        setInstanceData(formatted)
      } else {
        setInstanceData([])
      }

      const costMetrics = await api.get<CostMetricsPoint[]>("/api/analytics/metrics/costs")
      if (costMetrics && Array.isArray(costMetrics)) {
        const formatted = costMetrics.map((p) => {
          const date = new Date(p.timestamp)
          return {
            month: date.toLocaleDateString([], { month: "short", day: "numeric" }),
            compute: p.cumulative_cost_usd,
            storage: 0.0,
            network: 0.0,
          }
        })
        setCostData(formatted)
      } else {
        setCostData([])
      }
    } catch (err) {
      console.warn("Could not load analytics metrics.", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchAnalytics()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">Analytics Console</h1>
          <p className="text-sm text-zinc-400">
            Deeper insights into instance lifespans, resource utilization, and cost optimization.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors disabled:opacity-50 self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </button>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* Highlights Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-zinc-950/40 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Average CPU utilization</CardTitle>
                <Award className="h-4 w-4 text-indigo-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-50">
                  {metrics ? `${metrics.cpu_utilization_avg.toFixed(1)}%` : "0.0%"}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                  Average across all training virtual machines
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950/40 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Active Running Load</CardTitle>
                <Users className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-50">
                  {metrics ? `${metrics.active_instances} VM${metrics.active_instances === 1 ? "" : "s"}` : "0 VMs"}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                  Active virtual machines launched in student labs
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-950/40 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-zinc-400 uppercase">Total User Accounts</CardTitle>
                <Percent className="h-4 w-4 text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zinc-50">
                  {metrics ? `${metrics.total_users} User${metrics.total_users === 1 ? "" : "s"}` : "0 Users"}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                  Total student and trainer directory count
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <InstanceChart data={instanceData} />
            <CostChart data={costData} />
          </div>
        </>
      )}
    </div>
  )
}
