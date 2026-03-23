/**
 * Toast 通知组件
 */
let container = null

function ensureContainer() {
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    document.body.appendChild(container)
  }
  return container
}

export function toast(message, type = 'info', duration = 3000) {
  const el = ensureContainer()
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = message
  el.appendChild(t)

  setTimeout(() => {
    t.style.opacity = '0'
    t.style.transform = 'translateX(100%)'
    setTimeout(() => t.remove(), 300)
  }, duration)
}

export const toastSuccess = (msg, dur) => toast(msg, 'success', dur)
export const toastError = (msg, dur) => toast(msg, 'error', dur)
export const toastInfo = (msg, dur) => toast(msg, 'info', dur)
export const toastWarning = (msg, dur) => toast(msg, 'warning', dur)
