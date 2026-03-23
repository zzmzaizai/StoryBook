# StoryBook - AI Novel Editor

<p align="center">
  <strong>A cross-platform desktop application for AI-assisted novel writing based on Tauri v2</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2.5.0-blue?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/badge/Rust-1.70+-orange?logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript" alt="JavaScript" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

<p align="center">
  <a href="./README.zh-CN.md">中文</a> | English
</p>

---

## Introduction

StoryBook is a **powerful**, **lightweight**, and **feature-rich** cross-platform desktop application designed specifically for novel writers and creative authors. Built with modern technologies (Tauri v2 + Rust + Vanilla JS), it combines the speed of native applications with the flexibility of web technologies.

Whether you're writing a short story, a full-length novel, a screenplay, or even academic papers, StoryBook provides all the tools you need to bring your creative vision to life. With integrated AI assistance, you can overcome writer's block, generate ideas, and enhance your storytelling like never before.

### Why StoryBook?

- **🚀 Lightning Fast** - Built with Tauri v2 and Rust for native-level performance
- **🔒 Privacy First** - All data stored locally, your stories stay with you
- **🤖 AI-Powered** - Leverage multiple LLM providers to boost your creativity
- **🎨 15+ Novel Styles** - From urban romance to xianxia cultivation fantasy
- **📝 Professional Editor** - WYSIWYG Markdown editor with live preview
- **📊 Smart Organization** - Chapters, characters, timelines, and metadata all in one place
- **🌙 Dark/Light Themes** - Comfortable writing experience day or night
- **🔐 Security** - Password protection to keep your work safe

## Features

### Core Features

- **📚 Novel Project Management**
  - Create unlimited novel projects with custom metadata
  - Support for 15+ writing styles (Urban, Fantasy, Sci-Fi, Wuxia, Xianxia, etc.)
  - Configurable length types (Short, Medium, Long, Epic)
  - Track word count, chapter count, and writing progress
  - Set target audience and writing goals

- **✍️ Advanced Chapter Editor**
  - Built-in Vditor WYSIWYG Markdown editor
  - Real-time word count tracking
  - Version control with full history
  - Chapter status management (Draft, Concept, Rough, Final, Revision)
  - Drag-and-drop chapter reordering

- **👥 Character Development System**
  - Create detailed character profiles
  - Define relationships between characters
  - Role attributes (Protagonist, Heroine, Hero, Villain, Supporting, Passerby)
  - Character personality and background tracking
  - Visual character organization

- **📅 Timeline & Story Tracking**
  - Visual story timeline management
  - Event tracking across chapters
  - Maintain plot consistency
  - Track character appearances and story arcs

- **🏷️ Flexible Metadata System**
  - Custom metadata properties for novels and chapters
  - Extendable attribute system
  - Search and filter by metadata

### AI Capabilities

- **🌐 Multi-Provider LLM Support**
  - **OpenAI** - GPT-4o, GPT-4 Turbo, GPT-3.5, o1-preview, o1-mini
  - **Anthropic** - Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
  - **Google** - Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro
  - **Chinese AI** - DeepSeek, Zhipu AI (GLM-4), Qwen (通义千问), Moonshot
  - **Local AI** - Ollama (Llama 3.2, Qwen 2.5, Mistral, CodeLlama)

- **⚙️ Flexible Configuration**
  - Preset mode for quick setup
  - Advanced mode for fine-tuned control
  - Custom API endpoints
  - Multiple model profiles

- **🤖 AI Writing Assistance**
  - Intelligent outline generation
  - Content continuation and expansion
  - Character dialogue suggestions
  - Plot twist ideas
  - Style and tone recommendations
  - Grammar and clarity improvements

### Security Features

- **🔐 Access Protection**
  - Password-protected application access
  - Session-based authentication
  - Configurable security levels
  - "Ignore Risk" mode for convenience

### User Experience

- **🌓 Theme Support** - Automatic dark/light theme switching based on system preference
- **📱 Responsive Design** - Optimized layout for different screen sizes
- **⚡ Fast Startup** - Quick launch with splash screen
- **🔄 Auto-save** - Never lose your work with automatic saving
- **📁 Local Storage** - All data stored locally in SQLite database

## Supported Novel Styles

| Style | Type |
|-------|------|
| Urban | Modern themes |
| Fantasy | Fantasy worlds |
| Suspense | Mystery & detective |
| Comedy | Light & humorous |
| Romance | Love stories |
| Horror | Thriller & horror |
| Sci-Fi | Future technology |
| Historical | Historical themes |
| Wuxia | Martial arts |
| Xianxia | Cultivation fantasy |

## Tech Stack

### Frontend

- **Vanilla JavaScript** - Native JavaScript, no framework dependencies
- **Vite 6.x** - Modern build tool
- **Vditor 3.x** - WYSIWYG Markdown editor
- **Tauri API v2** - Desktop application interface

### Backend

- **Tauri v2** - Lightweight cross-platform desktop application framework
- **Rust** - High-performance systems programming language
- **Sea-ORM** - Async ORM framework
- **SQLite** - Embedded database
- **Tokio** - Async runtime

## Project Structure

```
StoryBook/
├── src/                        # Frontend source code
│   ├── api/                    # Tauri API wrapper
│   ├── assets/                 # Static assets
│   ├── components/             # UI components
│   │   ├── sidebar.js          # Sidebar
│   │   ├── novel-list.js       # Novel list
│   │   ├── chapter-page.js     # Chapter page
│   │   ├── character-page.js   # Character page
│   │   └── workspace.js        # Workspace
│   ├── lib/                    # Utility libraries
│   │   ├── modal.js            # Modal
│   │   ├── toast.js            # Toast notifications
│   │   ├── theme.js            # Theme management
│   │   ├── markdown-editor.js  # Markdown editor
│   │   └── store.js            # Local storage
│   ├── pages/                  # Pages
│   │   ├── dashboard.js        # Dashboard
│   │   ├── novels.js           # Novel management
│   │   ├── chapters.js         # Chapter management
│   │   ├── characters.js       # Character management
│   │   ├── workspace.js        # Workspace
│   │   ├── llm-config.js       # LLM configuration
│   │   ├── agent-config.js     # Agent configuration
│   │   ├── security.js         # Security settings
│   │   └── about.js            # About page
│   ├── state/                  # State management
│   ├── style/                  # Stylesheets
│   ├── main.js                 # Entry point
│   └── router.js               # Routing system
├── src-tauri/                  # Tauri backend
│   ├── src/
│   │   ├── commands/           # Tauri commands
│   │   │   ├── novels.rs       # Novel commands
│   │   │   ├── chapters.rs     # Chapter commands
│   │   │   ├── characters.rs   # Character commands
│   │   │   ├── timeline.rs     # Timeline commands
│   │   │   └── meta.rs         # Metadata commands
│   │   ├── constants/          # Constant definitions
│   │   ├── entity/             # Database entities
│   │   │   ├── novels.rs       # Novel entity
│   │   │   ├── chapters.rs     # Chapter entity
│   │   │   ├── characters.rs   # Character entity
│   │   │   └── enums.rs        # Enum definitions
│   │   ├── repository/         # Data repository layer
│   │   ├── seeds/              # Seed data
│   │   ├── db.rs               # Database initialization
│   │   ├── lib.rs              # Library entry
│   │   ├── main.rs             # Main program
│   │   ├── rig_service.rs      # AI service
│   │   └── tray.rs             # System tray
│   ├── icons/                  # Application icons
│   ├── Cargo.toml              # Rust dependency configuration
│   └── tauri.conf.json         # Tauri configuration
├── index.html                  # Entry HTML
├── package.json                # NPM configuration
├── vite.config.js              # Vite configuration
└── README.md                   # Project documentation
```

## Quick Start

### Requirements

- **Node.js** >= 18.x
- **Rust** >= 1.70
- **pnpm** or **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/zzmzaizai/storybook.git
cd storybook

# Install frontend dependencies
npm install

# Install Rust dependencies (auto-installed on first run)
cd src-tauri
cargo install
```

### Development Mode

```bash
# Start development server
npm run tauri dev
```

### Build for Production

```bash
# Build production version
npm run tauri build
```

Build artifacts are located in `src-tauri/target/release/bundle/`.

## Configuration

### LLM Configuration

The application supports multiple LLM providers:

| Provider | Type | Default API Endpoint |
|----------|------|---------------------|
| OpenAI | OpenAI | https://api.openai.com/v1 |
| Anthropic | Anthropic | https://api.anthropic.com/v1 |
| Google | Google | https://generativelanguage.googleapis.com/v1beta |
| DeepSeek | OpenAI | https://api.deepseek.com/v1 |
| Moonshot | OpenAI | https://api.moonshot.cn/v1 |
| Zhipu AI | OpenAI | https://open.bigmodel.cn/api/paas/v4 |
| Qwen | OpenAI | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| Ollama | Ollama | http://localhost:11434/v1 |

### Security Configuration

- Default access password: `123456` (recommended to change on first use)
- Support for custom access passwords
- Session-level authentication state management

## Data Storage

- Database file: `src-tauri/novel_editor.db` (SQLite)
- Configuration storage: Using Tauri Store plugin
- Data location: User application data directory

## Development Guide

### Recommended IDE

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### Code Standards

- JavaScript: ES6+ syntax, modular development
- Rust: Follow Rust standard code style
- Comments: English comments

## Contributing

Contributions are welcome! Please feel free to submit Issues and Pull Requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- Gitee: https://gitee.com/zzmzaizai/storybook
- GitHub: https://github.com/zzmzaizai/storybook

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=zzmzaizai/storybook&type=Date)](https://star-history.com/#zzmzaizai/storybook&Date)

---

<p align="center">
  Made with ❤️ by zaizai
</p>
