export default function PresentacionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {children}
    </div>
  )
}
