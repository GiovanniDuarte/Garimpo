'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Pickaxe, Library, ChevronLeft, ChevronRight } from 'lucide-react'
import { RedDiamondIcon } from '@/components/brand/RedDiamondIcon'

const links = [
  {
    href: '/garimpo',
    label: 'Garimpo',
    icon: Pickaxe,
    description: 'Descobrir vídeos',
  },
  {
    href: '/biblioteca',
    label: 'Biblioteca',
    icon: Library,
    description: 'Canais salvos',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col border-r border-[#272727] bg-[#0f0f0f] text-foreground',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-60'
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex h-14 items-center gap-3 px-4',
          collapsed && 'justify-center px-0'
        )}
      >
        <Link
          href="/garimpo"
          className="flex items-center gap-2.5 min-w-0"
          tabIndex={0}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
            <RedDiamondIcon size={26} />
          </div>
          {!collapsed && (
            <span className="truncate text-base font-bold tracking-tight text-white">
              Garimpo
            </span>
          )}
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3 h-px bg-[#272727]" />

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-2 py-3">
        {links.map(({ href, label, icon: Icon, description }) => {
          const active =
            pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm font-medium',
                'transition-colors duration-150',
                active
                  ? 'bg-[#272727] text-white'
                  : 'text-[#aaaaaa] hover:bg-[#272727] hover:text-white',
                collapsed && 'justify-center px-0 py-3'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  active ? 'text-white' : 'text-[#aaaaaa] group-hover:text-white'
                )}
              />
              {!collapsed && (
                <div className="flex min-w-0 flex-col leading-none">
                  <span className="truncate">{label}</span>
                  <span className="mt-0.5 truncate text-[11px] text-[#717171] group-hover:text-[#aaaaaa]">
                    {description}
                  </span>
                </div>
              )}
              {/* Active indicator bar */}
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          'mt-auto flex items-center gap-2 px-4 py-4 text-xs text-[#717171]',
          'hover:text-white transition-colors',
          collapsed && 'justify-center px-0'
        )}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span>Recolher</span>
          </>
        )}
      </button>
    </aside>
  )
}
