"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import * as RechartsPrimitive from "recharts"

const ChartContext = React.createContext(null)

function ChartContainer({ id, className, children, config, ...props }) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`
  return <ChartContext.Provider value={{ config }}><div data-chart={chartId} className={cn("flex aspect-video justify-center text-xs", className)} {...props}><RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer></div></ChartContext.Provider>
}

function ChartTooltip({ active, payload, label, ...props }) {
  const { config } = React.useContext(ChartContext) || {}
  if (!active || !payload?.length) return null
  return <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl" {...props}><div className="font-medium">{label}</div>{payload.map((item, index) => { const key = item.dataKey || item.name || `value-${index}`; return <div key={item.dataKey || index} className="flex w-full items-center gap-2"><span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} /><span className="text-muted-foreground">{config?.[key]?.label || item.name}</span><span className="ml-auto font-mono font-medium tabular-nums">{item.value}</span></div> })}</div>
}

function ChartLegend({ payload, ...props }) {
  const { config } = React.useContext(ChartContext) || {}
  if (!payload?.length) return null
  return <div className="flex items-center justify-center gap-4" {...props}>{payload.map((item) => { const key = item.dataKey || item.value; return <div key={key} className="flex items-center gap-1.5 text-xs"><span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />{config?.[key]?.label || item.value}</div> })}</div>
}

export { ChartContainer, ChartTooltip, ChartLegend }
