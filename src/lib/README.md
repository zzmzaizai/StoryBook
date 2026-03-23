# 通用组件说明文档

本文档记录 `d:\Codes\AIBook\StoryBook\src\lib` 目录下的通用组件用法。

---

## 目录

- [Modal 模态窗](#modal-模态窗)
- [Toast 通知](#toast-通知)
- [Markdown Editor 编辑器](#markdown-editor-编辑器)
- [Markdown Preview 预览](#markdown-preview-预览)

---

## Modal 模态窗

**文件**: `lib/modal.js`

通用模态窗组件，支持多种尺寸、拖拽、调整大小、自定义按钮等功能。

### 引入方式

```javascript
import { 
  Modal, 
  createModal, 
  alert, 
  confirm, 
  prompt, 
  success, 
  error, 
  warning, 
  info 
} from '../lib/modal.js'
```

### 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | string | 自动生成 | 模态窗唯一标识 |
| `title` | string | `''` | 标题 |
| `content` | string/HTMLElement | `''` | 内容，支持字符串或 DOM 元素 |
| `size` | string | `'md'` | 尺寸：`xs`/`sm`/`md`/`lg`/`xl`/`full` |
| `width` | number/string | null | 自定义宽度 |
| `height` | number/string | null | 自定义高度 |
| `minWidth` | number | 300 | 最小宽度（拖拽调整时） |
| `minHeight` | number | 200 | 最小高度（拖拽调整时） |
| `closable` | boolean | true | 是否显示关闭按钮 |
| `maskClosable` | boolean | true | 点击遮罩是否关闭 |
| `keyboard` | boolean | true | 是否支持 ESC 键关闭 |
| `draggable` | boolean | false | 是否可拖拽 |
| `resizable` | boolean | false | 是否可调整大小 |
| `showFooter` | boolean | true | 是否显示底部 |
| `footer` | string/HTMLElement | null | 自定义底部内容 |
| `buttons` | array | null | 自定义按钮配置 |
| `confirmText` | string | `'确定'` | 确认按钮文字 |
| `cancelText` | string | `'取消'` | 取消按钮文字 |
| `showConfirm` | boolean | true | 是否显示确认按钮 |
| `showCancel` | boolean | true | 是否显示取消按钮 |
| `confirmLoading` | boolean | false | 确认按钮是否加载中 |
| `closeIcon` | boolean | true | 是否显示关闭图标 |
| `animate` | boolean | true | 是否启用动画 |
| `center` | boolean | true | 是否居中显示 |
| `destroyOnClose` | boolean | false | 关闭时是否销毁 |
| `mask` | boolean | true | 是否显示遮罩 |
| `zIndex` | number | null | 自定义 z-index |
| `className` | string | `''` | 容器自定义类名 |
| `headerClassName` | string | `''` | 头部自定义类名 |
| `bodyClassName` | string | `''` | 内容区自定义类名 |
| `footerClassName` | string | `''` | 底部自定义类名 |
| `onOpen` | function | null | 打开回调 |
| `onClose` | function | null | 关闭回调 |
| `onConfirm` | function | null | 确认回调，返回 false 阻止关闭 |
| `onCancel` | function | null | 取消回调 |
| `onDragStart` | function | null | 开始拖拽回调 |
| `onDragEnd` | function | null | 结束拖拽回调 |
| `onResizeStart` | function | null | 开始调整大小回调 |
| `onResizeEnd` | function | null | 结束调整大小回调 |

### 使用示例

#### 基础用法

```javascript
createModal({
  title: '提示',
  content: '这是一个模态窗',
  onConfirm: () => console.log('确认'),
  onCancel: () => console.log('取消')
})
```

#### 快捷方法

```javascript
// 提示框
alert('提示内容', '提示')

// 确认框
confirm('确定删除吗？', '确认').then(res => {
  if (res.result?.action === 'confirm') {
    // 确认操作
  }
})

// 输入框
prompt('请输入名称：', '输入', {
  placeholder: '请输入...',
  defaultValue: '默认值',
  validate: (value) => !value ? '不能为空' : null
})

// 结果提示
success('操作成功！')
error('操作失败！')
warning('警告信息')
info('提示信息')
```

#### 自定义按钮

```javascript
createModal({
  title: '自定义按钮',
  content: '内容',
  buttons: [
    { 
      text: '取消', 
      type: 'default', 
      onClick: (e, modal) => modal.cancel() 
    },
    { 
      text: '保存', 
      type: 'primary', 
      onClick: (e, modal) => {
        // 保存逻辑
        modal.close()
      }
    },
    { 
      text: '删除', 
      type: 'danger', 
      icon: '<svg>...</svg>',
      onClick: (e, modal) => {
        // 删除逻辑
      }
    }
  ]
})
```

#### 拖拽和调整大小

```javascript
createModal({
  title: '可拖拽模态窗',
  content: '内容',
  size: 'lg',
  draggable: true,
  resizable: true,
  minWidth: 400,
  minHeight: 300,
  onDragEnd: (pos) => console.log('位置:', pos),
  onResizeEnd: (size) => console.log('大小:', size)
})
```

#### 实例方法

```javascript
const modal = new Modal({ title: '标题', content: '内容' })

// 打开
modal.open()

// 更新内容
modal.setContent('新内容')
modal.setTitle('新标题')

// 设置加载状态
modal.setLoading(true, 'primary')

// 关闭
modal.close()

// 销毁
modal.destroy()
```

#### 静态方法

```javascript
// 获取实例
Modal.get('modal-id')

// 关闭所有
Modal.closeAll()

// 销毁所有
Modal.destroyAll()
```

---

## Toast 通知

**文件**: `lib/toast.js`

轻量级消息通知组件，用于显示操作反馈。

### 引入方式

```javascript
import { 
  toast, 
  toastSuccess, 
  toastError, 
  toastInfo, 
  toastWarning 
} from '../lib/toast.js'
```

### 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `message` | string | - | 通知内容 |
| `type` | string | `'info'` | 类型：`success`/`error`/`info`/`warning` |
| `duration` | number | 3000 | 显示时长（毫秒） |

### 使用示例

```javascript
// 基础用法
toast('这是一条消息')

// 指定类型
toast('操作成功', 'success')
toast('操作失败', 'error')
toast('提示信息', 'info')
toast('警告信息', 'warning')

// 指定显示时长
toast('这条消息显示5秒', 'info', 5000)

// 快捷方法
toastSuccess('操作成功')
toastError('操作失败')
toastInfo('提示信息')
toastWarning('警告信息', 5000)
```

---

## Markdown Editor 编辑器

**文件**: `lib/markdown-editor.js`

基于 Vditor 的 Markdown 编辑器组件，支持工具栏、预览切换、全屏等功能。

### 引入方式

```javascript
import { 
  createMarkdownEditor, 
  createSimpleEditor,
  updateAllEditorsTheme 
} from '../lib/markdown-editor.js'
```

### 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mode` | string | `'wysiwyg'` | 模式：`wysiwyg`/`ir`/`sv` |
| `placeholder` | string | `'请输入内容...'` | 占位文字 |
| `value` | string | `''` | 初始内容 |
| `height` | number/string | `'auto'` | 高度 |
| `minHeight` | number | 300 | 最小高度 |
| `toolbar` | array | 默认工具栏 | 工具栏配置 |
| `onChange` | function | null | 内容变化回调 |
| `onFocus` | function | null | 获得焦点回调 |
| `onBlur` | function | null | 失去焦点回调 |
| `onSave` | function | null | 保存回调（Ctrl+S） |
| `onUpload` | function | null | 图片上传回调 |

### 使用示例

#### 基础用法

```javascript
import { createMarkdownEditor } from '../lib/markdown-editor.js'

const container = document.getElementById('editor-container')
const editor = createMarkdownEditor(container, {
  placeholder: '开始写作...',
  height: 500,
  value: '# 标题\n\n内容...',
  onChange: (value) => {
    console.log('内容变化:', value)
  }
})
```

#### 自定义工具栏

```javascript
const editor = createMarkdownEditor(container, {
  toolbar: [
    'headings', 'bold', 'italic', 'strike', '|',
    'list', 'ordered-list', 'check', '|',
    'quote', 'code', 'inline-code', '|',
    'table', 'line', '|',
    'undo', 'redo', '|',
    'preview-toggle', 'fullscreen'
  ]
})
```

#### 简洁模式

```javascript
import { createSimpleEditor } from '../lib/markdown-editor.js'

const editor = createSimpleEditor(container, {
  placeholder: '简短内容...',
  height: 200
})
```

#### 实例方法

```javascript
// 获取内容
const content = editor.getValue()

// 设置内容
editor.setValue('新的内容')

// 获取纯文本
const text = editor.getText()

// 插入内容
editor.insertValue('插入的文字')

// 聚焦
editor.focus()

// 失焦
editor.blur()

// 清空撤销栈
editor.clearStack()

// 销毁
editor.destroy()
```

#### 主题更新

```javascript
import { updateAllEditorsTheme } from '../lib/markdown-editor.js'

// 切换主题后调用
updateAllEditorsTheme()
```

---

## Markdown Preview 预览

**文件**: `lib/markdown-preview.js`

纯预览模式的 Markdown 渲染组件，高度跟随内容，可指定最大高度。

### 引入方式

```javascript
import { 
  createMarkdownPreview, 
  renderMarkdown, 
  updateAllPreviewsTheme 
} from '../lib/markdown-preview.js'
```

### 配置参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | string | `''` | Markdown 内容 |
| `maxHeight` | string | null | 最大高度（如 `'500px'`） |
| `showOutline` | boolean | true | 是否显示大纲 |
| `onClick` | function | null | 点击事件回调 |

### 使用示例

#### 基础用法

```javascript
import { createMarkdownPreview } from '../lib/markdown-preview.js'

const container = document.getElementById('preview-container')
const preview = createMarkdownPreview(container, {
  value: '# 标题\n\n内容...',
  showOutline: true
})
```

#### 指定最大高度

```javascript
const preview = createMarkdownPreview(container, {
  value: markdownContent,
  maxHeight: '500px'  // 超过此高度出现滚动条
})
```

#### 实例方法

```javascript
// 更新内容
preview.setValue('新的 Markdown 内容')

// 获取内容
const content = preview.getValue()

// 更新主题
preview.setTheme('dark')

// 销毁
preview.destroy()
```

#### 静态方法

```javascript
import { renderMarkdown, updateAllPreviewsTheme } from '../lib/markdown-preview.js'

// 渲染 Markdown 为 HTML 字符串
const html = renderMarkdown('# 标题\n\n内容...')

// 更新所有预览组件主题
updateAllPreviewsTheme()
```

---

## 组件更新记录

| 日期 | 组件 | 更新内容 |
|------|------|----------|
| 2024-01-XX | Modal | 初始版本，支持多种尺寸、拖拽、调整大小、自定义按钮 |
| 2024-01-XX | Toast | 初始版本，支持 success/error/info/warning 四种类型 |
| 2024-01-XX | Markdown Editor | 初始版本，基于 Vditor，支持工具栏、预览切换、全屏 |
| 2024-01-XX | Markdown Preview | 初始版本，纯预览模式，高度跟随内容 |

---

> 注意：新增通用组件后，请及时更新本文档。
