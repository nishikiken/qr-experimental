# Changelog - Experimental Version

## Дата: 06.04.2026

### Основные изменения

#### 1. Удалена интеграция с Supabase
- ❌ Убраны все вызовы Supabase API
- ✅ Добавлены mock данные
- ✅ Данные сохраняются в localStorage
- ✅ Полная функциональность без бэкенда

#### 2. Mock данные
```javascript
// 3 пользователя
mockUsers = [
  { telegram_id: 1, full_name: 'Иван Петров', ... },
  { telegram_id: 2, full_name: 'Мария Сидорова', ... },
  { telegram_id: 3, full_name: 'Алексей Иванов', ... }
]

// 3 работника
mockWorkers = [
  { telegram_id: 10, display_name: 'Анна', gender: 'F', ... },
  { telegram_id: 11, display_name: 'Дмитрий', gender: 'M', ... },
  { telegram_id: 12, display_name: 'Лена', gender: 'F', ... }
]

// 7 логов за 3 дня
mockLogs = [...]
```

#### 3. UI Анимации

##### Добавлены keyframes:
- `fadeIn` - плавное появление (opacity + translateY)
- `slideIn` - появление сбоку (opacity + translateX)
- `pulse` - пульсация (scale)
- `shimmer` - блестящий эффект

##### Применены к элементам:
- `.app-header` - fadeIn 0.5s
- `.scan-card` - fadeIn 0.5s + hover трансформация
- `.history-item` - slideIn 0.3s + hover эффект
- `.auth-item` - fadeIn 0.4s + hover эффект
- `.user-item` - fadeIn 0.4s + hover подъем
- `.loading` - pulse infinite
- `.success-day-message` - fadeIn 0.6s
- `.success-icon` - pulse 2s infinite

#### 4. Градиенты

##### CSS переменные:
```css
--gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
--gradient-3: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
```

##### Применение:
- `body` - радиальные градиенты на фоне
- `.btn-primary` - градиентный фон + shimmer эффект
- `.success-day-message` - градиентный фон

#### 5. Улучшенные тени и свечение

##### Тени:
- `.app-header` - `box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3)`
- `.scan-card` - `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3)`
- `.generate-card` - `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3)`

##### Hover свечение:
- `.nav-btn:hover` - `box-shadow: 0 4px 12px rgba(79, 143, 247, 0.2)`
- `.nav-btn.active` - `box-shadow: 0 0 20px rgba(79, 143, 247, 0.3)`
- `.btn-primary:hover` - `box-shadow: 0 8px 24px rgba(79, 143, 247, 0.3)`

#### 6. Hover эффекты

##### Трансформации:
- `.nav-btn:hover` - `translateY(-2px)` + shimmer
- `.scan-card:hover` - `translateY(-4px)`
- `.history-item:hover` - `translateX(4px)`
- `.auth-item:hover` - `translateX(4px)`
- `.user-item:hover` - `translateY(-2px)`
- `.filter-btn:hover` - `translateY(-2px)`
- `.btn-primary:hover` - `translateY(-2px)`

##### Дополнительные эффекты:
- `.filter-btn::after` - анимированная нижняя линия
- `.nav-btn::before` - shimmer эффект
- `.btn-primary::before` - shimmer эффект

#### 7. Transitions

Все интерактивные элементы используют:
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

Это создает плавные, естественные переходы.

#### 8. Упрощен HTML

Удалены зависимости:
- ❌ `telegram-web-app.js` (опционально)
- ❌ `html5-qrcode` (не нужен для админа)
- ❌ `supabase-js`
- ✅ Оставлен только `qrcode.js` для генерации

#### 9. Функциональность

Все функции работают:
- ✅ Просмотр отметок (сегодня/все дни)
- ✅ Просмотр опозданий (неделя/месяц)
- ✅ Управление пользователями (назначить/удалить)
- ✅ Управление работниками (редактировать/отнять статус)
- ✅ Генерация QR кодов
- ✅ Сохранение в localStorage

### Файлы

#### Изменены:
- `app.js` - полностью переписан с mock данными
- `style.css` - добавлены анимации, градиенты, эффекты
- `index.html` - удалены лишние зависимости

#### Добавлены:
- `README_EXPERIMENTAL.md` - описание экспериментальной версии
- `TEST_INSTRUCTIONS.md` - инструкция по тестированию
- `CHANGES_LOG.md` - этот файл

#### Не изменены:
- `svgg/*.svg` - все иконки остались
- `test_scanner.html` - тестовый файл

### Размер изменений

- `app.js`: ~1100 строк → ~700 строк (упрощение)
- `style.css`: ~1200 строк → ~1300 строк (+100 строк анимаций)
- `index.html`: минимальные изменения

### Производительность

Все анимации используют:
- `transform` (GPU ускорение)
- `opacity` (GPU ускорение)
- `cubic-bezier` для плавности
- Нет layout thrashing

### Совместимость

Работает в:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Мобильные браузеры

### Следующие шаги

Можно добавить:
- [ ] Particle эффекты на фоне
- [ ] Более сложные анимации переходов
- [ ] Темы (светлая/темная)
- [ ] Звуковые эффекты
- [ ] Больше градиентов
- [ ] Кастомные курсоры
- [ ] Parallax эффекты
