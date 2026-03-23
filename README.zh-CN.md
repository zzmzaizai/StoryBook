# StoryBook - AI 小说编辑器

<p align="center">
  <strong>基于 Tauri v2 的跨平台 AI 辅助小说创作桌面应用</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2.5.0-blue?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/badge/Rust-1.70+-orange?logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript" alt="JavaScript" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

<p align="center">
  中文 | <a href="./README.md">English</a>
</p>

---

## 项目简介

StoryBook 是一款**功能强大**、**轻量高效**、**特性丰富**的跨平台桌面应用，专为小说创作者和文学爱好者量身打造。采用前沿技术栈（Tauri v2 + Rust + Vanilla JS）构建，兼具原生应用的卓越性能和 Web 技术的灵活便捷。

无论您是在创作短篇小说、长篇巨著、影视剧本，还是学术论文，StoryBook 都能提供全方位的创作工具支持。借助集成的 AI 智能助手，您可以轻松突破创作瓶颈、激发灵感，让您的文字创作如虎添翼。

### 为什么选择 StoryBook？

- **🚀 极速体验** - 基于 Tauri v2 和 Rust 构建，原生级性能表现
- **🔒 隐私优先** - 所有数据本地存储，您的故事始终属于您
- **🤖 AI 赋能** - 支持多家大模型服务商，全方位提升创作效率
- **🎨 15+ 小说风格** - 从都市言情到仙侠玄幻，应有尽有
- **📝 专业编辑器** - 所见即所得 Markdown 编辑器，实时预览
- **📊 智能管理** - 章节、角色、时间线、元数据一站式管理
- **🌙 明暗主题** - 自适应系统主题，日夜创作皆舒适
- **🔐 安全防护** - 密码保护，守护您的创作成果

## 功能特性

### 核心功能

- **📚 小说项目管理**
  - 创建无限数量的小说项目，支持自定义元数据
  - 支持 15+ 种创作风格（都市、奇幻、科幻、武侠、仙侠等）
  - 可配置篇幅类型（短篇、中篇、长篇、超长篇）
  - 实时追踪字数、章节数和创作进度
  - 设定目标读者群体和创作目标

- **✍️ 专业章节编辑器**
  - 内置 Vditor 所见即所得 Markdown 编辑器
  - 实时字数统计
  - 完整的版本控制和历史记录
  - 章节状态管理（草稿、构思、粗稿、定稿、修订中）
  - 拖拽排序章节

- **👥 角色开发系统**
  - 创建详尽的角色档案
  - 定义角色之间的关系
  - 角色属性分类（主角、女主、男主、反派、配角、路人）
  - 角色性格和背景追踪
  - 可视化角色组织管理

- **📅 时间线与故事追踪**
  - 可视化故事时间线管理
  - 跨章节事件追踪
  - 保持剧情连贯性
  - 追踪角色出场和故事弧线

- **🏷️ 灵活的元数据系统**
  - 小说和章节的自定义元数据属性
  - 可扩展的属性系统
  - 按元数据搜索和筛选

### AI 能力

- **🌐 多平台大模型支持**
  - **OpenAI** - GPT-4o、GPT-4 Turbo、GPT-3.5、o1-preview、o1-mini
  - **Anthropic** - Claude 3.5 Sonnet、Claude 3 Opus、Claude 3 Haiku
  - **Google** - Gemini 1.5 Pro、Gemini 1.5 Flash、Gemini Pro
  - **国产 AI** - DeepSeek、智谱 AI (GLM-4)、通义千问、Moonshot
  - **本地 AI** - Ollama (Llama 3.2、Qwen 2.5、Mistral、CodeLlama)

- **⚙️ 灵活配置**
  - 预设模式快速上手
  - 进阶模式精细控制
  - 自定义 API 端点
  - 多模型配置管理

- **🤖 AI 写作辅助**
  - 智能大纲生成
  - 内容续写和扩展
  - 角色对话建议
  - 情节转折创意
  - 风格和语气建议
  - 语法和表达优化

### 安全特性

- **🔐 访问保护**
  - 密码保护的应用访问
  - 基于会话的身份认证
  - 可配置的安全级别
  - "无视风险"便捷模式

### 用户体验

- **🌓 主题支持** - 根据系统偏好自动切换明暗主题
- **📱 响应式设计** - 适配不同屏幕尺寸的最佳布局
- **⚡ 快速启动** - 带启动画面的极速加载
- **🔄 自动保存** - 自动保存机制，永不丢失创作内容
- **📁 本地存储** - 所有数据存储在本地 SQLite 数据库中

## 支持的小说风格

| 风格 | 类型 |
|------|------|
| 都市 | 现代题材 |
| 奇幻 | 架空世界 |
| 悬疑 | 推理解谜 |
| 喜剧 | 轻松幽默 |
| 言情 | 爱情故事 |
| 恐怖 | 惊悚悬疑 |
| 科幻 | 未来科技 |
| 历史 | 历史题材 |
| 武侠 | 武侠江湖 |
| 仙侠 | 修仙玄幻 |

## 技术栈

### 前端

- **Vanilla JavaScript** - 原生 JavaScript，无框架依赖
- **Vite 6.x** - 现代化构建工具
- **Vditor 3.x** - 所见即所得 Markdown 编辑器
- **Tauri API v2** - 桌面应用接口

### 后端

- **Tauri v2** - 轻量级跨平台桌面应用框架
- **Rust** - 高性能系统编程语言
- **Sea-ORM** - 异步 ORM 框架
- **SQLite** - 嵌入式数据库
- **Tokio** - 异步运行时

## 项目结构

```
StoryBook/
├── src/                        # 前端源码
│   ├── api/                    # Tauri API 封装
│   ├── assets/                 # 静态资源
│   ├── components/             # UI 组件
│   │   ├── sidebar.js          # 侧边栏
│   │   ├── novel-list.js       # 小说列表
│   │   ├── chapter-page.js     # 章节页面
│   │   ├── character-page.js   # 角色页面
│   │   └── workspace.js        # 工作台
│   ├── lib/                    # 工具库
│   │   ├── modal.js            # 模态框
│   │   ├── toast.js            # 消息提示
│   │   ├── theme.js            # 主题管理
│   │   ├── markdown-editor.js  # Markdown 编辑器
│   │   └── store.js            # 本地存储
│   ├── pages/                  # 页面
│   │   ├── dashboard.js        # 仪表盘
│   │   ├── novels.js           # 小说管理
│   │   ├── chapters.js         # 章节管理
│   │   ├── characters.js       # 角色管理
│   │   ├── workspace.js        # 工作台
│   │   ├── llm-config.js       # LLM 配置
│   │   ├── agent-config.js     # Agent 配置
│   │   ├── security.js         # 安全设置
│   │   └── about.js            # 关于页面
│   ├── state/                  # 状态管理
│   ├── style/                  # 样式文件
│   ├── main.js                 # 入口文件
│   └── router.js               # 路由系统
├── src-tauri/                  # Tauri 后端
│   ├── src/
│   │   ├── commands/           # Tauri 命令
│   │   │   ├── novels.rs       # 小说命令
│   │   │   ├── chapters.rs     # 章节命令
│   │   │   ├── characters.rs   # 角色命令
│   │   │   ├── timeline.rs     # 时间线命令
│   │   │   └── meta.rs         # 元数据命令
│   │   ├── constants/          # 常量定义
│   │   ├── entity/             # 数据库实体
│   │   │   ├── novels.rs       # 小说实体
│   │   │   ├── chapters.rs     # 章节实体
│   │   │   ├── characters.rs   # 角色实体
│   │   │   └── enums.rs        # 枚举定义
│   │   ├── repository/         # 数据仓库层
│   │   ├── seeds/              # 种子数据
│   │   ├── db.rs               # 数据库初始化
│   │   ├── lib.rs              # 库入口
│   │   ├── main.rs             # 主程序
│   │   ├── rig_service.rs      # AI 服务
│   │   └── tray.rs             # 系统托盘
│   ├── icons/                  # 应用图标
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置
├── index.html                  # 入口 HTML
├── package.json                # NPM 配置
├── vite.config.js              # Vite 配置
└── README.md                   # 项目说明
```

## 快速开始

### 环境要求

- **Node.js** >= 18.x
- **Rust** >= 1.70
- **pnpm** 或 **npm**

### 安装依赖

```bash
# 克隆项目
git clone https://gitee.com/zzmzaizai/storybook.git
cd storybook

# 安装前端依赖
npm install

# 安装 Rust 依赖 (首次运行会自动安装)
cd src-tauri
cargo install
```

### 开发模式

```bash
# 启动开发服务器
npm run tauri dev
```

### 构建发布

```bash
# 构建生产版本
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

## 配置说明

### LLM 配置

应用支持多种 LLM 提供商：

| 提供商 | 类型 | 默认 API 地址 |
|--------|------|---------------|
| OpenAI | OpenAI | https://api.openai.com/v1 |
| Anthropic | Anthropic | https://api.anthropic.com/v1 |
| Google | Google | https://generativelanguage.googleapis.com/v1beta |
| DeepSeek | OpenAI | https://api.deepseek.com/v1 |
| Moonshot | OpenAI | https://api.moonshot.cn/v1 |
| 智谱 AI | OpenAI | https://open.bigmodel.cn/api/paas/v4 |
| 通义千问 | OpenAI | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| Ollama | Ollama | http://localhost:11434/v1 |

### 安全配置

- 默认访问密码：`123456`（首次使用建议修改）
- 支持设置自定义访问密码
- 支持会话级别的认证状态管理

## 数据存储

- 数据库文件：`src-tauri/novel_editor.db` (SQLite)
- 配置存储：使用 Tauri Store 插件
- 数据位置：用户应用数据目录

## 开发指南

### IDE 推荐

- [VS Code](https://code.visualstudio.com/)
- [Tauri 扩展](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### 代码规范

- JavaScript: ES6+ 语法，模块化开发
- Rust: 遵循 Rust 标准代码风格
- 注释：使用英文注释

## 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式

- Gitee: https://gitee.com/zzmzaizai/storybook
- GitHub: https://github.com/zzmzaizai/storybook

## Star 历史

[![Star History Chart](https://api.star-history.com/svg?repos=zzmzaizai/storybook&type=Date)](https://star-history.com/#zzmzaizai/storybook&Date)

---

<p align="center">
  Made with ❤️ by zaizai
</p>
