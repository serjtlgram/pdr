// ==========================================
// ИНИЦИАЛИЗАЦИЯ И ЛОГИКА (ПОЛНАЯ ВЕРСИЯ С СЕРВЕРОМ)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // --- Настройка Telegram WebApp ---
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const tgUser = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
    const userId = tgUser ? tgUser.id : null; 

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
        }).catch(err => console.error("Помилка ініціалізації користувача:", err));
    }

    // --- ПРЕДЗАГРУЗКА РАЗДЕЛОВ В ФОНЕ ---
    // Начинаем грузить данные сразу при открытии мини-аппа и сохраняем этот процесс
    let topicsPromise = fetch('https://pdrua.duckdns.org/api/topics')
        .then(res => res.json())
        .catch(e => { console.error(e); return[]; });
        
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
    
    // Состояние теста и глобальные переменные
    let currentTopic = null; 
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let currentScreenName = 'home';
    let questionStates = []; 
    let isLoadingQuestions = false; // Флаг загрузки вопросов
    let noMoreQuestionsOnServer = false; // Флаг, если вопросы в базе закончились

    // Резервная копия разделов для моментальной загрузки
    let globalTopics =[]; // Никаких заготовок, только пустой массив

    // 3. ЛОГИКА ПОДПИСКИ
    let totalAnswersGiven = parseInt(localStorage.getItem('pdr_answers_count') || '0');
    let isUserVerified = (totalAnswersGiven < 2); 
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
    const themeIcon = document.getElementById('theme-icon');

    const iconMoon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    const iconSun = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

    if (tg && tg.CloudStorage) {
        tg.CloudStorage.getItem('app_theme', (err, savedTheme) => {
            if (!err && savedTheme) {
                if (savedTheme === 'light') {
                    document.body.classList.add('light-theme');
                    themeIcon.innerHTML = iconMoon; 
                } else {
                    document.body.classList.remove('light-theme');
                    themeIcon.innerHTML = iconSun; 
                }
            }
        });
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            addImpact();
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
        // Если нет ID или уже проверяем - отменяем запрос!
        // УБРАЛИ проверку isUserVerified, чтобы проверять каждый раз при старте
        if (!userId || isCheckingNow) return; 
        isCheckingNow = true;

        try {
            const response = await fetch(`https://pdrua.duckdns.org/check-sub?user_id=${userId}`);
            const data = await response.json();
            isUserVerified = (data.is_subscribed === true);
        } catch (error) {
            console.error("Помилка бэкенда:", error);
            // Если сервер упал, пускаем пользователя, чтобы не блокировать приложение
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

    // --- SPA Навигация ---
    function showScreen(screenToShow, screenName) {
        homeScreen.classList.remove('active');
        topicsScreen.classList.remove('active');
        quizScreen.classList.remove('active');
        
        screenToShow.classList.add('active');
        window.scrollTo(0, 0);

        currentScreenName = screenName;

        if (tg && tg.BackButton) {
            try {
                if (currentScreenName === 'home') tg.BackButton.hide();
                else tg.BackButton.show();
            } catch(e){}
        }
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
            showScreen(topicsScreen, 'topics');
            renderTopics(); 
        } else if (currentScreenName === 'topics') {
            showScreen(homeScreen, 'home');
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
            if(tg && tg.showAlert) tg.showAlert("Режим іспиту знаходиться в розробці! Скоро додамо 🚀");
            else alert("Режим іспиту знаходиться в розробці!");
        });
    }

    if (cardHard) {
        cardHard.addEventListener('click', () => {
            addImpact();
            if(tg && tg.showAlert) tg.showAlert("Розділ складних питань знаходиться в розробці! Збираємо вашу статистику 📊");
            else alert("Розділ складних питань знаходиться в розробці!");
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
        "topic_1": `<svg viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`, 
        "topic_2": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2v10M12 22v-6M4.93 4.93l4.24 4.24M19.07 19.07l-4.24-4.24M19.07 4.93l-4.24 4.24M4.93 19.07l4.24-4.24"/></svg>`, 
        "topic_3": `<svg viewBox="0 0 24 24"><path d="M12 2v2M5.3 5.3l1.4 1.4M18.7 5.3l-1.4 1.4M12 22H7a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5h-5z"/></svg>`, 
        "topic_4": `<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M12 7v7M9 18l3-4 3 4M8 11h8"/></svg>`, 
        "topic_5": `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, 
        "topic_6": `<svg viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>`, 
        "topic_7": `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2v8M12 14v8M2 12h8M14 12h8M4.9 4.9l5.7 5.7M13.4 13.4l5.7 5.7M4.9 19.1l5.7-5.7M13.4 10.6l5.7-5.7"/></svg>`, 
        "topic_8": `<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="17" r="2"/></svg>` 
    };

    // --- 4. ОТРИСОВКА РАЗДЕЛОВ (С СЕРВЕРА) ---
    async function renderTopics(filter = "") {
        const grid = document.getElementById('topics-grid');
        if (!grid) return;
        
        // КРАСИВАЯ ПЛАШКА ЗАГРУЗКИ (Скелетон-анимация)
        if (globalTopics.length === 0) {
            grid.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                    ${[1, 2, 3, 4, 5].map(() => `
                        <div style="height: 84px; border-radius: 16px; background: var(--c-surface); border: 1px solid var(--c-border-soft); animation: pulse 1.5s infinite ease-in-out; display: flex; align-items: center; padding: 16px; gap: 16px;">
                            <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--c-bg); opacity: 0.7;"></div>
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                                <div style="height: 14px; width: 70%; background: var(--c-bg); border-radius: 6px; opacity: 0.7;"></div>
                                <div style="height: 12px; width: 40%; background: var(--c-bg); border-radius: 6px; opacity: 0.5;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <style>
                    @keyframes pulse {
                        0% { opacity: 0.5; }
                        50% { opacity: 1; }
                        100% { opacity: 0.5; }
                    }
                </style>
            `;
        }
        
        try {
            // УМНОЕ ОЖИДАНИЕ: Если запрос уже пошел при старте приложения, просто ждем его результат!
            if (globalTopics.length === 0) {
                if (topicsPromise) {
                    globalTopics = await topicsPromise;
                } else {
                    const response = await fetch('https://pdrua.duckdns.org/api/topics');
                    globalTopics = await response.json();
                }
            }
            
            grid.innerHTML = ""; // Очищаем скелетоны

            const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");

            const filtered = globalTopics.filter(t => 
                t.title.toLowerCase().includes(filter.toLowerCase())
            );

            filtered.forEach((topic, index) => {
                const totalQ = topic.totalQuestions || 0;
                const topicStates = allSavedStates[topic.id] || [];
                
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

                const card = document.createElement('div');
                card.className = `topic-card ${colorClass}`;
                
                card.innerHTML = `
                    <div class="topic-header">
                        <div class="topic-icon-wrapper">${iconHtml}</div>
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
                    startQuiz(topic);
                };
                
                grid.appendChild(card);
            });

            // ЗАПУСКАЕМ ПРОВЕРКУ ПОДПИСКИ ТОЛЬКО ПОСЛЕ ТОГО, КАК ПЛИТКИ ПОЯВИЛИСЬ
            if (totalAnswersGiven >= 2 && !isUserVerified) {
                setTimeout(runSilentVerification, 1000); // Ждем 1 секунду для плавности
            }

        } catch (error) {
            console.error("Помилка завантаження розділів:", error);
            grid.innerHTML = '<div style="text-align:center; color: var(--c-danger);">Помилка з\'єднання з сервером</div>';
        }
    }

    const searchInput = document.getElementById('topic-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderTopics(e.target.value));
    }

    // --- 5. ЛОГИКА ТЕСТА (LAZY LOADING) ---
    async function startQuiz(topic) {
        currentTopic = topic;
        document.getElementById('quiz-topic-name').innerText = topic.title;
        
        currentQuestions = []; // Очищаем старые вопросы
        noMoreQuestionsOnServer = false; // Сбрасываем флаг при старте нового раздела
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
        
        // Загружаем первую партию вопросов
        const offset = Math.max(0, currentQuestionIndex - 5);
        await fetchQuestionsChunk(topic.id, offset, 20);
        
        renderQuestion();
    }

    async function fetchQuestionsChunk(topicId, offset, limit = 20) {
        // Если мы уже грузим ИЛИ знаем, что вопросов больше нет - отменяем запрос!
        if (isLoadingQuestions || noMoreQuestionsOnServer) return;
        isLoadingQuestions = true;

        try {
            const response = await fetch(`https://pdrua.duckdns.org/api/questions?topicId=${topicId}&offset=${offset}&limit=${limit}`);
            const newQuestions = await response.json();
            
            if (newQuestions.length === 0) {
                noMoreQuestionsOnServer = true; // Сервер сказал, что вопросов больше нет
            } else {
                newQuestions.forEach((q, i) => {
                    currentQuestions[offset + i] = q;
                    
                    // МАГИЯ: Предзагрузка картинок в кэш браузера!
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
            if (state && state.isCorrect === true) btn.classList.add('correct');
            else if (state && state.isCorrect === false) btn.classList.add('wrong');
            
            // Если вопрос еще не загружен, делаем кнопку полупрозрачной
            if (!currentQuestions[i]) {
                btn.classList.add('empty');
            }
            
            btn.addEventListener('click', () => {
                addImpact();
                currentQuestionIndex = i;
                renderQuestion();
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

        // PRE-FETCHING: Подгружаем следующие вопросы заранее
        if (!currentQuestions[currentQuestionIndex + 5] && (currentQuestionIndex + 5) < total) {
            let offsetToFetch = currentQuestionIndex;
            while(currentQuestions[offsetToFetch]) offsetToFetch++;
            if (!isLoadingQuestions) {
                fetchQuestionsChunk(currentTopic.id, offsetToFetch, 20);
            }
        }

        // Если вопрос еще не загрузился
        if (!q) {
            // Если мы точно знаем, что на сервере больше нет вопросов
            if (noMoreQuestionsOnServer) {
                // Возвращаем пользователя на последний доступный вопрос
                currentQuestionIndex = currentQuestions.length - 1;
                
                const coneIcon = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(245, 158, 11, 0.12); display: flex; align-items: center; justify-content: center;">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 20H20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12 3L5.5 20H18.5L12 3Z" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M8.5 12H15.5" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M7 16H17" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div style="line-height: 1.4; font-size: 1.15rem;">Ой! Наступні питання<br>будуть додані пізніше</div>
                    </div>
                `;
                showToast(coneIcon);
                
                renderQuestion();
                return;
            }
            // Иначе показываем загрузку и ждем
            document.getElementById('quiz-question-text').innerText = "Завантаження...";
            document.getElementById('quiz-options').innerHTML = "";
            
            if (!isLoadingQuestions) {
                fetchQuestionsChunk(currentTopic.id, currentQuestionIndex, 20);
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
                showScreen(topicsScreen, 'topics'); 
                renderTopics(); 
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

        if (totalAnswersGiven >= 2) {
            // Если проверка еще идет в фоне, просто ждем долю секунды (без зависания кнопки)
            if (isCheckingNow) {
                await new Promise(r => setTimeout(r, 300));
            }

            if (!isUserVerified) {
                document.getElementById('sub-modal').classList.add('active');
                return; 
            }
        }

        const isCorrect = (selectedIndex === correctIndex);
        questionStates[currentQuestionIndex] = { selectedIndex: selectedIndex, isCorrect: isCorrect };
        
        const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");
        allSavedStates[currentTopic.id] = questionStates;
        localStorage.setItem('pdr_quiz_states', JSON.stringify(allSavedStates));

        if (isCorrect) {
            const stats = JSON.parse(localStorage.getItem('pdr_topic_stats') || "{}");
            stats[currentTopic.id] = (stats[currentTopic.id] || 0) + 1;
            
            const totalQ = currentTopic.totalQuestions;
            if (stats[currentTopic.id] > totalQ) stats[currentTopic.id] = totalQ;
            
            localStorage.setItem('pdr_topic_stats', JSON.stringify(stats));
        }

        if (totalAnswersGiven < 2) {
            totalAnswersGiven++;
            localStorage.setItem('pdr_answers_count', totalAnswersGiven.toString());
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

    // --- ПРОФІЛЬ ТА СТАТИСТИКА ---
    const profileModal = document.getElementById('profile-modal');
    const btnCloseProfile = document.getElementById('btn-close-profile');
    const btnResetProgress = document.getElementById('btn-reset-progress');

    function calculateStats() {
        if (!globalTopics || globalTopics.length === 0) return { successRate: 0, answered: 0, total: 0, completionRate: 0 };

        const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");
        let totalExpected = 0;
        let totalAnswered = 0;
        let totalCorrect = 0;

        globalTopics.forEach(topic => {
            totalExpected += (topic.totalQuestions || 0);
            const topicStates = allSavedStates[topic.id] || [];
            
            topicStates.forEach(state => {
                if (state && state.selectedIndex !== null) {
                    totalAnswered++;
                    if (state.isCorrect) totalCorrect++;
                }
            });
        });

        const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
        const completionRate = totalExpected > 0 ? (totalAnswered / totalExpected) : 0;

        return { successRate, answered: totalAnswered, total: totalExpected, completionRate };
    }

    function updateHumorBanner(successRate) {
        const banner = document.getElementById('stat-humor-banner');
        if (!banner) return;

        let text = "";
        let iconLeft = "";
        let iconRight = "";
        let isMax = false;

        if (successRate <= 30) {
            text = "Схоже, правила поки що<br>керують вами 😅";
            iconLeft = "🚨"; iconRight = "⚠️";
        } else if (successRate <= 45) {
            text = "Ви вже розумієте, що «головна дорога» —<br>це не життєва позиція";
            iconLeft = "🛣️"; iconRight = "🤔";
        } else if (successRate <= 65) {
            text = "Дорожні знаки<br>починають вас поважати";
            iconLeft = "🚸"; iconRight = "😎";
        } else if (successRate <= 85) {
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
            
            // Если разделы еще не загружены, загружаем их для правильной статистики
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

            updateHumorBanner(stats.successRate);

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
            
            const confirmMsg = "Ви впевнені, що хочете скинути поточну статистику?";
            
            if (tg && tg.showConfirm) {
                tg.showConfirm(confirmMsg, (confirmed) => {
                    if (confirmed) executeReset();
                });
            } else {
                if (confirm(confirmMsg)) executeReset();
            }
        });
    }

    function executeReset() {
        localStorage.removeItem('pdr_topic_stats');
        localStorage.removeItem('pdr_quiz_states');
        
        renderTopics();
        profileModal.classList.remove('active');
        showScreen(topicsScreen, 'topics');
        
        if (tg && tg.showAlert) {
            tg.showAlert("Дані успішно обнулено!");
        } else {
            alert("Дані успішно обнулено!");
        }
    }

    // --- ФУНКЦІЯ ДЛЯ СПЛИВАЮЧИХ ПОВІДОМЛЕНЬ (TOAST) ---
    function showToast(message) {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            
            // Центрируем по центру экрана
            toast.style.position = 'fixed';
            toast.style.top = '50%'; 
            toast.style.left = '50%';
            toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            // Делаем дизайн более массивным и заметным
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
            
            // Чтобы текст мог переноситься на новую строку, если он длинный
            toast.style.whiteSpace = 'normal';
            toast.style.width = '85%';
            toast.style.maxWidth = '350px';
            
            document.body.appendChild(toast);
        }
        
        toast.innerHTML = message;
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
        toast.style.display = 'block';
        
        // Анимация появления (эффект "выпрыгивания")
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);
        
        // Исчезает через 3 секунды
        clearTimeout(toast.hideTimeout);
        toast.hideTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 3000);
    }

});