"use client"

import * as React from "react"

// Simple config-based class helper
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
    theme?: Record<string, string>
  }
>

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer.")
  }
  return context
}

export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactElement
  }
>(({ id, className, config, children, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={className}
        {...props}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            #${chartId} {
              ${Object.entries(config)
                .map(([key, value]) => {
                  if (!value.color) return ""
                  return `--color-${key}: ${value.color};`
                })
                .join("\n")}
            }
          `
        }} />
        <div id={chartId} className="w-full h-full">
          {children}
        </div>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

export const ChartTooltip = ({ ...props }) => {
  return null // Recharts handles rendering via the custom content prop
}

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean
    payload?: any[]
    label?: string
    labelFormatter?: (label: any) => React.ReactNode
    formatter?: (value: any, name: any, item: any, index: any) => React.ReactNode
    indicator?: "dot" | "line" | "dashed"
    hideLabel?: boolean
  } & React.ComponentProps<"div">
>(
  (
    {
      active,
      payload,
      label,
      labelFormatter,
      formatter,
      indicator = "dot",
      hideLabel = false,
      className,
      ...props
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs shadow-md text-zinc-50"
        {...props}
      >
        {!hideLabel && (
          <div className="font-medium text-zinc-400 mb-1">
            {labelFormatter ? labelFormatter(label) : label}
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = item.name || item.dataKey
            const itemConfig = config[key]
            const color = itemConfig?.color || item.color || item.payload?.fill
            const labelText = itemConfig?.label || key

            return (
              <div key={index} className="flex items-center gap-2">
                {indicator === "dot" && (
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-zinc-400">{labelText}:</span>
                <span className="font-semibold font-mono">
                  {formatter ? formatter(item.value, item.name, item, index) : item.value}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"
