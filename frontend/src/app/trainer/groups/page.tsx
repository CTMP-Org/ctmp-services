"use client"

import * as React from "react"
import { useApiClient } from "@/hooks/use-api-client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FolderPlus, Users, Eye, Trash2, ShieldAlert, Copy, Download, Check, ExternalLink } from "lucide-react"

interface TrainingGroup {
  id: string
  name: string
  studentCount: number
  awsRoleArn: string
  maxInstancesPerStudent: number
  status: "Active" | "Inactive"
}

interface GeneratedStudent {
  id: string
  username: string
  password: string
  name: string
  invite_token: string
  login_link: string
}

export default function TrainerGroupsPage() {
  const api = useApiClient()
  const [groups, setGroups] = React.useState<TrainingGroup[]>([])
  const [loading, setLoading] = React.useState(false)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [awsAccount, setAwsAccount] = React.useState("")
  const [awsRegion, setAwsRegion] = React.useState("us-east-1")
  const [studentEmails, setStudentEmails] = React.useState("")
  const [autoGenCount, setAutoGenCount] = React.useState(0)
  const [maxInstances, setMaxInstances] = React.useState(2)
  const [open, setOpen] = React.useState(false)

  // Success state for generated students
  const [createdStudents, setCreatedStudents] = React.useState<GeneratedStudent[] | null>(null)
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null)
  const [copiedAll, setCopiedAll] = React.useState(false)

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const data = await api.get<any[]>("/api/trainer/groups")
      if (data && Array.isArray(data)) {
        // Map to display schema
        const mapped = data.map((g) => ({
          id: g.id,
          name: g.name,
          studentCount: g.student_ids ? g.student_ids.length : 0,
          awsRoleArn: `arn:aws:iam::${g.aws_account_id || '<AWS_ACCOUNT_ID>'}:role/AzureMIFederatedRole`,
          maxInstancesPerStudent: 2,
          status: "Active" as const
        }))
        setGroups(mapped)
      }
    } catch (err) {
      console.warn("Could not load groups", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchGroups()
  }, [])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const emailsList = studentEmails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0)

      const payload = {
        name,
        description,
        aws_account_id: awsAccount,
        aws_region: awsRegion,
        student_emails: emailsList,
        auto_generate_count: autoGenCount,
        max_instances_per_student: maxInstances
      }

      const res = await api.post<any>("/api/trainer/groups", payload)
      if (res && res.created_students) {
        setCreatedStudents(res.created_students)
        fetchGroups() // Refresh groups table
      }
    } catch (err) {
      console.error("Failed to create group", err)
    }
  }

  const handleCopySingle = (student: GeneratedStudent, idx: number) => {
    const text = `Name: ${student.name}\nUsername: ${student.username}\nPassword: ${student.password}\nLogin Link: ${student.login_link}`
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleCopyAll = () => {
    if (!createdStudents) return
    const text = createdStudents
      .map(s => `Name: ${s.name}\nUsername: ${s.username}\nPassword: ${s.password}\nLogin Link: ${s.login_link}\n----------------------`)
      .join("\n")
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const handleDownloadCsv = () => {
    if (!createdStudents) return
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Username,Password,Login Link\n"
      + createdStudents.map(s => `"${s.name}","${s.username}","${s.password}","${s.login_link}"`).join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${name}_students_credentials.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCloseDialog = () => {
    setOpen(false)
    setCreatedStudents(null)
    // Clear form inputs
    setName("")
    setDescription("")
    setStudentEmails("")
    setAutoGenCount(0)
    setMaxInstances(2)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">Training Groups</h1>
          <p className="text-sm text-zinc-400">
            Create cohort sandbox environments, assign AWS deployment roles, and track active students.
          </p>
        </div>

        <Dialog open={open} onOpenChange={(val) => {
          if (!val) {
            handleCloseDialog()
          } else {
            setOpen(true)
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 max-w-fit shadow-lg shadow-indigo-600/20">
              <FolderPlus className="h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border border-zinc-800 text-zinc-50 max-w-2xl scrollbar-thin overflow-y-auto max-h-[90vh]">
            {!createdStudents ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-zinc-50">Create Training Group</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Setup a student group and automatically create student credentials in a single step.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="gname" className="text-zinc-400">Group Name</Label>
                      <Input
                        id="gname"
                        placeholder="e.g., AWS-101-Cohort-A"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="bg-zinc-900 border-zinc-800 text-zinc-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="desc" className="text-zinc-400">Description</Label>
                      <Input
                        id="desc"
                        placeholder="Introduction to AWS cloud"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-zinc-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="awsAcc" className="text-zinc-400">AWS Account ID</Label>
                      <Input
                        id="awsAcc"
                        placeholder="12-digit account ID"
                        value={awsAccount}
                        onChange={(e) => setAwsAccount(e.target.value)}
                        required
                        className="bg-zinc-900 border-zinc-800 text-zinc-50 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="awsReg" className="text-zinc-400">AWS Region</Label>
                      <Input
                        id="awsReg"
                        placeholder="us-east-1"
                        value={awsRegion}
                        onChange={(e) => setAwsRegion(e.target.value)}
                        required
                        className="bg-zinc-900 border-zinc-800 text-zinc-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emails" className="text-zinc-400">Add Student Emails (Comma/line-separated)</Label>
                    <Textarea
                      id="emails"
                      placeholder="alice@contoso.com, bob@contoso.com"
                      value={studentEmails}
                      onChange={(e) => setStudentEmails(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-50 h-20 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="autoCount" className="text-zinc-400">Or Auto-Generate Generic Accounts (Count)</Label>
                      <Input
                        id="autoCount"
                        type="number"
                        min={0}
                        max={30}
                        value={autoGenCount}
                        onChange={(e) => setAutoGenCount(Number(e.target.value))}
                        className="bg-zinc-900 border-zinc-800 text-zinc-50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="limitInst" className="text-zinc-400">Max Instances Per Student</Label>
                      <Input
                        id="limitInst"
                        type="number"
                        min={1}
                        max={5}
                        value={maxInstances}
                        onChange={(e) => setMaxInstances(Number(e.target.value))}
                        required
                        className="bg-zinc-900 border-zinc-800 text-zinc-50"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog} className="border-zinc-800 text-zinc-400">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                      Create Cohort
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-2">
                    <Check className="h-6 w-6" />
                  </div>
                  <DialogTitle className="text-zinc-50">Cohort Created Successfully</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    Group <span className="font-bold text-zinc-200">{name}</span> setup is complete. Save these student credentials and invite links.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Generated Accounts</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyAll} className="border-zinc-800 text-xs gap-1.5 h-8">
                        {copiedAll ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedAll ? "Copied All" : "Copy All"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownloadCsv} className="border-zinc-800 text-xs gap-1.5 h-8">
                        <Download className="h-3.5 w-3.5" />
                        Download CSV
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-800 overflow-hidden max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-zinc-900/50">
                        <TableRow className="border-b border-zinc-800">
                          <TableHead className="text-zinc-400 font-medium text-xs">Name</TableHead>
                          <TableHead className="text-zinc-400 font-medium text-xs">Username</TableHead>
                          <TableHead className="text-zinc-400 font-medium text-xs">Password</TableHead>
                          <TableHead className="text-zinc-400 font-medium text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {createdStudents.map((student, idx) => (
                          <TableRow key={student.id} className="border-b border-zinc-900 hover:bg-zinc-900/20 text-xs">
                            <TableCell className="font-semibold text-zinc-300">{student.name}</TableCell>
                            <TableCell className="font-mono text-zinc-400">{student.username}</TableCell>
                            <TableCell className="font-mono text-zinc-400">{student.password}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Copy credentials"
                                  onClick={() => handleCopySingle(student, idx)}
                                  className="h-7 w-7 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900"
                                >
                                  {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                                <a href={student.login_link} target="_blank" rel="noopener noreferrer">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Open login link"
                                    className="h-7 w-7 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={handleCloseDialog} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold w-full sm:w-auto">
                    Close & Finish
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-950/40 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-zinc-50">Active Groups</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Overview of sandbox groups. Instructors can monitor student counts and AWS IAM connections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-b border-zinc-800">
                  <TableHead className="text-zinc-400 font-medium">Group Name</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Assigned Students</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Max EC2 Limit</TableHead>
                  <TableHead className="text-zinc-400 font-medium">AWS IAM Role ARN</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-zinc-500 text-sm">
                      No training groups found. Click Create Group to add your first group.
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((group) => (
                    <TableRow key={group.id} className="border-b border-zinc-900 hover:bg-zinc-900/20">
                      <TableCell className="font-semibold text-zinc-300">{group.name}</TableCell>
                      <TableCell className="text-zinc-400">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-zinc-500" />
                          {group.studentCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-300 font-medium">{group.maxInstancesPerStudent} VMs</TableCell>
                      <TableCell className="text-zinc-400 font-mono text-xs max-w-[200px] truncate" title={group.awsRoleArn}>
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
