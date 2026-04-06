'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Pickaxe, Library } from 'lucide-react'
import { RedDiamondIcon } from '@/components/brand/RedDiamondIcon'

const links = [
  { href: '/garimpo', label: 'Garimpo', icon: Pickaxe },
  { href: '/biblioteca', label: 'Biblioteca', icon: Library },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#303030] bg-sidebar text-sidebar-foreground backdrop-blur-xl transition-all">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex items-center justify-center rounded-lg bg-[#212121] p-2 ring-1 ring-[#303030]">
          <RedDiamondIcon size={28} />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground/90">Garimpo</span>
      </div>
      <nav className="flex flex-col gap-1.5 px-4 py-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-[1.125rem] w-[1.125rem] transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
