"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function LoadingSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="bg-zinc-950/40 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24 bg-zinc-800" />
              <Skeleton className="h-8 w-8 rounded-lg bg-zinc-800" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-32 bg-zinc-800" />
              <Skeleton className="h-3 w-40 bg-zinc-800" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts & Feed Layout Skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2 bg-zinc-950/40 border-zinc-800">
          <CardHeader>
            <Skeleton className="h-5 w-48 bg-zinc-800" />
            <Skeleton className="h-3.5 w-72 bg-zinc-800" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full bg-zinc-800 rounded-lg" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/40 border-zinc-800">
          <CardHeader>
            <Skeleton className="h-5 w-36 bg-zinc-800" />
            <Skeleton className="h-3.5 w-56 bg-zinc-800" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex gap-3 pb-3 border-b border-zinc-900 last:border-0">
                <Skeleton className="h-4 w-4 rounded-full bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-24 bg-zinc-800" />
                    <Skeleton className="h-2.5 w-10 bg-zinc-800" />
                  </div>
                  <Skeleton className="h-3.5 w-40 bg-zinc-800" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Table Skeleton */}
      <Card className="bg-zinc-950/40 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40 bg-zinc-800" />
            <Skeleton className="h-3.5 w-60 bg-zinc-800" />
          </div>
          <Skeleton className="h-9 w-24 bg-zinc-800" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 py-2 border-b border-zinc-800">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-4 flex-1 bg-zinc-800" />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-4 py-3 border-b border-zinc-900 last:border-0">
              {Array.from({ length: 4 }).map((_, colIdx) => (
                <Skeleton key={colIdx} className="h-3.5 flex-1 bg-zinc-800" />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
