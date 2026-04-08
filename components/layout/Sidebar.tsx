'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Pickaxe, Library, Star, Crosshair } from 'lucide-react'
import { GarimpoGemMark } from '@/components/brand/GarimpoGemMark'

const links = [
  {
    href: '/garimpo',
    label: 'Garimpar',
    icon: Pickaxe,
  },
  {
    href: '/biblioteca',
    label: 'Biblioteca',
    icon: Library,
  },
  {
    href: '/favoritos',
    label: 'Favoritos',
    icon: Star,
  },
  {
    href: '/mineirador',
    label: 'Mineirador',
    icon: Crosshair,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col border-r border-white/[0.07] bg-gp-bg2">
      <div className="flex items-center border-b border-white/[0.07] px-5 py-[20px] pb-[18px]">
        <Link
          href="/garimpo"
          className="flex min-w-0 items-center gap-1.5"
          aria-label="Garimpo — início"
        >
          <GarimpoGemMark size={48} />
          <span className="font-heading text-[17px] font-extrabold tracking-[0.04em] text-gp-text antialiased">
            Garimpo
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col px-3 py-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-normal transition-colors',
                active
                  ? 'bg-gp-gold-dim font-medium text-gp-gold'
                  : 'text-gp-text2 hover:bg-gp-bg3 hover:text-gp-text'
              )}
            >
              <Icon
                className={cn(
                  'size-[22px] shrink-0 stroke-[1.75]',
                  active ? 'text-gp-gold' : 'text-gp-text2'
                )}
                aria-hidden
              />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/[0.07] px-3 py-3.5">
        <div className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-gp-bg3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-gp-bg4 font-heading text-[11px] font-semibold text-gp-text2">
            G
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-tight text-gp-text">
              Garimpo
            </p>
            <p className="text-[11px] text-gp-text3">local</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
