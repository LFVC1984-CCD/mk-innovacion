interface Props {
  value: string
  label: string
  color: string
  delta?: string
}

export default function SummaryCard({ value, label, color, delta }: Props) {
  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] p-3.5 hover:shadow-md transition-shadow"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <p className="font-condensed text-2xl font-black leading-none" style={{ color }}>{value}</p>
      <p className="text-[10px] text-slate font-semibold uppercase tracking-wide mt-0.5">{label}</p>
      {delta && <p className="text-[10px] font-bold mt-1" style={{ color }}>{delta}</p>}
    </div>
  )
}
