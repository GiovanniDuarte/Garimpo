'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Ação ao confirmar; o diálogo só fecha após resolver sem erro. */
  onConfirm: () => void | Promise<void>
  destructive?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  destructive,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    if (!open) setPending(false)
  }, [open])

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Mantém aberto; quem chama pode mostrar toast.
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent
        showCloseButton={!pending}
        className="border-white/[0.1] bg-gp-bg2 text-gp-text sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-gp-text">{title}</DialogTitle>
          {description != null && description !== '' && (
            <DialogDescription className="text-gp-text2">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="border-white/[0.07] bg-gp-bg3/80 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-white/[0.12] bg-transparent text-gp-text2 hover:bg-gp-bg4 hover:text-gp-text"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
