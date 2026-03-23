/**
 * 关于页面
 */
import { version as APP_VERSION } from '../../package.json'
import { ICONS } from '../lib/icons.js'

export async function render() {
  const el = document.createElement('div')
  el.className = 'page about-page'

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">关于</h1>
      <p class="page-subtitle">了解 StoryBook</p>
    </div>
    
    <div class="about-content">
      <div class="about-hero">
        <div class="about-logo">
          <div class="logo-icon">SB</div>
          <div class="logo-info">
            <h2 class="logo-name">StoryBook</h2>
            <p class="logo-version">版本 ${APP_VERSION}</p>
          </div>
        </div>
        <p class="about-tagline">专业的小说创作工具，让写作更简单</p>
      </div>
      
      <div class="about-grid">
        <div class="about-section">
          <div class="section-icon">${ICONS.sparkles}</div>
          <h3 class="section-title">功能特性</h3>
          <ul class="feature-list">
            <li>
              <span class="feature-icon">${ICONS.novels}</span>
              <div class="feature-content">
                <span class="feature-name">项目管理</span>
                <span class="feature-desc">多小说项目支持，轻松切换管理</span>
              </div>
            </li>
            <li>
              <span class="feature-icon">${ICONS.chapters}</span>
              <div class="feature-content">
                <span class="feature-name">章节编辑</span>
                <span class="feature-desc">富文本编辑器，版本历史追踪</span>
              </div>
            </li>
            <li>
              <span class="feature-icon">${ICONS.characters}</span>
              <div class="feature-content">
                <span class="feature-name">角色管理</span>
                <span class="feature-desc">角色档案、关系图谱一目了然</span>
              </div>
            </li>
            <li>
              <span class="feature-icon">${ICONS.ai}</span>
              <div class="feature-content">
                <span class="feature-name">AI 辅助</span>
                <span class="feature-desc">智能写作助手，激发创作灵感</span>
              </div>
            </li>
            <li>
              <span class="feature-icon">${ICONS.lock}</span>
              <div class="feature-content">
                <span class="feature-name">安全保护</span>
                <span class="feature-desc">密码保护，保护您的创作隐私</span>
              </div>
            </li>
          </ul>
        </div>
        
        <div class="about-section">
          <div class="section-icon">${ICONS.settings}</div>
          <h3 class="section-title">技术架构</h3>
          <div class="tech-grid">
            <div class="tech-item">
              <div class="tech-name">Tauri v2</div>
              <div class="tech-desc">跨平台桌面应用框架</div>
            </div>
            <div class="tech-item">
              <div class="tech-name">Vite</div>
              <div class="tech-desc">下一代前端构建工具</div>
            </div>
            <div class="tech-item">
              <div class="tech-name">JavaScript ES Modules</div>
              <div class="tech-desc">现代 JavaScript 模块化</div>
            </div>
            <div class="tech-item">
              <div class="tech-name">CSS Variables</div>
              <div class="tech-desc">主题定制与暗色模式</div>
            </div>
            <div class="tech-item">
              <div class="tech-name">SQLite</div>
              <div class="tech-desc">本地数据持久化存储</div>
            </div>
            <div class="tech-item">
              <div class="tech-name">Markdown</div>
              <div class="tech-desc">章节内容编辑支持</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="about-info-cards">
        <div class="info-card">
          <div class="info-icon">${ICONS['file-text']}</div>
          <div class="info-content">
            <h4 class="info-title">许可证</h4>
            <p class="info-text">MIT License - 开源免费使用</p>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon">${ICONS.monitor}</div>
          <div class="info-content">
            <h4 class="info-title">系统要求</h4>
            <p class="info-text">Windows 10+ / macOS 10.15+ / Linux</p>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon">${ICONS.history}</div>
          <div class="info-content">
            <h4 class="info-title">更新日志</h4>
            <p class="info-text">查看版本更新历史与新功能</p>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon">${ICONS['help-circle']}</div>
          <div class="info-content">
            <h4 class="info-title">帮助支持</h4>
            <p class="info-text">使用文档与常见问题解答</p>
          </div>
        </div>
      </div>
      
      <div class="about-footer">
        <div class="footer-divider"></div>
        <p class="copyright">© 2024 StoryBook. All rights reserved.</p>
        <p class="footer-note">Made with ❤️ for writers</p>
      </div>
    </div>
  `

  return el
}
