/**
 * 本地消息存储 - IndexedDB
 * 用于存储对话消息、章节内容等
 */

const DB_NAME = 'storybook-messages'
const DB_VERSION = 1
const STORE_MESSAGES = 'messages'
const STORE_CHAPTERS = 'chapters_cache'
const STORE_SETTINGS = 'settings'

let _db = null

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db)
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { _db = request.result; resolve(_db) }
    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // 消息存储
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' })
        msgStore.createIndex('sessionKey', 'sessionKey', { unique: false })
        msgStore.createIndex('timestamp', 'timestamp', { unique: false })
        msgStore.createIndex('sessionKey_timestamp', ['sessionKey', 'timestamp'], { unique: false })
      }

      // 章节缓存
      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        const chapterStore = db.createObjectStore(STORE_CHAPTERS, { keyPath: 'id' })
        chapterStore.createIndex('novelId', 'novelId', { unique: false })
        chapterStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      // 设置存储
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' })
      }
    }
  })
}

// ==================== 消息操作 ====================

export async function saveMessage(message) {
  if (!message || !message.id) return
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_MESSAGES, 'readwrite')
    tx.objectStore(STORE_MESSAGES).put({
      id: message.id,
      sessionKey: message.sessionKey || '',
      role: message.role || 'assistant',
      content: message.content || message.text || '',
      timestamp: message.timestamp || Date.now(),
    })
  } catch (e) {
    console.error('[db] saveMessage error:', e)
  }
}

export async function saveMessages(messages) {
  if (!messages?.length) return
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_MESSAGES, 'readwrite')
    const store = tx.objectStore(STORE_MESSAGES)
    messages.forEach(msg => {
      if (!msg.id) return
      store.put({
        id: msg.id,
        sessionKey: msg.sessionKey || '',
        role: msg.role || 'assistant',
        content: msg.content || msg.text || '',
        timestamp: msg.timestamp || Date.now(),
      })
    })
  } catch (e) {
    console.error('[db] saveMessages error:', e)
  }
}

export async function getMessages(sessionKey, limit = 200) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MESSAGES, 'readonly')
      const index = tx.objectStore(STORE_MESSAGES).index('sessionKey_timestamp')
      const range = IDBKeyRange.bound([sessionKey, 0], [sessionKey, Date.now() + 1])
      const messages = []
      const request = index.openCursor(range, 'prev')
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor && messages.length < limit) {
          messages.push(cursor.value)
          cursor.continue()
        }
      }
      tx.oncomplete = () => resolve(messages.reverse())
      tx.onerror = () => resolve([])
    })
  } catch (e) {
    console.error('[db] getMessages error:', e)
    return []
  }
}

export async function clearMessages(sessionKey) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_MESSAGES, 'readwrite')
    const request = tx.objectStore(STORE_MESSAGES).index('sessionKey').openCursor(sessionKey)
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
  } catch (e) {
    console.error('[db] clearMessages error:', e)
  }
}

// ==================== 章节缓存操作 ====================

export async function saveChapterCache(chapter) {
  if (!chapter || !chapter.id) return
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_CHAPTERS, 'readwrite')
    tx.objectStore(STORE_CHAPTERS).put({
      id: chapter.id,
      novelId: chapter.novelId || '',
      title: chapter.title || '',
      content: chapter.content || '',
      wordCount: chapter.wordCount || 0,
      updatedAt: Date.now(),
    })
  } catch (e) {
    console.error('[db] saveChapterCache error:', e)
  }
}

export async function getChapterCache(chapterId) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly')
      const request = tx.objectStore(STORE_CHAPTERS).get(chapterId)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })
  } catch (e) {
    console.error('[db] getChapterCache error:', e)
    return null
  }
}

export async function getNovelChaptersCache(novelId) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly')
      const index = tx.objectStore(STORE_CHAPTERS).index('novelId')
      const request = index.getAll(novelId)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => resolve([])
    })
  } catch (e) {
    console.error('[db] getNovelChaptersCache error:', e)
    return []
  }
}

export async function deleteChapterCache(chapterId) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_CHAPTERS, 'readwrite')
    tx.objectStore(STORE_CHAPTERS).delete(chapterId)
  } catch (e) {
    console.error('[db] deleteChapterCache error:', e)
  }
}

// ==================== 设置操作 ====================

export async function saveSetting(key, value) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_SETTINGS, 'readwrite')
    tx.objectStore(STORE_SETTINGS).put({ key, value })
  } catch (e) {
    console.error('[db] saveSetting error:', e)
  }
}

export async function getSetting(key, defaultValue = null) {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly')
      const request = tx.objectStore(STORE_SETTINGS).get(key)
      request.onsuccess = () => resolve(request.result?.value ?? defaultValue)
      request.onerror = () => resolve(defaultValue)
    })
  } catch (e) {
    console.error('[db] getSetting error:', e)
    return defaultValue
  }
}

export async function deleteSetting(key) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_SETTINGS, 'readwrite')
    tx.objectStore(STORE_SETTINGS).delete(key)
  } catch (e) {
    console.error('[db] deleteSetting error:', e)
  }
}

// ==================== 工具函数 ====================

export function isStorageAvailable() {
  try {
    return 'indexedDB' in window && !!indexedDB
  } catch {
    return false
  }
}

export async function clearAllData() {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_MESSAGES, STORE_CHAPTERS, STORE_SETTINGS], 'readwrite')
    tx.objectStore(STORE_MESSAGES).clear()
    tx.objectStore(STORE_CHAPTERS).clear()
    tx.objectStore(STORE_SETTINGS).clear()
  } catch (e) {
    console.error('[db] clearAllData error:', e)
  }
}

export async function getStorageStats() {
  try {
    const db = await openDB()
    const tx = db.transaction([STORE_MESSAGES, STORE_CHAPTERS, STORE_SETTINGS], 'readonly')

    const countStore = (store) => {
      return new Promise((resolve) => {
        const request = tx.objectStore(store).count()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(0)
      })
    }

    const [messages, chapters, settings] = await Promise.all([
      countStore(STORE_MESSAGES),
      countStore(STORE_CHAPTERS),
      countStore(STORE_SETTINGS),
    ])

    return { messages, chapters, settings }
  } catch (e) {
    console.error('[db] getStorageStats error:', e)
    return { messages: 0, chapters: 0, settings: 0 }
  }
}
