export const apiBase = import.meta.env.VITE_API_BASE || ''

export function getCookie(name) {
  if (!document.cookie) return ''
  const parts = document.cookie.split(';')
  for (const p of parts) {
    const idx = p.indexOf('=')
    if (idx === -1) continue
    const k = p.slice(0, idx).trim()
    if (k === name) return decodeURIComponent(p.slice(idx + 1).trim())
  }
  return ''
}

export async function ensureCsrf() {
  await fetch(`${apiBase}/api/csrf/`, { credentials: 'include' })
}

export async function apiFetch(path, options = {}) {
  const csrf = getCookie('csrftoken')
  const headers = {
    ...(options.headers || {}),
    ...(csrf && options.method && options.method !== 'GET'
      ? { 'X-CSRFToken': csrf }
      : {}),
  }
  return fetch(`${apiBase}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })
}
