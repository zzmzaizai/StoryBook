import { ICONS } from '../../lib/icons.js'

export function render(content, novelInfo) {
  content.innerHTML = `
    <div class="card">
      <h3 class="card-title">${ICONS.workflow} 写作流程</h3>
      <p class="text-secondary mb-lg">按照以下步骤完成小说创作</p>
      
      <div class="workflow-steps">
        <div class="workflow-step completed">
          <div class="workflow-step-icon">${ICONS.check}</div>
          <div class="workflow-step-content">
            <h4>创建小说</h4>
            <p>设置小说基本信息</p>
          </div>
          <span class="workflow-step-status">已完成</span>
        </div>
        
        <div class="workflow-step completed">
          <div class="workflow-step-icon">${ICONS.check}</div>
          <div class="workflow-step-content">
            <h4>设定世界观</h4>
            <p>定义故事背景与规则</p>
          </div>
          <span class="workflow-step-status">已完成</span>
        </div>
        
        <div class="workflow-step active">
          <div class="workflow-step-icon">3</div>
          <div class="workflow-step-content">
            <h4>创建角色</h4>
            <p>设计主要角色与关系</p>
          </div>
          <span class="workflow-step-status">进行中</span>
        </div>
        
        <div class="workflow-step">
          <div class="workflow-step-icon">4</div>
          <div class="workflow-step-content">
            <h4>规划时间线</h4>
            <p>设计故事发展脉络</p>
          </div>
          <span class="workflow-step-status">待开始</span>
        </div>
        
        <div class="workflow-step">
          <div class="workflow-step-icon">5</div>
          <div class="workflow-step-content">
            <h4>撰写章节</h4>
            <p>开始正文创作</p>
          </div>
          <span class="workflow-step-status">待开始</span>
        </div>
        
        <div class="workflow-step">
          <div class="workflow-step-icon">6</div>
          <div class="workflow-step-content">
            <h4>审核修改</h4>
            <p>完善与优化内容</p>
          </div>
          <span class="workflow-step-status">待开始</span>
        </div>
      </div>
    </div>
  `
}

export function cleanup() {
}
