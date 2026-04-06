import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Troca =sNN- por =s288- em URLs de avatar YouTube para menos pixelização. */
export function channelAvatarDisplayUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.includes('ggpht.com') || url.includes('googleusercontent')) {
    return url.replace(/=s\d+-/, '=s288-')
  }
  return url
}
