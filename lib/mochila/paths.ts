import { rm, unlink } from 'fs/promises'
import path from 'path'

export function getMochilaZipPath(canalId: string): string {
  return path.join(process.cwd(), 'data', 'mochilas', `${canalId}.zip`)
}

/** Remove o .zip final e o .tmp de geração a meio (crash), para não misturar com arquivo novo. */
export async function apagarMochilaZipSeExistir(canalId: string): Promise<void> {
  const p = getMochilaZipPath(canalId)
  await rm(p, { force: true }).catch(() => {})
  await rm(`${p}.tmp`, { force: true }).catch(() => {})
}

export async function removerArquivoMochila(canalId: string): Promise<void> {
  await apagarMochilaZipSeExistir(canalId)
}
