import { Sidebar } from '@/components/layout/Sidebar'

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#ff0000]/[0.06] via-background to-background text-foreground selection:bg-[#ff0000]/25">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">{children}</div>
    </div>
  )
}
