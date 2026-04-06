import { unlink } from 'fs/promises'
import path from 'path'

export function getMochilaZipPath(canalId: string): string {
  return path.join(process.cwd(), 'data', 'mochilas', `${canalId}.zip`)
}

export async function removerArquivoMochila(canalId: string): Promise<void> {
  try {
    await unlink(getMochilaZipPath(canalId))
  } catch {
    // ficheiro inexistente
  }
}
