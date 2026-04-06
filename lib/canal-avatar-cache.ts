import fs from 'fs/promises'
import path from 'path'

const AVATAR_DIR = path.join(process.cwd(), 'public', 'avatars')

export async function getCanalAvatarCached(canalId: string): Promise<string> {
  await fs.mkdir(AVATAR_DIR, { recursive: true })
  const filePath = path.join(AVATAR_DIR, `${canalId}.jpg`)
  try {
    await fs.access(filePath)
    return `/avatars/${canalId}.jpg`
  } catch {
    return ''
  }
}

export async function clearCanalAvatarFiles(canalId: string): Promise<void> {
  const filePath = path.join(AVATAR_DIR, `${canalId}.jpg`)
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore
  }
}
