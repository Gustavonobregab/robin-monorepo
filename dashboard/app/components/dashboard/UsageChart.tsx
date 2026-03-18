'use client'
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { UsageChartPoint } from '@/types'

interface UsageChartProps {
  data: UsageChartPoint[]
}

export function UsageChart({ data }: UsageChartProps) {
  return (
    <div className="bg-background rounded-xl p-5 border border-border shadow-sm">
      <p className="text-sm font-medium mb-4">Requests (last 30 days)</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="requests"
            stroke="#A0C878"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
