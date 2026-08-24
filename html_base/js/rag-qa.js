/**
 * 非遗 RAG 智能问答 - 前端交互逻辑
 * 连接后端 FastAPI 服务，实现完整的聊天体验
 */

// ===== 配置 =====
const API_BASE = 'http://localhost:8001';
const API_CHAT = `${API_BASE}/api/chat`;
const API_HEALTH = `${API_BASE}/api/health`;
const API_STATS = `${API_BASE}/api/stats`;

// ===== 状态管理 =====
const state = {
    messages: [],           // [{ role: 'user'|'assistant', content, sources?, timestamp }]
    isLoading: false,
    isHealthy: false,
    error: null,
};

// ===== DOM 元素引用 =====
let dom = {};

function cacheDom() {
    dom.messagesContainer = document.getElementById('qaMessages');
    dom.inputField = document.getElementById('qaInput');
    dom.sendBtn = document.getElementById('qaSendBtn');
    dom.statusDot = document.getElementById('qaStatusDot');
    dom.statusText = document.getElementById('qaStatusText');
    dom.welcomeArea = document.getElementById('qaWelcome');
    dom.suggestions = document.querySelectorAll('.qa-suggestion-chip');
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    bindEvents();
    checkHealth();
});

// ===== 事件绑定 =====
function bindEvents() {
    // 发送按钮
    dom.sendBtn?.addEventListener('click', handleSend);

    // 回车发送（Shift+Enter 换行）
    dom.inputField?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // 自动调整输入框高度
    dom.inputField?.addEventListener('input', autoResizeInput);

    // 推荐问题点击
    dom.suggestions?.forEach(chip => {
        chip.addEventListener('click', () => {
            const question = chip.textContent.trim();
            dom.inputField.value = question;
            handleSend();
        });
    });
}

function autoResizeInput() {
    const el = dom.inputField;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ===== 健康检查 =====
async function checkHealth() {
    try {
        const resp = await fetch(API_HEALTH, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
            const data = await resp.json();
            state.isHealthy = true;
            updateStatus('online', `知识库已就绪 · ${data.stats?.total_chunks || 0} 条记录`);
        } else {
            updateStatus('offline', '服务异常');
        }
    } catch {
        state.isHealthy = false;
        updateStatus('offline', '后端未连接');
    }
}

function updateStatus(status, text) {
    if (dom.statusDot) {
        dom.statusDot.style.background = status === 'online' ? '#4effb4' : '#ff6b6b';
    }
    if (dom.statusText) {
        dom.statusText.textContent = text;
    }
}

// ===== 发送消息 =====
async function handleSend() {
    const question = dom.inputField.value.trim();
    if (!question || state.isLoading) return;

    // 清空输入
    dom.inputField.value = '';
    dom.inputField.style.height = 'auto';

    // 隐藏欢迎区
    if (dom.welcomeArea) {
        dom.welcomeArea.style.display = 'none';
    }

    // 添加用户消息
    addMessage('user', question);

    // 显示 AI 加载状态
    const loadingId = showTyping();

    state.isLoading = true;
    dom.sendBtn.disabled = true;

    try {
        // 构建请求的对话历史
        const history = state.messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-10) // 只传最近 10 条
            .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
            }));

        const resp = await fetch(API_CHAT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, history }),
        });

        // 移除打字动画
        removeTyping(loadingId);

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || `请求失败 (${resp.status})`);
        }

        const data = await resp.json();

        // 添加 AI 回答
        addMessage('assistant', data.answer, data.sources || []);

        // 更新状态
        updateStatus('online', `知识库已就绪 · ${data.retrieved_count || 0} 篇参考`);

    } catch (err) {
        removeTyping(loadingId);
        addMessage('assistant', `抱歉，出了点问题 😥\n\n> ${err.message}\n\n请确认后端服务已启动：\n\`\`\`bash\ncd backend && python main.py\n\`\`\``, []);
        updateStatus('offline', '请求失败');
    } finally {
        state.isLoading = false;
        dom.sendBtn.disabled = false;
        dom.inputField.focus();
    }
}

// ===== 消息管理 =====
function addMessage(role, content, sources = []) {
    const msg = {
        role,
        content,
        sources,
        timestamp: new Date().toISOString(),
    };
    state.messages.push(msg);
    renderMessage(msg);
    scrollToBottom();
}

function renderMessage(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = `qa-message ${msg.role}`;

    // 头像
    const avatar = document.createElement('div');
    avatar.className = 'qa-avatar';
    avatar.innerHTML = msg.role === 'user'
        ? '<i class="fas fa-user"></i>'
        : '👾';

    // 气泡
    const bubble = document.createElement('div');
    bubble.className = 'qa-bubble';

    // 将 markdown 风格的文本转为 HTML
    bubble.innerHTML = formatContent(msg.content);

    // 来源引用（仅 assistant）
    if (msg.role === 'assistant' && msg.sources && msg.sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'qa-sources';
        sourcesDiv.innerHTML = `
            <div class="qa-sources-label">📚 参考来源</div>
            ${msg.sources.map(s => `
                <span class="qa-source-tag" title="${escapeHtml(s.text_preview || '')}">
                    ${escapeHtml(s.filename?.replace(/\.(docx|txt)$/, '') || '知识库')}
                    <span class="score">${(s.score * 100).toFixed(0)}%</span>
                </span>
            `).join('')}
        `;
        bubble.appendChild(sourcesDiv);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    dom.messagesContainer.appendChild(wrapper);
}

function showTyping() {
    const wrapper = document.createElement('div');
    wrapper.className = 'qa-message assistant';
    wrapper.id = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'qa-avatar';
    avatar.textContent = '👾';

    const bubble = document.createElement('div');
    bubble.className = 'qa-bubble';
    bubble.innerHTML = '<div class="qa-typing"><span></span><span></span><span></span></div>';

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    dom.messagesContainer.appendChild(wrapper);
    scrollToBottom();

    return 'typing-indicator';
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    if (dom.messagesContainer) {
        dom.messagesContainer.scrollTop = dom.messagesContainer.scrollHeight;
    }
}

// ===== 内容格式化 =====
function formatContent(text) {
    if (!text) return '';

    let html = escapeHtml(text);

    // 代码块 ```
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // 行内代码 `...`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 粗体 **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 斜体 *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 编号列表 1. 2. 3.
    html = html.replace(/(?:^|\n)(\d+)\.\s+(.+?)(?=\n|$)/g, (m, num, txt) =>
        `\n${num}. ${txt}`);

    // 📚 来源标题特殊处理
    html = html.replace(/📚\s*参考来源/g, '<strong>📚 参考来源</strong>');

    // 换行
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== 初始化默认消息 =====
function showWelcome() {
    if (dom.welcomeArea) {
        dom.welcomeArea.style.display = 'block';
    }
}
