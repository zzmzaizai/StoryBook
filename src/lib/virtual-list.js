/**
 * 虚拟滚动列表组件
 * 支持分页加载、虚拟滚动、固定高度容器内滚动
 */

/**
 * 创建虚拟滚动列表
 * @param {Object} options - 配置选项
 * @param {string} options.containerId - 容器 ID
 * @param {number} options.itemHeight - 每项高度（像素）
 * @param {number} options.pageSize - 每页加载数量（默认 20）
 * @param {number} options.bufferSize - 缓冲区数量（默认 5）
 * @param {Function} options.loadMore - 加载更多数据的回调 (page, pageSize) => Promise<{items, hasMore}>
 * @param {Function} options.renderItem - 渲染单项的回调 (item, index) => HTMLElement|string
 * @param {Function} options.onItemClick - 点击项的回调 (item, index) => void
 * @param {string} options.emptyText - 空数据提示文本
 * @returns {Object} { element, refresh, scrollToTop, destroy }
 */
export function createVirtualList(options) {
  const {
    containerId,
    itemHeight = 48,
    pageSize = 20,
    bufferSize = 5,
    loadMore,
    renderItem,
    onItemClick,
    emptyText = '暂无数据'
  } = options

  let items = []
  let currentPage = 0
  let isLoading = false
  let hasMore = true
  let scrollTop = 0
  let containerHeight = 0

  // 创建容器结构
  const container = document.createElement('div')
  container.className = 'virtual-list-container'
  container.id = containerId || `virtual-list-${Date.now()}`

  container.innerHTML = `
    <div class="virtual-list-scroll" id="${container.id}-scroll">
      <div class="virtual-list-content" id="${container.id}-content">
        <div class="virtual-list-phantom" id="${container.id}-phantom"></div>
        <div class="virtual-list-items" id="${container.id}-items"></div>
      </div>
    </div>
    <div class="virtual-list-loading" id="${container.id}-loading" style="display: none;">
      <span class="loading-spinner"></span>
      <span>加载中...</span>
    </div>
    <div class="virtual-list-empty" id="${container.id}-empty" style="display: none;">
      ${emptyText}
    </div>
  `

  const scrollEl = container.querySelector(`#${container.id}-scroll`)
  const contentEl = container.querySelector(`#${container.id}-content`)
  const phantomEl = container.querySelector(`#${container.id}-phantom`)
  const itemsEl = container.querySelector(`#${container.id}-items`)
  const loadingEl = container.querySelector(`#${container.id}-loading`)
  const emptyEl = container.querySelector(`#${container.id}-empty`)

  // 计算可见范围
  function getVisibleRange() {
    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = start + visibleCount

    return {
      start: Math.max(0, start - bufferSize),
      end: Math.min(items.length, end + bufferSize)
    }
  }

  // 渲染可见项
  function renderVisibleItems() {
    if (items.length === 0) {
      itemsEl.innerHTML = ''
      phantomEl.style.height = '0px'
      return
    }

    const { start, end } = getVisibleRange()
    const visibleItems = items.slice(start, end)

    // 更新幻影高度
    phantomEl.style.height = `${items.length * itemHeight}px`

    // 更新可见项
    itemsEl.style.transform = `translateY(${start * itemHeight}px)`

    const fragment = document.createDocumentFragment()
    visibleItems.forEach((item, idx) => {
      const realIndex = start + idx
      const el = renderListItem(item, realIndex)
      fragment.appendChild(el)
    })

    itemsEl.innerHTML = ''
    itemsEl.appendChild(fragment)
  }

  // 渲染单个列表项
  function renderListItem(item, index) {
    const el = document.createElement('div')
    el.className = 'virtual-list-item'
    el.style.height = `${itemHeight}px`
    el.dataset.index = index

    const content = renderItem(item, index)
    if (typeof content === 'string') {
      el.innerHTML = content
    } else if (content instanceof HTMLElement) {
      el.appendChild(content)
    }

    el.addEventListener('click', () => {
      onItemClick?.(item, index)
    })

    return el
  }

  // 加载更多数据
  async function loadMoreData() {
    if (isLoading || !hasMore) return

    isLoading = true
    loadingEl.style.display = 'flex'

    try {
      const result = await loadMore(currentPage, pageSize)

      if (result.items && result.items.length > 0) {
        items = [...items, ...result.items]
        currentPage++
        hasMore = result.hasMore !== false && result.items.length === pageSize

        renderVisibleItems()
        emptyEl.style.display = 'none'
      } else {
        hasMore = false
        if (items.length === 0) {
          emptyEl.style.display = 'block'
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      isLoading = false
      loadingEl.style.display = 'none'
    }
  }

  // 处理滚动
  function handleScroll() {
    scrollTop = scrollEl.scrollTop

    // 检查是否需要加载更多
    const scrollBottom = scrollTop + containerHeight
    const contentHeight = items.length * itemHeight
    const threshold = itemHeight * 3 // 提前 3 个 item 开始加载

    if (scrollBottom >= contentHeight - threshold && !isLoading && hasMore) {
      loadMoreData()
    }

    renderVisibleItems()
  }

  // 更新容器高度
  function updateContainerHeight() {
    containerHeight = scrollEl.clientHeight
    renderVisibleItems()
  }

  // 初始化
  function init() {
    updateContainerHeight()
    loadMoreData()

    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateContainerHeight)
  }

  // 刷新数据
  function refresh() {
    items = []
    currentPage = 0
    hasMore = true
    scrollTop = 0
    scrollEl.scrollTop = 0
    loadMoreData()
  }

  // 滚动到顶部
  function scrollToTop() {
    scrollEl.scrollTop = 0
  }

  // 滚动到指定项
  function scrollToItem(index) {
    const targetTop = index * itemHeight
    scrollEl.scrollTop = targetTop
  }

  // 获取当前数据
  function getItems() {
    return items
  }

  // 更新单项
  function updateItem(index, newItem) {
    if (index >= 0 && index < items.length) {
      items[index] = newItem
      renderVisibleItems()
    }
  }

  // 删除单项
  function removeItem(index) {
    if (index >= 0 && index < items.length) {
      items.splice(index, 1)
      renderVisibleItems()
    }
  }

  // 销毁
  function destroy() {
    scrollEl.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', updateContainerHeight)
    container.remove()
  }

  init()

  return {
    element: container,
    refresh,
    scrollToTop,
    scrollToItem,
    getItems,
    updateItem,
    removeItem,
    destroy
  }
}

/**
 * 创建简单的分页列表（非虚拟滚动，适合数据量不大的场景）
 * @param {Object} options - 配置选项
 * @returns {Object} { element, refresh, destroy }
 */
export function createPagedList(options) {
  const {
    containerId,
    pageSize = 20,
    loadMore,
    renderItem,
    onItemClick,
    emptyText = '暂无数据'
  } = options

  let items = []
  let currentPage = 0
  let isLoading = false
  let hasMore = true

  const container = document.createElement('div')
  container.className = 'paged-list-container'
  container.id = containerId || `paged-list-${Date.now()}`

  container.innerHTML = `
    <div class="paged-list-content" id="${container.id}-content"></div>
    <div class="paged-list-loading" id="${container.id}-loading" style="display: none;">
      <span class="loading-spinner"></span>
      <span>加载中...</span>
    </div>
    <div class="paged-list-empty" id="${container.id}-empty" style="display: none;">
      ${emptyText}
    </div>
    <div class="paged-list-loadmore" id="${container.id}-loadmore" style="display: none;">
      <button class="btn btn-secondary btn-sm">加载更多</button>
    </div>
  `

  const contentEl = container.querySelector(`#${container.id}-content`)
  const loadingEl = container.querySelector(`#${container.id}-loading`)
  const emptyEl = container.querySelector(`#${container.id}-empty`)
  const loadMoreEl = container.querySelector(`#${container.id}-loadmore`)

  async function loadMoreData() {
    if (isLoading || !hasMore) return

    isLoading = true
    loadingEl.style.display = 'flex'
    loadMoreEl.style.display = 'none'

    try {
      const result = await loadMore(currentPage, pageSize)

      if (result.items && result.items.length > 0) {
        const fragment = document.createDocumentFragment()
        result.items.forEach((item, idx) => {
          const realIndex = items.length + idx
          const el = renderListItem(item, realIndex)
          fragment.appendChild(el)
        })

        contentEl.appendChild(fragment)
        items = [...items, ...result.items]
        currentPage++
        hasMore = result.hasMore !== false && result.items.length === pageSize

        if (hasMore) {
          loadMoreEl.style.display = 'block'
        }
        emptyEl.style.display = 'none'
      } else {
        hasMore = false
        if (items.length === 0) {
          emptyEl.style.display = 'block'
        }
      }
    } catch (err) {
      console.error('加载数据失败:', err)
    } finally {
      isLoading = false
      loadingEl.style.display = 'none'
    }
  }

  function renderListItem(item, index) {
    const el = document.createElement('div')
    el.className = 'paged-list-item'
    el.dataset.index = index

    const content = renderItem(item, index)
    if (typeof content === 'string') {
      el.innerHTML = content
    } else if (content instanceof HTMLElement) {
      el.appendChild(content)
    }

    el.addEventListener('click', () => {
      onItemClick?.(item, index)
    })

    return el
  }

  function refresh() {
    items = []
    currentPage = 0
    hasMore = true
    contentEl.innerHTML = ''
    loadMoreEl.style.display = 'none'
    loadMoreData()
  }

  loadMoreEl.querySelector('button').addEventListener('click', loadMoreData)

  loadMoreData()

  return {
    element: container,
    refresh,
    destroy: () => container.remove()
  }
}
