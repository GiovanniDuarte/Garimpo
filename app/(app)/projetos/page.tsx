import { Header } from '@/components/layout/Header'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { FolderKanban, Sparkles } from 'lucide-react'

export default function ProjetosPage() {
  return (
    <>
      <Header
        title="Projetos"
        description="Transforme inspiração em vídeos reais."
      />
      <PageWrapper>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="relative flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-card/40 p-12 shadow-2xl backdrop-blur-md max-w-lg w-full">
            <div className="absolute -top-12 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-white/10 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
              <FolderKanban className="h-10 w-10 text-primary" />
            </div>
            
            <div className="mt-8 space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Kit de Produção Premium</h2>
              <p className="text-muted-foreground leading-relaxed">
                A estruturação de novos projetos, gerenciamento de ideias e painel de roteiro inteligente estão passando por uma reformulação.
              </p>
            </div>
            
            <div className="mt-8 flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-primary shadow-sm">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-wide">Em breve na próxima atualização</span>
            </div>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}

