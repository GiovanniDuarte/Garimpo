/** URL estável do perfil do canal para gravar na biblioteca (id UC…). */
export function urlPerfilCanalYoutube(youtubeId: string, fallback?: string | null): string {
  const id = youtubeId.trim()
  if (!id) return (fallback ?? '').trim()
  return `https://www.youtube.com/channel/${id}`
}
