import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { API_CONFIG } from './api-config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getImageUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }

  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");

  return `${baseUrl}/${cleanPath}`;
}
