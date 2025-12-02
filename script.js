// 双棋对战平台 - JavaScript逻辑文件

// 用户状态管理
let currentUser = null;
let users = JSON.parse(localStorage.getItem('chessUsers')) || [];
let games = JSON.parse(localStorage.getItem('chessGames')) || [];
let isGuestMode = true; // 默认启用访客模式
let isAdmin = false; // 管理员标志
let systemSettings = JSON.parse(localStorage.getItem('systemSettings')) || {
    systemMessage: "欢迎来到双棋对战平台！祝您游戏愉快！",
    defaultAiDifficulty: "medium",
    guestLimits: 10
};

// 管理员账号信息
const ADMIN_USERNAME = "administrator";
const ADMIN_PASSWORD = "123456";

// DOM元素引用
const userInfo = document.getElementById('userInfo');
const usernameDisplay = document.getElementById('usernameDisplay');
const guestBadge = document.getElementById('guestBadge');
const guestModeBtn = document.getElementById('guestModeBtn');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const mainMenu = document.getElementById('mainMenu');
const pages = document.querySelectorAll('.page');
const welcomeAlert = document.getElementById('welcomeAlert');
const adminNotice = document.getElementById('adminNotice');

// 页面显示/隐藏函数
function showElement(element) {
    if (element) element.style.display = 'flex';
}

function hideElement(element) {
    if (element) element.style.display = 'none';
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否有已登录用户
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isGuestMode = false;
        
        // 检查是否为管理员
        if (currentUser.username === ADMIN_USERNAME) {
            isAdmin = true;
        }
        
        updateUserUI();
        showAlert('欢迎回来，' + currentUser.username + '！', 'success');
    } else {
        // 默认访客模式
        isGuestMode = true;
        updateUserUI();
    }
    
    // 绑定事件监听器
    bindEvents();
    
    // 初始化棋盘
    initChineseChessBoard();
    initInternationalChessBoard();
    
    // 初始化游戏统计
    updateGameStats();
    
    // 初始化访客模式UI
    updateGuestUI();
    
    // 初始化管理员菜单
    updateAdminUI();
    
    // 加载系统设置
    loadSystemSettings();
});

// 绑定所有事件监听器
function bindEvents() {
    // 菜单点击事件
    mainMenu.addEventListener('click', function(e) {
        const menuItem = e.target.closest('.menu-item');
        if (menuItem) {
            const pageId = menuItem.dataset.page;
            switchPage(pageId);
            
            // 更新活动菜单项
            document.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('active');
            });
            menuItem.classList.add('active');
        }
    });
    
    // 访客模式按钮
    guestModeBtn.addEventListener('click', continueAsGuest);
    
    // 登录/注册按钮
    loginBtn.addEventListener('click', showLoginForm);
    registerBtn.addEventListener('click', showRegisterForm);
    
    // 游戏卡片点击事件
    document.getElementById('playChineseChess').addEventListener('click', function() {
        switchPage('play');
        document.getElementById('gameType').value = 'chinese';
        updateMenuActiveState('play');
    });
    
    document.getElementById('playInternationalChess').addEventListener('click', function() {
        switchPage('play');
        document.getElementById('gameType').value = 'international';
        updateMenuActiveState('play');
    });
    
    // 对手选择事件
    document.getElementById('human-opponent').addEventListener('click', function() {
        if (isGuestMode) {
            showAlert('访客模式不支持真人对战，请注册或登录后使用', 'warning');
            return;
        }
        selectOpponent('human');
    });
    
    document.getElementById('ai-opponent').addEventListener('click', function() {
        selectOpponent('ai');
    });
    
    // 开始游戏按钮
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    
    // 登录/注册表单切换
    document.getElementById('showRegister').addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterForm();
    });
    
    document.getElementById('showLogin').addEventListener('click', function(e) {
        e.preventDefault();
        showLoginForm();
    });
    
    // 执行登录
    document.getElementById('doLoginBtn').addEventListener('click', doLogin);
    
    // 执行注册
    document.getElementById('doRegisterBtn').addEventListener('click', doRegister);
    
    // 游戏控制按钮
    document.getElementById('chinese-restart').addEventListener('click', restartChineseGame);
    document.getElementById('chinese-resign').addEventListener('click', resignChineseGame);
    document.getElementById('international-restart').addEventListener('click', restartInternationalGame);
    document.getElementById('international-resign').addEventListener('click', resignInternationalGame);
    
    // 管理员功能按钮
    document.getElementById('refreshUsersBtn').addEventListener('click', refreshUserList);
    document.getElementById('resetAllStatsBtn').addEventListener('click', resetAllUserStats);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSystemSettings);
    document.getElementById('resetSettingsBtn').addEventListener('click', resetSystemSettings);
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', importData);
    document.getElementById('clearAllDataBtn').addEventListener('click', clearAllData);
    
    // 移动端菜单按钮
    document.getElementById('mobileMenuBtn').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('mobile-show');
    });
}

// 访客模式继续
function continueAsGuest() {
    isGuestMode = true;
    isAdmin = false;
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUserUI();
    updateGuestUI();
    updateAdminUI();
    showAlert('已切换到访客模式，您可以与AI机器人进行对战', 'success');
    switchPage('home');
    updateMenuActiveState('home');
}

// 切换页面
function switchPage(pageId) {
    // 隐藏所有页面
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // 根据当前模式更新UI
        updateGuestUI();
        
        // 如果是个人资料页面，根据登录状态显示相应内容
        if (pageId === 'profile') {
            if (currentUser) {
                showProfileInfo();
            } else {
                showLoginForm();
            }
        }
        
        // 如果是开始游戏页面，根据模式设置对手选择
        if (pageId === 'play') {
            if (isGuestMode) {
                // 访客模式只能选择AI对战
                selectOpponent('ai');
                document.getElementById('human-opponent').classList.add('disabled');
                document.getElementById('playModeInfo').textContent = '访客模式下，您只能与AI机器人进行对战';
            } else {
                document.getElementById('human-opponent').classList.remove('disabled');
                document.getElementById('playModeInfo').textContent = '您可以选择真人对战或机器人对战';
            }
        }
        
        // 如果是管理员页面，检查权限
        if (pageId === 'admin') {
            if (!isAdmin) {
                showAlert('您没有管理员权限访问此页面', 'error');
                switchPage('home');
                updateMenuActiveState('home');
                return;
            }
            // 加载管理员数据
            refreshUserList();
            updateAdminStats();
        }
    }
}

// 更新菜单激活状态
function updateMenuActiveState(pageId) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
}

// 更新访客模式UI
function updateGuestUI() {
    // 显示/隐藏访客通知
    const guestNotices = document.querySelectorAll('.guest-notice');
    guestNotices.forEach(notice => {
        if (isGuestMode) {
            showElement(notice);
        } else {
            hideElement(notice);
        }
    });
    
    // 显示/隐藏管理员通知
    if (isAdmin) {
        showElement(adminNotice);
    } else {
        hideElement(adminNotice);
    }
    
    // 更新游戏页面中的玩家信息
    if (isGuestMode) {
        document.getElementById('chinese-player-name').textContent = '访客玩家';
        document.getElementById('international-player-name').textContent = '访客玩家';
        document.getElementById('chinese-player-icon').classList.add('guest-icon');
        document.getElementById('international-player-icon').classList.add('guest-icon');
        
        // 更新个人资料页面
        document.getElementById('profileGuestTag').style.display = 'inline-block';
        document.getElementById('profileAdminTag').style.display = 'none';
        document.getElementById('guestStatsNote').style.display = 'block';
    } else {
        document.getElementById('chinese-player-name').textContent = currentUser ? currentUser.username : '玩家1';
        document.getElementById('international-player-name').textContent = currentUser ? currentUser.username : '玩家1';
        document.getElementById('chinese-player-icon').classList.remove('guest-icon');
        document.getElementById('international-player-icon').classList.remove('guest-icon');
        
        // 如果是管理员，添加管理员图标
        if (isAdmin) {
            document.getElementById('chinese-player-icon').classList.add('admin-icon');
            document.getElementById('international-player-icon').classList.add('admin-icon');
        }
        
        // 更新个人资料页面
        document.getElementById('profileGuestTag').style.display = 'none';
        document.getElementById('guestStatsNote').style.display = 'none';
        
        // 如果是管理员，显示管理员标记
        if (isAdmin) {
            document.getElementById('profileAdminTag').style.display = 'inline-block';
        }
    }
}

// 更新管理员UI
function updateAdminUI() {
    // 显示/隐藏管理员菜单项
    const adminMenuItems = document.querySelectorAll('.menu-item.admin-only');
    adminMenuItems.forEach(item => {
        item.style.display = isAdmin ? 'flex' : 'none';
    });
}

// 显示登录表单
function showLoginForm() {
    document.getElementById('profileInfo').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

// 显示注册表单
function showRegisterForm() {
    document.getElementById('profileInfo').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// 显示个人资料信息
function showProfileInfo() {
    document.getElementById('profileInfo').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    
    if (currentUser) {
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileAvatar').innerHTML = `<i class="fas fa-user"></i>`;
        
        // 如果是管理员，显示管理员图标
        if (isAdmin) {
            document.getElementById('profileAvatar').style.backgroundColor = 'var(--admin-color)';
        } else {
            document.getElementById('profileAvatar').style.backgroundColor = 'var(--secondary-color)';
        }
        
        // 更新游戏统计
        updateGameStats();
    } else {
        document.getElementById('profileUsername').textContent = '访客';
        document.getElementById('profileAvatar').style.backgroundColor = 'var(--guest-color)';
    }
}

// 执行登录
function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        showAlert('请输入用户名和密码', 'error');
        return;
    }
    
    // 检查是否是管理员账号
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // 管理员登录成功
        currentUser = { 
            username: ADMIN_USERNAME,
            joinDate: new Date().toISOString(),
            stats: { totalGames: 0, wins: 0 }
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        isGuestMode = false;
        isAdmin = true;
        updateUserUI();
        updateGuestUI();
        updateAdminUI();
        showProfileInfo();
        showAlert('管理员登录成功！', 'success');
        switchPage('home');
        updateMenuActiveState('home');
        return;
    }
    
    // 查找普通用户
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        // 登录成功
        currentUser = { 
            username: user.username,
            joinDate: user.joinDate,
            stats: user.stats || { totalGames: 0, wins: 0 }
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        isGuestMode = false;
        isAdmin = false;
        updateUserUI();
        updateGuestUI();
        updateAdminUI();
        showProfileInfo();
        showAlert('登录成功！', 'success');
        switchPage('home');
        updateMenuActiveState('home');
    } else {
        showAlert('用户名或密码错误', 'error');
    }
}

// 执行注册
function doRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    
    if (!username || !password) {
        showAlert('请输入用户名和密码', 'error');
        return;
    }
    
    // 不允许注册管理员账号
    if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        showAlert('该用户名不可用，请选择其他用户名', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('两次输入的密码不一致', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('密码长度至少6位', 'error');
        return;
    }
    
    // 检查用户名是否已存在
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        showAlert('用户名已存在', 'error');
        return;
    }
    
    // 创建新用户
    const newUser = {
        username,
        password,
        joinDate: new Date().toISOString(),
        stats: {
            totalGames: 0,
            wins: 0
        }
    };
    
    users.push(newUser);
    localStorage.setItem('chessUsers', JSON.stringify(users));
    
    // 自动登录
    currentUser = { 
        username: newUser.username,
        joinDate: newUser.joinDate,
        stats: newUser.stats
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    isGuestMode = false;
    isAdmin = false;
    updateUserUI();
    updateGuestUI();
    updateAdminUI();
    showProfileInfo();
    showAlert('注册成功！', 'success');
    switchPage('home');
    updateMenuActiveState('home');
}

// 更新用户界面
function updateUserUI() {
    if (currentUser && !isGuestMode) {
        usernameDisplay.textContent = currentUser.username;
        
        if (isAdmin) {
            guestBadge.style.display = 'none';
            // 添加管理员徽章
            if (!document.getElementById('adminBadge')) {
                const adminBadge = document.createElement('div');
                adminBadge.id = 'adminBadge';
                adminBadge.className = 'admin-badge';
                adminBadge.textContent = '管理员';
                usernameDisplay.parentNode.insertBefore(adminBadge, guestBadge);
            }
        } else {
            guestBadge.style.display = 'none';
            // 移除管理员徽章
            const adminBadge = document.getElementById('adminBadge');
            if (adminBadge) {
                adminBadge.remove();
            }
        }
        
        guestModeBtn.style.display = 'inline-block';
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        
        // 添加退出按钮
        if (!document.getElementById('logoutBtn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutBtn';
            logoutBtn.className = 'btn btn-secondary';
            logoutBtn.textContent = '退出';
            logoutBtn.addEventListener('click', logout);
            userInfo.appendChild(logoutBtn);
        }
    } else {
        usernameDisplay.textContent = '访客';
        guestBadge.style.display = 'inline-block';
        guestModeBtn.style.display = 'inline-block';
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        
        // 移除管理员徽章
        const adminBadge = document.getElementById('adminBadge');
        if (adminBadge) {
            adminBadge.remove();
        }
        
        // 移除退出按钮
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.remove();
        }
    }
}

// 退出登录
function logout() {
    currentUser = null;
    isGuestMode = true;
    isAdmin = false;
    localStorage.removeItem('currentUser');
    updateUserUI();
    updateGuestUI();
    updateAdminUI();
    showLoginForm();
    showAlert('已成功退出登录，已切换到访客模式', 'success');
}

// 选择对手类型
function selectOpponent(type) {
    const humanOption = document.getElementById('human-opponent');
    const aiOption = document.getElementById('ai-opponent');
    const opponentUsernameGroup = document.getElementById('opponentUsernameGroup');
    const aiDifficultyGroup = document.getElementById('aiDifficultyGroup');
    
    if (type === 'human' && !isGuestMode) {
        humanOption.classList.add('selected');
        aiOption.classList.remove('selected');
        opponentUsernameGroup.style.display = 'block';
        aiDifficultyGroup.style.display = 'none';
        document.getElementById('playModeInfo').textContent = '您选择了真人对战模式';
    } else {
        humanOption.classList.remove('selected');
        aiOption.classList.add('selected');
        opponentUsernameGroup.style.display = 'none';
        aiDifficultyGroup.style.display = 'block';
        document.getElementById('playModeInfo').textContent = isGuestMode ? 
            '访客模式下，您只能与AI机器人进行对战' : 
            '您选择了机器人对战模式';
    }
}

// 开始游戏
function startGame() {
    const gameType = document.getElementById('gameType').value;
    const isHumanOpponent = document.getElementById('human-opponent').classList.contains('selected');
    
    // 访客模式检查
    if (isGuestMode && isHumanOpponent) {
        showAlert('访客模式不支持真人对战，请注册或登录后使用', 'warning');
        return;
    }
    
    if (isHumanOpponent) {
        const opponentUsername = document.getElementById('opponentUsername').value.trim();
        if (!opponentUsername) {
            showAlert('请输入对手用户名', 'error');
            return;
        }
        
        // 记录游戏
        const newGame = {
            id: Date.now(),
            player1: currentUser.username,
            player2: opponentUsername,
            type: gameType,
            mode: 'human',
            date: new Date().toISOString(),
            status: 'pending'
        };
        
        games.push(newGame);
        localStorage.setItem('chessGames', JSON.stringify(games));
        
        showAlert(`已向 ${opponentUsername} 发起${gameType === 'chinese' ? '中国象棋' : '国际象棋'}对战邀请`, 'success');
        
        // 切换到游戏页面
        if (gameType === 'chinese') {
            switchPage('chinese-chess');
            updateMenuActiveState('chinese-chess');
        } else {
            switchPage('international-chess');
            updateMenuActiveState('international-chess');
        }
    } else {
        const difficulty = document.getElementById('aiDifficulty').value;
        const playerName = isGuestMode ? '访客玩家' : currentUser.username;
        
        // 记录游戏（对于访客，游戏数据不会保存到本地存储）
        if (!isGuestMode) {
            const newGame = {
                id: Date.now(),
                player1: currentUser.username,
                player2: 'AI机器人(' + difficulty + ')',
                type: gameType,
                mode: 'ai',
                difficulty: difficulty,
                date: new Date().toISOString(),
                status: 'active'
            };
            
            games.push(newGame);
            localStorage.setItem('chessGames', JSON.stringify(games));
        }
        
        showAlert(`开始与${difficulty}难度的AI进行${gameType === 'chinese' ? '中国象棋' : '国际象棋'}对战`, 'success');
        
        // 切换到游戏页面
        if (gameType === 'chinese') {
            switchPage('chinese-chess');
            updateMenuActiveState('chinese-chess');
        } else {
            switchPage('international-chess');
            updateMenuActiveState('international-chess');
        }
    }
}

// 初始化中国象棋棋盘
function initChineseChessBoard() {
    const board = document.getElementById('chinese-chessboard');
    board.innerHTML = '';
    
    // 中国象棋棋子初始位置
    const chinesePieces = [
        ['车', '马', '象', '士', '将', '士', '象', '马', '车'],
        ['', '', '', '', '', '', '', '', ''],
        ['', '炮', '', '', '', '', '', '炮', ''],
        ['兵', '', '兵', '', '兵', '', '兵', '', '兵'],
        ['', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['卒', '', '卒', '', '卒', '', '卒', '', '卒'],
        ['', '炮', '', '', '', '', '', '炮', ''],
        ['', '', '', '', '', '', '', '', ''],
        ['俥', '傌', '相', '仕', '帥', '仕', '相', '傌', '俥']
    ];
    
    // 生成棋盘
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = `cell chinese-cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 添加棋子
            const piece = chinesePieces[row][col];
            if (piece) {
                cell.textContent = piece;
                cell.style.color = row < 5 ? '#000' : '#c00'; // 红黑方颜色
                cell.classList.add('piece');
                cell.dataset.piece = piece;
                
                // 添加点击事件 - 简单移动逻辑
                cell.addEventListener('click', function() {
                    handleChessPieceClick(row, col, 'chinese', piece);
                });
            }
            
            // 添加楚河汉界标识
            if (row === 4 || row === 5) {
                cell.style.position = 'relative';
                if (col === 0) {
                    const label = document.createElement('div');
                    label.textContent = row === 4 ? '楚河' : '汉界';
                    label.style.position = 'absolute';
                    label.style.bottom = '2px';
                    label.style.right = '2px';
                    label.style.fontSize = '12px';
                    label.style.color = '#666';
                    cell.appendChild(label);
                }
            }
            
            board.appendChild(cell);
        }
    }
}

// 初始化国际象棋棋盘
function initInternationalChessBoard() {
    const board = document.getElementById('international-chessboard');
    board.innerHTML = '';
    
    // 国际象棋棋子初始位置
    const internationalPieces = [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];
    
    // 生成棋盘
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.className = `cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // 添加棋子
            const piece = internationalPieces[row][col];
            if (piece) {
                cell.textContent = piece;
                cell.style.color = row < 2 ? '#000' : '#333'; // 黑方和白方
                cell.classList.add('piece');
                cell.dataset.piece = piece;
                
                // 添加点击事件 - 简单移动逻辑
                cell.addEventListener('click', function() {
                    handleChessPieceClick(row, col, 'international', piece);
                });
            }
            
            board.appendChild(cell);
        }
    }
}

// 简单的棋子点击处理（基础移动逻辑）
let selectedPiece = null;
let currentTurn = 'red'; // 中国象棋红方先走，国际象棋白方先走

function handleChessPieceClick(row, col, gameType, piece) {
    const board = gameType === 'chinese' ? 
        document.getElementById('chinese-chessboard') : 
        document.getElementById('international-chessboard');
    
    const cells = board.querySelectorAll('.cell');
    
    // 清除之前的高亮
    cells.forEach(cell => {
        cell.style.boxShadow = '';
        cell.style.backgroundColor = '';
    });
    
    // 如果没有选中的棋子，选中当前棋子
    if (!selectedPiece) {
        // 检查是否可以选中该棋子（简单规则：红方棋子只能红方选，黑方棋子只能黑方选）
        const isRedPiece = piece && (gameType === 'chinese' ? 
            (row >= 5 || piece === '兵' || piece === '炮') : 
            row >= 6);
        
        if ((currentTurn === 'red' && isRedPiece) || (currentTurn === 'black' && !isRedPiece)) {
            selectedPiece = { row, col, gameType, piece };
            
            // 高亮选中的棋子
            const cell = document.querySelector(`#${gameType}-chessboard .cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.style.boxShadow = '0 0 10px 2px var(--secondary-color)';
                
                // 显示可能的移动位置（简单演示）
                showPossibleMoves(row, col, gameType, piece);
            }
        } else {
            showAlert('现在不是您的回合或不能选择对方棋子', 'warning');
        }
    } else {
        // 已经有选中的棋子，尝试移动
        if (selectedPiece.row === row && selectedPiece.col === col) {
            // 点击同一个棋子，取消选择
            selectedPiece = null;
        } else {
            // 尝试移动到目标位置
            const targetCell = document.querySelector(`#${gameType}-chessboard .cell[data-row="${row}"][data-col="${col}"]`);
            const targetPiece = targetCell.dataset.piece;
            
            // 简单移动规则：只能移动到空位或对方棋子位置
            if (!targetPiece || (currentTurn === 'red' && row < 5) || (currentTurn === 'black' && row >= 5)) {
                // 移动棋子
                const sourceCell = document.querySelector(`#${gameType}-chessboard .cell[data-row="${selectedPiece.row}"][data-col="${selectedPiece.col}"]`);
                
                // 移动到目标位置
                targetCell.textContent = selectedPiece.piece;
                targetCell.dataset.piece = selectedPiece.piece;
                targetCell.style.color = sourceCell.style.color;
                
                // 清空源位置
                sourceCell.textContent = '';
                sourceCell.dataset.piece = '';
                
                // 切换回合
                currentTurn = currentTurn === 'red' ? 'black' : 'red';
                
                // 更新回合指示器
                if (gameType === 'chinese') {
                    document.getElementById('chinese-turn-indicator').textContent = 
                        currentTurn === 'red' ? '轮到红方' : '轮到黑方';
                } else {
                    document.getElementById('international-turn-indicator').textContent = 
                        currentTurn === 'red' ? '轮到白方' : '轮到黑方';
                }
                
                showAlert('移动成功', 'success');
            } else {
                showAlert('不能移动到该位置', 'warning');
            }
            
            selectedPiece = null;
        }
    }
}

// 显示可能的移动位置（简单演示）
function showPossibleMoves(row, col, gameType, piece) {
    const board = gameType === 'chinese' ? 
        document.getElementById('chinese-chessboard') : 
        document.getElementById('international-chessboard');
    
    // 根据棋子类型显示可能的移动位置（简化版）
    let possibleMoves = [];
    
    if (gameType === 'chinese') {
        // 中国象棋简单移动规则
        if (piece === '兵' || piece === '卒') {
            // 兵/卒只能向前走一格
            const direction = piece === '兵' ? -1 : 1; // 兵向上，卒向下
            possibleMoves.push({ row: row + direction, col: col });
        } else if (piece === '将' || piece === '帥') {
            // 将/帥可以在九宫格内移动一格
            const palaceRows = piece === '将' ? [0, 1, 2] : [7, 8, 9];
            const palaceCols = [3, 4, 5];
            
            possibleMoves = [
                { row: row - 1, col: col },
                { row: row + 1, col: col },
                { row: row, col: col - 1 },
                { row: row, col: col + 1 }
            ].filter(move => 
                palaceRows.includes(move.row) && 
                palaceCols.includes(move.col)
            );
        } else {
            // 其他棋子可以移动到周围8个方向（简化）
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    possibleMoves.push({ row: row + dr, col: col + dc });
                }
            }
        }
    } else {
        // 国际象棋简单移动规则
        if (piece === '♙' || piece === '♟') {
            // 兵只能向前走一格
            const direction = piece === '♙' ? -1 : 1;
            possibleMoves.push({ row: row + direction, col: col });
        } else if (piece === '♔' || piece === '♚') {
            // 王可以移动到周围8个方向
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    possibleMoves.push({ row: row + dr, col: col + dc });
                }
            }
        } else {
            // 其他棋子可以移动到周围8个方向（简化）
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    possibleMoves.push({ row: row + dr, col: col + dc });
                }
            }
        }
    }
    
    // 过滤出棋盘范围内的位置
    possibleMoves = possibleMoves.filter(move => 
        move.row >= 0 && 
        move.row < (gameType === 'chinese' ? 10 : 8) && 
        move.col >= 0 && 
        move.col < (gameType === 'chinese' ? 9 : 8)
    );
    
    // 高亮显示可能移动的位置
    possibleMoves.forEach(move => {
        const cell = board.querySelector(`.cell[data-row="${move.row}"][data-col="${move.col}"]`);
        if (cell) {
            cell.style.backgroundColor = 'rgba(52, 152, 219, 0.3)';
        }
    });
}

// 重新开始中国象棋游戏
function restartChineseGame() {
    initChineseChessBoard();
    document.getElementById('chinese-turn-indicator').textContent = '轮到红方';
    currentTurn = 'red';
    selectedPiece = null;
    showAlert('游戏已重新开始', 'success');
}

// 认输中国象棋游戏
function resignChineseGame() {
    if (confirm('确定要认输吗？')) {
        showAlert('您已认输，游戏结束', 'error');
        // 更新游戏记录（仅限注册用户）
        if (!isGuestMode && games.length > 0) {
            const lastGame = games[games.length - 1];
            lastGame.status = 'completed';
            lastGame.result = 'resign';
            lastGame.winner = lastGame.player2;
            localStorage.setItem('chessGames', JSON.stringify(games));
            updateGameStats();
        }
    }
}

// 重新开始国际象棋游戏
function restartInternationalGame() {
    initInternationalChessBoard();
    document.getElementById('international-turn-indicator').textContent = '轮到白方';
    currentTurn = 'red'; // 白方对应red
    selectedPiece = null;
    showAlert('游戏已重新开始', 'success');
}

// 认输国际象棋游戏
function resignInternationalGame() {
    if (confirm('确定要认输吗？')) {
        showAlert('您已认输，游戏结束', 'error');
        // 更新游戏记录（仅限注册用户）
        if (!isGuestMode && games.length > 0) {
            const lastGame = games[games.length - 1];
            lastGame.status = 'completed';
            lastGame.result = 'resign';
            lastGame.winner = lastGame.player2;
            localStorage.setItem('chessGames', JSON.stringify(games));
            updateGameStats();
        }
    }
}

// 更新游戏统计
function updateGameStats() {
    if (!currentUser || isGuestMode) {
        document.getElementById('totalGames').textContent = '0';
        document.getElementById('wins').textContent = '0';
        document.getElementById('recentActivity').textContent = '暂无活动记录（访客模式下游戏数据不会被保存）';
        return;
    }
    
    const userGames = games.filter(game => 
        game.player1 === currentUser.username || game.player2 === currentUser.username
    );
    
    const completedGames = userGames.filter(game => game.status === 'completed');
    const userWins = completedGames.filter(game => game.winner === currentUser.username).length;
    
    document.getElementById('totalGames').textContent = userGames.length;
    document.getElementById('wins').textContent = userWins;
    
    // 更新最近活动
    const recentActivity = document.getElementById('recentActivity');
    if (userGames.length > 0) {
        const lastGame = userGames[userGames.length - 1];
        const gameType = lastGame.type === 'chinese' ? '中国象棋' : '国际象棋';
        const opponent = lastGame.player1 === currentUser.username ? lastGame.player2 : lastGame.player1;
        const date = new Date(lastGame.date).toLocaleDateString();
        
        recentActivity.innerHTML = `
            <div>${date} - ${gameType}对战</div>
            <div>对手: ${opponent}</div>
            <div>状态: ${lastGame.status === 'completed' ? '已完成' : '进行中'}</div>
        `;
    } else {
        recentActivity.textContent = '暂无活动记录';
    }
}

// 管理员功能
function refreshUserList() {
    const userTableBody = document.getElementById('userTableBody');
    userTableBody.innerHTML = '';
    
    // 添加管理员账号（如果不在用户列表中）
    let allUsers = [...users];
    const adminInList = allUsers.find(u => u.username === ADMIN_USERNAME);
    if (!adminInList) {
        allUsers.unshift({
            username: ADMIN_USERNAME,
            joinDate: '系统默认',
            stats: { totalGames: 0, wins: 0 }
        });
    }
    
    allUsers.forEach(user => {
        const row = document.createElement('tr');
        
        // 计算胜率
        const winRate = user.stats.totalGames > 0 
            ? Math.round((user.stats.wins / user.stats.totalGames) * 100) 
            : 0;
        
        row.innerHTML = `
            <td>${user.username} ${user.username === ADMIN_USERNAME ? '<span class="admin-badge" style="font-size:10px; padding:2px 5px;">管理员</span>' : ''}</td>
            <td>${user.joinDate === '系统默认' ? '系统默认' : new Date(user.joinDate).toLocaleDateString()}</td>
            <td>${user.stats.totalGames || 0}</td>
            <td>${winRate}%</td>
            <td>${user.username === ADMIN_USERNAME ? '管理员' : (user.username === currentUser?.username ? '在线' : '离线')}</td>
            <td>
                ${user.username !== ADMIN_USERNAME ? `
                    <button class="btn btn-secondary btn-sm delete-user-btn" data-username="${user.username}" style="padding: 5px 10px; font-size: 12px;">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                    <button class="btn btn-secondary btn-sm reset-stats-btn" data-username="${user.username}" style="padding: 5px 10px; font-size: 12px;">
                        <i class="fas fa-redo"></i> 重置统计
                    </button>
                ` : '<span style="color:#666;">系统账号</span>'}
            </td>
        `;
        
        userTableBody.appendChild(row);
    });
    
    // 为删除和重置按钮添加事件监听器
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            deleteUser(username);
        });
    });
    
    document.querySelectorAll('.reset-stats-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            resetUserStats(username);
        });
    });
    
    updateAdminStats();
}

function deleteUser(username) {
    if (username === ADMIN_USERNAME) {
        showAlert('不能删除管理员账号', 'error');
        return;
    }
    
    if (confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销！`)) {
        // 从用户列表中删除
        users = users.filter(u => u.username !== username);
        localStorage.setItem('chessUsers', JSON.stringify(users));
        
        // 从游戏记录中删除相关游戏
        games = games.filter(game => 
            game.player1 !== username && game.player2 !== username
        );
        localStorage.setItem('chessGames', JSON.stringify(games));
        
        showAlert(`用户 "${username}" 已删除`, 'success');
        refreshUserList();
    }
}

function resetUserStats(username) {
    if (username === ADMIN_USERNAME) {
        showAlert('不能重置管理员账号统计', 'error');
        return;
    }
    
    if (confirm(`确定要重置用户 "${username}" 的游戏统计吗？`)) {
        const user = users.find(u => u.username === username);
        if (user) {
            user.stats = { totalGames: 0, wins: 0 };
            localStorage.setItem('chessUsers', JSON.stringify(users));
            showAlert(`用户 "${username}" 的游戏统计已重置`, 'success');
            refreshUserList();
        }
    }
}

function resetAllUserStats() {
    if (confirm('确定要重置所有用户的游戏统计吗？此操作会影响所有注册用户！')) {
        users.forEach(user => {
            if (user.username !== ADMIN_USERNAME) {
                user.stats = { totalGames: 0, wins: 0 };
            }
        });
        localStorage.setItem('chessUsers', JSON.stringify(users));
        showAlert('所有用户游戏统计已重置', 'success');
        refreshUserList();
    }
}

function updateAdminStats() {
    // 用户统计
    document.getElementById('totalUsers').textContent = users.length + 1; // +1 管理员账号
    
    // 游戏统计
    document.getElementById('totalGamesAdmin').textContent = games.length;
    
    const activeGames = games.filter(game => game.status === 'active' || game.status === 'pending').length;
    document.getElementById('activeGames').textContent = activeGames;
    
    const chineseGames = games.filter(game => game.type === 'chinese').length;
    document.getElementById('chineseGames').textContent = chineseGames;
    
    const internationalGames = games.filter(game => game.type === 'international').length;
    document.getElementById('internationalGames').textContent = internationalGames;
    
    const aiGames = games.filter(game => game.mode === 'ai').length;
    document.getElementById('aiGames').textContent = aiGames;
}

function loadSystemSettings() {
    document.getElementById('systemMessage').value = systemSettings.systemMessage;
    document.getElementById('defaultAiDifficulty').value = systemSettings.defaultAiDifficulty;
    document.getElementById('guestLimits').value = systemSettings.guestLimits;
    
    // 设置默认AI难度
    document.getElementById('aiDifficulty').value = systemSettings.defaultAiDifficulty;
}

function saveSystemSettings() {
    systemSettings.systemMessage = document.getElementById('systemMessage').value;
    systemSettings.defaultAiDifficulty = document.getElementById('defaultAiDifficulty').value;
    systemSettings.guestLimits = parseInt(document.getElementById('guestLimits').value);
    
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    
    // 更新当前AI难度选择
    document.getElementById('aiDifficulty').value = systemSettings.defaultAiDifficulty;
    
    showAlert('系统设置已保存', 'success');
}

function resetSystemSettings() {
    if (confirm('确定要恢复默认系统设置吗？')) {
        systemSettings = {
            systemMessage: "欢迎来到双棋对战平台！祝您游戏愉快！",
            defaultAiDifficulty: "medium",
            guestLimits: 10
        };
        
        localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
        loadSystemSettings();
        showAlert('系统设置已恢复为默认值', 'success');
    }
}

function exportData() {
    const data = {
        users: users,
        games: games,
        systemSettings: systemSettings,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `chess-platform-backup-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showAlert('数据已导出为JSON文件', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function() {
            try {
                const data = JSON.parse(reader.result);
                
                if (confirm('确定要导入数据吗？这将覆盖当前所有数据！')) {
                    if (data.users) {
                        users = data.users;
                        localStorage.setItem('chessUsers', JSON.stringify(users));
                    }
                    
                    if (data.games) {
                        games = data.games;
                        localStorage.setItem('chessGames', JSON.stringify(games));
                    }
                    
                    if (data.systemSettings) {
                        systemSettings = data.systemSettings;
                        localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
                        loadSystemSettings();
                    }
                    
                    showAlert('数据导入成功', 'success');
                    refreshUserList();
                }
            } catch (error) {
                showAlert('导入失败：文件格式不正确', 'error');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function clearAllData() {
    if (confirm('警告：确定要清除所有数据吗？这将删除所有用户信息和游戏记录，此操作不可逆！')) {
        users = [];
        games = [];
        systemSettings = {
            systemMessage: "欢迎来到双棋对战平台！祝您游戏愉快！",
            defaultAiDifficulty: "medium",
            guestLimits: 10
        };
        
        localStorage.setItem('chessUsers', JSON.stringify(users));
        localStorage.setItem('chessGames', JSON.stringify(games));
        localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
        
        // 清除当前用户
        currentUser = null;
        isGuestMode = true;
        isAdmin = false;
        localStorage.removeItem('currentUser');
        
        updateUserUI();
        updateGuestUI();
        updateAdminUI();
        showLoginForm();
        loadSystemSettings();
        refreshUserList();
        
        showAlert('所有数据已清除，已切换到访客模式', 'success');
        switchPage('home');
        updateMenuActiveState('home');
    }
}

// 显示提示信息
function showAlert(message, type) {
    // 创建临时提示框
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '1000';
    alertDiv.style.maxWidth = '300px';
    alertDiv.style.display = 'block';
    
    document.body.appendChild(alertDiv);
    
    // 自动隐藏
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// 默认选择机器人对战（访客模式只能选择AI对战）
selectOpponent('ai');

// 默认隐藏访客和管理员通知
hideElement(document.getElementById('guestNotice'));
hideElement(document.getElementById('adminNotice'));
hideElement(document.getElementById('chineseGuestNotice'));
hideElement(document.getElementById('internationalGuestNotice'));
hideElement(document.getElementById('playGuestNotice'));
hideElement(document.getElementById('profileGuestNotice'));