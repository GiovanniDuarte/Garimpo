import { Sidebar } from '@/components/layout/Sidebar'

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gp-bg text-foreground">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-gp-bg">
        {children}
      </div>
    </div>
  )
}
