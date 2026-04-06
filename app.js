// EXPERIMENTAL VERSION - Mock Data Only
// No Supabase integration, full access for UI testing

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

let currentUser = null;
let html5QrCode = null;
let currentFilter = 'week';
let currentLogView = 'attendance';
let currentLateFilter = 'week';
let currentDayView = 'today';

// Mock Data
const mockUsers = [
    { telegram_id: 1, full_name: 'Иван Петров', username: 'ivan_p', is_admin: false, is_worker: false, created_at: '2026-03-15T10:00:00Z' },
    { telegram_id: 2, full_name: 'Мария Сидорова', username: 'maria_s', is_admin: false, is_worker: false, created_at: '2026-03-20T14:30:00Z' },
    { telegram_id: 3, full_name: 'Алексей Иванов', username: 'alex_i', is_admin: false, is_worker: false, created_at: '2026-04-01T09:15:00Z' }
];

const mockWorkers = [
    { telegram_id: 10, full_name: 'Анна Кузнецова', display_name: 'Анна', username: 'anna_k', gender: 'F', is_worker: true },
    { telegram_id: 11, full_name: 'Дмитрий Смирнов', display_name: 'Дмитрий', username: 'dmitry_s', gender: 'M', is_worker: true },
    { telegram_id: 12, full_name: 'Елена Волкова', display_name: 'Лена', username: 'elena_v', gender: 'F', is_worker: true }
];

const mockLogs = [
    { user_id: 10, full_name: 'Анна Кузнецова', qr_code: 'QR_AUTH_2026-04-06', auth_time: '2026-04-06T07:55:00Z' },
    { user_id: 11, full_name: 'Дмитрий Смирнов', qr_code: 'QR_AUTH_2026-04-06', auth_time: '2026-04-06T08:15:00Z' },
    { user_id: 12, full_name: 'Елена Волкова', qr_code: 'QR_AUTH_2026-04-06', auth_time: '2026-04-06T08:30:00Z' },
    { user_id: 10, full_name: 'Анна Кузнецова', qr_code: 'QR_AUTH_2026-04-05', auth_time: '2026-04-05T07:50:00Z' },
    { user_id: 11, full_name: 'Дмитрий Смирнов', qr_code: 'QR_AUTH_2026-04-05', auth_time: '2026-04-05T08:20:00Z' },
    { user_id: 10, full_name: 'Анна Кузнецова', qr_code: 'QR_AUTH_2026-04-04', auth_time: '2026-04-04T08:10:00Z' },
    { user_id: 12, full_name: 'Елена Волкова', qr_code: 'QR_AUTH_2026-04-04', auth_time: '2026-04-04T08:25:00Z' }
];

// Load from localStorage or use defaults
function loadMockData() {
    const stored = localStorage.getItem('qr_auth_experimental');
    if (stored) {
        const data = JSON.parse(stored);
        return data;
    }
    return {
        users: [...mockUsers],
        workers: [...mockWorkers],
        logs: [...mockLogs]
    };
}

function saveMockData(data) {
    localStorage.setItem('qr_auth_experimental', JSON.stringify(data));
}

let mockData = loadMockData();

// Инициализация
async function init() {
    // Всегда показываем админ панель для тестирования
    currentUser = {
        id: 999,
        first_name: 'Тестовый',
        last_name: 'Админ',
        username: 'test_admin',
        photo_url: null
    };
    
    document.getElementById('userName').textContent = 'Тестовый Админ';
    
    const avatarEl = document.getElementById('userAvatar');
    avatarEl.innerHTML = `<img src="svgg/user.svg" alt="User" style="width: 24px; height: 24px; opacity: 0.5;">`;

    showAdminPanel();
    setTimeout(setTodayDate, 100);
}

function showAdminPanel() {
    document.getElementById('userRole').textContent = 'Администратор';
    document.getElementById('userRole').classList.add('admin');
    
    const headerNav = document.getElementById('headerNav');
    headerNav.innerHTML = `
        <button class="nav-btn" onclick="showAdminTab('logs', 'attendance')">Отметки</button>
        <button class="nav-btn" onclick="showAdminTab('logs', 'late')">Опоздания</button>
        <button class="nav-btn" onclick="showAdminTab('users')">Пользователи</button>
        <button class="nav-btn" onclick="showAdminTab('workers')">Работники</button>
        <button class="nav-btn" onclick="showAdminTab('generate')">Генератор</button>
    `;
    
    document.getElementById('adminWelcome').classList.remove('hidden');
}

function showAdminTab(tab, subview) {
    closeMenuOnSelect();
    document.querySelectorAll('.header-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    
    document.getElementById('adminWelcome').classList.add('hidden');
    document.getElementById('logsTab').classList.remove('active');
    document.getElementById('usersTab').classList.remove('active');
    document.getElementById('workersTab').classList.remove('active');
    document.getElementById('generateTab').classList.remove('active');
    
    if (tab === 'welcome') {
        document.getElementById('adminWelcome').classList.remove('hidden');
    } else if (tab === 'logs') {
        document.getElementById('logsTab').classList.add('active');
        if (subview) {
            switchLogSubmenu(subview);
        } else {
            loadAttendanceLogs();
        }
    } else if (tab === 'users') {
        document.getElementById('usersTab').classList.add('active');
        loadUsers();
    } else if (tab === 'workers') {
        document.getElementById('workersTab').classList.add('active');
        loadWorkers();
    } else if (tab === 'generate') {
        document.getElementById('generateTab').classList.add('active');
    }
    
    if (tg) tg.HapticFeedback.impactOccurred('light');
}

// Админ: Логи
function switchLogSubmenu(view) {
    currentLogView = view;
    
    const titleEl = document.getElementById('currentViewTitle');
    if (titleEl) {
        titleEl.textContent = view === 'attendance' ? 'Отметки' : 'Опоздания';
    }
    
    document.getElementById('attendanceView').classList.toggle('hidden', view !== 'attendance');
    document.getElementById('lateView').classList.toggle('hidden', view !== 'late');
    
    if (view === 'attendance') {
        loadAttendanceLogs();
    } else {
        loadLateLogs();
    }
    
    if (tg) tg.HapticFeedback.impactOccurred('light');
}

function loadAttendanceLogs() {
    const authList = document.getElementById('attendanceList');
    
    if (currentDayView === 'today') {
        authList.innerHTML = '<p class="loading">Загрузка...</p>';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayLogs = mockData.logs.filter(log => {
            const logDate = new Date(log.auth_time);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
        });

        if (todayLogs.length === 0) {
            authList.innerHTML = '<div class="empty-state">Сегодня еще никто не отметился</div>';
            return;
        }

        renderTodayAttendance(todayLogs);
    } else {
        authList.innerHTML = '<p class="loading">Загрузка...</p>';
        renderDaysList(mockData.logs);
    }
}

function renderTodayAttendance(logs) {
    const authList = document.getElementById('attendanceList');
    authList.innerHTML = '';

    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'auth-item';
        
        const authTime = new Date(log.auth_time);
        const timeStr = authTime.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const displayQR = log.qr_code.replace('QR_AUTH_', '');

        item.innerHTML = `
            <div class="auth-item-header">
                <span class="auth-item-name">${log.full_name}</span>
                <span class="auth-item-time">${timeStr}</span>
            </div>
            <div class="auth-item-qr">QR: ${displayQR}</div>
        `;

        authList.appendChild(item);
    });
}

function renderDaysList(logs) {
    const authList = document.getElementById('attendanceList');
    authList.innerHTML = '';
    
    const byDate = {};
    logs.forEach(log => {
        const date = new Date(log.auth_time);
        const dateKey = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        if (!byDate[dateKey]) {
            byDate[dateKey] = [];
        }
        byDate[dateKey].push(log);
    });
    
    Object.keys(byDate).forEach(dateKey => {
        const dayItem = document.createElement('div');
        dayItem.className = 'day-item';
        dayItem.innerHTML = `
            <div class="day-header" onclick="toggleDayDetails('${dateKey}')">
                <span class="day-date">${dateKey}</span>
                <span class="day-count">${byDate[dateKey].length} чел.</span>
                <span class="day-arrow">▼</span>
            </div>
            <div class="day-details hidden" id="day-${dateKey}">
                ${byDate[dateKey].map(log => {
                    const time = new Date(log.auth_time).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    return `<div class="day-detail-item">${log.full_name} — ${time}</div>`;
                }).join('')}
            </div>
        `;
        authList.appendChild(dayItem);
    });
}

function toggleDayDetails(dateKey) {
    const details = document.getElementById(`day-${dateKey}`);
    const arrow = event.target.closest('.day-header').querySelector('.day-arrow');
    details.classList.toggle('hidden');
    arrow.style.transform = details.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function switchDayView(view) {
    currentDayView = view;
    document.querySelectorAll('.day-view-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    loadAttendanceLogs();
}

// Опоздания для админа
function loadLateLogs() {
    const lateList = document.getElementById('lateList');
    lateList.innerHTML = '<p class="loading">Загрузка...</p>';
    
    let dateFilter = new Date();
    if (currentLateFilter === 'week') {
        dateFilter.setDate(dateFilter.getDate() - 7);
    } else {
        dateFilter.setMonth(dateFilter.getMonth() - 1);
    }
    
    const filteredLogs = mockData.logs.filter(log => {
        const logDate = new Date(log.auth_time);
        return logDate >= dateFilter;
    });

    if (filteredLogs.length === 0) {
        lateList.innerHTML = '<div class="empty-state">Нет данных</div>';
        return;
    }
    
    const WORK_START_HOUR = 8;
    const WORK_START_MINUTE = 0;
    
    const lateByUser = {};
    
    filteredLogs.forEach(log => {
        const authTime = new Date(log.auth_time);
        const hour = authTime.getHours();
        const minute = authTime.getMinutes();
        
        if (hour > WORK_START_HOUR || (hour === WORK_START_HOUR && minute > WORK_START_MINUTE)) {
            if (!lateByUser[log.user_id]) {
                lateByUser[log.user_id] = {
                    name: log.full_name,
                    count: 0
                };
            }
            lateByUser[log.user_id].count++;
        }
    });
    
    renderLateSummary(lateByUser);
}

function renderLateSummary(lateByUser) {
    const lateList = document.getElementById('lateList');
    lateList.innerHTML = '';
    
    const users = Object.values(lateByUser).sort((a, b) => b.count - a.count);
    
    if (users.length === 0) {
        lateList.innerHTML = '<div class="empty-state"><img src="svgg/alarm.svg" alt="No late" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 15px;"><br>Опозданий нет!</div>';
        return;
    }
    
    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'late-item';
        
        item.innerHTML = `
            <span class="late-name">${user.name}</span>
            <span class="late-count">${user.count}</span>
        `;
        
        lateList.appendChild(item);
    });
}

function switchLateFilter(period) {
    currentLateFilter = period;
    document.querySelectorAll('.late-filter-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    loadLateLogs();
}

// Генерация QR
async function generateQR() {
    const dateInput = document.getElementById('qrDate');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        if (tg) tg.showAlert('Выберите дату');
        else alert('Выберите дату');
        return;
    }

    const qrData = `QR_AUTH_${selectedDate}`;

    const qrContainer = document.getElementById('qrCanvas');
    const preview = document.getElementById('qrPreview');
    
    try {
        qrContainer.innerHTML = '';
        
        if (typeof QRCode === 'undefined') {
            throw new Error('QRCode library not loaded');
        }
        
        new QRCode(qrContainer, {
            text: qrData,
            width: 300,
            height: 300,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        
        preview.classList.remove('hidden');
        
        if (tg) tg.HapticFeedback.notificationOccurred('success');
    } catch (err) {
        console.error('Ошибка генерации QR:', err);
        if (tg) tg.showAlert('Ошибка: ' + err.message);
        else alert('Ошибка: ' + err.message);
    }
}

function setTodayDate() {
    const dateInput = document.getElementById('qrDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

function downloadQR() {
    const qrContainer = document.getElementById('qrCanvas');
    const canvas = qrContainer.querySelector('canvas');
    const date = document.getElementById('qrDate').value;
    
    if (!canvas) {
        alert('Сначала сгенерируйте QR-код');
        return;
    }
    
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr_${date}_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
}

function printQR() {
    const qrContainer = document.getElementById('qrCanvas');
    const canvas = qrContainer.querySelector('canvas');
    const date = document.getElementById('qrDate').value;
    
    if (!canvas) {
        alert('Сначала сгенерируйте QR-код');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Code - ${date}</title>
            <style>
                body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: Arial, sans-serif; }
                h1 { margin-bottom: 20px; }
                img { max-width: 400px; border: 2px solid #000; padding: 20px; }
            </style>
        </head>
        <body>
            <h1>QR Code: ${date}</h1>
            <img src="${canvas.toDataURL()}" alt="QR Code">
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
}

// Управление пользователями
function loadUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '<p class="loading">Загрузка...</p>';

    const users = mockData.users;

    if (users.length === 0) {
        usersList.innerHTML = '<div class="empty-state">Нет новых пользователей</div>';
        return;
    }

    renderUsersList(users);
}

function renderUsersList(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';

    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'user-item';
        
        let dateStr = 'Дата неизвестна';
        if (user.created_at) {
            const createdAt = new Date(user.created_at);
            dateStr = createdAt.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }

        item.innerHTML = `
            <div class="user-item-header">
                <div class="user-item-info">
                    <div class="user-item-name">${user.full_name}</div>
                    <div class="user-item-meta">
                        <span class="user-item-username">@${user.username || 'без username'}</span>
                        <span class="user-item-separator">•</span>
                        <span class="user-item-date">${dateStr}</span>
                    </div>
                </div>
                <span class="badge badge-user">Пользователь</span>
            </div>
            <div class="user-item-actions">
                <button class="btn-toggle-worker" 
                        onclick="makeWorker(${user.telegram_id})">
                    Назначить работником
                </button>
                <button class="btn-delete-user" onclick="deleteUser(${user.telegram_id}, '${user.full_name.replace(/'/g, "\\'")}')">
                    <img src="svgg/delete.svg" alt="Delete" class="btn-icon"> Удалить пользователя
                </button>
            </div>
        `;

        usersList.appendChild(item);
    });
}

function makeWorker(telegramId) {
    const userIndex = mockData.users.findIndex(u => u.telegram_id === telegramId);
    if (userIndex !== -1) {
        const user = mockData.users[userIndex];
        mockData.workers.push({
            ...user,
            is_worker: true,
            display_name: user.full_name,
            gender: 'M'
        });
        mockData.users.splice(userIndex, 1);
        saveMockData(mockData);
    }
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    loadUsers();
}

// Управление работниками
function loadWorkers() {
    const workersList = document.getElementById('workersList');
    workersList.innerHTML = '<p class="loading">Загрузка...</p>';

    const workers = mockData.workers;

    if (workers.length === 0) {
        workersList.innerHTML = '<div class="empty-state">Нет работников</div>';
        return;
    }

    renderWorkersList(workers);
}

function renderWorkersList(workers) {
    const workersList = document.getElementById('workersList');
    workersList.innerHTML = '';

    workers.forEach(worker => {
        const item = document.createElement('div');
        item.className = 'user-item';
        
        const displayName = worker.display_name || worker.full_name;
        const gender = worker.gender || 'M';

        item.innerHTML = `
            <div class="user-item-header">
                <div class="user-item-info">
                    <div class="user-item-name">${displayName}</div>
                    <div class="user-item-meta">
                        <span class="user-item-username">@${worker.username || 'без username'}</span>
                        <span class="user-item-separator">•</span>
                        <span class="user-item-gender">${gender === 'F' ? 'Ж' : 'М'}</span>
                    </div>
                </div>
                <span class="badge badge-worker">Работник</span>
            </div>
            <div class="user-item-actions">
                <button class="btn-edit-worker" onclick="showEditWorker(${worker.telegram_id}, '${displayName.replace(/'/g, "\\'")}', '${gender}')">
                    <img src="svgg/edit.svg" alt="Edit" class="btn-icon"> Редактировать
                </button>
                <button class="btn-toggle-worker active" 
                        onclick="removeWorkerStatus(${worker.telegram_id})">
                    Отнять статус
                </button>
            </div>
        `;

        workersList.appendChild(item);
    });
}

function showEditWorker(telegramId, currentName, currentGender) {
    const item = event.target.closest('.user-item');
    const actionsDiv = item.querySelector('.user-item-actions');
    
    actionsDiv.innerHTML = `
        <div class="edit-form">
            <div class="form-group-inline">
                <label>Отображаемое имя</label>
                <input type="text" id="editName_${telegramId}" class="form-input-inline" value="${currentName}">
            </div>
            <div class="form-group-inline">
                <label>Пол</label>
                <div class="gender-buttons-inline">
                    <button class="gender-btn-inline ${currentGender === 'M' ? 'active' : ''}" onclick="selectGenderInline(${telegramId}, 'M')">М</button>
                    <button class="gender-btn-inline ${currentGender === 'F' ? 'active' : ''}" onclick="selectGenderInline(${telegramId}, 'F')">Ж</button>
                </div>
            </div>
            <div class="edit-actions">
                <button class="btn-cancel" onclick="loadWorkers()">Отмена</button>
                <button class="btn-save" onclick="saveWorkerEdit(${telegramId})">Сохранить</button>
            </div>
        </div>
    `;
    
    item.dataset.selectedGender = currentGender;
    if (tg) tg.HapticFeedback.impactOccurred('light');
}

function selectGenderInline(telegramId, gender) {
    const item = event.target.closest('.user-item');
    item.dataset.selectedGender = gender;
    
    item.querySelectorAll('.gender-btn-inline').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tg) tg.HapticFeedback.impactOccurred('light');
}

function saveWorkerEdit(telegramId) {
    const item = event.target.closest('.user-item');
    const displayName = document.getElementById(`editName_${telegramId}`).value.trim();
    const gender = item.dataset.selectedGender || 'M';
    
    if (!displayName) {
        if (tg) tg.showAlert('Введите имя');
        else alert('Введите имя');
        return;
    }
    
    const workerIndex = mockData.workers.findIndex(w => w.telegram_id === telegramId);
    if (workerIndex !== -1) {
        mockData.workers[workerIndex].display_name = displayName;
        mockData.workers[workerIndex].gender = gender;
        saveMockData(mockData);
    }
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    loadWorkers();
}

function removeWorkerStatus(telegramId) {
    const workerIndex = mockData.workers.findIndex(w => w.telegram_id === telegramId);
    if (workerIndex !== -1) {
        const worker = mockData.workers[workerIndex];
        mockData.users.push({
            telegram_id: worker.telegram_id,
            full_name: worker.full_name,
            username: worker.username,
            is_admin: false,
            is_worker: false,
            created_at: new Date().toISOString()
        });
        mockData.workers.splice(workerIndex, 1);
        saveMockData(mockData);
    }
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    loadWorkers();
}

function deleteUser(telegramId, fullName) {
    const confirmed = confirm(`Удалить пользователя "${fullName}"?\n\nЭто действие нельзя отменить.`);
    
    if (confirmed) {
        const userIndex = mockData.users.findIndex(u => u.telegram_id === telegramId);
        if (userIndex !== -1) {
            mockData.users.splice(userIndex, 1);
            saveMockData(mockData);
        }
        
        if (tg) tg.HapticFeedback.notificationOccurred('success');
        setTimeout(() => loadUsers(), 300);
    }
}

init();

// Мобильное меню
function toggleMobileMenu() {
    const nav = document.getElementById('headerNav');
    const btn = document.getElementById('mobileMenuBtn');
    
    nav.classList.toggle('active');
    btn.classList.toggle('active');
    
    if (tg) tg.HapticFeedback.impactOccurred('light');
}

function closeMenuOnSelect() {
    if (window.innerWidth <= 768) {
        const nav = document.getElementById('headerNav');
        const btn = document.getElementById('mobileMenuBtn');
        nav.classList.remove('active');
        btn.classList.remove('active');
    }
}
