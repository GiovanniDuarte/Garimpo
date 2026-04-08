import { redirect } from 'next/navigation'

/** Rota antiga; bookmark e links legados continuam a funcionar. */
export default function CacadorLegadoRedirect() {
  redirect('/mineirador')
}
