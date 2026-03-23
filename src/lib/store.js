/**
 * Tauri Store 持久化存储封装
 * 基于 tauri-plugin-store 实现键值对持久化
 */

const isTauri = !!window.__TAURI_INTERNALS__
let store = null

/**
 * 获取 Store 实例（懒加载）
 */
async function getStore() {
  if (!isTauri) {
    throw new Error('Store API 仅在 Tauri 环境中可用')
  }
  if (!store) {
    const { Store } = await import('@tauri-apps/plugin-store')
    store = await Store.load('storybook-settings.json')
  }
  return store
}

/**
 * 获取设置值
 * @param {string} key - 键名
 * @param {*} defaultValue - 默认值
 * @returns {Promise<*>} 存储的值或默认值
 */
export async function getSetting(key, defaultValue = null) {
  try {
    const s = await getStore()
    const value = await s.get(key)
    return value !== undefined ? value : defaultValue
  } catch (e) {
    console.error('获取设置失败:', e)
    return defaultValue
  }
}

/**
 * 设置值
 * @param {string} key - 键名
 * @param {*} value - 值
 * @returns {Promise<boolean>} 是否成功
 */
export async function setSetting(key, value) {
  try {
    const s = await getStore()
    await s.set(key, value)
    await s.save()
    return true
  } catch (e) {
    console.error('保存设置失败:', e)
    return false
  }
}

/**
 * 删除设置
 * @param {string} key - 键名
 * @returns {Promise<boolean>} 是否成功
 */
export async function deleteSetting(key) {
  try {
    const s = await getStore()
    await s.delete(key)
    await s.save()
    return true
  } catch (e) {
    console.error('删除设置失败:', e)
    return false
  }
}

/**
 * 批量获取设置
 * @param {string[]} keys - 键名数组
 * @returns {Promise<Object>} 键值对对象
 */
export async function getSettings(keys) {
  const result = {}
  for (const key of keys) {
    result[key] = await getSetting(key)
  }
  return result
}

/**
 * 批量设置
 * @param {Object} settings - 键值对对象
 * @returns {Promise<boolean>} 是否成功
 */
export async function setSettings(settings) {
  try {
    const s = await getStore()
    for (const [key, value] of Object.entries(settings)) {
      await s.set(key, value)
    }
    await s.save()
    return true
  } catch (e) {
    console.error('批量保存设置失败:', e)
    return false
  }
}

/**
 * 清除所有设置
 * @returns {Promise<boolean>} 是否成功
 */
export async function clearSettings() {
  try {
    const s = await getStore()
    await s.clear()
    await s.save()
    return true
  } catch (e) {
    console.error('清除设置失败:', e)
    return false
  }
}
