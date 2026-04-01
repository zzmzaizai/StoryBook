# StoryBook - AI 小说编辑器

<p align="center">
  <strong>基于 Tauri v2 的跨平台本地优先 AI 小说创作桌面应用</strong>
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

StoryBook 是一款面向小说创作的本地桌面应用，目标是把小说项目管理、章节写作、元数据整理、时间线规划和可配置 AI 能力整合到一个 Tauri 应用中。

当前代码已经具备一条可实际使用的创作链路：

- 管理小说项目
- 编辑章节与角色
- 维护小说元数据和时间线
- 配置 LLM 与 Agent
- 使用 AI 生成小说基础信息、元数据、时间线草案以及进行流式对话

## 当前已实现功能

### 小说项目管理

- 创建、更新、删除小说项目
- 保存标题、简介、风格、目标读者、篇幅类型等基础信息
- 对 AI 创建的小说保存“原始需求”文本
- 将写作设置独立存储，不与小说主表强耦合

### 工作台

- `基础`：小说基础信息与写作设置
- `元数据`：结构化小说元数据编辑
- `时间线`：分卷 / 章节范围规划
- `流程`：未来工作流能力的占位页

### 章节与角色

- 章节 CRUD
- 基于自定义 CodeMirror Markdown 编辑器的正文编辑
- 角色 CRUD
- 角色属性、性别、性格等字段维护

### 当前可用 AI 能力

- 根据一句要求 AI 创建小说基础信息
- AI 助手流式对话
- 元数据 AI 生成，并流式写入编辑器
- 时间线 AI 生成，返回 JSON 后自动填充表单
- 在存在小说上下文时，写作设置会注入 AI 提示词

### LLM 与 Agent 系统

- 可视化管理 LLM 配置
- 可视化管理 Agent 运行时绑定配置
- Agent 的名称、描述、类型和提示词全部来自 `src-tauri/src/ai/prompts/*.toml`
- Agent 运行时配置仅保存 `agent_code`、可选 `llm_config_id` 与可选 `extra_config`
- 若某个 Agent 在数据库中没有配置记录，系统会自动回退到默认 LLM
- 当前内置 Agent 包括：
  - `general_chat`
  - `novel_info_generator`
  - `novel_outline`
  - `chapter_timeline`
  - `character_design`
  - `meta_generator`
  - `chapter_content`
  - `chapter_polish`

### 安全与本地存储

- 本地访问密码页面
- SQLite 本地数据存储
- Tauri Store 本地配置持久化

## 当前真实可用的 LLM Provider

当前代码中已经接入真实请求的 Provider：

- OpenAI
- DeepSeek
- OpenRouter
- Ollama（走 OpenAI 兼容接口）

代码里虽然保留了更多 provider 抽象，但并不是 README 里所有历史列出的平台都已经完整接通真实请求。

## 尚未完全完成的部分

仓库里仍有一些区域属于占位、半成品或持续演进中，例如：

- 工作流自动编排还未完成
- 部分 AI 入口是近期接入，后续还会继续细化
- 更深层的结构化创作流水线尚未完全闭环
- 早期文档中的部分描述比当前实际实现更超前

本 README 以“当前代码真实状态”为准，而不是早期规划状态。

## 内置小说风格

当前内置风格枚举：

| 风格 | 说明 |
|------|------|
| 都市 | 现代题材 |
| 奇幻 | 架空世界 |
| 悬疑 | 推理解谜 |
| 喜剧 | 轻松幽默 |
| 言情 | 情感向 |
| 恐怖 | 惊悚 / 恐怖 |
| 科幻 | 科幻题材 |
| 历史 | 历史题材 |
| 武侠 | 武侠江湖 |
| 仙侠 | 修仙玄幻 |

## 技术栈

### 前端

- Vanilla JavaScript
- Vite
- CodeMirror 6
- markdown-it
- Tauri API v2

### 后端

- Tauri v2
- Rust
- SeaORM
- SQLite
- Tokio
- rig-core

## 项目结构

```text
StoryBook/
├── src/
│   ├── api/                     # Tauri invoke 封装
│   ├── components/              # 通用 UI 组件与模态窗
│   ├── lib/                     # modal、markdown editor、tabs、toast、store
│   ├── pages/
│   │   ├── dashboard.js
│   │   ├── novels.js
│   │   ├── chapters.js
│   │   ├── characters.js
│   │   ├── chat.js
│   │   ├── llm-config.js
│   │   ├── agent-config.js
│   │   ├── security.js
│   │   ├── workspace.js
│   │   └── workspace/
│   │       ├── workspace-basic.js
│   │       ├── workspace-meta.js
│   │       ├── workspace-timeline.js
│   │       └── workspace-workflow.js
│   ├── state/                   # 轻量前端状态
│   ├── style/                   # 页面与全局样式
│   ├── main.js
│   └── router.js
├── src-tauri/
│   ├── src/
│   │   ├── ai/                  # LLM、Agent、prompt、AI 执行层
│   │   ├── commands/            # Tauri commands
│   │   ├── constants/           # 元数据与章节属性定义
│   │   ├── entity/              # SeaORM 实体
│   │   ├── repository/          # 数据仓库层
│   │   ├── seeds/               # 种子数据
│   │   ├── db.rs                # SQLite 初始化与字段补齐逻辑
│   │   ├── lib.rs               # Tauri 应用入口
│   │   ├── storage.rs           # 存储路径管理
│   │   └── tray.rs              # 系统托盘
│   └── Cargo.toml
├── package.json
├── vite.config.js
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18
- Rust >= 1.70
- npm

### 安装依赖

```bash
git clone https://github.com/zzmzaizai/storybook.git
cd storybook
npm install
```

### 开发模式

```bash
npm run tauri:dev
```

### 构建发布

```bash
npm run tauri:build
```

构建产物位于 `src-tauri/target/release/bundle/`。

## 数据存储

- 主数据：SQLite，位于用户应用数据目录
- 本地配置：Tauri Store
- 小说相关文件：位于应用存储目录下的小说子目录

## 对开发者的说明

- 前端采用直接 DOM 渲染，而不是框架式组件系统
- 工作台和 AI 相关代码仍在快速演进，阅读当前源码比参考旧截图或旧文档更可靠
- 不同 AI 场景分别采用流式文本输出或结构化 JSON 返回，取决于编辑器场景

## 许可证

本项目采用 MIT 许可证，详见 `LICENSE`。

## 链接

- Gitee: https://gitee.com/zzmzaizai/storybook
- GitHub: https://github.com/zzmzaizai/storybook
