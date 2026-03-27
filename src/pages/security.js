/**
 * 安全设置页面
 * 访问密码管理 & 无视风险模式
 */
import { icon } from '../lib/icons.js'
import { toastSuccess, toastError, toastWarning } from '../lib/toast.js'
import { getSetting, setSetting, deleteSetting } from '../lib/store.js'
import { createModal } from '../lib/modal.js'

const SECURITY_KEYS = {
  ACCESS_PASSWORD: 'security.access_password',
  IGNORE_RISK: 'security.ignore_risk',
  SESSION_AUTH: 'security.session_auth',
}

const SESSION_KEY = 'storybook_authed'

export function isSessionAuthed() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function setSessionAuthed(authed) {
  if (authed) {
    sessionStorage.setItem(SESSION_KEY, '1')
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

export function clearSessionAuth() {
  sessionStorage.removeItem(SESSION_KEY)
}

export async function getSecurityStatus() {
  let password = await getSetting(SECURITY_KEYS.ACCESS_PASSWORD, '')
  const ignoreRisk = await getSetting(SECURITY_KEYS.IGNORE_RISK, false)
  
  if (!password && !ignoreRisk) {
    password = '123456'
    await setSetting(SECURITY_KEYS.ACCESS_PASSWORD, password)
  }
  
  const isDefault = password === '123456'
  
  return {
    hasPassword: !!password && !ignoreRisk,
    ignoreRisk: !!ignoreRisk,
    mustChangePassword: isDefault,
    defaultPassword: isDefault ? '123456' : null,
  }
}

export async function verifyPassword(password) {
  const storedPassword = await getSetting(SECURITY_KEYS.ACCESS_PASSWORD, '')
  return storedPassword === password
}

export async function changePassword(oldPassword, newPassword) {
  const storedPassword = await getSetting(SECURITY_KEYS.ACCESS_PASSWORD, '')
  
  if (storedPassword && storedPassword !== oldPassword) {
    return { success: false, error: '当前密码错误' }
  }
  
  const strengthError = checkPasswordStrength(newPassword)
  if (strengthError) {
    return { success: false, error: strengthError }
  }
  
  const success = await setSetting(SECURITY_KEYS.ACCESS_PASSWORD, newPassword)
  if (success) {
    await deleteSetting(SECURITY_KEYS.IGNORE_RISK)
    return { success: true }
  }
  return { success: false, error: '保存失败' }
}

export async function setIgnoreRisk(enable) {
  if (enable) {
    await deleteSetting(SECURITY_KEYS.ACCESS_PASSWORD)
    await setSetting(SECURITY_KEYS.IGNORE_RISK, true)
  } else {
    await deleteSetting(SECURITY_KEYS.IGNORE_RISK)
  }
  return { success: true }
}

function checkPasswordStrength(password) {
  if (!password || password.length < 6) {
    return '密码至少 6 位'
  }
  if (password.length > 64) {
    return '密码不能超过 64 位'
  }
  if (/^\d+$/.test(password)) {
    return '密码不能是纯数字'
  }
  const weakPasswords = ['123456', '654321', 'password', 'admin', 'qwerty', 'abc123', '111111', '000000', 'letmein', 'welcome']
  if (weakPasswords.includes(password.toLowerCase())) {
    return '密码太常见，请换一个更安全的密码'
  }
  return null
}

export function getPasswordStrength(password) {
  if (!password) {
    return { level: 0, text: '', color: '' }
  }
  if (password.length < 6) {
    return { level: 1, text: '太短', color: 'var(--error)' }
  }
  if (/^\d+$/.test(password)) {
    return { level: 1, text: '纯数字太弱', color: 'var(--error)' }
  }
  
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  
  if (score <= 1) return { level: 2, text: '一般', color: 'var(--warning)' }
  if (score <= 3) return { level: 3, text: '良好', color: 'var(--accent)' }
  return { level: 4, text: '强', color: 'var(--success)' }
}

async function showPasswordModal() {
  return new Promise((resolve) => {
    const contentEl = document.createElement('div')
    contentEl.innerHTML = `
      <div class="login-verify-container">
        <div class="login-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>
        <div class="login-title">访问验证</div>
        <div class="login-desc">请输入密码以访问应用程序</div>
        <div class="form-group">
          <input type="password" id="verify-password" class="form-input login-input" 
            placeholder="请输入访问密码" autocomplete="current-password">
        </div>
        <div id="verify-error" class="login-error" style="display:none"></div>
        <div class="login-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <span>首次使用默认密码为 <a href="#" class="default-password-link" data-password="123456" style="color: var(--accent); text-decoration: underline; cursor: pointer;">123456</a></span>
        </div>
      </div>
    `

    const doVerify = async (e, modalInstance) => {
      const input = contentEl.querySelector('#verify-password')
      const errorEl = contentEl.querySelector('#verify-error')
      const password = input.value.trim()

      if (!password) {
        errorEl.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>请输入密码</span>
        `
        errorEl.style.display = 'flex'
        input.focus()
        return false
      }

      const isValid = await verifyPassword(password)

      if (isValid) {
        setSessionAuthed(true)
        if (modalInstance) {
          modalInstance.close()
        }
        resolve(true)
        return true
      } else {
        errorEl.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>密码错误，请重试</span>
        `
        errorEl.style.display = 'flex'
        input.value = ''
        input.focus()
        input.classList.add('shake')
        setTimeout(() => input.classList.remove('shake'), 500)
        return false
      }
    }

    const modal = createModal({
      title: '',
      content: contentEl,
      size: 'sm',
      closable: false,
      maskClosable: false,
      keyboard: false,
      showCancel: false,
      showHeader: false,
      buttons: [
        {
          text: '验证',
          type: 'primary',
          className: 'modal-btn-full-width',
          icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>`,
          onClick: doVerify,
        }
      ],
    })

    const input = contentEl.querySelector('#verify-password')
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        doVerify(e, modal)
      }
    })

    // 默认密码点击事件
    const defaultPasswordLink = contentEl.querySelector('.default-password-link')
    if (defaultPasswordLink) {
      defaultPasswordLink.addEventListener('click', (e) => {
        e.preventDefault()
        const password = defaultPasswordLink.getAttribute('data-password')
        input.value = password
        input.focus()
      })
    }

    setTimeout(() => {
      input?.focus()
    }, 100)
  })
}

export async function checkSecurityAccess() {
  const status = await getSecurityStatus()

  if (status.ignoreRisk || !status.hasPassword) {
    return true
  }

  if (isSessionAuthed()) {
    return true
  }

  return await showPasswordModal()
}

export function render() {
  const container = document.createElement('div')
  container.className = 'page'

  container.innerHTML = `
    <div class="page-header">
      <h1>安全设置</h1>
    </div>
    <div id="security-content">
      <div class="config-section loading-placeholder" style="height:120px"></div>
    </div>
  `

  loadSecurityStatus(container)
  return container
}

async function loadSecurityStatus(container) {
  const contentEl = container.querySelector('#security-content')
  try {
    const status = await getSecurityStatus()
    renderSecurityContent(contentEl, status)
  } catch (e) {
    contentEl.innerHTML = `
      <div class="config-section">
        <p style="color:var(--error)">加载失败: ${e.message}</p>
      </div>
    `
  }
}

function renderSecurityContent(container, status) {
  let html = ''

  const stateIcon = status.hasPassword
    ? (status.mustChangePassword ? icon('alert-circle', 16) : icon('check', 16))
    : (status.ignoreRisk ? icon('alert-circle', 16) : icon('info', 16))
  const stateText = status.hasPassword
    ? (status.mustChangePassword ? '使用默认密码（需修改）' : '已设置自定义密码')
    : (status.ignoreRisk ? '无视风险模式（无密码）' : '未设置密码')
  const stateColor = status.hasPassword && !status.mustChangePassword
    ? 'var(--success)'
    : 'var(--warning)'

  html += `
    <div class="config-section">
      <div class="config-section-title">访问密码状态</div>
      <div class="security-status-card" style="border-left-color: ${stateColor}">
        <span class="security-status-icon" style="color: ${stateColor}">${stateIcon}</span>
        <div class="security-status-info">
          <div class="security-status-text">${stateText}</div>
          <div class="security-status-desc">
            ${status.hasPassword
              ? '每次打开应用需输入密码'
              : (status.ignoreRisk ? '任何人打开应用即可使用' : '建议设置密码以保护数据')}
          </div>
        </div>
      </div>
    </div>
  `

  html += `
    <div class="config-section">
      <div class="config-section-title">${status.hasPassword ? '修改密码' : '设置密码'}</div>
      <form id="form-change-pw" class="security-form">
        ${status.hasPassword ? `
          <div class="form-group">
            <label class="form-label">当前密码</label>
            <input type="password" id="sec-old-pw" class="form-input" 
              placeholder="输入当前密码" autocomplete="current-password"
              ${status.defaultPassword ? `value="${status.defaultPassword}"` : ''}>
            ${status.defaultPassword ? '<div class="form-hint">已自动填充默认密码，直接设置新密码即可</div>' : ''}
          </div>
        ` : ''}
        <div class="form-group">
          <label class="form-label">新密码</label>
          <input type="password" id="sec-new-pw" class="form-input" 
            placeholder="至少 6 位，不能纯数字" autocomplete="new-password">
          <div id="pw-strength" class="password-strength"></div>
        </div>
        <div class="form-group">
          <label class="form-label">确认新密码</label>
          <input type="password" id="sec-confirm-pw" class="form-input" 
            placeholder="再次输入新密码" autocomplete="new-password">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            ${status.hasPassword ? '确认修改' : '设置密码'}
          </button>
          <span id="change-pw-msg" class="form-message"></span>
        </div>
      </form>
    </div>
  `

  html += `
    <div class="config-section">
      <div class="config-section-title" style="display:flex;align-items:center;gap:6px">
        ${icon('alert-circle', 16)}
        无视风险模式
      </div>
      <div class="ignore-risk-card ${status.ignoreRisk ? 'enabled' : ''}">
        <div class="ignore-risk-header">
          <div class="ignore-risk-info">
            <div class="ignore-risk-title">关闭密码保护</div>
            <div class="ignore-risk-desc">
              开启后任何人都可以直接访问应用，无需输入密码。<br>
              <strong style="color:var(--error)">仅建议在受信任的环境中使用。</strong>
            </div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-ignore-risk" ${status.ignoreRisk ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div id="ignore-risk-confirm" class="ignore-risk-confirm" style="display:none">
        <p class="ignore-risk-warning">确认关闭密码保护？</p>
        <p class="ignore-risk-detail">
          关闭后，<strong>任何能访问此应用的人</strong>都可以直接进入，查看和修改你的数据。
        </p>
        <div class="ignore-risk-actions">
          <button class="btn btn-danger btn-sm" id="btn-confirm-ignore">我了解风险，确认关闭</button>
          <button class="btn btn-secondary btn-sm" id="btn-cancel-ignore">取消</button>
        </div>
      </div>
    </div>
  `

  container.innerHTML = html
  bindSecurityEvents(container, status)
}

function bindSecurityEvents(container, status) {
  const newPwInput = container.querySelector('#sec-new-pw')
  const strengthEl = container.querySelector('#pw-strength')
  if (newPwInput && strengthEl) {
    newPwInput.addEventListener('input', () => {
      const s = getPasswordStrength(newPwInput.value)
      if (!newPwInput.value) {
        strengthEl.innerHTML = ''
        return
      }
      const bars = [1, 2, 3, 4].map(i =>
        `<div class="strength-bar ${i <= s.level ? 'active' : ''}" style="--strength-color: ${s.color}"></div>`
      ).join('')
      strengthEl.innerHTML = `${bars}<span class="strength-text" style="color:${s.color}">${s.text}</span>`
    })
  }

  const form = container.querySelector('#form-change-pw')
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const oldPw = container.querySelector('#sec-old-pw')?.value || ''
      const newPw = container.querySelector('#sec-new-pw')?.value || ''
      const confirmPw = container.querySelector('#sec-confirm-pw')?.value || ''
      const msgEl = container.querySelector('#change-pw-msg')
      const btn = form.querySelector('button[type="submit"]')

      if (newPw !== confirmPw) {
        msgEl.textContent = '两次输入的密码不一致'
        msgEl.className = 'form-message error'
        return
      }

      btn.disabled = true
      btn.textContent = '提交中...'
      msgEl.textContent = ''

      try {
        const result = await changePassword(oldPw, newPw)
        if (result.success) {
          msgEl.textContent = '密码修改成功'
          msgEl.className = 'form-message success'
          toastSuccess('密码已更新')
          setSessionAuthed(true)
          form.reset()
          strengthEl.innerHTML = ''
          setTimeout(() => {
            const page = container.closest('.page')
            if (page) loadSecurityStatus(page)
          }, 1000)
        } else {
          msgEl.textContent = result.error
          msgEl.className = 'form-message error'
        }
      } catch (err) {
        msgEl.textContent = err.message
        msgEl.className = 'form-message error'
      } finally {
        btn.disabled = false
        btn.textContent = status.hasPassword ? '确认修改' : '设置密码'
      }
    })
  }

  const toggle = container.querySelector('#toggle-ignore-risk')
  const confirmBox = container.querySelector('#ignore-risk-confirm')
  if (toggle && confirmBox) {
    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        confirmBox.style.display = 'block'
        toggle.checked = false
      } else {
        handleIgnoreRiskChange(container, false)
      }
    })

    container.querySelector('#btn-confirm-ignore')?.addEventListener('click', () => {
      handleIgnoreRiskChange(container, true)
    })
    container.querySelector('#btn-cancel-ignore')?.addEventListener('click', () => {
      confirmBox.style.display = 'none'
    })
  }
}

async function handleIgnoreRiskChange(container, enable) {
  try {
    const result = await setIgnoreRisk(enable)
    if (result.success) {
      if (enable) {
        toastWarning('已开启无视风险模式，密码保护已关闭')
        clearSessionAuth()
      } else {
        toastSuccess('无视风险模式已关闭，请设置新密码')
      }
      setTimeout(() => {
        const page = container.closest('.page')
        if (page) loadSecurityStatus(page)
      }, 500)
    } else {
      toastError('操作失败: ' + result.error)
    }
  } catch (e) {
    toastError('操作失败: ' + e.message)
  }
}
