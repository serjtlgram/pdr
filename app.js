// ==========================================
// ИНИЦИАЛИЗАЦИЯ И ЛОГИКА
// ==========================================
// Берем базу данных из внешнего файла data.js
const pdrData = window.pdrData;

document.addEventListener("DOMContentLoaded", () => {
    
    const btnStart = document.getElementById('btn-start-learning');
    const btnBackHome = document.getElementById('btn-back-home');
    
    // Экраны
    const homeScreen = document.getElementById('home-screen');
    const topicsScreen = document.getElementById('topics-screen');
    const quizScreen = document.getElementById('quiz-screen');
    
    // Состояние теста
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let currentScreenName = 'home';
    
    // Массив для хранения ответов пользователя (чтобы сохранять цвета квадратиков)
    let questionStates = []; // формат: { selectedIndex: number|null, isCorrect: boolean|null }

    // --- Настройка Telegram WebApp ---
    const tg = window.Telegram ? window.Telegram.WebApp : null;

    if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('bg_color');

        window.addImpact = function() {
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
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
            tg.BackButton.onClick(() => goBack());
        }
    } else {
        window.addImpact = function() {}; 
    }

    // --- Переключение тем ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    themeToggleBtn.addEventListener('click', () => {
        addImpact();
        document.body.classList.toggle('light-theme');
        
        if (document.body.classList.contains('light-theme')) {
            themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
        } else {
            themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
        }
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
            if (currentScreenName === 'home') tg.BackButton.hide();
            else tg.BackButton.show();
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

    // Клик по названию раздела тоже возвращает назад
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

        if (!pdrData || !pdrData.topics) {
            console.error("База данных билетов не загружена!");
            return;
        }

        pdrData.topics.forEach(topic => {
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
        document.getElementById('quiz-topic-name').innerText = topic.title;
        currentQuestions = pdrData.questions.filter(q => q.topicId === topic.id);
        currentQuestionIndex = 0;
        
        // Создаем чистый лист ответов для текущей сессии
        questionStates = currentQuestions.map(() => ({ selectedIndex: null, isCorrect: null }));
        
        if (currentQuestions.length > 0) {
            renderQuestion();
            showScreen(quizScreen, 'quiz');
        } else {
            if(tg) tg.showAlert("Питання для цього розділу ще не додані!");
            else alert("Питання для цього розділу ще не додані!");
        }
    }

    // Отрисовка скролл-панели с квадратиками
    function renderNavBar() {
        const navBar = document.getElementById('question-nav-bar');
        navBar.innerHTML = '';

        currentQuestions.forEach((_, idx) => {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.innerText = idx + 1;
            
            // Добавляем классы состояний
            if (idx === currentQuestionIndex) btn.classList.add('active');
            
            const state = questionStates[idx];
            if (state.isCorrect === true) btn.classList.add('correct');
            else if (state.isCorrect === false) btn.classList.add('wrong');
            
            // Переход по клику на любой вопрос
            btn.addEventListener('click', () => {
                addImpact();
                currentQuestionIndex = idx;
                renderQuestion();
            });
            
            navBar.appendChild(btn);
        });

        // Авто-прокрутка к активному квадратику
        const activeBtn = navBar.querySelector('.active');
        if (activeBtn) {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }

    function renderQuestion() {
        const q = currentQuestions[currentQuestionIndex];
        const currentState = questionStates[currentQuestionIndex];
        
        document.getElementById('current-q-num').innerText = currentQuestionIndex + 1;
        document.getElementById('total-q-num').innerText = currentQuestions.length;
        document.getElementById('quiz-question-text').innerText = q.text;
        
        // Обновляем квадратики навигации
        renderNavBar();
        
        const imgEl = document.getElementById('quiz-image');
        imgEl.src = q.image;
        imgEl.parentElement.style.display = q.image ? 'block' : 'none';

        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';

        // Отрисовка вариантов ответа
        q.options.forEach((optionText, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<span class="option-number">${index + 1}</span> <span>${optionText}</span>`;
            
            // Если вопрос уже был отвечен ранее, сразу показываем правильный/неправильный ответ
            if (currentState.selectedIndex !== null) {
                btn.disabled = true;
                if (index === q.correctIndex) {
                    btn.classList.add('correct');
                } else if (index === currentState.selectedIndex) {
                    btn.classList.add('wrong');
                }
            } else {
                // Иначе вешаем обработчик клика
                btn.addEventListener('click', () => handleAnswer(btn, index, q.correctIndex));
            }
            
            optionsContainer.appendChild(btn);
        });

        const nextBtn = document.getElementById('btn-next-question');
        const explanationWrapper = document.getElementById('quiz-explanation-wrapper');

        // Логика отображения кнопки "Наступне питання" и Спойлеров
        if (currentState.selectedIndex !== null) {
            // Если отвечено - показываем кнопку и спойлеры
            if (currentQuestionIndex < currentQuestions.length - 1) {
                nextBtn.innerText = 'Наступне питання →';
                nextBtn.style.display = 'block';
                nextBtn.onclick = () => { addImpact(); currentQuestionIndex++; renderQuestion(); };
            } else {
                nextBtn.innerText = 'Завершити розділ';
                nextBtn.style.display = 'block';
                nextBtn.onclick = () => { addImpact(); showScreen(topicsScreen, 'topics'); };
            }

            // Настройка спойлеров
            if (explanationWrapper && (q.ruleText || q.explanationText)) {
                const detailsRule = document.getElementById('details-rule');
                const detailsExplanation = document.getElementById('details-explanation');
                
                explanationWrapper.style.display = 'flex';
                
                if (q.ruleText && detailsRule) {
                    document.getElementById('quiz-rule-text').innerHTML = q.ruleText;
                    detailsRule.style.display = 'block';
                    detailsRule.removeAttribute('open'); // Свернут по умолчанию
                } else if (detailsRule) {
                    detailsRule.style.display = 'none';
                }
                
                if (q.explanationText && detailsExplanation) {
                    document.getElementById('quiz-explanation-text').innerHTML = q.explanationText;
                    detailsExplanation.style.display = 'block';
                    detailsExplanation.removeAttribute('open'); // Свернут по умолчанию
                } else if (detailsExplanation) {
                    detailsExplanation.style.display = 'none';
                }
            }
        } else {
            // Если вопрос еще не отвечен - прячем кнопку "Далее" и спойлеры
            nextBtn.style.display = 'none';
            if (explanationWrapper) explanationWrapper.style.display = 'none';
        }
    }

    function handleAnswer(clickedBtn, selectedIndex, correctIndex) {
        addImpact(); 
        
        // Записываем результат в состояние
        const isCorrect = (selectedIndex === correctIndex);
        questionStates[currentQuestionIndex] = { selectedIndex: selectedIndex, isCorrect: isCorrect };
        
        // Перерисовываем экран (кнопки заблокируются, цвета обновятся, появятся спойлеры и кнопка Далее)
        renderQuestion();
    }

});