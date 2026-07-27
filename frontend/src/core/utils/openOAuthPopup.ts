export function openOAuthPopup(windowName: string): Window | null {
  const width = 520
  const height = 720
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes',
  ].join(',')

  const popup = window.open('about:blank', windowName, features)
  if (!popup) return null

  popup.document.write(
    '<p style="font-family:Manrope,sans-serif;padding:1rem;color:#737373">Abriendo Google…</p>',
  )
  return popup
}
