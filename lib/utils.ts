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

  let baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, "");

  // If the base URL ends with /api, remove it to serve static files from root
  if (baseUrl.endsWith("/api")) {
    baseUrl = baseUrl.slice(0, -4);
  }

  const cleanPath = path.replace(/^\//, "");

  return `${baseUrl}/${cleanPath}`;
}

export function formatMoney(amount?: number | string, currency = "ETB") {
  const val = Number(amount) || 0;
  return `${val.toFixed(2)} ${currency}`;
}
