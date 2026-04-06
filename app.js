// Supabase Configuration
const SUPABASE_URL = 'https://hyxyablgkjtoxcxnurkk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5eHlhYmxna2p0b3hjeG51cmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODE5NjksImV4cCI6MjA4NDc1Nzk2OX0._3HQYSymZ2ArXIN143gAiwulCL1yt7i5fiHaTd4bp5U';

let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

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
let hasShownWelcome = false;

// Инициализация
async function init() {
    let user;
    
    if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) {
        const urlParams = new URLSearchParams(window.location.search);
        const testMode = urlParams.get('test');
        
        user = testMode === 'admin' ? {
            id: 999999999,
            first_name: 'Админ',
            last_name: 'Тестовый',
            username: 'test_admin',
            photo_url: null
        } : {
            id: 123456789,
            first_name: 'Тестовый',
            last_name: 'Пользователь',
            username: 'test_user',
            photo_url: null
        };
    } else {
        user = tg.initDataUnsafe.user;
    }

    currentUser = user;
    
    // Получаем данные пользователя из БД для отображения display_name
    const { data: userData } = await supabase
        .from('qr_auth_users')
        .select('display_name, gender, is_admin, is_worker')
        .eq('telegram_id', user.id)
        .single();
    
    const displayName = userData?.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Пользователь';
    document.getElementById('userName').textContent = displayName;
    
    const avatarEl = document.getElementById('userAvatar');
    if (user.photo_url) {
        avatarEl.innerHTML = `<img src="${user.photo_url}" alt="Avatar">`;
    } else {
        avatarEl.innerHTML = `<img src="svgg/user.svg" alt="User" style="width: 24px; height: 24px; opacity: 0.5;">`;
    }

    await registerUser(user);
    const isAdmin = userData?.is_admin || false;
    window.isWorker = userData?.is_worker || false;
    window.userGender = userData?.gender || 'M';

    if (isAdmin) {
        showAdminPanel();
    } else {
        showUserScreen();
    }
    
    // Устанавливаем сегодняшнюю дату для генератора
    setTimeout(setTodayDate, 100);
}

async function registerUser(user) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Пользователь';
    
    await supabase.from('qr_auth_users').upsert({
        telegram_id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: fullName
    }, { onConflict: 'telegram_id' });
}

async function checkAdmin(telegramId) {
    const { data } = await supabase
        .from('qr_auth_users')
        .select('is_admin, is_worker, gender')
        .eq('telegram_id', telegramId)
        .single();

    window.isWorker = data?.is_worker || false;
    window.userGender = data?.gender || 'M';
    return data?.is_admin || false;
}

function showUserScreen() {
    const roleText = window.isWorker ? 'Работник' : 'Пользователь';
    document.getElementById('userRole').textContent = roleText;
    
    const headerNav = document.getElementById('headerNav');
    
    if (window.isWorker) {
        headerNav.innerHTML = `
            <button class="nav-btn active" onclick="showUserTab('scan')">Сканировать</button>
            <button class="nav-btn" onclick="showUserTab('history')">Опоздания</button>
        `;
        showUserTab('scan');
    } else {
        // Для не-работников показываем только сообщение об ожидании
        headerNav.innerHTML = '';
        document.getElementById('scanTab').classList.add('active');
        const readerEl = document.getElementById('qr-reader');
        readerEl.innerHTML = `
            <div class="access-denied">
                <img src="svgg/block.svg" alt="Block" class="access-denied-icon-svg">
                <div class="access-denied-text">Вы не идентифицированы как работник, ожидайте выдачи разрешений администратором</div>
            </div>
        `;
    }
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
    
    // Показываем приветствие и НЕ переключаемся автоматически
    document.getElementById('adminWelcome').classList.remove('hidden');
    
    subscribeToAuthLogs();
}

function showUserTab(tab) {
    // Проверяем, является ли пользователь работником
    if (!window.isWorker) {
        return; // Не даем переключаться между вкладками
    }
    
    closeMenuOnSelect();
    document.querySelectorAll('.header-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    
    document.getElementById('scanTab').classList.remove('active');
    document.getElementById('historyTab').classList.remove('active');
    
    if (tab === 'scan') {
        document.getElementById('scanTab').classList.add('active');
        checkTodayAuth();
    } else if (tab === 'history') {
        document.getElementById('historyTab').classList.add('active');
        loadUserLateHistory();
    }
    
    if (tg) tg.HapticFeedback.impactOccurred('light');
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
            loadAuthLogs();
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

async function checkTodayAuth() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data } = await supabase
        .from('qr_auth_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('auth_time', today.toISOString())
        .limit(1);
    
    if (data && data.length > 0) {
        const readerEl = document.getElementById('qr-reader');
        readerEl.innerHTML = `
            <div class="success-day-message">
                <img src="svgg/success.svg" alt="Success" class="success-icon-svg">
                <div class="success-title">Успешная авторизация!</div>
                <div class="success-text">Хорошего рабочего дня!</div>
            </div>
        `;
    } else {
        startQRScanner();
    }
}

function startQRScanner() {
    if (!window.isWorker) {
        const readerEl = document.getElementById('qr-reader');
        readerEl.innerHTML = `
            <div class="access-denied">
                <img src="svgg/block.svg" alt="Block" class="access-denied-icon-svg">
                <div class="access-denied-text">Вы не идентифицированы как работник, ожидайте выдачи разрешений администратором</div>
            </div>
        `;
        return;
    }
    
    if (html5QrCode) return;
    
    // Проверяем доступность библиотеки (может быть Html5Qrcode или Html5QrcodeScanner)
    const QrCodeLib = window.Html5Qrcode || window.Html5QrcodeScanner;
    if (!QrCodeLib) {
        console.error('Html5Qrcode library not loaded. Available:', Object.keys(window).filter(k => k.includes('Html5')));
        showResultMessage('Ошибка загрузки сканера', 'error');
        return;
    }
    
    try {
        html5QrCode = new Html5Qrcode("qr-reader");
        
        html5QrCode.start(
            { facingMode: "environment" },
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            onScanSuccess,
            (errorMessage) => {
                // Игнорируем ошибки сканирования (когда QR не найден)
            }
        ).catch(err => {
            console.error('Camera error:', err);
            showResultMessage('Не удалось запустить камеру: ' + err, 'error');
        });
    } catch (err) {
        console.error('Scanner initialization error:', err);
        showResultMessage('Ошибка инициализации сканера: ' + err, 'error');
    }
}

async function onScanSuccess(decodedText) {
    console.log('QR Scanned:', decodedText);
    
    // Останавливаем сканер сразу
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
        } catch (e) {
            console.error('Error stopping scanner:', e);
        }
        html5QrCode = null;
    }
    
    // Проверяем формат QR - принимаем оба варианта
    if (!decodedText.startsWith('QR_AUTH_')) {
        showResultMessage('❌ Неверный QR-код', 'error');
        if (tg) tg.HapticFeedback.notificationOccurred('error');
        setTimeout(() => {
            hideResultMessage();
            startQRScanner();
        }, 2000);
        return;
    }

    await sendAuthLog(decodedText);
}

async function sendAuthLog(qrCode) {
    const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() 
        || currentUser.username || 'Пользователь';

    const { error } = await supabase.from('qr_auth_logs').insert({
        user_id: currentUser.id,
        full_name: fullName,
        qr_code: qrCode,
        auth_time: new Date().toISOString()
    });

    if (error) {
        showResultMessage('Ошибка авторизации', 'error');
        if (tg) tg.HapticFeedback.notificationOccurred('error');
        setTimeout(() => {
            hideResultMessage();
            startQRScanner();
        }, 2000);
    } else {
        // Показываем успешное сообщение на весь день
        const readerEl = document.getElementById('qr-reader');
        readerEl.innerHTML = `
            <div class="success-day-message">
                <img src="svgg/success.svg" alt="Success" class="success-icon-svg">
                <div class="success-title">Успешная авторизация!</div>
                <div class="success-text">Хорошего рабочего дня!</div>
            </div>
        `;
        if (tg) tg.HapticFeedback.notificationOccurred('success');
    }
}

// История опозданий работника
async function loadUserLateHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '<p class="loading">Загрузка...</p>';

    if (!currentUser) {
        historyList.innerHTML = '<div class="empty-state">Нет данных</div>';
        return;
    }

    let dateFilter = new Date();
    if (currentFilter === 'week') {
        dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (currentFilter === 'month') {
        dateFilter.setMonth(dateFilter.getMonth() - 1);
    } else {
        dateFilter = null;
    }

    let query = supabase
        .from('qr_auth_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('auth_time', { ascending: false });

    if (dateFilter) {
        query = query.gte('auth_time', dateFilter.toISOString());
    }

    const { data } = await query.limit(50);

    if (!data || data.length === 0) {
        const periodText = currentFilter === 'week' ? 'на этой неделе' : 'в этом месяце';
        historyList.innerHTML = `<div class="empty-state"><img src="svgg/alarm.svg" alt="No late" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 15px;"><br>${periodText.charAt(0).toUpperCase() + periodText.slice(1)} еще не было опозданий, так держать!</div>`;
        return;
    }

    renderLateHistory(data);
}

function renderLateHistory(logs) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    const WORK_START_HOUR = 8;
    const WORK_START_MINUTE = 0;
    
    const lateEntries = logs.filter(log => {
        const authTime = new Date(log.auth_time);
        const hour = authTime.getHours();
        const minute = authTime.getMinutes();
        
        // Опоздание если после 8:00
        return hour > WORK_START_HOUR || (hour === WORK_START_HOUR && minute > WORK_START_MINUTE);
    });
    
    if (lateEntries.length === 0) {
        const periodText = currentFilter === 'week' ? 'на этой неделе' : 'в этом месяце';
        historyList.innerHTML = `<div class="empty-state"><img src="svgg/alarm.svg" alt="No late" style="width: 48px; height: 48px; opacity: 0.3; margin-bottom: 15px;"><br>${periodText.charAt(0).toUpperCase() + periodText.slice(1)} не было опозданий, так держать!</div>`;
        return;
    }

    lateEntries.forEach((log, index) => {
        const item = document.createElement('div');
        item.className = 'history-item late';
        
        const authTime = new Date(log.auth_time);
        const dateStr = authTime.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'long'
        });
        const timeStr = authTime.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const genderText = window.userGender === 'F' ? 'Пришла' : 'Пришел';

        item.innerHTML = `
            <div class="history-item-info">
                <div class="history-item-date">${dateStr}</div>
                <div class="history-item-time">${genderText} в ${timeStr}</div>
            </div>
            <div class="history-item-late">${index + 1}</div>
        `;

        historyList.appendChild(item);
    });
}

function filterHistory(period) {
    currentFilter = period;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    loadUserLateHistory();
    if (tg) tg.HapticFeedback.impactOccurred('light');
}

// Админ: Логи
let currentDayView = 'today';

function switchLogSubmenu(view) {
    currentLogView = view;
    
    // Обновляем заголовок
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

async function loadAuthLogs() {
    switchLogSubmenu('attendance');
}

async function loadAttendanceLogs() {
    const authList = document.getElementById('attendanceList');
    
    if (currentDayView === 'today') {
        authList.innerHTML = '<p class="loading">Загрузка...</p>';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data } = await supabase
            .from('qr_auth_logs')
            .select('*')
            .gte('auth_time', today.toISOString())
            .order('auth_time', { ascending: false });

        if (!data || data.length === 0) {
            authList.innerHTML = '<div class="empty-state">Сегодня еще никто не отметился</div>';
            return;
        }

        renderTodayAttendance(data);
    } else {
        // Показываем список дней
        authList.innerHTML = '<p class="loading">Загрузка...</p>';
        
        const { data } = await supabase
            .from('qr_auth_logs')
            .select('*')
            .order('auth_time', { ascending: false })
            .limit(500);

        if (!data || data.length === 0) {
            authList.innerHTML = '<div class="empty-state">Нет данных</div>';
            return;
        }

        renderDaysList(data);
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
    
    // Группируем по датам
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
    
    // Отрисовываем дни
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
async function loadLateLogs() {
    const lateList = document.getElementById('lateList');
    lateList.innerHTML = '<p class="loading">Загрузка...</p>';
    
    let dateFilter = new Date();
    if (currentLateFilter === 'week') {
        dateFilter.setDate(dateFilter.getDate() - 7);
    } else {
        dateFilter.setMonth(dateFilter.getMonth() - 1);
    }
    
    const { data } = await supabase
        .from('qr_auth_logs')
        .select('*')
        .gte('auth_time', dateFilter.toISOString())
        .order('auth_time', { ascending: false });

    if (!data || data.length === 0) {
        lateList.innerHTML = '<div class="empty-state">Нет данных</div>';
        return;
    }
    
    // Подсчитываем опоздания по пользователям
    const WORK_START_HOUR = 8;
    const WORK_START_MINUTE = 0;
    
    const lateByUser = {};
    
    data.forEach(log => {
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
        lateList.innerHTML = '<div class="empty-state"><img src="svgg/party.svg" alt="Party" style="width: 48px; height: 48px; margin-bottom: 15px;"><br>Опозданий нет!</div>';
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
        
        // Стандартные цвета: черный код на белом фоне (для лучшего сканирования)
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

// Установить сегодняшнюю дату по умолчанию
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

// Управление пользователями (только назначение работником)
async function loadUsers() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '<p class="loading">Загрузка...</p>';

    const { data } = await supabase
        .from('qr_auth_users')
        .select('*')
        .eq('is_worker', false)
        .eq('is_admin', false)
        .order('created_at', { ascending: false, nullsFirst: false });

    if (!data || data.length === 0) {
        usersList.innerHTML = '<div class="empty-state">Нет новых пользователей</div>';
        return;
    }

    renderUsersList(data);
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

async function makeWorker(telegramId) {
    const { error } = await supabase
        .from('qr_auth_users')
        .update({ is_worker: true })
        .eq('telegram_id', telegramId);

    if (error) {
        if (tg) tg.showAlert('Ошибка обновления');
        else alert('Ошибка обновления');
        return;
    }
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    loadUsers();
}

// Управление работниками (редактирование + отнять статус)
async function loadWorkers() {
    const workersList = document.getElementById('workersList');
    workersList.innerHTML = '<p class="loading">Загрузка...</p>';

    const { data } = await supabase
        .from('qr_auth_users')
        .select('*')
        .eq('is_worker', true)
        .order('full_name', { ascending: true });

    if (!data || data.length === 0) {
        workersList.innerHTML = '<div class="empty-state">Нет работников</div>';
        return;
    }

    renderWorkersList(data);
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

async function saveWorkerEdit(telegramId) {
    const item = event.target.closest('.user-item');
    const displayName = document.getElementById(`editName_${telegramId}`).value.trim();
    const gender = item.dataset.selectedGender || 'M';
    
    if (!displayName) {
        if (tg) tg.showAlert('Введите имя');
        else alert('Введите имя');
        return;
    }
    
    const { error } = await supabase
        .from('qr_auth_users')
        .update({ 
            display_name: displayName,
            gender: gender
        })
        .eq('telegram_id', telegramId);

    if (error) {
        if (tg) tg.showAlert('Ошибка обновления');
        else alert('Ошибка обновления');
        return;
    }
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    loadWorkers();
}

async function removeWorkerStatus(telegramId) {
    const { error } = await supabase
        .from('qr_auth_users')
        .update({ is_worker: false })
        .eq('telegram_id', telegramId);

    if (error) {
        if (tg) tg.showAlert('Ошибка обновления');
        else alert('Ошибка обновления');
        return;
    }
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    loadWorkers();
}

async function deleteUser(telegramId, fullName) {
    // Простое подтверждение без использования неподдерживаемых методов
    const confirmed = confirm(`Удалить пользователя "${fullName}"?\n\nЭто действие нельзя отменить.`);
    
    if (confirmed) {
        await performDeleteUser(telegramId);
    }
}

async function performDeleteUser(telegramId) {
    try {
        // Удаляем логи пользователя
        const { error: logsError } = await supabase
            .from('qr_auth_logs')
            .delete()
            .eq('user_id', telegramId);
        
        if (logsError) {
            console.error('Error deleting logs:', logsError);
            throw logsError;
        }
        
        // Удаляем пользователя
        const { error: userError } = await supabase
            .from('qr_auth_users')
            .delete()
            .eq('telegram_id', telegramId);

        if (userError) {
            console.error('Error deleting user:', userError);
            throw userError;
        }
        
        if (tg) tg.HapticFeedback.notificationOccurred('success');
        
        // Небольшая задержка перед обновлением списка
        setTimeout(() => {
            loadUsers();
        }, 300);
    } catch (error) {
        console.error('Delete error:', error);
        if (tg) tg.showAlert('Ошибка удаления: ' + error.message);
        else alert('Ошибка удаления: ' + error.message);
    }
}

async function toggleWorkerStatus(telegramId, currentStatus) {
    const newStatus = !currentStatus;

    const { error } = await supabase
        .from('qr_auth_users')
        .update({ is_worker: newStatus })
        .eq('telegram_id', telegramId);

    if (error) {
        if (tg) tg.showAlert('Ошибка обновления');
        else alert('Ошибка обновления');
        return;
    }
    
    if (tg) tg.HapticFeedback.notificationOccurred('success');
    loadUsers();
}

function subscribeToAuthLogs() {
    supabase
        .channel('qr_auth_logs_channel')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'qr_auth_logs' },
            () => {
                if (tg) tg.HapticFeedback.notificationOccurred('success');
                if (currentLogView === 'attendance') loadAttendanceLogs();
                else loadLateLogs();
            }
        )
        .subscribe();
}

function showResultMessage(message, type) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.textContent = message;
    resultDiv.className = `result-message ${type}`;
}

function hideResultMessage() {
    document.getElementById('scanResult').className = 'result-message hidden';
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

// Закрываем меню при выборе пункта
function closeMenuOnSelect() {
    if (window.innerWidth <= 768) {
        const nav = document.getElementById('headerNav');
        const btn = document.getElementById('mobileMenuBtn');
        nav.classList.remove('active');
        btn.classList.remove('active');
    }
}
