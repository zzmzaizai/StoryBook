/**
 * Tabs 组件 - 带辉光/溅射特效的标签切换
 * 参考 ClawPanel 的【聊天/规划/执行/无限】tabs 效果
 */

/**
 * 创建 Tabs 组件
 * @param {Object} options - 配置选项
 * @param {string} options.containerId - 容器 ID
 * @param {Array<{key: string, label: string, icon?: string, color?: string}>} options.tabs - Tab 配置
 * @param {string} options.activeKey - 默认激活的 tab
 * @param {Function} options.onChange - 切换回调 (key) => void
 * @returns {Object} { element, setActive, destroy }
 */
export function createTabs(options) {
  const { containerId, tabs, activeKey, onChange } = options
  let currentKey = activeKey || (tabs[0]?.key)

  // 默认颜色
  const defaultColors = ['#6366f1', '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ec4899']

  // 创建容器
  const container = document.createElement('div')
  container.className = 'tabs-container'
  container.id = containerId || `tabs-${Date.now()}`
  container.dataset.active = currentKey

  // 创建 tabs 结构
  const tabsHtml = `
    <div class="tabs-wrapper" id="${container.id}-wrapper">
      <div class="tab-slider" id="${container.id}-slider"></div>
      ${tabs.map((tab, index) => {
        const color = tab.color || defaultColors[index % defaultColors.length]
        const isActive = tab.key === currentKey
        return `
          <button 
            class="tab-btn ${isActive ? 'active' : ''}" 
            data-tab="${tab.key}"
            data-color="${color}"
            data-index="${index}"
          >
            ${tab.icon ? `<span class="tab-icon">${tab.icon}</span>` : ''}
            <span class="tab-label">${tab.label}</span>
          </button>
        `
      }).join('')}
    </div>
  `

  container.innerHTML = tabsHtml

  // 定位滑动指示器
  function positionSlider(key) {
    const wrapper = container.querySelector(`#${container.id}-wrapper`)
    const slider = container.querySelector(`#${container.id}-slider`)
    const activeBtn = wrapper?.querySelector(`.tab-btn[data-tab="${key}"]`)

    if (!wrapper || !slider || !activeBtn) return

    const wRect = wrapper.getBoundingClientRect()
    const bRect = activeBtn.getBoundingClientRect()

    slider.style.width = bRect.width + 'px'
    slider.style.left = (bRect.left - wRect.left) + 'px'
    slider.style.opacity = '1'
  }

  // 应用主题色
  function applyTheme(color) {
    container.style.setProperty('--tab-accent', color)
  }

  // 播放切换动画
  function playTransition(tabBtn, color) {
    const wrapper = container.querySelector(`#${container.id}-wrapper`)
    if (!wrapper) return

    const wRect = wrapper.getBoundingClientRect()
    const bRect = tabBtn.getBoundingClientRect()
    const centerX = bRect.left + bRect.width / 2 - wRect.left
    const centerY = bRect.top + bRect.height / 2 - wRect.top

    // 1. 涟漪效果
    const ripple = document.createElement('div')
    ripple.className = 'tab-effect-ripple'
    ripple.style.setProperty('--ripple-x', centerX + 'px')
    ripple.style.setProperty('--ripple-y', centerY + 'px')
    ripple.style.setProperty('--ripple-color', color)
    wrapper.appendChild(ripple)
    setTimeout(() => ripple.remove(), 700)

    // 2. 粒子爆发
    const particleCount = 12
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className = 'tab-effect-particle'

      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
      const dist = 25 + Math.random() * 40
      const size = 2 + Math.random() * 2

      particle.style.setProperty('--px', centerX + 'px')
      particle.style.setProperty('--py', centerY + 'px')
      particle.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px')
      particle.style.setProperty('--dy', (Math.sin(angle) * dist - 10) + 'px')
      particle.style.setProperty('--size', size + 'px')
      particle.style.setProperty('--color', color)
      particle.style.setProperty('--delay', (Math.random() * 0.1) + 's')
      particle.style.setProperty('--duration', (0.4 + Math.random() * 0.2) + 's')

      wrapper.appendChild(particle)
      setTimeout(() => particle.remove(), 700)
    }

    // 3. 辉光脉冲
    container.classList.remove('tab-glow-pulse')
    void container.offsetWidth
    container.classList.add('tab-glow-pulse')
    setTimeout(() => container.classList.remove('tab-glow-pulse'), 600)
  }

  // 设置激活 tab
  function setActive(key) {
    const tabBtn = container.querySelector(`.tab-btn[data-tab="${key}"]`)
    if (!tabBtn || key === currentKey) return

    const color = tabBtn.dataset.color

    // 更新状态
    currentKey = key
    container.dataset.active = key

    // 更新样式
    container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'))
    tabBtn.classList.add('active')

    // 动画效果
    positionSlider(key)
    applyTheme(color)
    playTransition(tabBtn, color)

    // 回调
    onChange?.(key)
  }

  // 绑定事件
  function bindEvents() {
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.tab
        setActive(key)
      })
    })
  }

  // 初始化
  function init() {
    // 延迟初始化滑动指示器，确保 DOM 已渲染
    setTimeout(() => {
      const activeTab = tabs.find(t => t.key === currentKey)
      if (activeTab) {
        positionSlider(currentKey)
        applyTheme(activeTab.color || defaultColors[tabs.findIndex(t => t.key === currentKey) % defaultColors.length])
      }
    }, 0)
    bindEvents()
  }

  // 销毁
  function destroy() {
    container.remove()
  }

  init()

  return {
    element: container,
    setActive,
    destroy,
    getActiveKey: () => currentKey
  }
}

/**
 * 简单的 Tabs 切换（无特效版本，用于轻量级场景）
 * @param {Object} options - 配置选项
 * @returns {Object} { element, setActive, destroy }
 */
export function createSimpleTabs(options) {
  const { containerId, tabs, activeKey, onChange } = options
  let currentKey = activeKey || (tabs[0]?.key)

  const container = document.createElement('div')
  container.className = 'simple-tabs'
  container.id = containerId || `simple-tabs-${Date.now()}`

  container.innerHTML = `
    <div class="simple-tabs-nav">
      ${tabs.map(tab => `
        <button 
          class="simple-tab ${tab.key === currentKey ? 'active' : ''}" 
          data-tab="${tab.key}"
        >
          ${tab.icon ? `<span class="simple-tab-icon">${tab.icon}</span>` : ''}
          <span>${tab.label}</span>
        </button>
      `).join('')}
    </div>
    <div class="simple-tabs-content" id="${container.id}-content"></div>
  `

  function setActive(key) {
    if (key === currentKey) return
    currentKey = key

    container.querySelectorAll('.simple-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === key)
    })

    onChange?.(key)
  }

  container.querySelectorAll('.simple-tab').forEach(btn => {
    btn.addEventListener('click', () => setActive(btn.dataset.tab))
  })

  return {
    element: container,
    setActive,
    destroy: () => container.remove(),
    getActiveKey: () => currentKey,
    getContentElement: () => container.querySelector(`#${container.id}-content`)
  }
}
