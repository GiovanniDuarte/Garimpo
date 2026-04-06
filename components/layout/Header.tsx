interface HeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between gap-4 border-b border-[#272727] bg-[#0f0f0f]/95 px-6 py-3 backdrop-blur-md">
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-xl font-semibold leading-tight tracking-tight text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 truncate text-xs text-[#aaaaaa]">{description}</p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </header>
  )
}
