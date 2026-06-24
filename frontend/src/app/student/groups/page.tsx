"use client"

import * as React from "react"
import { useApiClient } from "@/hooks/use-api-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FolderKanban, Users, ShieldAlert, Cpu } from "lucide-react"

interface StudentGroup {
  id: string
  name: string
  trainerName: string
  maxInstancesPerStudent: number
  awsRoleArn: string
  status: "Active" | "Inactive"
}

export default function StudentGroupsPage() {
  const api = useApiClient()
  const [groups, setGroups] = React.useState<StudentGroup[]>([])

  React.useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await api.get<StudentGroup[]>("/api/student/groups")
        if (data && Array.isArray(data)) {
          setGroups(data)
        }
      } catch (err) {
        console.warn("Could not load student groups from API, using fallback.", err)
      }
    }
    fetchGroups()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">My Training Groups</h1>
        <p className="text-sm text-zinc-400">
          View your enrolled cohorts, assigned instructors, and lab capacity limits.
        </p>
      </div>

      <Card className="bg-zinc-950/40 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-50">Enrolled Courses & Sandbox Credentials</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Active roles provisioned via your organization membership.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-b border-zinc-800">
                  <TableHead className="text-zinc-400 font-medium">Cohort Name</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Instructor</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Max EC2 Limit</TableHead>
                  <TableHead className="text-zinc-400 font-medium">AWS IAM Role ARN (OIDC)</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-zinc-500 text-sm">
                      You are not currently enrolled in any training groups.
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => (
                    <TableRow key={group.id} className="border-b border-zinc-900 hover:bg-zinc-900/20">
                      <TableCell className="font-semibold text-zinc-300">
                        <span className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-indigo-400" />
                          {group.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-400 font-medium">{group.trainerName}</TableCell>
                      <TableCell className="text-zinc-300 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5 text-zinc-500" />
                          {group.maxInstancesPerStudent} Active VMs
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-400 font-mono text-xs max-w-[250px] truncate" title={group.awsRoleArn}>
                        {group.awsRoleArn}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {group.status}
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
