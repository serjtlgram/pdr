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

    // 3. ЛОГИКА ПОДПИСКИ
    let totalAnswersGiven = parseInt(localStorage.getItem('pdr_answers_count') || '0');
    
    // ИСПРАВЛЕНИЕ: Если ответов >= 2, по умолчанию считаем пользователя НЕВЕРИФИЦИРОВАННЫМ
    let isUserVerified = (totalAnswersGiven < 2); 
    let isCheckingNow = false; // Статус: идет ли запрос к серверу прямо сейчас

    // Запускаем проверку сразу при входе, если лимит исчерпан
    if (totalAnswersGiven >= 2) {
        runSilentVerification();
    }

    async function runSilentVerification() {
        if (!userId || isCheckingNow) return;
        isCheckingNow = true;

        try {
            const response = await fetch(`https://pdrua.duckdns.org/check-sub?user_id=${userId}`);
            const data = await response.json();
            
            // Проверяем ответ от сервера
            isUserVerified = (data.is_subscribed === true);
        } catch (error) {
            console.error("Помилка бэкенда:", error);
            // Если сервер упал — не мучаем пользователя, пускаем
            isUserVerified = true; 
        } finally {
            isCheckingNow = false;
        }
    }

    // --- Обработка клика на ответ ---
    async function handleAnswer(clickedBtn, selectedIndex, correctIndex) {
        if (typeof addImpact === 'function') addImpact(); 
        
        let answersCount = parseInt(localStorage.getItem('pdr_answers_count') || '0');

        // Если лимит превышен
        if (answersCount >= 2) {
            // Если проверка еще в процессе или вернула "не подписан"
            if (isCheckingNow) {
                const originalHtml = clickedBtn.innerHTML;
                clickedBtn.innerHTML = `<span>⏳ Перевірка...</span>`;
                // Ждем окончания запроса
                while (isCheckingNow) { await new Promise(r => setTimeout(r, 100)); }
                clickedBtn.innerHTML = originalHtml;
            }

            if (!isUserVerified) {
                document.getElementById('sub-modal').classList.add('active');
                return; // Блокируем ответ
            }
        }

        // Если всё ок — засчитываем ответ
        const isCorrect = (selectedIndex === correctIndex);
        questionStates[currentQuestionIndex] = { selectedIndex, isCorrect };
        
        if (answersCount < 2) {
            answersCount++;
            localStorage.setItem('pdr_answers_count', answersCount.toString());
        }

        renderQuestion();

        // Скролл вниз к пояснениям
        setTimeout(() => {
            const wrapper = document.getElementById('quiz-explanation-wrapper');
            if (wrapper && wrapper.style.display !== 'none') {
                wrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }, 100);
    }

    // Кнопка в модальном окне
    document.getElementById('btn-check-sub').addEventListener('click', async () => {
        const btn = document.getElementById('btn-check-sub');
        btn.innerText = "Перевіряю...";
        await runSilentVerification();
        if (isUserVerified) {
            document.getElementById('sub-modal').classList.remove('active');
        } else {
            if(tg && tg.showAlert) tg.showAlert("Ви ще не підписані!");
        }
        btn.innerText = "Я підписався! Перевірити";
    });

    // --- Дальше вставь свои функции: renderQuestion, renderTopics, startQuiz, renderNavBar и т.д. ---
    // Обязательно убедись, что внутри renderQuestion() при создании кнопок вариантов ответа 
    // вызывается именно handleAnswer(btn, index, q.correctIndex)
    
    // ... (твой остальной код из прошлого файла) ...
});