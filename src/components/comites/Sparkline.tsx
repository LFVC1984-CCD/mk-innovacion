'use client'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props {
  data: number[]
  color: string
  width?: number
  height?: number
}

export default function Sparkline({ data, color, width = 80, height = 28 }: Props) {
  const chartData = data.map((v, i) => ({ v, i }))
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
