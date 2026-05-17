// ==========================================
// ИНИЦИАЛИЗАЦИЯ И ЛОГИКА (ПОЛНАЯ ВЕРСИЯ С СЕРВЕРОМ)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // --- Настройка Telegram WebApp ---
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const tgUser = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
    const userId = tgUser ? tgUser.id : null; 
    const FREE_ANSWERS_LIMIT = 10;
    let isUserPro = false;
    const PRO_TOPICS = ["topic_8", "topic_8.2", "topic_16.2", "topic_33.1", "topic_33.2", "topic_33.3", "topic_33.4", "topic_33.5"];

    // 1. БЛОКИРОВКА ПОЗА TELEGRAM
    if (!tgUser && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        document.getElementById('not-tg-blocker').classList.add('active');
        document.getElementById('app-container').style.display = 'none';
        return; 
    }

    // --- ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ НА СЕРВЕРЕ ---
    if (tgUser) {
        fetch('https://pdrua.duckdns.org/init-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: tgUser.id,
                username: tgUser.username || null,
                first_name: tgUser.first_name || null,
                last_name: tgUser.last_name || null,
                language_code: tgUser.language_code || null,
                is_premium: tgUser.is_premium || false
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.is_pro) {
                isUserPro = true;
            }
        })
        .catch(err => console.error("Помилка ініціалізації користувача:", err));
    }

    // --- ПРЕДЗАГРУЗКА РАЗДЕЛОВ В ФОНЕ ---
    // Начинаем грузить данные сразу при открытии мини-аппа и сохраняем этот процесс
    let topicsPromise = fetch('https://pdrua.duckdns.org/api/topics')
        .then(res => res.json())
        .catch(err => console.error("Помилка завантаження розділів:", err));
        
    topicsPromise.then(data => { 
        if (data && data.length > 0) globalTopics = data; 
    });

    // 2. АВАТАРКА
    const avatarContainer = document.getElementById('user-avatar-container');
    const avatarImg = document.getElementById('user-avatar-img');
    
    if (tgUser && avatarContainer) {
        avatarContainer.style.display = 'flex';
        if (tgUser.photo_url) {
            avatarImg.src = tgUser.photo_url;
            avatarImg.style.display = 'block';
        } else {
            avatarImg.style.display = 'none';
            avatarContainer.innerHTML = tgUser.first_name ? tgUser.first_name.charAt(0).toUpperCase() : '👤';
        }
    } else if (avatarContainer) {
        avatarContainer.style.display = 'flex';
        avatarImg.style.display = 'none';
        avatarContainer.innerHTML = '👤';
    }

    // Основные переменные интерфейса
    const btnStart = document.getElementById('btn-start-learning');
    const btnBackHome = document.getElementById('btn-back-home');
    const homeScreen = document.getElementById('home-screen');
    const topicsScreen = document.getElementById('topics-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const examScreen = document.getElementById('exam-screen');
    
    // Состояние теста и глобальные переменные
    let currentTopic = null; 
    let currentQuestions =[];
    let currentQuestionIndex = 0;
    let currentScreenName = 'home';
    let questionStates =[]; 
    let isLoadingQuestions = false; // Флаг загрузки вопросов
    let noMoreQuestionsOnServer = false; // Флаг, если вопросы в базе закончились

    // Резервная копия разделов для моментальной загрузки
    let globalTopics =[]; // Никаких заготовок, только пустой массив

    // 3. ЛОГИКА ПОДПИСКИ
    let totalAnswersGiven = parseInt(localStorage.getItem('pdr_answers_count') || '0');
    let isUserVerified = (totalAnswersGiven < FREE_ANSWERS_LIMIT); 
    let isCheckingNow = false;

    // --- Настройки Telegram UI ---
    if (tg) {
        try { tg.ready(); } catch(e) {}
        try { tg.expand(); } catch(e) {}
        
        if (typeof tg.setHeaderColor === 'function') {
            try { tg.setHeaderColor('bg_color'); } catch(e) {}
        }

        window.addImpact = function() {
            if (tg.HapticFeedback && typeof tg.HapticFeedback.impactOccurred === 'function') {
                try { tg.HapticFeedback.impactOccurred('medium'); } catch(e) {}
            }
        };

        function applySmartPadding() {
            if (window.innerWidth <= 768) {
                const appContainer = document.getElementById('app-container');
                const screenDiff = window.screen.height - window.innerHeight;
                if (screenDiff < 130) {
                    appContainer.style.paddingTop = '75px'; 
                } else {
                    appContainer.style.paddingTop = '16px'; 
                }
            }
        }
        applySmartPadding();
        window.addEventListener('resize', applySmartPadding);

        if (tg.BackButton) {
            try { tg.BackButton.onClick(() => goBack()); } catch(e) {}
        }
    } else {
        window.addImpact = function() {}; 
    }

    // --- Переключение тем ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const cyberToggleBtn = document.getElementById('cyber-toggle'); // Новая кнопка
    const themeIcon = document.getElementById('theme-icon');

    const iconMoon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    const iconSun = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

    // Восстановление темы при загрузке
    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem('app_theme', (err, savedTheme) => {
            if (!err && savedTheme) {
                document.body.classList.remove('light-theme', 'cyber-theme');
                if (savedTheme === 'light') {
                    document.body.classList.add('light-theme');
                    themeIcon.innerHTML = iconMoon; 
                } else if (savedTheme === 'cyber') {
                    document.body.classList.add('cyber-theme');
                    themeIcon.innerHTML = iconSun; 
                } else {
                    themeIcon.innerHTML = iconSun; 
                }
            }
        });
    }

    // --- УНІВЕРСАЛЬНА КАСТОМНА МОДАЛКА ПІДТВЕРДЖЕННЯ ---
    let confirmCallback = null;

    function showCustomConfirm(options) {
        const iconContainer = document.getElementById('confirm-icon-container');
        iconContainer.innerHTML = options.icon;
        iconContainer.style.color = options.color;
        iconContainer.style.background = options.bgColor;
        
        document.getElementById('confirm-title').innerText = options.title;
        document.getElementById('confirm-desc').innerText = options.desc;
        
        const okBtn = document.getElementById('btn-confirm-ok');
        okBtn.innerText = options.okText || 'ОК';
        
        // Якщо це небезпечна дія (видалення, переривання), робимо кнопку червоною
        if (options.isDanger) {
            okBtn.style.background = 'var(--c-danger)';
            okBtn.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.3)';
        } else {
            okBtn.style.background = ''; // Повертаємо стандартний градієнт
            okBtn.style.boxShadow = '';
        }

        confirmCallback = options.onConfirm;
        document.getElementById('custom-confirm-modal').classList.add('active');
    }

    document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
        addImpact();
        document.getElementById('custom-confirm-modal').classList.remove('active');
        confirmCallback = null;
    });

    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
        addImpact();
        document.getElementById('custom-confirm-modal').classList.remove('active');
        if (confirmCallback) confirmCallback();
    });

    // Логика кнопки Киберпанк
    if (cyberToggleBtn) {
        cyberToggleBtn.addEventListener('click', () => {
            addImpact();
            const isCyber = document.body.classList.contains('cyber-theme');
            
            document.body.classList.remove('light-theme'); // Выключаем светлую в любом случае
            themeIcon.innerHTML = iconSun; // Возвращаем иконку солнца для базовой темной

            if (isCyber) {
                document.body.classList.remove('cyber-theme'); // Возврат к обычной темной
                if (tg && tg.CloudStorage) tg.CloudStorage.setItem('app_theme', 'dark');
            } else {
                document.body.classList.add('cyber-theme'); // Включаем киберпанк
                if (tg && tg.CloudStorage) tg.CloudStorage.setItem('app_theme', 'cyber');
            }
        });
    }

    // Логика обычной кнопки (Светлая/Темная)
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            addImpact();
            document.body.classList.remove('cyber-theme'); // При клике сюда киберпанк всегда выключается
            
            document.body.classList.toggle('light-theme');
            const isLightNow = document.body.classList.contains('light-theme');
            themeIcon.innerHTML = isLightNow ? iconMoon : iconSun;

            if (tg && tg.CloudStorage) {
                tg.CloudStorage.setItem('app_theme', isLightNow ? 'light' : 'dark');
            }
        });
    }

    // --- Фоновая проверка подписки ---
    async function runSilentVerification() {
        if (!userId || isCheckingNow) return; 
        isCheckingNow = true;

        try {
            const response = await fetch(`https://pdrua.duckdns.org/check-sub?user_id=${userId}`);
            const data = await response.json();
            isUserVerified = (data.is_subscribed === true);
        } catch (error) {
            console.error("Помилка бэкенда:", error);
            isUserVerified = true; 
        } finally {
            isCheckingNow = false;
        }
    }

    const subModal = document.getElementById('sub-modal');
    const btnCheckSub = document.getElementById('btn-check-sub');
    if (btnCheckSub) {
        btnCheckSub.addEventListener('click', async () => {
            addImpact();
            btnCheckSub.innerText = "Перевіряю...";
            btnCheckSub.disabled = true;

            await runSilentVerification();

            if (isUserVerified) {
                subModal.classList.remove('active'); 
            } else {
                if(tg && tg.showAlert) tg.showAlert("Ви ще не підписані! Перейдіть за посиланням та підпишіться.");
                else alert("Ви ще не підписані!");
            }

            btnCheckSub.innerText = "Я підписався! Перевірити";
            btnCheckSub.disabled = false;
        });
    }

    // --- НОВИЙ КОД: Запускаємо тиху перевірку відразу при старті додатку ---
    if (totalAnswersGiven >= FREE_ANSWERS_LIMIT && !isUserVerified) {
        setTimeout(runSilentVerification, 100); // Запускаємо майже миттєво у фоні
    }

    // --- SPA Навигация ---
    function showScreen(screenToShow, screenName) {
        homeScreen.classList.remove('active');
        topicsScreen.classList.remove('active');
        quizScreen.classList.remove('active');
        if (examScreen) examScreen.classList.remove('active'); // <--- ДОДАЙ ЦЕЙ РЯДОК

        screenToShow.classList.add('active');
        window.scrollTo(0, 0);

        currentScreenName = screenName;

        // --- НОВЕ: Керування нижньою панеллю ---
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) {
            if (screenName === 'home') {
                bottomNav.style.display = 'none'; // Ховаємо на головній
            } else {
                bottomNav.style.display = 'flex'; // Показуємо на всіх інших
            }
        }
        // ---------------------------------------

        if (tg && tg.BackButton) {
            try {
                if (currentScreenName === 'home') tg.BackButton.hide();
                else tg.BackButton.show();
            } catch(e){}
        }
    }

    function updateBottomNav(mode) {
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            if (item.getAttribute('data-mode') === mode) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    function goBack() {
        addImpact();
        
        const profileModal = document.getElementById('profile-modal');
        if (profileModal && profileModal.classList.contains('active')) {
            profileModal.classList.remove('active');
            if (tg && tg.BackButton) {
                if (currentScreenName === 'home') tg.BackButton.hide();
                else tg.BackButton.show();
            }
            return; 
        }

        if (currentScreenName === 'quiz') {
            // Перевіряємо, чи ми в режимі "Обране"
            if (currentTopic && currentTopic.id === 'favorites_mode') {
                renderFavoriteTopics(); // Повертаємось до списку обраних розділів
            } else {
                showScreen(topicsScreen, 'topics');
                renderTopics(); // Повертаємось до звичайних розділів
            }
        } else if (currentScreenName === 'topics' || currentScreenName === 'favorites_list') {
            showScreen(homeScreen, 'home'); // Зі списку розділів повертаємось на головну
        }
    }

    const quizTopicName = document.getElementById('quiz-topic-name');
    if (quizTopicName) quizTopicName.addEventListener('click', goBack);
    
    const btnBackFromQuiz = document.getElementById('btn-back-from-quiz');
    if (btnBackFromQuiz) btnBackFromQuiz.addEventListener('click', goBack);

    if (btnBackHome) {
        btnBackHome.addEventListener('click', () => {
            addImpact();
            showScreen(homeScreen, 'home');
        });
    }

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            addImpact();
            renderTopics();
            showScreen(topicsScreen, 'topics');
        });
    }

    const cardLearning = document.getElementById('card-learning');
    const cardExam = document.getElementById('card-exam');
    const cardHard = document.getElementById('card-hard');
    const cardFavorites = document.getElementById('card-favorites');

    // --- Кліки по нижній панелі навігації ---
    const navLearning = document.getElementById('nav-learning');
    const navExam = document.getElementById('nav-exam');
    const navHard = document.getElementById('nav-hard');
    const navFavorites = document.getElementById('nav-favorites');

    if (navLearning) {
        navLearning.addEventListener('click', (e) => {
            e.preventDefault();
            addImpact();
            renderTopics();
            showScreen(topicsScreen, 'topics');
        });
    }

    if (navHard) {
        navHard.addEventListener('click', async (e) => {
            e.preventDefault();
            addImpact();
            if (globalTopics.length === 0) {
                if(topicsPromise) globalTopics = await topicsPromise;
                else {
                    const res = await fetch('https://pdrua.duckdns.org/api/topics');
                    globalTopics = await res.json();
                }
            }
            startHardMode();
        });
    }

    if (navFavorites) {
        navFavorites.addEventListener('click', (e) => {
            e.preventDefault();
            addImpact();
            if (globalTopics.length === 0) return;
            renderFavoriteTopics();
        });
    }

    if (cardLearning) {
        cardLearning.addEventListener('click', () => {
            addImpact();
            renderTopics();
            showScreen(topicsScreen, 'topics');
        });
    }

    if (cardExam) {
        cardExam.addEventListener('click', () => {
            addImpact();
            startExamMode(); // Запускаем экзамен
        });
    }

    if (cardHard) {
        cardHard.addEventListener('click', async () => {
            addImpact();
            
            if (globalTopics.length === 0) {
                if(topicsPromise) globalTopics = await topicsPromise;
                else {
                    const res = await fetch('https://pdrua.duckdns.org/api/topics');
                    globalTopics = await res.json();
                }
            }
            
            startHardMode(); 
        });
    }

    if (cardFavorites) {
        cardFavorites.addEventListener('click', () => {
            addImpact();
            if (globalTopics.length === 0) return; // Чекаємо завантаження
            renderFavoriteTopics();
        });
    }

    const inactiveCategories = document.querySelectorAll('.category-btn.inactive');
    inactiveCategories.forEach(btn => {
        btn.addEventListener('click', () => {
            addImpact(); 
            const catName = btn.getAttribute('data-cat');
            const msg = `Категорія "${catName}" знаходиться в розробці! 🚧\n\nЗараз для вивчення доступна тільки категорія "B" (Легкові автомобілі).`;
            if(tg && tg.showAlert) tg.showAlert(msg);
            else alert(msg);
        });
    });

    const modernIcons = {
        // 1. Загальні положення (Книга)
        "topic_1": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`, 
        
        // 2. Обов'язки і права водіїв (Кермо)
        "topic_2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v10M12 22v-6M4.93 4.93l4.24 4.24M19.07 19.07l-4.24-4.24M19.07 4.93l-4.24 4.24M4.93 19.07l4.24-4.24"/></svg>`, 
        
        // 3. Спецсигнали (Маячок/Дзвінок)
        "topic_3": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M5.3 5.3l1.4 1.4M18.7 5.3l-1.4 1.4M12 22H7a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5h-5z"/></svg>`, 
        
        // 4. Пішоходи (Людина)
        "topic_4": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v7M9 18l3-4 3 4M8 11h8"/></svg>`, 
        
        // 5. Пасажири (Люди в авто)
        "topic_5": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, 
        
        // 6. Велосипедисти (Велосипед)
        "topic_6": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>`, 
        
        // 7. Гужовий транспорт (Колесо воза)
        "topic_7": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2v8M12 14v8M2 12h8M14 12h8M4.9 4.9l5.7 5.7M13.4 13.4l5.7 5.7M4.9 19.1l5.7-5.7M13.4 10.6l5.7-5.7"/></svg>`, 
        
        // 8. Регулювання дорожнього руху (Світлофор)
        "topic_8": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="17" r="2"/></svg>`,

        // 8.2. Регулювання дорожнього руху (Нерегульовані перехрестя / Регулювальник) - Кашкет
        "topic_8.2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h18"/><path d="M6 14v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3"/><circle cx="12" cy="10" r="2"/></svg>`,

        // 9. Попереджувальні сигнали (Знак оклику в трикутнику)
        "topic_9": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

        // 10. Початок руху та зміна напрямку (Стрілка маневру)
        "topic_10": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>`,

        // 11. Розташування ТЗ на дорозі (Смуги руху / Дорога в перспективі)
        "topic_11": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22L8 2"/><path d="M20 22L16 2"/><path d="M12 6v2"/><path d="M12 12v2"/><path d="M12 18v2"/></svg>`,

        // 12. Швидкість руху (Спідометр)
        "topic_12": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 12l3-3"/><path d="M19.4 15a9 9 0 1 0-14.8 0"/></svg>`,

        // 13. Дистанція, інтервал (Стрілки відстані)
        "topic_13": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12H2"/><path d="M18 8l4 4-4 4"/><path d="M6 8l-4 4 4 4"/></svg>`,

        // 14. Обгін (Стрілка випередження)
        "topic_14": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21V3"/><polyline points="4 7 8 3 12 7"/><path d="M16 21v-8a4 4 0 0 0-4-4"/><polyline points="9 12 12 9 15 12"/></svg>`,

        // 15. Зупинка і стоянка (Знак Паркування "P")
        "topic_15": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`,

        // 16. Проїзд перехресть (Перетин доріг)
        "topic_16.1": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12H3"/><path d="M12 21V3"/><path d="M16 8l-4-4-4 4"/><path d="M8 16l4 4 4-4"/></svg>`,

        // 16.2. Проїзд перехресть (Нерегульовані перехрестя) - Знак "Головна дорога"
        "topic_16.2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(45 12 12)"/><rect x="8.5" y="8.5" width="7" height="7" rx="1" transform="rotate(45 12 12)"/></svg>`,

        // 17. Переваги маршрутних ТЗ (Автобус)
        "topic_17": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 18v2"/><path d="M18 18v2"/><path d="M2 12h20"/><path d="M6 12v-2"/><path d="M10 12v-2"/><path d="M14 12v-2"/><path d="M18 12v-2"/></svg>`,

        // 18. Проїзд пішохідних переходів (Людина на зебрі)
        "topic_18": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M12 6v6"/><path d="M10 17l2-5 2 5"/><path d="M8 10h8"/><path d="M3 20h18"/><path d="M3 16h18"/></svg>`,

        // 19. Користування світловими приладами (Фара / Світло)
        "topic_19": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/></svg>`,

        // 20. Рух через залізничні переїзди (Потяг)
        "topic_20": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M8 17l-2 4"/><path d="M16 17l2 4"/><circle cx="8" cy="11" r="1"/><circle cx="16" cy="11" r="1"/><path d="M4 7h16"/></svg>`
    };

    // --- 4. ОТРИСОВКА РАЗДЕЛОВ (С СЕРВЕРА) ---
    async function renderTopics(filter = "") {
        const grid = document.getElementById('topics-grid');

        // Повертаємо стандартні заголовки та пошук
        const titleEl = document.querySelector('#topics-screen .section-title');
        const subEl = document.querySelector('#topics-screen .screen-subtitle');
        const searchContainer = document.getElementById('search-container-block');
        
        if (titleEl) titleEl.innerText = "Розділи навчання";
        if (subEl) subEl.innerText = "Оберіть тему для підготовки";
        if (searchContainer) searchContainer.style.display = 'flex';
        
        updateBottomNav('learning'); // Підсвічуємо вкладку "Навчання"

        if (!grid) return;
        
        if (globalTopics.length === 0) {
            grid.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; width: 100%;">
                    <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--c-border-soft)" stroke-width="3"></circle>
                        <path d="M12 2 A 10 10 0 0 1 22 12" fill="none" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"></path>
                    </svg>
                    <div style="color: var(--c-text-soft); font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 1.05rem; font-weight: 600; letter-spacing: 0.3px; opacity: 0.8;">
                        Завантаження розділів...
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
        
        try {
            if (globalTopics.length === 0) {
                if (topicsPromise) {
                    globalTopics = await topicsPromise;
                } else {
                    const response = await fetch('https://pdrua.duckdns.org/api/topics');
                    globalTopics = await response.json();
                }
            }
            
            grid.innerHTML = ""; 

            const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");

            const filtered = globalTopics.filter(t => 
                t.title.toLowerCase().includes(filter.toLowerCase())
            );

            filtered.forEach((topic, index) => {
                const totalQ = topic.totalQuestions || 0;
                const topicStates = allSavedStates[topic.id] ||[];
                
                let answeredCount = 0;
                let correctCount = 0;

                topicStates.forEach(state => {
                    if (state && state.selectedIndex !== null) {
                        answeredCount++;
                        if (state.isCorrect) correctCount++;
                    }
                });

                const progressPercent = totalQ > 0 ? Math.min(100, Math.round((answeredCount / totalQ) * 100)) : 0;
                const successRate = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
                const infoText = `${answeredCount}/${totalQ} &bull; ${successRate}% вірно`;
                const colorClass = `c${(index % 6) + 1}`;
                const iconHtml = modernIcons[topic.id] || `<span style="font-size: 1.5rem;">${topic.icon || "🚦"}</span>`;

                const isProTopic = PRO_TOPICS.includes(topic.id);
                const proBadgeHtml = (isProTopic && !isUserPro) 
                    ? `<div style="position:absolute; top:-8px; right:-8px; background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; font-size: 0.65rem; font-weight: 800; padding: 4px 8px; border-radius: 8px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.4); z-index: 2; letter-spacing: 0.5px;">PRO</div>` 
                    : '';

                const card = document.createElement('div');
                card.className = `topic-card ${colorClass}`;
                
                card.innerHTML = `
                    <div class="topic-header">
                        <div class="topic-icon-wrapper" style="position: relative;">
                            ${iconHtml}
                            ${proBadgeHtml}
                        </div>
                        <div class="topic-chevron">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="topic-title">${topic.title}</div>
                    <div class="topic-info">
                        <span>${infoText}</span>
                        <div class="topic-progress-bg">
                            <div class="topic-progress-fill" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                `;
                
                card.onclick = () => {
                    addImpact();
                    if (isProTopic && !isUserPro) {
                        showProModal(); // Вызовем окно покупки
                        return;
                    }
                    startQuiz(topic);
                };
                
                grid.appendChild(card);
            });

        } catch (error) {
            console.error("Помилка завантаження розділів:", error);
            grid.innerHTML = '<div style="text-align:center; color: var(--c-danger);">Помилка з\'єднання з сервером</div>';
        }
    }

    const searchInput = document.getElementById('topic-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderTopics(e.target.value));
    }

    // ==========================================
    // РЕЖИМ "ІСПИТ" (EXAM MODE)
    // ==========================================
    
    let examQuestions = [];
    let examState = {
        answers: new Array(20).fill(null), // Вибрані варіанти (індекси)
        saved: new Array(20).fill(false),  // Чи натиснув користувач "Зберегти"
        currentIndex: 0,
        endTime: null,
        timerInterval: null,
        isActive: false
    };

    const EXAM_DURATION_MS = 20 * 60 * 1000; // 20 хвилин

    // Прив'язка кнопок запуску іспиту
    if (navExam) {
        navExam.addEventListener('click', (e) => {
            e.preventDefault();
            addImpact();
            startExamMode(); // Запускаем экзамен
        });
    }
    
    if (cardExam) {
        cardExam.addEventListener('click', startExamMode);
    }

    async function startExamMode() {
        addImpact();
        
        if (totalAnswersGiven >= FREE_ANSWERS_LIMIT && !isUserVerified) {
            document.getElementById('sub-modal').classList.add('active');
            return;
        }

        showCustomConfirm({
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
            color: '#8B5CF6', // Фіолетовий
            bgColor: 'rgba(139, 92, 246, 0.15)',
            title: 'Розпочати іспит?',
            desc: 'У вас буде 20 хвилин на 20 питань. Допускається не більше 2 помилок.',
            okText: 'Розпочати',
            isDanger: false,
            onConfirm: () => initExam()
        });
    }

    async function initExam() {
        showScreen(examScreen, 'exam');
        document.getElementById('exam-question-text').innerText = "Формування білета...";
        document.getElementById('exam-options').innerHTML = "";
        document.getElementById('exam-image').parentElement.style.display = 'none';
        
        // Ховаємо нижню панель навігації
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';

        try {
            const response = await fetch('https://pdrua.duckdns.org/api/exam-questions');
            examQuestions = await response.json();
            
            if (!examQuestions || examQuestions.length === 0) throw new Error("Empty questions");

            // Скидаємо стан
            examState.answers = new Array(examQuestions.length).fill(null);
            examState.saved = new Array(examQuestions.length).fill(false);
            examState.currentIndex = 0;
            examState.isActive = true;
            
            // Встановлюємо час завершення
            examState.endTime = Date.now() + EXAM_DURATION_MS;
            localStorage.setItem('pdr_exam_end_time', examState.endTime); // Захист від згортання додатку

            startExamTimer();
            renderExamQuestion();

        } catch (error) {
            console.error("Помилка завантаження іспиту:", error);
            if(tg && tg.showAlert) tg.showAlert("Помилка сервера. Спробуйте пізніше.");
            goBack();
        }
    }

    function startExamTimer() {
        if (examState.timerInterval) clearInterval(examState.timerInterval);
        
        const timerEl = document.getElementById('exam-timer');
        
        examState.timerInterval = setInterval(() => {
            if (!examState.isActive) {
                clearInterval(examState.timerInterval);
                return;
            }

            const now = Date.now();
            const timeLeft = examState.endTime - now;

            if (timeLeft <= 0) {
                clearInterval(examState.timerInterval);
                timerEl.innerText = "00:00";
                finishExam(true); // true = час вийшов
                return;
            }

            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (timeLeft < 60000) { // Останні 60 секунд
                timerEl.classList.add('warning');
            } else {
                timerEl.classList.remove('warning');
            }
        }, 1000);
    }

    function renderExamNavBar() {
        const navBar = document.getElementById('exam-nav-bar');
        navBar.innerHTML = '';

        examQuestions.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.innerText = i + 1;
            
            if (i === examState.currentIndex) btn.classList.add('active');
            if (examState.saved[i]) btn.classList.add('saved'); // Жовтий колір
            
            btn.addEventListener('click', () => {
                addImpact();
                examState.currentIndex = i;
                renderExamQuestion();
            });
            
            navBar.appendChild(btn);
        });

        // Оновлюємо лічильник збережених
        const savedCount = examState.saved.filter(s => s).length;
        document.getElementById('exam-saved-count').innerText = savedCount;

        const activeBtn = navBar.querySelector('.active');
        if (activeBtn) {
            navBar.scrollTo({
                left: activeBtn.offsetLeft - (navBar.offsetWidth / 2) + (activeBtn.offsetWidth / 2),
                behavior: 'smooth'
            });
        }
    }

    function renderExamQuestion() {
        const q = examQuestions[examState.currentIndex];
        if (!q) return;

        renderExamNavBar();

        document.getElementById('exam-question-text').innerText = `${examState.currentIndex + 1}. ${q.text}`;
        
        const imgEl = document.getElementById('exam-image');
        if (q.image) {
            imgEl.src = q.image;
            imgEl.parentElement.style.display = 'block';
        } else {
            imgEl.src = '';
            imgEl.parentElement.style.display = 'none';
        }

        const optionsContainer = document.getElementById('exam-options');
        optionsContainer.innerHTML = '';

        q.options.forEach((optionText, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<span class="option-number">${index + 1}</span> <span>${optionText}</span>`;
            
            // Якщо варіант вибраний (навіть якщо ще не збережений)
            if (examState.answers[examState.currentIndex] === index) {
                btn.classList.add('selected');
            }
            
            btn.addEventListener('click', () => {
                addImpact();
                // Просто виділяємо, але не зберігаємо остаточно
                examState.answers[examState.currentIndex] = index;
                renderExamQuestion(); // Перемальовуємо, щоб оновити виділення
            });
            
            optionsContainer.appendChild(btn);
        });

        // Логіка кнопок "Зберегти" та "Наступне"
        const btnSave = document.getElementById('btn-exam-save');
        const btnNext = document.getElementById('btn-exam-next');

        // Кнопка збереження активна тільки якщо вибрано якийсь варіант
        btnSave.disabled = (examState.answers[examState.currentIndex] === null);
        
        if (examState.saved[examState.currentIndex]) {
            btnSave.innerText = "Оновити відповідь";
            btnSave.style.background = "var(--c-surface)";
            btnSave.style.color = "var(--c-text)";
        } else {
            btnSave.innerText = "Зберегти відповідь";
            btnSave.style.background = ""; // Повертаємо дефолтний градієнт
            btnSave.style.color = "";
        }

        btnSave.onclick = () => {
            addImpact();
            examState.saved[examState.currentIndex] = true;
            
            // --- НОВЕ: Додаємо в "Складні питання" якщо відповідь неправильна ---
            const q = examQuestions[examState.currentIndex];
            const selectedAns = examState.answers[examState.currentIndex];
            
            if (selectedAns !== q.correctIndex) {
                const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");
                if (!allSavedStates[q.topicId]) allSavedStates[q.topicId] = [];
                
                // Записуємо помилку. Вона автоматично з'явиться в розділі "Складні"
                allSavedStates[q.topicId][q.originalIndex] = { selectedIndex: selectedAns, isCorrect: false };
                localStorage.setItem('pdr_quiz_states', JSON.stringify(allSavedStates));
                
                // Зберігаємо в хмару
                if (typeof scheduleCloudSave === 'function') scheduleCloudSave(q.topicId);
            }
            // -------------------------------------------------------------------

            // Перевіряємо, чи всі питання збережені
            const allSaved = examState.saved.every(s => s === true);
            if (allSaved) {
                finishExam(false);
            } else {
                let nextUnsaved = examState.saved.findIndex((s, idx) => !s && idx > examState.currentIndex);
                if (nextUnsaved === -1) {
                    nextUnsaved = examState.saved.findIndex(s => !s);
                }
                if (nextUnsaved !== -1) {
                    examState.currentIndex = nextUnsaved;
                }
                renderExamQuestion();
            }
        };

        btnNext.onclick = () => {
            addImpact();
            if (examState.currentIndex < examQuestions.length - 1) {
                examState.currentIndex++;
                renderExamQuestion();
            }
        };
    }

    // Дострокове завершення
    document.getElementById('btn-exam-finish-early').addEventListener('click', () => {
        showCustomConfirm({
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
            color: '#EF4444', // Червоний
            bgColor: 'rgba(239, 68, 68, 0.15)',
            title: 'Завершити достроково?',
            desc: 'Ви впевнені, що хочете завершити іспит? Не всі відповіді збережені.',
            okText: 'Завершити',
            isDanger: true,
            onConfirm: () => finishExam(false)
        });
    });

    function finishExam(isTimeout = false) {
        examState.isActive = false;
        clearInterval(examState.timerInterval);
        localStorage.removeItem('pdr_exam_end_time');

        let correctCount = 0;
        let wrongCount = 0;
        let unansweredCount = 0;

        // --- НОВЕ: Формуємо список тем для повторення (тільки якщо іспит пройдено повністю) ---
        if (!isTimeout) {
            const weakTopicsSet = new Set();
            examQuestions.forEach((q, i) => {
                if (examState.answers[i] !== q.correctIndex) {
                    weakTopicsSet.add(q.topicId);
                }
            });
            // Зберігаємо унікальні ID тем, де були помилки
            localStorage.setItem('pdr_exam_weak_topics', JSON.stringify(Array.from(weakTopicsSet)));
        }
        // --------------------------------------------------------------------------------------

        examQuestions.forEach((q, i) => {
            if (!examState.saved[i] || examState.answers[i] === null) {
                unansweredCount++;
                wrongCount++; // Незбережена відповідь = помилка
            } else if (examState.answers[i] === q.correctIndex) {
                correctCount++;
            } else {
                wrongCount++;
            }
        });

        const isPassed = wrongCount <= 2;

        // Збереження статистики іспитів
        const examStats = JSON.parse(localStorage.getItem('pdr_exam_stats') || '{"total":0, "passed":0, "lastWrong":0}');
        examStats.total += 1;
        if (isPassed && !isTimeout) examStats.passed += 1;
        examStats.lastWrong = isTimeout ? 20 : wrongCount; // Якщо час вийшов, вважаємо що все погано
        localStorage.setItem('pdr_exam_stats', JSON.stringify(examStats));

        const modal = document.getElementById('exam-result-modal');
        const iconEl = document.getElementById('exam-result-icon');
        const titleEl = document.getElementById('exam-result-title');
        const descEl = document.getElementById('exam-result-desc');
        
        document.getElementById('exam-res-correct').innerText = correctCount;
        document.getElementById('exam-res-wrong').innerText = wrongCount;

        if (isTimeout) {
            iconEl.innerText = "⏱";
            titleEl.innerText = "Час вийшов!";
            titleEl.style.color = "var(--c-danger)";
            descEl.innerText = "Іспит не складено. Ви не встигли дати відповіді на всі питання.";
        } else if (isPassed) {
            iconEl.innerText = "🏆";
            titleEl.innerText = "Іспит складено!";
            titleEl.style.color = "var(--c-success)";
            descEl.innerText = "Вітаємо! Ви успішно пройшли тестування.";
            
            // Запускаємо конфетті, якщо є підтримка в ТГ
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            iconEl.innerText = "🛑";
            titleEl.innerText = "Іспит не складено";
            titleEl.style.color = "var(--c-danger)";
            descEl.innerText = `Ви допустили ${wrongCount} помилок. Допускається не більше 2.`;
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        }

        modal.classList.add('active');
    }

    document.getElementById('btn-exam-close-result').addEventListener('click', () => {
        document.getElementById('exam-result-modal').classList.remove('active');
        showScreen(homeScreen, 'home');
    });

    // --- МОДИФІКАЦІЯ ФУНКЦІЇ goBack() ---
    // Знайди свою існуючу функцію goBack() і додай туди перевірку на іспит:
    const originalGoBack = goBack;
    goBack = function() {
        if (currentScreenName === 'exam' && examState.isActive) {
            showCustomConfirm({
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
                color: '#F59E0B', // Оранжевий
                bgColor: 'rgba(245, 158, 11, 0.15)',
                title: 'Перервати іспит?',
                desc: 'Ваш прогрес буде втрачено, а іспит вважатиметься нескладеним.',
                okText: 'Перервати',
                isDanger: true,
                onConfirm: () => {
                    examState.isActive = false;
                    clearInterval(examState.timerInterval);
                    showScreen(homeScreen, 'home');
                }
            });
            return; 
        }
        
        // Виклик оригінальної логіки для інших екранів
        // (Тут просто встав код зі своєї старої функції goBack, або залиш як є, якщо використовуєш перевизначення)
        
        addImpact();
        const profileModal = document.getElementById('profile-modal');
        if (profileModal && profileModal.classList.contains('active')) {
            profileModal.classList.remove('active');
            if (tg && tg.BackButton) {
                if (currentScreenName === 'home') tg.BackButton.hide();
                else tg.BackButton.show();
            }
            return; 
        }

        if (currentScreenName === 'quiz') {
            if (currentTopic && currentTopic.id === 'favorites_mode') {
                renderFavoriteTopics();
            } else {
                showScreen(topicsScreen, 'topics');
                renderTopics();
            }
        } else if (currentScreenName === 'topics' || currentScreenName === 'favorites_list') {
            showScreen(homeScreen, 'home');
        }
    };

    // --- 5. ЛОГИКА ТЕСТА (LAZY LOADING) ---
    const CHUNK_SIZE = 25; 

    // --- РЕЖИМ "СКЛАДНІ ПИТАННЯ" (ВИРТУАЛЬНИЙ РОЗДІЛ) ---
    async function startHardMode() {
        updateBottomNav('hard'); // Підсвічуємо вкладку "Складні"
        
        let hardRefs = [];
        const savedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");

        globalTopics.forEach(topic => {
            const topicStates = savedStates[topic.id] ||[];
            topicStates.forEach((state, index) => {
                if (state && state.selectedIndex !== null && state.isCorrect === false) {
                    hardRefs.push({ topicId: topic.id, originalIndex: index });
                }
            });
        });

        if (hardRefs.length === 0) {
            const emptyIcon = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                    <div style="font-size: 3rem;">🎉</div>
                    <div style="line-height: 1.4; font-size: 1.15rem;">У вас немає складних питань!<br>Ви відповідаєте ідеально.</div>
                </div>
            `;
            showToast(emptyIcon);
            return;
        }

        currentTopic = {
            id: 'hard_mode',
            title: 'Складні питання',
            isVirtual: true,
            totalQuestions: hardRefs.length,
            refs: hardRefs 
        };

        currentQuestions = Array(hardRefs.length).fill(null); 
        questionStates = Array(hardRefs.length).fill(null).map(() => ({ selectedIndex: null, isCorrect: null }));
        currentQuestionIndex = 0;

        document.getElementById('quiz-topic-name').innerText = currentTopic.title;
        showScreen(quizScreen, 'quiz');
        renderQuestion();
    }

    // --- ЛОГІКА "ОБРАНЕ" ---
    
    // Отримуємо реальні координати питання (навіть якщо ми у віртуальному розділі)
    function getRealQuestionRef() {
        if (!currentTopic) return null;
        if (currentTopic.isVirtual) {
            return currentTopic.refs[currentQuestionIndex];
        }
        return { topicId: currentTopic.id, originalIndex: currentQuestionIndex };
    }

    // Оновлення візуалу кнопки закладки
    function updateBookmarkUI() {
        const btn = document.getElementById('btn-bookmark');
        if (!btn) return;
        
        const ref = getRealQuestionRef();
        if (!ref) return;

        const favs = JSON.parse(localStorage.getItem('pdr_favorites') || "{}");
        const isFav = favs[ref.topicId] && favs[ref.topicId].includes(ref.originalIndex);

        if (isFav) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    // Клік по закладці
    const btnBookmark = document.getElementById('btn-bookmark');
    if (btnBookmark) {
        btnBookmark.addEventListener('click', () => {
            addImpact();
            const ref = getRealQuestionRef();
            if (!ref) return;

            let favs = JSON.parse(localStorage.getItem('pdr_favorites') || "{}");
            if (!favs[ref.topicId]) favs[ref.topicId] =[];

            const indexInArray = favs[ref.topicId].indexOf(ref.originalIndex);
            
            if (indexInArray === -1) {
                // Додаємо
                favs[ref.topicId].push(ref.originalIndex);
                favs[ref.topicId].sort((a, b) => a - b); // Сортуємо по порядку
                btnBookmark.classList.add('active');
            } else {
                // Видаляємо
                favs[ref.topicId].splice(indexInArray, 1);
                if (favs[ref.topicId].length === 0) delete favs[ref.topicId];
                btnBookmark.classList.remove('active');
            }

            localStorage.setItem('pdr_favorites', JSON.stringify(favs));
            
            // Зберігаємо в хмару Telegram з дебаунсом (захист від спаму кліками)
            if (tg && tg.CloudStorage) {
                if (window.favCloudSaveTimeout) clearTimeout(window.favCloudSaveTimeout);
                window.favCloudSaveTimeout = setTimeout(() => {
                    tg.CloudStorage.setItem('pdr_favorites', JSON.stringify(favs));
                }, 1500); // Відправляємо в хмару тільки через 1.5 сек після останнього кліку
            }
        });
    }

    // Відмальовка екрану з розділами Обраного
    function renderFavoriteTopics() {
        const favs = JSON.parse(localStorage.getItem('pdr_favorites') || "{}");
        const favTopicIds = Object.keys(favs);

        if (favTopicIds.length === 0) {
            const emptyIcon = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                    <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(236, 72, 153, 0.12); display: flex; align-items: center; justify-content: center; color: #EC4899;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div style="line-height: 1.4; font-size: 1.15rem;">У вас поки немає<br>збережених питань</div>
                </div>
            `;
            showToast(emptyIcon);
            return;
        }

        const grid = document.getElementById('topics-grid');
        grid.innerHTML = ""; 
        
        // Змінюємо заголовки екрану
        document.querySelector('#topics-screen .section-title').innerText = "Ваші обрані питання";
        document.querySelector('#topics-screen .screen-subtitle').innerText = "Згруповані за розділами ПДР";
        
       // Ховаємо пошук, він тут не потрібен
       const searchContainer = document.getElementById('search-container-block');
       if(searchContainer) searchContainer.style.display = 'none';
       
       updateBottomNav('favorites'); // Підсвічуємо вкладку "Обрані"

        favTopicIds.forEach((topicId, index) => {
            const topic = globalTopics.find(t => t.id === topicId);
            if (!topic) return;

            const questionsCount = favs[topicId].length;
            const colorClass = `c${(index % 6) + 1}`;
            const iconHtml = modernIcons[topic.id] || `<span style="font-size: 1.5rem;">${topic.icon || "🔖"}</span>`;

            const isProTopic = PRO_TOPICS.includes(topic.id);
            const proBadgeHtml = (isProTopic && !isUserPro) 
                ? `<div style="position:absolute; top:-8px; right:-8px; background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; font-size: 0.65rem; font-weight: 800; padding: 4px 8px; border-radius: 8px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.4); z-index: 2; letter-spacing: 0.5px;">PRO</div>` 
                : '';

            const card = document.createElement('div');
            card.className = `topic-card ${colorClass}`;
            
            card.innerHTML = `
                <div class="topic-header">
                    <div class="topic-icon-wrapper" style="position: relative;">
                    ${iconHtml}
                    ${proBadgeHtml}
                </div>
                    <div class="topic-chevron">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </div>
                <div class="topic-title">${topic.title}</div>
                <div class="topic-info">
                    <span style="font-weight: 600;">Збережено питань: ${questionsCount}</span>
                </div>
            `;
            
            card.onclick = () => {
                addImpact();
                startFavoritesQuiz(topic, favs[topicId]);
            };
            
            grid.appendChild(card);
        });

        showScreen(topicsScreen, 'favorites_list');
    }

    // Запуск тесту по обраним питанням конкретного розділу
    function startFavoritesQuiz(originalTopic, questionIndexes) {
        let refs = questionIndexes.map(idx => ({ topicId: originalTopic.id, originalIndex: idx }));

        currentTopic = {
            id: 'favorites_mode',
            title: 'Обране: ' + originalTopic.title,
            isVirtual: true,
            totalQuestions: refs.length,
            refs: refs 
        };

        currentQuestions = Array(refs.length).fill(null); 
        // Для обраного ми не зберігаємо прогрес відповідей, просто даємо тренуватись
        questionStates = Array(refs.length).fill(null).map(() => ({ selectedIndex: null, isCorrect: null }));
        currentQuestionIndex = 0;

        document.getElementById('quiz-topic-name').innerText = "Обране";
        showScreen(quizScreen, 'quiz');
        renderQuestion();
    }

    async function startQuiz(topic) {
        currentTopic = topic;
        document.getElementById('quiz-topic-name').innerText = topic.title;
        
        currentQuestions =[]; 
        noMoreQuestionsOnServer = false; 
        const total = topic.totalQuestions || 79;
        
        questionStates = Array(total).fill(null).map(() => ({ selectedIndex: null, isCorrect: null }));
        
        const savedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");
        if (savedStates[topic.id]) {
            savedStates[topic.id].forEach((savedState, idx) => {
                if (idx < total && savedState) {
                    questionStates[idx] = savedState;
                }
            });
        }

        let firstUnanswered = questionStates.findIndex(state => state.selectedIndex === null);
        currentQuestionIndex = firstUnanswered !== -1 ? firstUnanswered : 0;
        
        showScreen(quizScreen, 'quiz');
        document.getElementById('quiz-question-text').innerText = "Завантаження питань...";
        document.getElementById('quiz-options').innerHTML = "";
        
        const limitToFetch = currentQuestionIndex + 20;
        await fetchQuestionsChunk(topic.id, 0, limitToFetch);
        
        renderQuestion();
    }

    async function fetchQuestionsChunk(topicId, offset, limit = CHUNK_SIZE) {
        if (isLoadingQuestions || noMoreQuestionsOnServer) return;
        isLoadingQuestions = true;

        try {
            const response = await fetch(`https://pdrua.duckdns.org/api/questions?topicId=${topicId}&user_id=${userId}&offset=${offset}&limit=${limit}`);
            const newQuestions = await response.json();
            
            if (newQuestions.length === 0) {
                noMoreQuestionsOnServer = true; 
            } else {
                newQuestions.forEach((q, i) => {
                    currentQuestions[offset + i] = q;
                    if (q.image) {
                        const preloadImg = new Image();
                        preloadImg.src = q.image;
                    }
                });
            }
        } catch (error) {
            console.error("Помилка завантаження питань:", error);
        } finally {
            isLoadingQuestions = false;
        }
    }

    function renderNavBar() {
        const navBar = document.getElementById('question-nav-bar');
        navBar.innerHTML = '';

        const total = currentTopic.totalQuestions || 79;

        for (let i = 0; i < total; i++) {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.innerText = i + 1;
            
            if (i === currentQuestionIndex) btn.classList.add('active');
            
            const state = questionStates[i];
            if (state && state.selectedIndex !== null) {
                if (state.isCorrect === true) btn.classList.add('correct');
                else if (state.isCorrect === false) btn.classList.add('wrong');
            }
            
            if (!currentTopic.isVirtual && !currentQuestions[i] && (!state || state.selectedIndex === null)) {
                btn.classList.add('empty');
            }
            
            btn.addEventListener('click', () => {
                addImpact();
                currentQuestionIndex = i;
                renderQuestion();
                window.scrollTo(0, 70); // Возвращаем экран в верх
            });
            
            navBar.appendChild(btn);
        }

        const activeBtn = navBar.querySelector('.active');
        if (activeBtn) {
            navBar.scrollTo({
                left: activeBtn.offsetLeft - (navBar.offsetWidth / 2) + (activeBtn.offsetWidth / 2),
                behavior: 'smooth'
            });
        }
    }

    function renderQuestion() {

        const total = currentTopic.totalQuestions || 79;
        const q = currentQuestions[currentQuestionIndex];

        if (!currentQuestions[currentQuestionIndex + 5] && (currentQuestionIndex + 5) < total) {
            let offsetToFetch = currentQuestionIndex;
            while(currentQuestions[offsetToFetch]) offsetToFetch++;
            if (!isLoadingQuestions) {
                fetchQuestionsChunk(currentTopic.id, offsetToFetch, CHUNK_SIZE);
            }
        }

        if (!q) {
            if (noMoreQuestionsOnServer && !currentTopic.isVirtual) {
                currentQuestionIndex = currentQuestions.length - 1;
                const coneIcon = `<div style="display: flex; flex-direction: column; align-items: center; gap: 16px;"><div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(245, 158, 11, 0.12); display: flex; align-items: center; justify-content: center;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 20H20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3L5.5 20H18.5L12 3Z" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 12H15.5" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 16H17" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div style="line-height: 1.4; font-size: 1.15rem;">Ой! Наступні питання<br>будуть додані пізніше</div></div>`;
                showToast(coneIcon);
                renderQuestion();
                return;
            }
            
            document.getElementById('quiz-question-text').innerText = "Завантаження питання...";
            document.getElementById('quiz-options').innerHTML = "";
            const imgEl = document.getElementById('quiz-image');
            if (imgEl && imgEl.parentElement) imgEl.parentElement.style.display = 'none';
            const nextBtn = document.getElementById('btn-next-question');
            if (nextBtn) nextBtn.style.display = 'none';
            
            if (!currentTopic.isVirtual && !isLoadingQuestions) {
                fetchQuestionsChunk(currentTopic.id, currentQuestionIndex, CHUNK_SIZE);
            } 
            else if (currentTopic.isVirtual && !isLoadingQuestions) {
                isLoadingQuestions = true;
                const ref = currentTopic.refs[currentQuestionIndex];
                fetch(`https://pdrua.duckdns.org/api/questions?topicId=${ref.topicId}&user_id=${userId}&offset=${ref.originalIndex}&limit=1`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            currentQuestions[currentQuestionIndex] = data[0];
                        } else {
                            currentQuestions[currentQuestionIndex] = { text: "Помилка: Питання не знайдено", options: ["Далі"], correctIndex: 0 };
                        }
                        isLoadingQuestions = false;
                        renderQuestion();
                    })
                    .catch(err => { 
                        console.error("Помилка мережі:", err); 
                        isLoadingQuestions = false; 
                    });
            }
            
            setTimeout(renderQuestion, 300);
            return;
        }

        const currentState = questionStates[currentQuestionIndex];
        
        document.getElementById('current-q-num').innerText = currentQuestionIndex + 1;
        document.getElementById('total-q-num').innerText = total;
        document.getElementById('quiz-question-text').innerText = q.text;
        
        renderNavBar(); 
        
        const imgEl = document.getElementById('quiz-image');
        if (q.image) {
            imgEl.src = q.image;
            imgEl.parentElement.style.display = 'block';
        } else {
            imgEl.src = '';
            imgEl.parentElement.style.display = 'none';
        }

        const optionsContainer = document.getElementById('quiz-options');
        updateBookmarkUI(); // Оновлюємо стан закладки для поточного питання
        optionsContainer.innerHTML = '';

        q.options.forEach((optionText, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<span class="option-number">${index + 1}</span> <span>${optionText}</span>`;
            
            if (currentState && currentState.selectedIndex !== null) {
                btn.disabled = true;
                if (index === q.correctIndex) btn.classList.add('correct');
                else if (index === currentState.selectedIndex) btn.classList.add('wrong');
            } else {
                btn.addEventListener('click', () => handleAnswer(btn, index, q.correctIndex));
            }
            
            optionsContainer.appendChild(btn);
        });

        const nextBtn = document.getElementById('btn-next-question');
        nextBtn.style.display = 'block';

        if (currentQuestionIndex < total - 1) {
            nextBtn.innerText = 'Наступне питання →';
            nextBtn.onclick = () => {
                addImpact();
                currentQuestionIndex++;
                renderQuestion();
                window.scrollTo(0, 70); // Возвращаем экран в верх
            };
        } else {
            nextBtn.innerText = 'Завершити розділ';
            nextBtn.onclick = () => {
                addImpact();
                if (currentQuestionIndex < total - 1) {
                    const successIcon = `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(16, 185, 129, 0.12); display: flex; align-items: center; justify-content: center;">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.0976 1.98233 16.06 2.86" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M22 4L12 14.01L9 11.01" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div style="line-height: 1.4; font-size: 1.15rem;">Ви пройшли всі доступні<br>на даний момент питання</div>
                        </div>
                    `;
                    showToast(successIcon);
                }
                if (currentTopic && currentTopic.id === 'favorites_mode') {
                    renderFavoriteTopics();
                } else {
                    showScreen(topicsScreen, 'topics'); 
                    renderTopics(); 
                }
            };
        }

        const explanationWrapper = document.getElementById('quiz-explanation-wrapper');
        if (currentState && currentState.selectedIndex !== null && explanationWrapper && (q.ruleText || q.explanationText)) {
            const detailsRule = document.getElementById('details-rule');
            const detailsExplanation = document.getElementById('details-explanation');
            
            explanationWrapper.style.display = 'flex';
            
            if (q.ruleText && detailsRule) {
                document.getElementById('quiz-rule-text').innerHTML = q.ruleText;
                detailsRule.style.display = 'block';
                detailsRule.removeAttribute('open'); 
            } else if (detailsRule) {
                detailsRule.style.display = 'none';
            }
            
            if (q.explanationText && detailsExplanation) {
                document.getElementById('quiz-explanation-text').innerHTML = q.explanationText;
                detailsExplanation.style.display = 'block';
                detailsExplanation.removeAttribute('open'); 
            } else if (detailsExplanation) {
                detailsExplanation.style.display = 'none';
            }
        } else {
            if (explanationWrapper) explanationWrapper.style.display = 'none';
        }
    }

    async function handleAnswer(clickedBtn, selectedIndex, correctIndex) {
        addImpact(); 

        if (totalAnswersGiven >= FREE_ANSWERS_LIMIT) {
            // Якщо перевірка зараз іде у фоні — чекаємо її завершення
            while (isCheckingNow) {
                await new Promise(r => setTimeout(r, 100));
            }

            // Якщо ми досі не знаємо статус (наприклад, фонова перевірка не спрацювала) — перевіряємо прямо зараз
            if (!isUserVerified) {
                await runSilentVerification();
            }

            // Якщо після всього цього підписки дійсно немає — показуємо вікно
            if (!isUserVerified) {
                document.getElementById('sub-modal').classList.add('active');
                return; 
            }
        }

        const isCorrect = (selectedIndex === correctIndex);
        questionStates[currentQuestionIndex] = { selectedIndex: selectedIndex, isCorrect: isCorrect };
        
        const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");

        if (currentTopic.isVirtual) {
            const ref = currentTopic.refs[currentQuestionIndex];
            
            questionStates[currentQuestionIndex] = { selectedIndex: selectedIndex, isCorrect: isCorrect };
            
            if (!allSavedStates[ref.topicId]) allSavedStates[ref.topicId] = [];
            allSavedStates[ref.topicId][ref.originalIndex] = { selectedIndex: selectedIndex, isCorrect: isCorrect };
            localStorage.setItem('pdr_quiz_states', JSON.stringify(allSavedStates));

            if (isCorrect) {
                const stats = JSON.parse(localStorage.getItem('pdr_topic_stats') || "{}");
                stats[ref.topicId] = (stats[ref.topicId] || 0) + 1;
                const realTopic = globalTopics.find(t => t.id === ref.topicId);
                const realTotalQ = realTopic ? realTopic.totalQuestions : 999;
                if (stats[ref.topicId] > realTotalQ) stats[ref.topicId] = realTotalQ;
                localStorage.setItem('pdr_topic_stats', JSON.stringify(stats));
            }

        } else {
            questionStates[currentQuestionIndex] = { selectedIndex: selectedIndex, isCorrect: isCorrect };
            allSavedStates[currentTopic.id] = questionStates;
            localStorage.setItem('pdr_quiz_states', JSON.stringify(allSavedStates));

            if (isCorrect) {
                const stats = JSON.parse(localStorage.getItem('pdr_topic_stats') || "{}");
                stats[currentTopic.id] = (stats[currentTopic.id] || 0) + 1;
                const totalQ = currentTopic.totalQuestions;
                if (stats[currentTopic.id] > totalQ) stats[currentTopic.id] = totalQ;
                localStorage.setItem('pdr_topic_stats', JSON.stringify(stats));
            }
        }

        if (totalAnswersGiven < FREE_ANSWERS_LIMIT) {
            totalAnswersGiven++;
            localStorage.setItem('pdr_answers_count', totalAnswersGiven.toString());
        }

        // Запускаємо тихе збереження у хмару Телеграм
        if (currentTopic.isVirtual) {
            scheduleCloudSave(currentTopic.refs[currentQuestionIndex].topicId);
        } else {
            scheduleCloudSave(currentTopic.id);
        }

        renderQuestion();

        setTimeout(() => {
            const explanationWrapper = document.getElementById('quiz-explanation-wrapper');
            const nextBtn = document.getElementById('btn-next-question');
            
            if (explanationWrapper && explanationWrapper.style.display !== 'none') {
                explanationWrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
            } else if (nextBtn) {
                nextBtn.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 50);
    }

    function showProModal() {
        let proModal = document.getElementById('pro-modal');
        if (!proModal) {
            proModal = document.createElement('div');
            proModal.id = 'pro-modal';
            proModal.className = 'modal-overlay';
            proModal.innerHTML = `
                <div class="modal-content" style="max-width: 350px; padding: 24px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 3.5rem; margin-bottom: 10px;">⭐️</div>
                        <h3 style="font-size: 1.6rem; margin-bottom: 8px; font-weight: 800;">PRO Доступ</h3>
                        <p style="color: var(--c-text-soft); font-size: 0.95rem; line-height: 1.4;">Відкрийте всі преміум-розділи та детальні пояснення до питань. Оплата безпечно через Telegram Stars.</p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button class="btn-primary" onclick="buyPro('1_month')" style="display: flex; justify-content: space-between; width: 100%; padding: 16px 20px; background: var(--c-surface); color: var(--c-text); border: 1px solid var(--c-border-soft);">
                            <span style="font-weight: 600;">1 місяць</span> <span style="font-weight: 800; color: #F59E0B;">⭐️ 1</span>
                        </button>
                        <button class="btn-primary" onclick="buyPro('3_months')" style="display: flex; justify-content: space-between; width: 100%; padding: 16px 20px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border: none; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3);">
                            <span style="font-weight: 700;">3 місяці (Вигідно)</span> <span style="font-weight: 800;">⭐️ 2</span>
                        </button>
                        <button class="btn-primary" onclick="buyPro('12_months')" style="display: flex; justify-content: space-between; width: 100%; padding: 16px 20px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); border: none; box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);">
                            <span style="font-weight: 700;">1 рік (Максимум)</span> <span style="font-weight: 800;">⭐️ 3</span>
                        </button>
                    </div>
                    <button class="btn-danger-outline" onclick="document.getElementById('pro-modal').classList.remove('active')" style="width: 100%; margin-top: 16px; border: none; color: var(--c-text-soft);">Скасувати</button>
                </div>
            `;
            document.body.appendChild(proModal);
        }
        proModal.classList.add('active');
    }

    // Глобальная функция для вызова из HTML
    window.buyPro = async function(tierId) {
        addImpact();
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span style="margin: 0 auto;">Завантаження...</span>`;
        btn.disabled = true;

        try {
            const res = await fetch('https://pdrua.duckdns.org/api/create-invoice', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ user_id: userId, tier_id: tierId })
            });
            const data = await res.json();
            
            if (data.invoice_url) {
                // Вызываем нативное окно оплаты Telegram
                tg.openInvoice(data.invoice_url, (status) => {
                    if (status === 'paid') {
                        document.getElementById('pro-modal').classList.remove('active');
                        isUserPro = true;
                        renderTopics(); // Перерисовываем меню, чтобы убрать плашки PRO
                        if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                        showCustomConfirm({
                            icon: '🎉', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)',
                            title: 'Оплата успішна!', desc: 'Дякуємо! PRO доступ активовано. Всі розділи відкрито.',
                            okText: 'Супер!', isDanger: false
                        });
                    }
                });
            } else {
                alert("Помилка створення рахунку: " + data.error);
            }
        } catch (e) {
            alert("Помилка з'єднання з сервером");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // --- ПРОФІЛЬ ТА СТАТИСТИКА ---
    const profileModal = document.getElementById('profile-modal');
    const btnCloseProfile = document.getElementById('btn-close-profile');
    const btnResetProgress = document.getElementById('btn-reset-progress');

    function calculateStats() {
        if (!globalTopics || globalTopics.length === 0) {
            return { successRate: 0, answered: 0, total: 0, completionRate: 0, correct: 0, incorrect: 0 };
        }

        const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");
        let totalExpected = 0;
        let totalAnswered = 0;
        let totalCorrect = 0;
        let totalIncorrect = 0; // Добавили счетчик ошибок

        globalTopics.forEach(topic => {
            totalExpected += (topic.totalQuestions || 0);
            const topicStates = allSavedStates[topic.id] || [];
            
            topicStates.forEach(state => {
                if (state && state.selectedIndex !== null) {
                    totalAnswered++;
                    if (state.isCorrect) {
                        totalCorrect++;
                    } else {
                        totalIncorrect++; // Считаем ошибки
                    }
                }
            });
        });

        const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
        const completionRate = totalExpected > 0 ? (totalAnswered / totalExpected) : 0;

        // Возвращаем расширенный объект со статистикой
        return { 
            successRate, 
            answered: totalAnswered, 
            total: totalExpected, 
            completionRate,
            correct: totalCorrect,
            incorrect: totalIncorrect
        };
    }

    function updateHumorBanner(successRate) {
        const banner = document.getElementById('stat-humor-banner');
        if (!banner) return;

        let text = "";
        let iconLeft = "";
        let iconRight = "";
        let isMax = false;

        if (successRate <= 20) {
            text = "Схоже, правила поки що<br>керують вами 😅";
            iconLeft = "🚨"; iconRight = "⚠️";
        } else if (successRate <= 40) {
            text = "Ви вже розумієте, що «головна дорога» —<br>це не життєва позиція";
            iconLeft = "🛣️"; iconRight = "🤔";
        } else if (successRate <= 60) {
            text = "Дорожні знаки<br>починають вас поважати";
            iconLeft = "🚸"; iconRight = "😎";
        } else if (successRate <= 80) {
            text = "Навігатор більше не переживає<br>за ваше майбутнє";
            iconLeft = "📱"; iconRight = "😌";
        } else if (successRate <= 99) {
            text = "Ще трохи — і вас почнуть<br>пропускати навіть маршрутки";
            iconLeft = "🚐"; iconRight = "👑";
        } else {
            text = "Світлофор бачить вас —<br>і перемикається на <span style='color: var(--c-success); font-weight: 800;'>зелений</span>";
            iconLeft = "🏆"; iconRight = "🚦";
            isMax = true;
        }

        banner.className = `stat-humor-banner ${isMax ? 'tier-max' : ''}`;
        banner.innerHTML = `
            <div class="humor-icon left">${iconLeft}</div>
            <div class="humor-text">${text}</div>
            <div class="humor-icon right">${iconRight}</div>
        `;
    }

    function animateCircles(successRate, completionRate) {
        const circleSuccess = document.getElementById('circle-success');
        const circleCompletion = document.getElementById('circle-completion');
        const circumference = 251.2; 

        circleSuccess.style.transition = 'none';
        circleCompletion.style.transition = 'none';
        circleSuccess.style.strokeDashoffset = circumference;
        circleCompletion.style.strokeDashoffset = circumference;

        circleSuccess.getBoundingClientRect();

        circleSuccess.style.transition = 'stroke-dashoffset 0.5s ease-in';
        circleCompletion.style.transition = 'stroke-dashoffset 0.5s ease-in';
        circleSuccess.style.strokeDashoffset = 0;
        circleCompletion.style.strokeDashoffset = 0;

        setTimeout(() => {
            circleSuccess.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)';
            circleCompletion.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)';

            const successOffset = circumference - (successRate / 100) * circumference;
            const completionOffset = circumference - completionRate * circumference;

            circleSuccess.style.strokeDashoffset = successOffset;
            circleCompletion.style.strokeDashoffset = completionOffset;
        }, 550); 
    }

    if (avatarContainer) {
        avatarContainer.addEventListener('click', async () => {
            addImpact();
            
            if (globalTopics.length === 0) {
                try {
                    const response = await fetch('https://pdrua.duckdns.org/api/topics');
                    globalTopics = await response.json();
                } catch (e) { console.error(e); }
            }

            const stats = calculateStats();
            
            document.getElementById('stat-success-text').innerText = `${stats.successRate}%`;
            document.getElementById('stat-answered-text').innerText = stats.answered;
            document.getElementById('stat-total-text').innerText = stats.total;

            const correctEl = document.getElementById('stat-correct-text');
            const incorrectEl = document.getElementById('stat-incorrect-text');
            if (correctEl) correctEl.innerText = stats.correct;
            if (incorrectEl) incorrectEl.innerText = stats.incorrect;

            updateHumorBanner(stats.successRate);

            // Вивід статистики іспитів
            const examStats = JSON.parse(localStorage.getItem('pdr_exam_stats') || '{"total":0, "passed":0, "lastWrong":0}');
            document.getElementById('stat-exam-passed').innerText = examStats.passed;
            document.getElementById('stat-exam-total').innerText = examStats.total;
            
            const lastScoreEl = document.getElementById('stat-exam-last');
            if (examStats.total > 0) {
                lastScoreEl.innerText = `${examStats.lastWrong} пом.`;
                // Якщо помилок <= 2 (здав) - зелений, інакше - червоний
                lastScoreEl.style.color = examStats.lastWrong <= 2 ? 'var(--c-success)' : 'var(--c-danger)';
            } else {
                lastScoreEl.innerText = '-';
                lastScoreEl.style.color = 'var(--c-text)';
            }

            // --- НОВЕ: Вивід тем для повторення ---
            const weakTopicsContainer = document.getElementById('weak-topics-container');
            if (weakTopicsContainer) {
                const weakTopics = JSON.parse(localStorage.getItem('pdr_exam_weak_topics') || "[]");
                
                if (weakTopics.length > 0) {
                    let html = `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--c-border-soft);">
                                    <h4 style="font-size: 0.85rem; color: var(--c-text-soft); margin-bottom: 10px; font-weight: 600;">Рекомендуємо повторити:</h4>
                                    <div style="display: flex; flex-direction: column; gap: 8px;">`;
                    
                    weakTopics.forEach(tId => {
                        const topicObj = globalTopics.find(t => t.id === tId);
                        if (topicObj) {
                            html += `<button class="weak-topic-chip" data-topic="${tId}">${topicObj.title}</button>`;
                        }
                    });
                    
                    html += `</div></div>`;
                    weakTopicsContainer.innerHTML = html;
                    weakTopicsContainer.style.display = 'block';
                    
                    // Додаємо кліки по темам
                    weakTopicsContainer.querySelectorAll('.weak-topic-chip').forEach(chip => {
                        chip.addEventListener('click', () => {
                            addImpact();
                            const tId = chip.getAttribute('data-topic');
                            const topicObj = globalTopics.find(t => t.id === tId);
                            if (topicObj) {
                                profileModal.classList.remove('active'); // Закриваємо профіль
                                startQuiz(topicObj); // Запускаємо вибрану тему
                            }
                        });
                    });
                } else {
                    weakTopicsContainer.style.display = 'none';
                }
            }
            // --------------------------------------

            profileModal.classList.add('active');

            if (tg && tg.BackButton) {
                tg.BackButton.show();
            }

            setTimeout(() => {
                animateCircles(stats.successRate, stats.completionRate);
            }, 50);
        });
    }

    if (btnResetProgress) {
        btnResetProgress.addEventListener('click', () => {
            addImpact();
            showCustomConfirm({
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
                color: '#EF4444', // Червоний
                bgColor: 'rgba(239, 68, 68, 0.15)',
                title: 'Обнулити дані?',
                desc: 'Ви впевнені, що хочете скинути поточну статистику? Весь прогрес буде втрачено назавжди!',
                okText: 'Обнулити',
                isDanger: true,
                onConfirm: () => executeReset()
            });
        });
    }

    function executeReset() {
        localStorage.removeItem('pdr_topic_stats');
        localStorage.removeItem('pdr_quiz_states');
        
        // ОЧИЩАЄМО ХМАРУ ТЕЛЕГРАМ ПРИ ОБНУЛЕННІ
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.getKeys((err, keys) => {
                if (!err && keys) {
                    const topicKeys = keys.filter(k => k.startsWith('topic_'));
                    if (topicKeys.length > 0) tg.CloudStorage.removeItems(topicKeys);
                }
            });
        }
        
        renderTopics();
        profileModal.classList.remove('active');
        showScreen(topicsScreen, 'topics');
        
        if (tg && tg.showAlert) {
            tg.showAlert("Дані успішно обнулено!");
        } else {
            alert("Дані успішно обнулено!");
        }

        localStorage.removeItem('pdr_exam_stats');

    }

    function showToast(message) {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            
            toast.style.position = 'fixed';
            toast.style.top = '50%'; 
            toast.style.left = '50%';
            toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            toast.style.backgroundColor = 'var(--c-surface)';
            toast.style.color = 'var(--c-text)';
            toast.style.border = '1px solid var(--c-border-soft)';
            toast.style.padding = '24px 32px';
            toast.style.borderRadius = '24px';
            toast.style.fontSize = '1.1rem';
            toast.style.fontWeight = '600';
            toast.style.zIndex = '10000';
            toast.style.textAlign = 'center';
            toast.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            
            toast.style.whiteSpace = 'normal';
            toast.style.width = '85%';
            toast.style.maxWidth = '350px';
            
            document.body.appendChild(toast);
        }
        
        toast.innerHTML = message;
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
        
        clearTimeout(toast.hideTimeout);
        toast.hideTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 3000);
    }

    // ==========================================
    // CLOUD STORAGE (СИНХРОНІЗАЦІЯ ПРОГРЕСУ)
    // ==========================================
    
    // 1. Архіватор даних (стискаємо об'єкти в малі масиви)
    function packState(stateArray) {
        return JSON.stringify(stateArray.map(s => {
            // Якщо питання ще не пройдене, зберігаємо просто null (економимо пам'ять хмари!)
            if (!s || s.selectedIndex === null) return null;
            return[s.selectedIndex, s.isCorrect ? 1 : 0];
        }));
    }

    // 2. Розархіватор (з лікуванням битих даних)
    function unpackState(packedStr) {
        try {
            const arr = JSON.parse(packedStr);
            return arr.map(item => {
                // Якщо з хмари прилетів мусор типу [null, 0] — стираємо його повністю
                if (!item || item[0] === null) return null;
                
                return { selectedIndex: item[0], isCorrect: !!item[1] };
            });
        } catch(e) { 
            return []; 
        }
    }

    // 3. Відновлення при вході
    function syncFromCloud() {
        if (!tg || !tg.CloudStorage) return;
        
        // --- НОВЕ: Відновлюємо Обране з хмари Telegram ---
        tg.CloudStorage.getItem('pdr_favorites', (err, value) => {
            if (!err && value) {
                // Якщо в хмарі є збережені закладки, записуємо їх у локальну пам'ять
                localStorage.setItem('pdr_favorites', value);
            }
        });
        // -------------------------------------------------

        tg.CloudStorage.getKeys((err, keys) => {
            if (err || !keys || keys.length === 0) return;

            const topicKeys = keys.filter(k => k.startsWith('topic_'));
            if (topicKeys.length === 0) return;

            tg.CloudStorage.getItems(topicKeys, (err, values) => {
                if (err || !values) return;

                const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");
                const stats = JSON.parse(localStorage.getItem('pdr_topic_stats') || "{}");

                topicKeys.forEach(key => {
                    if (values[key]) {
                        const unpacked = unpackState(values[key]);
                        allSavedStates[key] = unpacked;

                        // Відновлюємо статистику
                        let correctCount = 0;
                        unpacked.forEach(s => { if (s && s.isCorrect) correctCount++; });
                        stats[key] = correctCount;
                    }
                });

                localStorage.setItem('pdr_quiz_states', JSON.stringify(allSavedStates));
                localStorage.setItem('pdr_topic_stats', JSON.stringify(stats));

                if (currentScreenName === 'topics') renderTopics();
            });
        });
    }

    // 4. Тихе збереження (Дебаунс 1 сек)
    let cloudSaveTimeouts = {};
    function scheduleCloudSave(topicId) {
        if (!tg || !tg.CloudStorage || topicId === 'hard_mode') return; 
        
        if (cloudSaveTimeouts[topicId]) clearTimeout(cloudSaveTimeouts[topicId]);
        
        cloudSaveTimeouts[topicId] = setTimeout(() => {
            const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");
            const topicState = allSavedStates[topicId];
            if (topicState) {
                tg.CloudStorage.setItem(topicId, packState(topicState));
            }
        }, 1000); 
    }

    // Запускаємо відновлення при старті додатку
    syncFromCloud();

}); // <-- ВОТ ТА САМАЯ ЗАКРЫВАЮЩАЯ СКОБКА