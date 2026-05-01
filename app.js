// Инициализируем SDK Телеграма
window.Telegram.WebApp.ready();

// Просим Телеграм раскрыть Mini App на весь доступный экран
window.Telegram.WebApp.expand();

// Получаем объект пользователя
const user = window.Telegram.WebApp.initDataUnsafe.user;

// Настраиваем Header (телефонную строку состояния) под тему
window.Telegram.WebApp.setHeaderColor('bg_color');

// Подставляем инициалы пользователя
const initialsSpan = document.getElementById('profile-initials');
if (user && user.first_name) {
    initialsSpan.textContent = user.first_name.charAt(0).toUpperCase();
} else {
    initialsSpan.textContent = 'G'; // Placeholder
}

// Простой эффект вибрации при нажатии кнопок
function addImpact() {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
}

// Примеры обработки событий
const mainBtn = document.querySelector('.main-cta-button');
mainBtn.addEventListener('click', () => {
    addImpact();
    window.Telegram.WebApp.showAlert('Починаємо навчання! (Вайб активувався)');
});

const gridItems = document.querySelectorAll('.grid-item');
gridItems.forEach(item => {
    item.addEventListener('click', () => {
        addImpact();
        const section = item.getAttribute('data-section');
        window.Telegram.WebApp.showAlert(`Ви вибрали: ${item.querySelector('.item-title').textContent}`);
    });
});