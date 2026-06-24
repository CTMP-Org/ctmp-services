"use client"

import * as React from "react"
import { useApiClient } from "@/hooks/use-api-client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Download, RefreshCw, FileText } from "lucide-react"

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  status: "Success" | "Failure" | "Warning"
}

export default function AdminAuditPage() {
  const api = useApiClient()
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await api.get<any>("/api/admin/audit-log")
      if (data && data.entries && Array.isArray(data.entries)) {
        // Map backend AuditLogResponse to frontend AuditLog interface
        const mappedLogs = data.entries.map((entry: any) => {
          // Status from action or details
          let status: "Success" | "Failure" | "Warning" = "Success"
          if (entry.details) {
            if (entry.details.status === "Failure" || entry.details.error) {
              status = "Failure"
            } else if (entry.details.status === "Warning") {
              status = "Warning"
            }
          }

          return {
            id: entry.id,
            timestamp: entry.timestamp,
            user: entry.actor_name || entry.actor_id || "system",
            action: entry.action,
            resource: entry.resource_type ? `${entry.resource_type}:${entry.resource_id}` : entry.resource_id || "none",
            status
          }
        })
        setLogs(mappedLogs)
      } else {
        setLogs([])
      }
    } catch (err) {
      console.warn("Could not load audit logs from API.", err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter(
    (log) =>
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredLogs, null, 2)
    )}`
    const downloadAnchor = document.createElement("a")
    downloadAnchor.setAttribute("href", jsonString)
    downloadAnchor.setAttribute("download", `audit_log_${new Date().toISOString()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">System Audit Trail</h1>
          <p className="text-sm text-zinc-400">
            Immutable log of all tenant, cluster, and virtual machine actions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchLogs}
            disabled={loading}
            className="border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5">
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      <Card className="bg-zinc-950/40 border-zinc-800">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-zinc-50">Audit History</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Correlates actor identity, action type, affected resource, and timestamp.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search by action, user or resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-50 placeholder:text-zinc-500 focus-visible:ring-indigo-500"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-b border-zinc-800">
                  <TableHead className="text-zinc-400 font-medium">Timestamp</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Identity</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Action Event</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Target Resource</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-zinc-500 text-sm">
                      Syncing audit logs from database...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-zinc-500 text-sm">
                      No logs found matching selection.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="border-b border-zinc-900 hover:bg-zinc-900/20">
                      <TableCell className="text-zinc-400 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-zinc-300">{log.user}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-indigo-400 font-mono font-bold text-[11px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          <FileText className="h-3 w-3" />
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-400 font-mono text-xs">{log.resource}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            log.status === "Success"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : log.status === "Warning"
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }
                        >
                          {log.status}
                        </Badge>
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
