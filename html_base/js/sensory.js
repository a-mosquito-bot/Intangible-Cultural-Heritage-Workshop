// 感知数据库页脚本
document.addEventListener('DOMContentLoaded', function () {
    // Back to top
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            backToTop.classList.toggle('show', window.scrollY > 600);
        });
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Accordion: 感官档案库可展开列表
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function () {
            const body = this.nextElementSibling;
            const isOpen = this.getAttribute('aria-expanded') === 'true';

            // 关闭所有其他展开项
            accordionHeaders.forEach(h => {
                if (h !== this && h.getAttribute('aria-expanded') === 'true') {
                    h.setAttribute('aria-expanded', 'false');
                    const otherBody = h.nextElementSibling;
                    otherBody.style.maxHeight = '0';
                    otherBody.classList.remove('open');
                }
            });

            if (isOpen) {
                // 折叠当前项
                this.setAttribute('aria-expanded', 'false');
                body.style.maxHeight = '0';
                body.classList.remove('open');
            } else {
                // 展开当前项
                this.setAttribute('aria-expanded', 'true');
                body.classList.add('open');
                // 用 scrollHeight 获取实际内容高度，动画精准丝滑
                body.style.maxHeight = body.scrollHeight + 'px';
            }
        });
    });

    // 窗口 resize 时更新已展开项的高度，防止内容变化导致截断
    window.addEventListener('resize', () => {
        accordionHeaders.forEach(header => {
            if (header.getAttribute('aria-expanded') === 'true') {
                const body = header.nextElementSibling;
                body.style.maxHeight = body.scrollHeight + 'px';
            }
        });
    });

    console.log('感知数据库页已就绪');

    // ========== 投壶游戏 ==========
    initPitchPotGame();
});

// ============================================================
//  投壶（Pitch-Pot）互动游戏
// ============================================================
function initPitchPotGame() {
    const canvas = document.getElementById('pitchpot-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const actionBtn = document.getElementById('pp-action-btn');
    const resetBtn = document.getElementById('pp-reset-btn');
    const hintEl = document.getElementById('pp-hint');
    const scoreEl = document.getElementById('pp-score');
    const throwsEl = document.getElementById('pp-throws');
    const rateEl = document.getElementById('pp-rate');
    const powerFill = document.getElementById('pp-power-fill');
    const powerWrap = document.getElementById('pp-power-wrap');

    // 响应式 Canvas 尺寸
    function resizeCanvas() {
        const wrapper = canvas.parentElement;
        const maxW = Math.min(wrapper.clientWidth - 2, 600);
        const scale = maxW / 600;
        canvas.style.width = maxW + 'px';
        canvas.style.height = (380 * scale) + 'px';
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // --- 游戏状态 ---
    const state = {
        score: 0,
        throws: 0,
        phase: 'idle',       // idle | aiming | flying | result
        power: 50,
        powerDir: 1,         // 力道条移动方向
        arrowX: 100,
        arrowY: 326,
        arrowVX: 0,
        arrowVY: 0,
        arrowAngle: 0,
        flying: false,
        resultMsg: '',
        resultTimer: 0,
        particles: [],
        animId: null
    };

    // --- 常量 ---
    const LAUNCH_X = 100;
    const LAUNCH_Y = 326;
    const POT_CENTER_X = 450;
    const POT_TOP_Y = 278;
    // 壶口命中区域 (匹配绘制坐标: 壶口内孔中心 450,256)
    const POT_MOUTH_LEFT = 432;
    const POT_MOUTH_RIGHT = 468;
    const POT_MOUTH_TOP = 246;
    const POT_MOUTH_BOTTOM = 266;
    const GRAVITY = 350;  // px/s²

    // --- 绘制函数 ---
    function drawBackground() {
        // 地面
        ctx.fillStyle = '#e8dcc8';
        ctx.fillRect(0, 340, 600, 40);
        ctx.fillStyle = '#d4c8a8';
        ctx.fillRect(0, 340, 600, 3);

        // 地面纹理
        ctx.fillStyle = '#d4c8a8';
        for (let i = 0; i < 600; i += 30) {
            ctx.fillRect(i, 345, 15, 2);
        }

        // 远处装饰
        ctx.fillStyle = '#f0ebe0';
        ctx.fillRect(0, 100, 600, 240);
        ctx.strokeStyle = '#e0d5c0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 140);
        ctx.lineTo(120, 200);
        ctx.lineTo(200, 150);
        ctx.stroke();
    }

    function drawPot() {
        const x = POT_CENTER_X;
        const y = 340; // 壶底

        ctx.save();

        // 壶身阴影
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.beginPath();
        ctx.ellipse(x + 4, y - 2, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 壶底
        ctx.fillStyle = '#8B6914';
        ctx.beginPath();
        ctx.ellipse(x, y, 26, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 壶身主体 (梯形 —— 上窄下宽)
        ctx.fillStyle = '#C8963E';
        ctx.beginPath();
        ctx.moveTo(x - 22, POT_TOP_Y);   // 左上
        ctx.lineTo(x + 22, POT_TOP_Y);   // 右上
        ctx.quadraticCurveTo(x + 27, 310, x + 25, 338);  // 右侧曲线
        ctx.lineTo(x - 25, 338);          // 底部右侧 → 左侧
        ctx.quadraticCurveTo(x - 27, 310, x - 22, POT_TOP_Y); // 左侧曲线
        ctx.closePath();
        ctx.fill();

        // 壶身高光
        const bodyGrad = ctx.createLinearGradient(x - 20, 0, x + 10, 0);
        bodyGrad.addColorStop(0, 'rgba(255,255,255,0.05)');
        bodyGrad.addColorStop(0.3, 'rgba(255,255,255,0.2)');
        bodyGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        bodyGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // 壶身纹饰
        ctx.strokeStyle = '#A07828';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, 310, 21, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, 318, 23.5, Math.PI, 0);
        ctx.stroke();

        // 壶颈
        ctx.fillStyle = '#B8862D';
        ctx.beginPath();
        ctx.moveTo(x - 14, POT_TOP_Y);
        ctx.lineTo(x + 14, POT_TOP_Y);
        ctx.lineTo(x + 16, POT_TOP_Y - 22);
        ctx.lineTo(x - 16, POT_TOP_Y - 22);
        ctx.closePath();
        ctx.fill();

        // 壶口 (椭圆形开口)
        ctx.fillStyle = '#3D2B0F';
        ctx.beginPath();
        ctx.ellipse(x, POT_TOP_Y - 22, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 壶口内壁
        ctx.fillStyle = '#2A1A05';
        ctx.beginPath();
        ctx.ellipse(x, POT_TOP_Y - 22, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 壶耳 (左右把手)
        ctx.strokeStyle = '#B8862D';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // 左耳
        ctx.beginPath();
        ctx.moveTo(x - 20, 300);
        ctx.quadraticCurveTo(x - 38, 295, x - 28, 280);
        ctx.stroke();

        // 右耳
        ctx.beginPath();
        ctx.moveTo(x + 20, 300);
        ctx.quadraticCurveTo(x + 38, 295, x + 28, 280);
        ctx.stroke();

        ctx.restore();
    }

    function drawArrow(x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 箭杆
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();

        // 箭羽
        ctx.fillStyle = '#C0392B';
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(-30, -6);
        ctx.lineTo(-26, 0);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(-30, 6);
        ctx.lineTo(-26, 0);
        ctx.closePath();
        ctx.fill();

        // 箭头
        ctx.fillStyle = '#7F8C8D';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(12, -5);
        ctx.lineTo(14, 0);
        ctx.lineTo(12, 5);
        ctx.closePath();
        ctx.fill();

        // 箭头尖端
        ctx.fillStyle = '#BDC3C7';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(13, -2);
        ctx.lineTo(13, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    function drawLaunchMarker() {
        // 发射位标记
        ctx.fillStyle = 'rgba(26,94,84,0.2)';
        ctx.beginPath();
        ctx.arc(LAUNCH_X, LAUNCH_Y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26,94,84,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 虚线轨迹提示
        if (state.phase === 'aiming') {
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(26,94,84,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(LAUNCH_X, LAUNCH_Y);

            const power = state.power / 100;
            const vx = 280 + power * 80;
            const vy = -(180 + power * 220);
            let px = LAUNCH_X, py = LAUNCH_Y;
            const dt = 0.02;
            for (let t = 0; t < 1.5; t += dt) {
                const nx = LAUNCH_X + vx * t;
                const ny = LAUNCH_Y + vy * t + 0.5 * GRAVITY * t * t;
                if (ny > 345) break;
                ctx.lineTo(nx, ny);
                px = nx; py = ny;
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function drawParticles() {
        state.particles.forEach((p, i) => {
            p.x += p.vx * 0.016;
            p.y += p.vy * 0.016;
            p.vy += 200 * 0.016;
            p.life -= 0.016;
            if (p.life > 0) {
                ctx.fillStyle = `rgba(${p.color},${p.life})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        state.particles = state.particles.filter(p => p.life > 0);
    }

    function drawResultMessage() {
        if (!state.resultMsg) return;
        const alpha = Math.min(1, state.resultTimer / 0.8);
        const yOff = (1 - state.resultTimer / 1.2) * 30;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 28px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        const isHit = state.resultMsg.includes('投中') || state.resultMsg.includes('完美');
        ctx.fillStyle = isHit ? '#c0392b' : '#555';
        ctx.fillText(state.resultMsg, 300, 150 - yOff);

        if (isHit) {
            ctx.fillStyle = '#e9c46a';
            ctx.font = '18px "Noto Sans SC", sans-serif';
            ctx.fillText('+1 分！', 300, 180 - yOff);
        }
        ctx.restore();
    }

    // --- 主渲染 ---
    function render() {
        ctx.clearRect(0, 0, 600, 380);
        drawBackground();
        drawPot();
        drawLaunchMarker();
        drawParticles();

        if (state.flying || state.phase === 'flying' || state.phase === 'result') {
            drawArrow(state.arrowX, state.arrowY, state.arrowAngle);
        } else {
            // 待发射的箭
            drawArrow(LAUNCH_X, LAUNCH_Y, -0.35);
        }

        drawResultMessage();
    }

    // --- 物理更新 ---
    function updatePhysics(dt) {
        if (!state.flying) return;

        const cappedDt = Math.min(dt, 0.05);
        state.arrowVY += GRAVITY * cappedDt;
        state.arrowX += state.arrowVX * cappedDt;
        state.arrowY += state.arrowVY * cappedDt;

        // 计算箭的角度
        state.arrowAngle = Math.atan2(state.arrowVY, state.arrowVX);

        // 检测是否进入壶口范围
        if (state.arrowX >= POT_MOUTH_LEFT && state.arrowX <= POT_MOUTH_RIGHT &&
            state.arrowY >= POT_MOUTH_TOP && state.arrowY <= POT_MOUTH_BOTTOM &&
            state.arrowVY > 0) {
            // 投中！
            state.flying = false;
            state.phase = 'result';
            state.resultMsg = '🎉 投中！';
            state.resultTimer = 1.2;
            state.score++;
            spawnParticles(POT_CENTER_X, POT_TOP_Y - 22, '233,196,106', 20);
            updateScoreboard();
            actionBtn.style.display = 'inline-flex';
            actionBtn.innerHTML = '<i class="fas fa-play"></i> 再投一次';
            resetBtn.style.display = 'inline-flex';
            hintEl.textContent = '太棒了！点击"再投一次"继续挑战！';
            powerWrap.style.opacity = '0.4';
            return;
        }

        // 落地或出界
        if (state.arrowY >= 345 || state.arrowX > 620 || state.arrowX < -20) {
            state.flying = false;
            state.phase = 'result';
            state.resultTimer = 1.2;

            // 判断差多少
            if (state.arrowX < POT_MOUTH_LEFT && state.arrowY < 345) {
                state.resultMsg = '差一点…力道再大些';
            } else if (state.arrowX > POT_MOUTH_RIGHT) {
                state.resultMsg = '太远了…力道小一点';
            } else if (state.arrowY <= POT_MOUTH_TOP && state.arrowX >= POT_MOUTH_LEFT && state.arrowX <= POT_MOUTH_RIGHT) {
                state.resultMsg = '可惜！刚好飞过壶口';
            } else if (state.arrowY < 345) {
                state.resultMsg = '未中，再试一次吧';
            } else {
                state.resultMsg = '力道不足…再加把劲';
            }

            actionBtn.style.display = 'inline-flex';
            actionBtn.innerHTML = '<i class="fas fa-play"></i> 再投一次';
            resetBtn.style.display = 'inline-flex';
            hintEl.textContent = '差一点就中了！调整力道再试试～';
            powerWrap.style.opacity = '0.4';
        }
    }

    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            state.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 160,
                vy: -(Math.random() * 120 + 40),
                size: Math.random() * 4 + 2,
                life: Math.random() * 0.6 + 0.4,
                color: color
            });
        }
    }

    function updateScoreboard() {
        scoreEl.textContent = state.score;
        throwsEl.textContent = state.throws;
        if (state.throws > 0) {
            rateEl.textContent = Math.round((state.score / state.throws) * 100) + '%';
        } else {
            rateEl.textContent = '-';
        }
        // 闪动得分
        if (state.resultMsg && state.resultMsg.includes('投中')) {
            const scoreItem = scoreEl.parentElement;
            scoreItem.classList.remove('flash');
            void scoreItem.offsetWidth;
            scoreItem.classList.add('flash');
        }
    }

    // --- 游戏循环 ---
    let lastTime = 0;
    function gameLoop(timestamp) {
        const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
        lastTime = timestamp;

        // 力道条动画
        if (state.phase === 'aiming') {
            state.power += state.powerDir * 90 * dt; // 移动速度
            if (state.power >= 100) {
                state.power = 100;
                state.powerDir = -1;
            } else if (state.power <= 5) {
                state.power = 5;
                state.powerDir = 1;
            }
            powerFill.style.width = state.power + '%';
        }

        // 结果计时器
        if (state.phase === 'result') {
            state.resultTimer -= dt;
            if (state.resultTimer <= 0) {
                state.resultMsg = '';
                state.resultTimer = 0;
            }
        }

        updatePhysics(dt);
        render();
        state.animId = requestAnimationFrame(gameLoop);
    }

    // --- 发射箭矢 ---
    function launchArrow() {
        if (state.phase !== 'aiming') return;

        const power = state.power / 100; // 0-1
        const vx = 280 + power * 80;     // 水平速度 280-360
        const vy = -(180 + power * 220);  // 垂直速度 (向上) 180-400

        state.arrowX = LAUNCH_X;
        state.arrowY = LAUNCH_Y;
        state.arrowVX = vx;
        state.arrowVY = vy;
        state.arrowAngle = Math.atan2(vy, vx);
        state.flying = true;
        state.phase = 'flying';
        state.throws++;
        updateScoreboard();

        powerFill.style.width = '0%';
        powerWrap.style.opacity = '0.4';
        hintEl.textContent = '箭矢飞行中…';
        actionBtn.style.display = 'none';
    }

    // --- 开始瞄准 ---
    function startAiming() {
        state.phase = 'aiming';
        state.power = 5;
        state.powerDir = 1;
        state.flying = false;
        state.resultMsg = '';
        state.resultTimer = 0;
        state.arrowX = LAUNCH_X;
        state.arrowY = LAUNCH_Y;
        state.arrowAngle = -0.35;
        state.particles = [];

        powerFill.style.width = '5%';
        powerWrap.style.opacity = '1';
        actionBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        hintEl.textContent = '🎯 点击壶口上方区域或按空格键锁定力道！';
    }

    // --- 重置游戏 ---
    function resetGame() {
        state.score = 0;
        state.throws = 0;
        state.phase = 'idle';
        state.flying = false;
        state.resultMsg = '';
        state.resultTimer = 0;
        state.particles = [];
        state.arrowX = LAUNCH_X;
        state.arrowY = LAUNCH_Y;
        state.arrowAngle = -0.35;

        powerFill.style.width = '0%';
        powerWrap.style.opacity = '0.4';
        actionBtn.style.display = 'inline-flex';
        actionBtn.innerHTML = '<i class="fas fa-play"></i> 开始投掷';
        resetBtn.style.display = 'none';
        hintEl.textContent = '点击上方按钮，看准时机再点击屏幕锁定力道！';
        updateScoreboard();
    }

    // --- 事件绑定 ---
    actionBtn.addEventListener('click', () => {
        if (state.phase === 'idle' || state.phase === 'result') {
            startAiming();
        }
    });

    resetBtn.addEventListener('click', resetGame);

    canvas.addEventListener('click', (e) => {
        if (state.phase === 'aiming') {
            launchArrow();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && state.phase === 'aiming') {
            e.preventDefault();
            launchArrow();
        }
    });

    // --- 初始化 ---
    powerWrap.style.opacity = '0.4';
    state.animId = requestAnimationFrame(gameLoop);

    console.log('投壶游戏已就绪');
}
