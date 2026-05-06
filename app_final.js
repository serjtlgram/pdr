// ==========================================
// ИНИЦИАЛИЗАЦИЯ И ЛОГИКА (ПОЛНАЯ ВЕРСИЯ)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // --- Настройка Telegram WebApp ---
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const tgUser = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
    const userId = tgUser ? tgUser.id : null; 

    // 1. БЛОКИРОВКА ПОЗА TELEGRAM
    if (!tgUser) {
        document.getElementById('not-tg-blocker').classList.add('active');
        document.getElementById('app-container').style.display = 'none';
        return; 
    }

    // 2. АВАТАРКА
    const avatarContainer = document.getElementById('user-avatar-container');
    const avatarImg = document.getElementById('user-avatar-img');
    
    if (tgUser) {
        avatarContainer.style.display = 'flex';
        if (tgUser.photo_url) {
            avatarImg.src = tgUser.photo_url;
            avatarImg.style.display = 'block';
        } else {
            avatarImg.style.display = 'none';
            avatarContainer.innerHTML = tgUser.first_name ? tgUser.first_name.charAt(0).toUpperCase() : '👤';
        }
    }

    // Основные переменные интерфейса
    const btnStart = document.getElementById('btn-start-learning');
    const btnBackHome = document.getElementById('btn-back-home');
    const homeScreen = document.getElementById('home-screen');
    const topicsScreen = document.getElementById('topics-screen');
    const quizScreen = document.getElementById('quiz-screen');
    
    // Состояние теста
    let currentTopic = null; 
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let currentScreenName = 'home';
    let questionStates = []; 

    // 3. ЛОГИКА ПОДПИСКИ (Строгая)
    let totalAnswersGiven = parseInt(localStorage.getItem('pdr_answers_count') || '0');
    let isUserVerified = (totalAnswersGiven < 2); 
    let isCheckingNow = false; 

    if (totalAnswersGiven >= 2) {
        runSilentVerification();
    }

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

        // --- Переключение тем с сохранением в Telegram CloudStorage ---
        const themeToggleBtn = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');

        // Иконки для кнопок
        const iconMoon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
        const iconSun = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

        // 1. При загрузке проверяем, есть ли сохраненная тема в облаке Telegram
        if (tg && tg.CloudStorage) {
            tg.CloudStorage.getItem('app_theme', (err, savedTheme) => {
                if (!err && savedTheme) {
                    if (savedTheme === 'light') {
                        document.body.classList.add('light-theme');
                        themeIcon.innerHTML = iconMoon; // Показываем луну, так как тема светлая
                    } else {
                        document.body.classList.remove('light-theme');
                        themeIcon.innerHTML = iconSun; // Показываем солнце
                    }
                }
            });
        }

        // 2. Логика переключения по клику
        themeToggleBtn.addEventListener('click', () => {
            addImpact();
            document.body.classList.toggle('light-theme');
            
            const isLightNow = document.body.classList.contains('light-theme');
            
            // Меняем иконку
            if (isLightNow) {
                themeIcon.innerHTML = iconMoon;
            } else {
                themeIcon.innerHTML = iconSun;
            }

            // Сохраняем выбор пользователя в облако Telegram
            if (tg && tg.CloudStorage) {
                tg.CloudStorage.setItem('app_theme', isLightNow ? 'light' : 'dark');
            }
        });

    // --- Фоновая (тихая) проверка ---
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

    // --- Кнопка в модальном окне ---
    const subModal = document.getElementById('sub-modal');
    document.getElementById('btn-check-sub').addEventListener('click', async () => {
        addImpact();
        const btn = document.getElementById('btn-check-sub');
        btn.innerText = "Перевіряю...";
        btn.disabled = true;

        await runSilentVerification();

        if (isUserVerified) {
            subModal.classList.remove('active'); 
        } else {
            if(tg && tg.showAlert) tg.showAlert("Ви ще не підписані! Перейдіть за посиланням та підпишіться.");
            else alert("Ви ще не підписані!");
        }

        btn.innerText = "Я підписався! Перевірити";
        btn.disabled = false;
    });

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
        if (currentScreenName === 'quiz') {
            showScreen(topicsScreen, 'topics');
        } else if (currentScreenName === 'topics') {
            showScreen(homeScreen, 'home');
        }
    }

    document.getElementById('quiz-topic-name').addEventListener('click', goBack);
    document.getElementById('btn-back-from-topics').addEventListener('click', goBack);
    document.getElementById('btn-back-from-quiz').addEventListener('click', goBack);

    btnBackHome.addEventListener('click', () => {
        addImpact();
        showScreen(homeScreen, 'home');
    });

    btnStart.addEventListener('click', () => {
        addImpact();
        renderTopics();
        showScreen(topicsScreen, 'topics');
    });

    // --- Отрисовка тем ---
    function renderTopics() {
        const topicsList = document.getElementById('topics-list');
        topicsList.innerHTML = ''; 

        const db = window.pdrData;
        if (!db || !db.topics) return;

        db.topics.forEach(topic => {
            const card = document.createElement('div');
            card.className = 'feature-card';
            card.innerHTML = `
                <div class="card-icon" style="background: transparent; font-size: 1.8rem;">${topic.icon}</div>
                <div class="card-text">
                    <h3>${topic.title}</h3>
                    <p>${topic.description}</p>
                </div>
                <div class="card-arrow">›</div>
            `;
            card.addEventListener('click', () => {
                addImpact();
                startQuiz(topic);
            });
            topicsList.appendChild(card);
        });
    }

    // --- Логика Теста ---
    function startQuiz(topic) {
        currentTopic = topic;
        document.getElementById('quiz-topic-name').innerText = topic.title;
        currentQuestions = window.pdrData.questions.filter(q => q.topicId === topic.id);
        currentQuestionIndex = 0;
        
        const total = topic.totalQuestions || currentQuestions.length || 79;
        questionStates = Array(total).fill(null).map(() => ({ selectedIndex: null, isCorrect: null }));
        
        if (currentQuestions.length > 0) {
            renderQuestion();
            showScreen(quizScreen, 'quiz');
        } else {
            if(tg && tg.showAlert) tg.showAlert("Питання для цього розділу ще не додані!");
            else alert("Питання для цього розділу ще не додані!");
        }
    }

    function renderNavBar() {
        const navBar = document.getElementById('question-nav-bar');
        navBar.innerHTML = '';

        const total = currentTopic.totalQuestions || currentQuestions.length || 79;

        for (let i = 0; i < total; i++) {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.innerText = i + 1;
            
            if (i < currentQuestions.length) {
                if (i === currentQuestionIndex) btn.classList.add('active');
                
                const state = questionStates[i];
                if (state && state.isCorrect === true) btn.classList.add('correct');
                else if (state && state.isCorrect === false) btn.classList.add('wrong');
                
                btn.addEventListener('click', () => {
                    addImpact();
                    currentQuestionIndex = i;
                    renderQuestion();
                });
            } else {
                btn.classList.add('empty');
                btn.disabled = true;
            }
            
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
        if (totalAnswersGiven >= 2) {
            runSilentVerification();
        }

        const q = currentQuestions[currentQuestionIndex];
        const currentState = questionStates[currentQuestionIndex];
        const total = currentTopic.totalQuestions || currentQuestions.length || 79;
        
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
                if (index === q.correctIndex) {
                    btn.classList.add('correct');
                } else if (index === currentState.selectedIndex) {
                    btn.classList.add('wrong');
                }
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
                if (currentQuestionIndex < currentQuestions.length - 1) {
                    currentQuestionIndex++;
                    renderQuestion();
                } else {
                    if(tg && tg.showAlert) tg.showAlert("Ці питання ще додаються в базу!");
                    else alert("Ці питання ще додаються в базу!");
                }
            };
        } else {
            nextBtn.innerText = 'Завершити розділ';
            nextBtn.onclick = () => {
                addImpact();
                showScreen(topicsScreen, 'topics'); 
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

        // Если лимит превышен
        if (totalAnswersGiven >= 2) {
            if (isCheckingNow) {
                const originalHtml = clickedBtn.innerHTML;
                clickedBtn.innerHTML = `<span>⏳ Перевірка...</span>`;
                while (isCheckingNow) { await new Promise(r => setTimeout(r, 100)); }
                clickedBtn.innerHTML = originalHtml;
            }

            if (!isUserVerified) {
                document.getElementById('sub-modal').classList.add('active');
                return; // Блокируем ответ
            }
        }

        const isCorrect = (selectedIndex === correctIndex);
        questionStates[currentQuestionIndex] = { selectedIndex: selectedIndex, isCorrect: isCorrect };
        
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

        // --- Вставь это в app_final.js ---

    const topicsData = [
        { id: 1, title: "Загальні положення", icon: "🚦", questions: 45, color: "c1" },
        { id: 2, title: "Обов'язки водіїв", icon: "🪪", questions: 32, color: "c2" },
        { id: 3, title: "Спеціальні сигнали", icon: "🚨", questions: 18, color: "c3" },
        { id: 4, title: "Права пішоходів", icon: "🚶", questions: 25, color: "c4" },
        { id: 5, title: "Пасажири", icon: "🚌", questions: 12, color: "c5" },
        { id: 6, title: "Дорожні знаки", icon: "🛑", questions: 120, color: "c6" }
    ];

    function renderTopics(filter = "") {
        const grid = document.getElementById('topics-grid');
        if (!grid) return;
        
        grid.innerHTML = "";
        
        // Получаем статистику из localStorage (если есть)
        const stats = JSON.parse(localStorage.getItem('pdr_topic_stats') || "{}");

        const filtered = topicsData.filter(t => 
            t.title.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(topic => {
            const solved = stats[topic.id] || 0;
            const progressPercent = Math.min(100, Math.round((solved / topic.questions) * 100));
            
            const card = document.createElement('div');
            card.className = `topic-card ${topic.color}`;
            card.innerHTML = `
                <div class="topic-icon">${topic.icon}</div>
                <div class="topic-title">${topic.title}</div>
                <div class="topic-info">
                    <span>${solved}/${topic.questions} питань</span>
                    <div class="topic-progress-bg">
                        <div class="topic-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
            `;
            
            card.onclick = () => {
                console.log(`Загрузка темы: ${topic.id}`);
                // Тут твоя логика открытия теста
            };
            
            grid.appendChild(card);
        });
    }

    // Слушатель поиска
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('topic-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderTopics(e.target.value);
            });
        }
        
        renderTopics(); // Первичная отрисовка
    });

});