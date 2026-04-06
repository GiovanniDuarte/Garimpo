interface HeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[5rem] items-center justify-between border-b border-[#303030] bg-background/80 px-6 py-4 backdrop-blur-xl transition-all">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground/90">{title}</h1>
        {description && (
          <p className="text-sm font-medium text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </header>
  )
}
