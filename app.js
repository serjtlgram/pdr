// ==========================================
// 1. БАЗА ДАННЫХ ПДД
// ==========================================
const pdrData = {
    topics: [
        { 
            id: "topic_1", 
            title: "1. Загальні положення", 
            description: "Основні терміни та поняття", 
            icon: "📖" 
        }
    ],
    questions: [
        {
            id: 1,
            topicId: "topic_1", 
            text: "1.1. Трамвайна колія – елемент дороги, призначений для руху рейкових транспортних засобів, який обмежується по ширині:",
            image: "img-quest/1.1.webp",
            options: [
                "Спеціально виділеним вимощенням.",
                "Дорожньою розміткою.",
                "Відповіді, зазначені в пунктах 1 та 2."
            ],
            correctIndex: 2 
        }
    ]
};

// ==========================================
// 2. ИНИЦИАЛИЗАЦИЯ И ЛОГИКА
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    const btnStart = document.getElementById('btn-start-learning');
    const btnBackHome = document.getElementById('btn-back-home');
    
    // Экраны
    const homeScreen = document.getElementById('home-screen');
    const topicsScreen = document.getElementById('topics-screen');
    const quizScreen = document.getElementById('quiz-screen');
    
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    
    // Переменная для отслеживания текущего экрана (для кнопки Назад)
    let currentScreenName = 'home';

    // --- 2.1 Настройка Telegram WebApp ---
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

        // Настройка родной кнопки "Назад" в Telegram
        if (tg.BackButton) {
            tg.BackButton.onClick(() => goBack());
        }
    } else {
        window.addImpact = function() {}; 
    }

    // --- 2.2 Переключение тем ---
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

    // --- 2.3 SPA Навигация ---
    function showScreen(screenToShow, screenName) {
        homeScreen.classList.remove('active');
        topicsScreen.classList.remove('active');
        quizScreen.classList.remove('active');
        
        screenToShow.classList.add('active');
        window.scrollTo(0, 0);

        currentScreenName = screenName;

        // Управляем отображением нативной кнопки TG Назад
        if (tg && tg.BackButton) {
            if (currentScreenName === 'home') {
                tg.BackButton.hide();
            } else {
                tg.BackButton.show();
            }
        }
    }

    // Общая функция "Назад"
    function goBack() {
        addImpact();
        if (currentScreenName === 'quiz') {
            showScreen(topicsScreen, 'topics');
        } else if (currentScreenName === 'topics') {
            showScreen(homeScreen, 'home');
        }
    }

    // Подключаем кнопки "Назад" для ПК-версии
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

    // --- 2.4 Отрисовка тем ---
    function renderTopics() {
        const topicsList = document.getElementById('topics-list');
        topicsList.innerHTML = ''; 

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

    // --- 2.5 Логика Теста ---
    function startQuiz(topic) {
        document.getElementById('quiz-topic-name').innerText = topic.title;
        currentQuestions = pdrData.questions.filter(q => q.topicId === topic.id);
        currentQuestionIndex = 0;
        
        if (currentQuestions.length > 0) {
            renderQuestion();
            showScreen(quizScreen, 'quiz');
        } else {
            if(tg) tg.showAlert("Питання для цього розділу ще не додані!");
            else alert("Питання для цього розділу ще не додані!");
        }
    }

    function renderQuestion() {
        const q = currentQuestions[currentQuestionIndex];
        
        document.getElementById('current-q-num').innerText = currentQuestionIndex + 1;
        document.getElementById('total-q-num').innerText = currentQuestions.length;
        document.getElementById('quiz-question-text').innerText = q.text;
        
        const imgEl = document.getElementById('quiz-image');
        imgEl.src = q.image;
        
        // Если картинки нет, скрываем блок, и блок с ответами растянется на 100% ширины
        imgEl.parentElement.style.display = q.image ? 'block' : 'none';

        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';

        q.options.forEach((optionText, index) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<span class="option-number">${index + 1}</span> <span>${optionText}</span>`;
            
            btn.addEventListener('click', () => handleAnswer(btn, index, q.correctIndex));
            optionsContainer.appendChild(btn);
        });

        document.getElementById('btn-next-question').style.display = 'none';
    }

    function handleAnswer(clickedBtn, selectedIndex, correctIndex) {
        addImpact(); 
        
        const allBtns = document.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.disabled = true);

        if (selectedIndex === correctIndex) {
            clickedBtn.classList.add('correct');
        } else {
            clickedBtn.classList.add('wrong');
            allBtns[correctIndex].classList.add('correct');
        }

        const nextBtn = document.getElementById('btn-next-question');
        if (currentQuestionIndex < currentQuestions.length - 1) {
            nextBtn.innerText = 'Наступне питання →';
            nextBtn.style.display = 'block';
            nextBtn.onclick = () => {
                addImpact();
                currentQuestionIndex++;
                renderQuestion();
            };
        } else {
            nextBtn.innerText = 'Завершити розділ';
            nextBtn.style.display = 'block';
            nextBtn.onclick = () => {
                addImpact();
                showScreen(topicsScreen, 'topics'); 
            };
        }
    }

});