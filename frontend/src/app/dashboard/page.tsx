"use client";

import * as React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useApiClient } from "@/hooks/use-api-client";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { InstanceChart } from "@/components/dashboard/instance-chart";
import { CostChart } from "@/components/dashboard/cost-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AlertCircle, RefreshCw, Users, FolderKanban, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsDashboardResponse {
  active_instances: number;
  total_users: number;
  cpu_utilization_avg: number;
  active_groups: number;
  total_spend_usd: number;
}

interface BillingSummaryResponse {
  total_platform_cost: number;
  active_groups_count: number;
  active_students_count: number;
  top_spending_group_id: string;
  currency: string;
  monthly_budget: number;
  budget_utilization_percentage: number;
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

export default function DashboardPage() {
  const { name, isAdmin, isTrainer } = useAuth();
  const api = useApiClient();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  // Regular Trainer/Student states
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsDashboardResponse | null>(null);
  const [billingData, setBillingData] = React.useState<BillingSummaryResponse | null>(null);
  const [instanceMetrics, setInstanceMetrics] = React.useState<InstanceMetricsPoint[]>([]);
  const [costMetrics, setCostMetrics] = React.useState<CostMetricsPoint[]>([]);

  // Admin states
  const [users, setUsers] = React.useState<any[]>([]);
  const [groups, setGroups] = React.useState<any[]>([]);

  const roleLabel = React.useMemo(() => {
    if (isAdmin) return "System Administrator";
    if (isTrainer) return "Training Instructor";
    return "Student Member";
  }, [isAdmin, isTrainer]);

  // 1. Fetch regular dashboard stats (accessible by Trainer/Student)
  const loadDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const analyticsRes = await api.get<AnalyticsDashboardResponse>("/api/analytics/dashboard");
      setAnalyticsData(analyticsRes);

      const instanceRes = await api.get<InstanceMetricsPoint[]>("/api/analytics/metrics/instances");
      setInstanceMetrics(instanceRes || []);

      if (isTrainer) {
        try {
          const billingRes = await api.get<BillingSummaryResponse>("/api/billing/summary");
          setBillingData(billingRes);

          const costRes = await api.get<CostMetricsPoint[]>("/api/analytics/metrics/costs");
          setCostMetrics(costRes || []);
        } catch (billingErr) {
          console.warn("Could not fetch billing/costs dashboard data", billingErr);
        }
      }
    } catch (err: any) {
      console.error("Dashboard metrics loading error:", err);
      setError("Failed to sync latest cloud telemetry data from backend API.");
    } finally {
      setLoading(false);
    }
  }, [api, isTrainer]);

  // 2. Fetch admin dashboard stats (users and groups directory)
  const loadAdminDashboardData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const usersRes = await api.get<any[]>("/api/admin/users");
      setUsers(usersRes || []);
      const groupsRes = await api.get<any[]>("/api/admin/groups");
      setGroups(groupsRes || []);
    } catch (err: any) {
      console.error("Admin dashboard data loading error:", err);
      setError("Failed to sync latest administration directory from database.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  React.useEffect(() => {
    if (isAdmin) {
      loadAdminDashboardData();
    } else {
      loadDashboardData();
    }
  }, [isAdmin, loadAdminDashboardData, loadDashboardData]);

  // Format stats cards data
  const statsData = React.useMemo(() => {
    if (!analyticsData) return undefined;
    return {
      activeInstances: analyticsData.active_instances,
      totalStudents: analyticsData.total_users,
      monthlySpend: billingData?.total_platform_cost ?? analyticsData.total_spend_usd,
      budgetLimit: billingData?.monthly_budget ?? 500.0,
      uptimePercent: 100.0,
    };
  }, [analyticsData, billingData]);

  // Format instance metrics for Recharts
  const formattedInstanceData = React.useMemo(() => {
    if (!instanceMetrics || instanceMetrics.length === 0) return [];
    return instanceMetrics.map((p) => {
      const date = new Date(p.timestamp);
      return {
        day: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        active: p.running_count,
        stopped: p.stopped_count,
      };
    });
  }, [instanceMetrics]);

  // Format cost metrics for Recharts
  const formattedCostData = React.useMemo(() => {
    if (!costMetrics || costMetrics.length === 0) return [];
    return costMetrics.map((p) => {
      const date = new Date(p.timestamp);
      return {
        month: date.toLocaleDateString([], { month: "short", day: "numeric" }),
        compute: p.cumulative_cost_usd,
        storage: 0.0,
        network: 0.0,
      };
    });
  }, [costMetrics]);

  // Split users into trainers and students for the admin view
  const trainers = React.useMemo(() => users.filter(u => u.role === "Trainer" || u.roles?.includes("Trainer")), [users]);
  const students = React.useMemo(() => users.filter(u => u.role === "Student" || u.roles?.includes("Student")), [users]);

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-zinc-400">Syncing active virtual machine telemetry...</p>
      </div>
    );
  }

  // --- ADMIN VIEW ---
  if (isAdmin) {
    const isSystemEmpty = trainers.length === 0 && students.length === 0;

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">
              Welcome back, {name || "User"}
            </h1>
            <p className="text-sm text-zinc-400">
              Signed in as{" "}
              <span className="font-semibold text-indigo-400">System Administrator</span>.
              Here is the live portal directory.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAdminDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync Directory
            </button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSystemEmpty ? (
          <Card className="bg-zinc-950/40 border-zinc-800/80 p-8 text-center max-w-xl mx-auto mt-12 shadow-2xl">
            <CardHeader className="pb-2">
              <div className="mx-auto p-4 rounded-full bg-zinc-900 border border-zinc-800 w-fit mb-4 text-indigo-400 animate-pulse">
                <Sparkles className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl font-bold text-zinc-100">Portal Directory is Empty</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                No active trainers or students are registered in the SQL database.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-500 max-w-md mx-auto">
              Emergency local admin <span className="font-mono text-zinc-450 font-semibold">admin1</span> is active. Once trainers and students log in via Microsoft Entra ID or get invited, they will appear here automatically.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Trainers Card */}
            <Card className="bg-zinc-950/40 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-900">
                <CardTitle className="text-base font-semibold text-zinc-50 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  Registered Instructors ({trainers.length})
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Trainers authorized to create sandboxes and cohorts.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {trainers.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-6">No trainers registered.</p>
                ) : (
                  <div className="space-y-3">
                    {trainers.map((t) => {
                      const managed = groups.filter(g => g.trainer_id === t.id);
                      return (
                        <div key={t.id} className="flex flex-col gap-1 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-zinc-200">{t.name || t.id}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{t.email}</span>
                          </div>
                          {managed.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {managed.map(g => (
                                <span key={g.id} className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <FolderKanban className="h-3 w-3" />
                                  {g.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500 italic mt-1">No groups assigned</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students Card */}
            <Card className="bg-zinc-950/40 border-zinc-800">
              <CardHeader className="pb-3 border-b border-zinc-900">
                <CardTitle className="text-base font-semibold text-zinc-50 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  Active Students ({students.length})
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Students enrolled in active training sandboxes.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {students.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-6">No students registered.</p>
                ) : (
                  <div className="space-y-3">
                    {students.map((s) => {
                      const enrolled = groups.filter(g => g.student_ids?.includes(s.id));
                      return (
                        <div key={s.id} className="flex flex-col gap-1 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-zinc-200">{s.name || s.id}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{s.email}</span>
                          </div>
                          {enrolled.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {enrolled.map(g => (
                                <span key={g.id} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <FolderKanban className="h-3 w-3" />
                                  {g.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-500 italic mt-1">Not enrolled in any cohorts</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // --- TRAINER/STUDENT VIEW ---
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-50">
            Welcome back, {name || "User"}
          </h1>
          <p className="text-sm text-zinc-400">
            Signed in as{" "}
            <span className="font-semibold text-indigo-400">{roleLabel}</span>.
            Access all resources below.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards Section */}
      <StatsCards data={statsData} />

      {/* Main Charts / Feed Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Instance Trends */}
        <div className="lg:col-span-2 space-y-6">
          <InstanceChart data={formattedInstanceData} />
          {isTrainer && <CostChart data={formattedCostData} />}
        </div>

        {/* Real-time Activity Feed */}
        <div>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
