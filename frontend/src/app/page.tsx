"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Terminal, Shield, ArrowRight, ShieldCheck, Cpu, Cloud, BarChart3, Database, Key } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Decorative gradient glow background */}
      <div className="absolute top-0 left-1/4 -z-10 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[100px]" />
      <div className="absolute bottom-0 left-1/3 -z-10 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[80px]" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-50">Contoso CTMP</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          <a href="#features" className="hover:text-zinc-50 transition-colors">Features</a>
          <a href="#architecture" className="hover:text-zinc-50 transition-colors">Architecture</a>
          <a href="#credentials" className="hover:text-zinc-50 transition-colors">Demo Credentials</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-indigo-600/20">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-4 py-1.5 text-xs text-indigo-400 font-medium">
          <ShieldCheck className="h-3.5 w-3.5" />
          Production-Ready Cross-Cloud Federation
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] bg-gradient-to-r from-zinc-50 via-zinc-100 to-indigo-300 bg-clip-text text-transparent">
          Orchestrate Sandbox Lab Environments at Scale
        </h1>
        <p className="text-zinc-400 text-base sm:text-xl max-w-2xl mx-auto font-normal leading-relaxed">
          Provision sandboxes, manage training cohorts, and track active student virtual machines securely using Azure Database for PostgreSQL and AWS OIDC Trust Federation.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 w-full max-w-lg mx-auto">
          <Link href="/login?role=trainer" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-6 py-6 h-12 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Instructor Portal
            </Button>
          </Link>
          <Link href="/login?role=student" className="w-full sm:w-auto">
            <Button size="lg" className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-100 hover:text-zinc-50 text-sm font-bold px-6 py-6 h-12 shadow-lg shadow-zinc-950 flex items-center justify-center gap-2">
              <Terminal className="h-4 w-4" />
              Student Portal
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-900 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Key Capabilities</h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Everything you need to run audited, zero-trust cloud training classrooms.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">One-Step Setup</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Create a training cohort, set AWS resource limits, and auto-generate student login credentials or login links in a single operation.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-400">
              <Cloud className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">AWS OIDC Federation</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Securely authenticate via Microsoft Entra ID and perform EC2 lifecycle actions using temporary credentials from AWS Security Token Service.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">PostgreSQL Backend</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Robust data layer running on Azure Database for PostgreSQL Flexible Server, secured with TLS encryption and isolated subnets.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10 text-amber-400">
              <Key className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Key Vault Secrets</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Zero hardcoded secrets. Key database credentials, tokens, and SSL certificates are dynamically fetched from Azure Key Vault.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600/10 text-rose-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">Billing Tracking</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Real-time cost telemetry mapping back to specific student workloads, enabling automated budgets and warning alerts.
            </p>
          </div>
          <div className="p-6 rounded-xl border border-zinc-900 bg-zinc-950/40 backdrop-blur space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold">WAF Protection</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Application Gateway WAF v2 handles all traffic, protecting APIs from OWASP Top 10 vulnerabilities in Prevention mode.
            </p>
          </div>
        </div>
      </section>

      {/* Demo Credentials Section */}
      <section id="credentials" className="max-w-4xl mx-auto px-6 py-12 mb-20 border border-zinc-800 bg-zinc-950/50 rounded-xl space-y-6">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-indigo-400" />
          <h2 className="text-xl font-bold">Demo Login Credentials</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Use the following pre-seeded credentials to explore the portal features after clicking Sign In:
        </p>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
            <span className="font-semibold text-indigo-400 text-xs uppercase tracking-wider block">Trainer Portal</span>
            <div className="space-y-1 text-xs text-zinc-300 font-mono">
              <p>Username: trainer1</p>
              <p>Password: Password123</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
            <span className="font-semibold text-indigo-400 text-xs uppercase tracking-wider block">Student Portal</span>
            <div className="space-y-1 text-xs text-zinc-300 font-mono">
              <p>Username: student1</p>
              <p>Password: Password123</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        &copy; {new Date().getFullYear()} Contoso Cloud. All rights reserved. Enforced security and compliance logs.
      </footer>
    </div>
  )
}
