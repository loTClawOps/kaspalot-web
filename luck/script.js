// 抽奖转盘主程序
class LotteryWheel {
    constructor() {
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.names = [];
        this.colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8B739', '#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E'
        ];
        this.currentAngle = 0;
        this.isSpinning = false;
        this.spinSpeed = 0;
        this.history = [];
        
        this.init();
    }
    
    init() {
        this.checkPassword();
    }
    
    // 密码验证
    checkPassword() {
        const CORRECT_PASSWORD = '28256';
        const overlay = document.getElementById('passwordOverlay');
        const input = document.getElementById('passwordInput');
        const btn = document.getElementById('passwordBtn');
        const error = document.getElementById('passwordError');
        
        // 检查是否已经验证过（session 内免重复输入）
        if (sessionStorage.getItem('lotteryAuth') === 'true') {
            overlay.style.display = 'none';
            this.initApp();
            return;
        }
        
        // 验证函数
        const verify = () => {
            if (input.value === CORRECT_PASSWORD) {
                sessionStorage.setItem('lotteryAuth', 'true');
                overlay.style.display = 'none';
                this.initApp();
            } else {
                error.classList.add('show');
                input.value = '';
                input.focus();
                setTimeout(() => error.classList.remove('show'), 2000);
            }
        };
        
        // 绑定事件
        btn.addEventListener('click', verify);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') verify();
        });
        
        // 自动聚焦
        input.focus();
    }
    
    // 初始化应用（密码验证通过后）
    initApp() {
        this.loadNames();
        this.bindEvents();
        this.loadSavedBackground();
        
        // 默认收起设置面板
        const settingsPanel = document.getElementById('settingsPanel');
        const toggleIcon = document.querySelector('.panel-toggle .toggle-icon');
        const panelToggle = document.getElementById('panelToggle');
        if (settingsPanel && !settingsPanel.classList.contains('collapsed')) {
            settingsPanel.classList.add('collapsed');
            if (toggleIcon) toggleIcon.textContent = '▶';
            if (panelToggle) panelToggle.title = '展开设置';
        }
    }
    
    // 从输入框加载名字
    loadNames() {
        const input = document.getElementById('namesInput').value;
        this.names = input.split('\n').map(n => n.trim()).filter(n => n);
        this.draw();
    }
    
    // 绑定事件
    bindEvents() {
        // 更新名单
        document.getElementById('updateNamesBtn').addEventListener('click', () => {
            this.loadNames();
            this.showToast('名单已更新！');
        });
        
        // 开始抽奖
        document.getElementById('spinBtn').addEventListener('click', () => this.spin());
        
        // 设置面板折叠切换
        const panelToggle = document.getElementById('panelToggle');
        const settingsPanel = document.getElementById('settingsPanel');
        const toggleIcon = panelToggle.querySelector('.toggle-icon');
        panelToggle.addEventListener('click', () => {
            settingsPanel.classList.toggle('collapsed');
            // 切换箭头方向
            if (settingsPanel.classList.contains('collapsed')) {
                toggleIcon.textContent = '▶';
                panelToggle.title = '展开设置';
            } else {
                toggleIcon.textContent = '◀';
                panelToggle.title = '收起设置';
            }
        });
        
        // 上传背景
        document.getElementById('uploadBgBtn').addEventListener('click', () => {
            document.getElementById('bgImageInput').click();
        });
        
        document.getElementById('bgImageInput').addEventListener('change', (e) => {
            this.handleBackgroundUpload(e);
        });
        
        // 重置背景
        document.getElementById('resetBgBtn').addEventListener('click', () => {
            this.resetBackground();
        });
        
        // 清空历史
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.history = [];
            this.updateHistoryDisplay();
            localStorage.removeItem('lotteryHistory');
        });
        
        // 弹窗关闭
        document.querySelector('.close-btn').addEventListener('click', () => {
            document.getElementById('winnerModal').style.display = 'none';
        });
        
        document.getElementById('continueBtn').addEventListener('click', () => {
            document.getElementById('winnerModal').style.display = 'none';
        });
        
        // 点击弹窗外部关闭
        document.getElementById('winnerModal').addEventListener('click', (e) => {
            if (e.target.id === 'winnerModal') {
                document.getElementById('winnerModal').style.display = 'none';
            }
        });
        
        // 加载历史记录
        this.loadHistory();
        
        // 空格键快捷抽奖
        document.addEventListener('keydown', (e) => {
            // 同时检测 keyCode (32) 和 key/code 属性，兼容不同浏览器
            const isSpace = e.keyCode === 32 || e.key === ' ' || e.code === 'Space';
            
            if (!isSpace) return;
            
            // 如果焦点在输入框、textarea 或按钮上，不处理（让输入框正常工作）
            const activeTag = document.activeElement.tagName;
            if (activeTag === 'TEXTAREA' || activeTag === 'INPUT' || activeTag === 'BUTTON') {
                return;
            }
            
            // 阻止空格键默认行为（防止页面滚动）
            e.preventDefault();
            
            // 如果正在旋转，不处理
            if (this.isSpinning) return;
            
            console.log('Starting spin!');
            // 如果弹窗显示中，关闭弹窗；否则开始抽奖
            const modal = document.getElementById('winnerModal');
            const isModalVisible = window.getComputedStyle(modal).display !== 'none';
            if (isModalVisible) {
                modal.style.display = 'none';
            } else {
                this.spin();
            }
        });
    }
    
    // 绘制转盘
    draw() {
        const { canvas, ctx, names, colors, currentAngle } = this;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (names.length === 0) {
            // 没有名字时显示提示
            ctx.fillStyle = '#eee';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#999';
            ctx.font = '20px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('请输入抽奖名单', centerX, centerY);
            return;
        }
        
        const anglePerSector = (Math.PI * 2) / names.length;
        
        // 绘制扇形
        names.forEach((name, index) => {
            const startAngle = currentAngle + index * anglePerSector;
            const endAngle = startAngle + anglePerSector;
            
            // 扇形
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            
            // 边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // 文字
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + anglePerSector / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Microsoft YaHei';
            
            // 根据名字长度调整字体大小
            let fontSize = 16;
            if (name.length > 6) fontSize = 12;
            if (name.length > 10) fontSize = 10;
            ctx.font = `bold ${fontSize}px Microsoft YaHei`;
            
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.fillText(name, radius - 20, 5);
            ctx.restore();
        });
        
        // 中心圆
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 中心点
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
    }
    
    // 开始旋转
    spin() {
        if (this.isSpinning || this.names.length === 0) return;
        
        this.isSpinning = true;
        document.getElementById('spinBtn').disabled = true;
        
        // 随机目标角度（至少转10圈）
        const minSpins = 10;
        const maxSpins = 15;
        const spins = minSpins + Math.random() * (maxSpins - minSpins);
        const targetAngle = spins * Math.PI * 2;
        
        // 随机停止位置
        const finalAngle = Math.random() * Math.PI * 2;
        const totalRotation = targetAngle + finalAngle;
        
        // 动画参数
        const duration = 6000; // 6秒
        const startTime = Date.now();
        const startAngle = this.currentAngle;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 缓动函数（先快后慢）
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            this.currentAngle = startAngle + totalRotation * easeOut;
            this.draw();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.onSpinComplete();
            }
        };
        
        animate();
    }
    
    // 旋转完成
    onSpinComplete() {
        this.isSpinning = false;
        document.getElementById('spinBtn').disabled = false;
        
        // 计算中奖者（指针在顶部，角度需要调整）
        const anglePerSector = (Math.PI * 2) / this.names.length;
        // 指针在顶部（-PI/2），需要标准化角度
        let normalizedAngle = (Math.PI * 3 / 2 - this.currentAngle) % (Math.PI * 2);
        if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
        
        const winnerIndex = Math.floor(normalizedAngle / anglePerSector);
        const winner = this.names[winnerIndex];
        
        // 添加到历史记录
        this.addToHistory(winner);
        
        // 显示中奖弹窗
        this.showWinnerModal(winner);
        
        // 如果勾选了"移除中奖者"
        if (document.getElementById('removeWinner').checked) {
            this.names.splice(winnerIndex, 1);
            document.getElementById('namesInput').value = this.names.join('\n');
            this.draw();
            
            if (this.names.length === 0) {
                setTimeout(() => {
                    alert('所有参与者都已中奖！');
                }, 500);
            }
        }
    }
    
    // 显示中奖弹窗
    showWinnerModal(winner) {
        document.getElementById('winnerName').textContent = winner;
        document.getElementById('winnerModal').style.display = 'flex';
        
        // 播放简单的庆祝效果（使用 Web Audio API）
        this.playWinSound();
    }
    
    // 播放中奖音效
    playWinSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建简单的胜利音效
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C大调和弦
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const osc = audioContext.createOscillator();
                    const gain = audioContext.createGain();
                    
                    osc.connect(gain);
                    gain.connect(audioContext.destination);
                    
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    
                    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    
                    osc.start(audioContext.currentTime);
                    osc.stop(audioContext.currentTime + 0.5);
                }, i * 100);
            });
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    // 添加到历史记录
    addToHistory(winner) {
        const record = {
            name: winner,
            time: new Date().toLocaleString('zh-CN')
        };
        this.history.unshift(record);
        this.updateHistoryDisplay();
        this.saveHistory();
    }
    
    // 更新历史记录显示
    updateHistoryDisplay() {
        const list = document.getElementById('historyList');
        list.innerHTML = this.history.map(h => `
            <li>
                <span>${h.name}</span>
                <span class="winner-time">${h.time.split(' ')[1]}</span>
            </li>
        `).join('');
    }
    
    // 保存历史到本地存储
    saveHistory() {
        localStorage.setItem('lotteryHistory', JSON.stringify(this.history));
    }
    
    // 加载历史记录
    loadHistory() {
        const saved = localStorage.getItem('lotteryHistory');
        if (saved) {
            this.history = JSON.parse(saved);
            this.updateHistoryDisplay();
        }
    }
    
    // 处理背景上传
    handleBackgroundUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            this.setBackground(imageUrl);
            localStorage.setItem('lotteryBackground', imageUrl);
            this.showToast('背景图已更新！');
        };
        reader.readAsDataURL(file);
    }
    
    // 设置背景
    setBackground(imageUrl) {
        const overlay = document.querySelector('.bg-overlay');
        overlay.style.backgroundImage = `url(${imageUrl})`;
        overlay.style.opacity = '0.4';
    }
    
    // 重置背景
    resetBackground() {
        const overlay = document.querySelector('.bg-overlay');
        overlay.style.backgroundImage = '';
        overlay.style.opacity = '0.3';
        localStorage.removeItem('lotteryBackground');
        this.showToast('已恢复默认背景');
    }
    
    // 加载保存的背景
    loadSavedBackground() {
        const saved = localStorage.getItem('lotteryBackground');
        if (saved) {
            this.setBackground(saved);
        }
    }
    
    // 显示提示
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            z-index: 10000;
            animation: fadeInUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new LotteryWheel();
});
