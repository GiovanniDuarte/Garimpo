interface HeaderProps {
  title?: string
  description?: string
  action?: React.ReactNode
  /** Barra só com ações (título omitido) — páginas com hero próprio */
  actionsOnly?: boolean
}

export function Header({
  title,
  description,
  action,
  actionsOnly,
}: HeaderProps) {
  const showTitle = !actionsOnly && title
  return (
    <header className="sticky top-0 z-30 flex min-h-[52px] items-center justify-between gap-4 border-b border-white/[0.07] bg-gp-bg/95 px-6 py-2.5 backdrop-blur-md">
      {showTitle ? (
        <div className="flex min-w-0 flex-col">
          <h1 className="font-heading truncate text-lg font-bold tracking-wide text-gp-text">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 truncate text-xs text-gp-text2">{description}</p>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {action && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
          {action}
        </div>
      )}
    </header>
  )
}
