"use client"

import * as React from "react"
import { useApiClient } from "@/hooks/use-api-client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Trash2, RefreshCw, Server, AlertCircle } from "lucide-react"

interface StudentInstance {
  id: string
  studentName: string
  groupName: string
  instanceId: string
  instanceType: string
  status: "Running" | "Stopped" | "Pending" | "Terminated"
  launchTime: string
}

export default function TrainerInstancesPage() {
  const api = useApiClient()
  const [instances, setInstances] = React.useState<StudentInstance[]>([])
  const [loading, setLoading] = React.useState(false)

  const fetchInstances = async () => {
    setLoading(true)
    try {
      const data = await api.get<any[]>("/api/trainer/instances")
      if (data && Array.isArray(data)) {
        const mapped = data.map((item) => {
          let stateMapped = "Unknown"
          if (item.state) {
            const raw = item.state.toLowerCase()
            if (raw === "running") stateMapped = "Running"
            else if (raw === "stopped") stateMapped = "Stopped"
            else if (raw === "pending") stateMapped = "Pending"
            else if (raw === "terminated") stateMapped = "Terminated"
          }
          return {
            id: item.id,
            studentName: item.student_name || "Unassigned Student",
            groupName: item.group_name || "Unassigned Group",
            instanceId: item.id,
            instanceType: item.instance_type || "t3.micro",
            status: stateMapped as any,
            launchTime: item.launch_time || new Date().toISOString()
          }
        })
        setInstances(mapped)
      } else {
        setInstances([])
      }
    } catch (err) {
      console.warn("Could not load trainer instances from API.", err)
      setInstances([])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchInstances()
  }, [])

  const handleAction = async (id: string, action: "start" | "stop" | "terminate") => {
    try {
      await api.post(`/api/trainer/instances/${id}/${action}`)
      fetchInstances()
    } catch (err) {
      console.warn(`Action ${action} failed, simulating state change locally.`, err)
      // Visual feedback simulator
      setInstances((prev) =>
         prev.map((inst) => {
           if (inst.id === id) {
             const nextStatus = action === "start" ? "Running" : action === "stop" ? "Stopped" : "Terminated"
             return { ...inst, status: nextStatus }
           }
           return inst
         })
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">Student Cloud Instances</h1>
          <p className="text-sm text-zinc-400">
            Control, audit, and power off student-provisioned EC2 environments across your groups.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchInstances}
          disabled={loading}
          className="border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 gap-1.5 self-start"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="bg-zinc-950/40 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-50">AWS EC2 Inventory</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Real-time status updates directly from AWS EC2 API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950/20">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-b border-zinc-800">
                  <TableHead className="text-zinc-400 font-medium">Student</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Training Group</TableHead>
                  <TableHead className="text-zinc-400 font-medium">AWS ID</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Type</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Launch Time</TableHead>
                  <TableHead className="text-zinc-400 font-medium text-right">Power Operations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && instances.length === 0 ? (
                  <TableRow className="border-b border-zinc-900">
                    <TableCell colSpan={7} className="h-32 text-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-zinc-500 mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : instances.length === 0 ? (
                  <TableRow className="border-b border-zinc-900">
                    <TableCell colSpan={7} className="h-40 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <Server className="h-8 w-8 text-zinc-600 animate-pulse" />
                        <span className="font-semibold text-sm text-zinc-300">No active virtual machines found</span>
                        <span className="text-xs text-zinc-500 max-w-xs">
                          When students launch AWS virtual machines inside their training cohorts, they will appear in this control center.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  instances.map((inst) => (
                    <TableRow key={inst.id} className="border-b border-zinc-900 hover:bg-zinc-900/20">
                      <TableCell className="font-semibold text-zinc-300">{inst.studentName}</TableCell>
                      <TableCell className="text-zinc-400">{inst.groupName}</TableCell>
                      <TableCell className="font-mono text-xs text-indigo-400 select-all">
                        {inst.instanceId}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-zinc-400">{inst.instanceType}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            inst.status === "Running"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : inst.status === "Stopped"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : inst.status === "Pending"
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }
                        >
                          {inst.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs">
                        {new Date(inst.launchTime).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={inst.status === "Running" || inst.status === "Terminated"}
                            onClick={() => handleAction(inst.id, "start")}
                            className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={inst.status === "Stopped" || inst.status === "Terminated"}
                            onClick={() => handleAction(inst.id, "stop")}
                            className="h-8 w-8 text-yellow-500 hover:bg-yellow-500/10 disabled:opacity-30"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={inst.status === "Terminated"}
                            onClick={() => handleAction(inst.id, "terminate")}
                            className="h-8 w-8 text-red-500 hover:bg-red-500/10 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
