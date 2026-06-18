// ==========================================
// РРќРР¦РРђР›РР—РђР¦РРЇ Р Р›РћР“РРљРђ (РџРћР›РќРђРЇ Р’Р•Р РЎРРЇ РЎ РЎР•Р Р’Р•Р РћРњ).
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    
    // --- Р‘Р°Р·РѕРІРёР№ URL Р±РµРєРµРЅРґСѓ: Р·РјС–РЅСЋРІР°С‚Рё РўР†Р›Р¬РљР РўРЈРў РїСЂРё Р·РјС–РЅС– С…РѕСЃС‚Р° ---
    const API_BASE = 'https://pdrua.duckdns.org';

    // --- РќР°СЃС‚СЂРѕР№РєР° Telegram WebApp ---
    const tg = window.Telegram ? window.Telegram.WebApp : null;
    const tgUser = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
    
    // --- РђР’РўРћРњРђРўРР§РќР• Р”РћР”РђР’РђРќРќРЇ РђР’РўРћР РР—РђР¦Р†Р‡ Р”Рћ Р’РЎР†РҐ Р—РђРџРРўР†Р’ ---
    const originalFetch = window.fetch;
    window.fetch = function(resource, config) {
        if (typeof resource === 'string' && resource.startsWith(API_BASE)) {
            config = config || {};
            // РџРµСЂРµС‚РІРѕСЂСЋС”РјРѕ Headers-РѕР±'С”РєС‚ Сѓ Р·РІРёС‡Р°Р№РЅРёР№ РѕР±'С”РєС‚, СЏРєС‰Рѕ РїРѕС‚СЂС–Р±РЅРѕ
            if (config.headers instanceof Headers) {
                const plainHeaders = {};
                config.headers.forEach((value, key) => { plainHeaders[key] = value; });
                config.headers = plainHeaders;
            } else {
                config.headers = config.headers || {};
            }
            if (tg && tg.initData) {
                config.headers['Authorization'] = 'tma ' + tg.initData;
            } else {
                console.warn('[Auth] tg.initData РІС–РґСЃСѓС‚РЅС–Р№ вЂ” Р·Р°РїРёС‚ Р±РµР· Р°РІС‚РѕСЂРёР·Р°С†С–С—:', resource);
            }
        }
        return originalFetch(resource, config);
    };

    const userId = tgUser ? tgUser.id : null; 
    const FREE_ANSWERS_LIMIT = 10;
    let isUserPro = false;
    const PRO_TOPICS = ["topic_8", "topic_8.2", "topic_16.1", "topic_16.2", "topic_18", "topic_20", "topic_21", "topic_27", "topic_33.1", "topic_33.2", "topic_33.3", "topic_33.4", "topic_33.5", "topic_33.6", "topic_33.7", "topic_33.8", "topic_37"];


    // 1. Р‘Р›РћРљРР РћР’РљРђ РџРћР—Рђ TELEGRAM
    if (!tgUser && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        document.getElementById('not-tg-blocker').classList.add('active');
        document.getElementById('app-container').style.display = 'none';
        return; 
    }

    // --- РќРћР’Рђ Р¤РЈРќРљР¦Р†РЇ: РџР»Р°С€РєРё PRO РЅР° РіРѕР»РѕРІРЅРѕРјСѓ РµРєСЂР°РЅС– ---
    function updateHomeScreenProBadges() {
        const hardIcon = document.querySelector('#card-hard .card-icon');
        const favIcon = document.querySelector('#card-favorites .card-icon');
        
        // Р’РёРґР°Р»СЏС”РјРѕ СЃС‚Р°СЂС– РїР»Р°С€РєРё, СЏРєС‰Рѕ РІРѕРЅРё С”
        document.querySelectorAll('.home-pro-badge').forEach(el => el.remove());

        // РЇРєС‰Рѕ СЋР·РµСЂ РќР• Pro, РІС–С€Р°С”РјРѕ РїР»Р°С€РєРё
        if (!isUserPro) {
            const badgeHTML = `<div class="home-pro-badge" style="position:absolute; top:-8px; right:-8px; background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; font-size: 0.65rem; font-weight: 800; padding: 4px 8px; border-radius: 8px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.4); z-index: 2; letter-spacing: 0.5px;">PRO</div>`;
            
            if (hardIcon) {
                hardIcon.style.position = 'relative';
                hardIcon.insertAdjacentHTML('beforeend', badgeHTML);
            }
            if (favIcon) {
                favIcon.style.position = 'relative';
                favIcon.insertAdjacentHTML('beforeend', badgeHTML);
            }
        }
    }

    // Р—Р±РµСЂС–РіР°С”РјРѕ С‡Р°СЃ РѕСЃС‚Р°РЅРЅСЊРѕРіРѕ С–СЃРїРёС‚Сѓ РІ РіР»РѕР±Р°Р»СЊРЅСѓ Р·РјС–РЅРЅСѓ РґР»СЏ РєР»С–С”РЅС‚Р°
    let lastExamTimeFromServer = 0;

    // --- РРќРР¦РРђР›РР—РђР¦РРЇ РџРћР›Р¬Р—РћР’РђРўР•Р›РЇ РќРђ РЎР•Р Р’Р•Р Р• ---
    if (tgUser) {
        fetch(`${API_BASE}/init-user', {
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
            if (data && typeof data.answers_count !== 'undefined') {
                totalAnswersGiven = data.answers_count;
                // removed invalid verification check
            }
            if (data && typeof data.last_exam_time !== 'undefined') {
                lastExamTimeFromServer = data.last_exam_time;
            }
            updateHomeScreenProBadges();
        })
        .catch(err => console.error("РџРѕРјРёР»РєР° С–РЅС–С†С–Р°Р»С–Р·Р°С†С–С— РєРѕСЂРёСЃС‚СѓРІР°С‡Р°:", err));
    } else {
        updateHomeScreenProBadges();
    }

    // --- РџР Р•Р”Р—РђР“Р РЈР—РљРђ Р РђР—Р”Р•Р›РћР’ Р’ Р¤РћРќР• ---
    // РќР°С‡РёРЅР°РµРј РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ СЃСЂР°Р·Сѓ РїСЂРё РѕС‚РєСЂС‹С‚РёРё РјРёРЅРё-Р°РїРїР° Рё СЃРѕС…СЂР°РЅСЏРµРј СЌС‚РѕС‚ РїСЂРѕС†РµСЃСЃ
    let topicsPromise = fetch(`${API_BASE}/api/topics')
        .then(res => res.json())
        .catch(err => console.error("РџРѕРјРёР»РєР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ СЂРѕР·РґС–Р»С–РІ:", err));
        
    topicsPromise.then(data => { 
        if (data && data.length > 0) globalTopics = data; 
    });

    // 2. РђР’РђРўРђР РљРђ
    const avatarContainer = document.getElementById('user-avatar-container');
    const avatarImg = document.getElementById('user-avatar-img');
    
    if (tgUser && avatarContainer) {
        avatarContainer.style.display = 'flex';
        if (tgUser.photo_url) {
            avatarImg.src = tgUser.photo_url;
            avatarImg.style.display = 'block';
        } else {
            avatarImg.style.display = 'none';
            avatarContainer.innerHTML = tgUser.first_name ? tgUser.first_name.charAt(0).toUpperCase() : 'рџ‘¤';
        }
    } else if (avatarContainer) {
        avatarContainer.style.display = 'flex';
        avatarImg.style.display = 'none';
        avatarContainer.innerHTML = 'рџ‘¤';
    }

    // РћСЃРЅРѕРІРЅС‹Рµ РїРµСЂРµРјРµРЅРЅС‹Рµ РёРЅС‚РµСЂС„РµР№СЃР°
    const btnStart = document.getElementById('btn-start-learning');
    const btnBackHome = document.getElementById('btn-back-home');
    const homeScreen = document.getElementById('home-screen');
    const topicsScreen = document.getElementById('topics-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const examScreen = document.getElementById('exam-screen');
    
    // РЎРѕСЃС‚РѕСЏРЅРёРµ С‚РµСЃС‚Р° Рё РіР»РѕР±Р°Р»СЊРЅС‹Рµ РїРµСЂРµРјРµРЅРЅС‹Рµ
    let currentTopic = null; 
    let currentQuestions =[];
    let currentQuestionIndex = 0;
    let currentScreenName = 'home';
    let questionStates =[]; 
    let isLoadingQuestions = false; // Р¤Р»Р°Рі Р·Р°РіСЂСѓР·РєРё РІРѕРїСЂРѕСЃРѕРІ
    let noMoreQuestionsOnServer = false; // Р¤Р»Р°Рі, РµСЃР»Рё РІРѕРїСЂРѕСЃС‹ РІ Р±Р°Р·Рµ Р·Р°РєРѕРЅС‡РёР»РёСЃСЊ

    // Р РµР·РµСЂРІРЅР°СЏ РєРѕРїРёСЏ СЂР°Р·РґРµР»РѕРІ РґР»СЏ РјРѕРјРµРЅС‚Р°Р»СЊРЅРѕР№ Р·Р°РіСЂСѓР·РєРё
    let globalTopics =[]; // РќРёРєР°РєРёС… Р·Р°РіРѕС‚РѕРІРѕРє, С‚РѕР»СЊРєРѕ РїСѓСЃС‚РѕР№ РјР°СЃСЃРёРІ

    // 3. Р›РћР“РРљРђ РџРћР”РџРРЎРљР
    let totalAnswersGiven = parseInt(localStorage.getItem('pdr_answers_count') || '0');
    let isUserVerified = false; 
    let isCheckingNow = false;

    // --- РќР°СЃС‚СЂРѕР№РєРё Telegram UI ---
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

    // --- РџРµСЂРµРєР»СЋС‡РµРЅРёРµ С‚РµРј ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const cyberToggleBtn = document.getElementById('cyber-toggle'); // РќРѕРІР°СЏ РєРЅРѕРїРєР°
    const themeIcon = document.getElementById('theme-icon');

    const iconMoon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    const iconSun = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';

    // Р’РѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ С‚РµРјС‹ РїСЂРё Р·Р°РіСЂСѓР·РєРµ
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

    // --- РЈРќР†Р’Р•Р РЎРђР›Р¬РќРђ РљРђРЎРўРћРњРќРђ РњРћР”РђР›РљРђ РџР†Р”РўР’Р•Р Р”Р–Р•РќРќРЇ ---
    let confirmCallback = null;

    function showCustomConfirm(options) {
        const iconContainer = document.getElementById('confirm-icon-container');
        iconContainer.innerHTML = options.icon;
        iconContainer.style.color = options.color;
        iconContainer.style.background = options.bgColor;
        
        document.getElementById('confirm-title').innerText = options.title;
        document.getElementById('confirm-desc').innerText = options.desc;
        
        const okBtn = document.getElementById('btn-confirm-ok');
        okBtn.innerText = options.okText || 'РћРљ';
        
        // РЇРєС‰Рѕ С†Рµ РЅРµР±РµР·РїРµС‡РЅР° РґС–СЏ (РІРёРґР°Р»РµРЅРЅСЏ, РїРµСЂРµСЂРёРІР°РЅРЅСЏ), СЂРѕР±РёРјРѕ РєРЅРѕРїРєСѓ С‡РµСЂРІРѕРЅРѕСЋ
        if (options.isDanger) {
            okBtn.style.background = 'var(--c-danger)';
            okBtn.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.3)';
        } else {
            okBtn.style.background = ''; // РџРѕРІРµСЂС‚Р°С”РјРѕ СЃС‚Р°РЅРґР°СЂС‚РЅРёР№ РіСЂР°РґС–С”РЅС‚
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

    // Р›РѕРіРёРєР° РєРЅРѕРїРєРё РљРёР±РµСЂРїР°РЅРє
    if (cyberToggleBtn) {
        cyberToggleBtn.addEventListener('click', () => {
            addImpact();
            const isCyber = document.body.classList.contains('cyber-theme');
            
            document.body.classList.remove('light-theme'); // Р’С‹РєР»СЋС‡Р°РµРј СЃРІРµС‚Р»СѓСЋ РІ Р»СЋР±РѕРј СЃР»СѓС‡Р°Рµ
            themeIcon.innerHTML = iconSun; // Р’РѕР·РІСЂР°С‰Р°РµРј РёРєРѕРЅРєСѓ СЃРѕР»РЅС†Р° РґР»СЏ Р±Р°Р·РѕРІРѕР№ С‚РµРјРЅРѕР№

            if (isCyber) {
                document.body.classList.remove('cyber-theme'); // Р’РѕР·РІСЂР°С‚ Рє РѕР±С‹С‡РЅРѕР№ С‚РµРјРЅРѕР№
                if (tg && tg.CloudStorage) tg.CloudStorage.setItem('app_theme', 'dark');
            } else {
                document.body.classList.add('cyber-theme'); // Р’РєР»СЋС‡Р°РµРј РєРёР±РµСЂРїР°РЅРє
                if (tg && tg.CloudStorage) tg.CloudStorage.setItem('app_theme', 'cyber');
            }
        });
    }

    // Р›РѕРіРёРєР° РѕР±С‹С‡РЅРѕР№ РєРЅРѕРїРєРё (РЎРІРµС‚Р»Р°СЏ/РўРµРјРЅР°СЏ)
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            addImpact();
            document.body.classList.remove('cyber-theme'); // РџСЂРё РєР»РёРєРµ СЃСЋРґР° РєРёР±РµСЂРїР°РЅРє РІСЃРµРіРґР° РІС‹РєР»СЋС‡Р°РµС‚СЃСЏ
            
            document.body.classList.toggle('light-theme');
            const isLightNow = document.body.classList.contains('light-theme');
            themeIcon.innerHTML = isLightNow ? iconMoon : iconSun;

            if (tg && tg.CloudStorage) {
                tg.CloudStorage.setItem('app_theme', isLightNow ? 'light' : 'dark');
            }
        });
    }

    // --- Р¤РѕРЅРѕРІР°СЏ РїСЂРѕРІРµСЂРєР° РїРѕРґРїРёСЃРєРё ---
    async function runSilentVerification() {
        if (!userId || isCheckingNow) return; 
        isCheckingNow = true;

        try {
            const response = await fetch(`${API_BASE}/check-sub?user_id=${userId}&t=${Date.now()}`);
            const data = await response.json();
            isUserVerified = (data.is_subscribed === true || data.is_subbed === true);
        } catch (error) {
            console.error("РџРѕРјРёР»РєР° Р±СЌРєРµРЅРґР°:", error);
            isUserVerified = false; // FAIL-CLOSED
        } finally {
            isCheckingNow = false;
        }
    }

    const subModal = document.getElementById('sub-modal');
    const btnCheckSub = document.getElementById('btn-check-sub');
    if (btnCheckSub) {
        btnCheckSub.addEventListener('click', async () => {
            addImpact();
            btnCheckSub.innerText = "РџРµСЂРµРІС–СЂСЏСЋ...";
            btnCheckSub.disabled = true;

            await runSilentVerification();

            if (isUserVerified) {
                subModal.classList.remove('active'); 
            } else {
                if(tg && tg.showAlert) tg.showAlert("Р’Рё С‰Рµ РЅРµ РїС–РґРїРёСЃР°РЅС–! РџРµСЂРµР№РґС–С‚СЊ Р·Р° РїРѕСЃРёР»Р°РЅРЅСЏРј С‚Р° РїС–РґРїРёС€С–С‚СЊСЃСЏ.");
                else alert("Р’Рё С‰Рµ РЅРµ РїС–РґРїРёСЃР°РЅС–!");
            }

            btnCheckSub.innerText = "РЇ РїС–РґРїРёСЃР°РІСЃСЏ! РџРµСЂРµРІС–СЂРёС‚Рё";
            btnCheckSub.disabled = false;
        });
    }

    // --- РќРћР’РР™ РљРћР”: Р—Р°РїСѓСЃРєР°С”РјРѕ С‚РёС…Сѓ РїРµСЂРµРІС–СЂРєСѓ РІС–РґСЂР°Р·Сѓ РїСЂРё СЃС‚Р°СЂС‚С– РґРѕРґР°С‚РєСѓ РґР»СЏ РІСЃС–С… ---
    setTimeout(runSilentVerification, 100); // Р—Р°РїСѓСЃРєР°С”РјРѕ РјР°Р№Р¶Рµ РјРёС‚С‚С”РІРѕ Сѓ С„РѕРЅС–

    // --- SPA РќР°РІРёРіР°С†РёСЏ ---
    function showScreen(screenToShow, screenName) {
        homeScreen.classList.remove('active');
        topicsScreen.classList.remove('active');
        quizScreen.classList.remove('active');
        if (examScreen) examScreen.classList.remove('active'); // <--- Р”РћР”РђР™ Р¦Р•Р™ Р РЇР”РћРљ

        screenToShow.classList.add('active');
        window.scrollTo(0, 0);

        currentScreenName = screenName;

        // --- РќРћР’Р•: РљРµСЂСѓРІР°РЅРЅСЏ РЅРёР¶РЅСЊРѕСЋ РїР°РЅРµР»Р»СЋ ---
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) {
            if (screenName === 'home') {
                bottomNav.style.display = 'none'; // РҐРѕРІР°С”РјРѕ РЅР° РіРѕР»РѕРІРЅС–Р№
            } else {
                bottomNav.style.display = 'flex'; // РџРѕРєР°Р·СѓС”РјРѕ РЅР° РІСЃС–С… С–РЅС€РёС…
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
            // РџРµСЂРµРІС–СЂСЏС”РјРѕ, С‡Рё РјРё РІ СЂРµР¶РёРјС– "РћР±СЂР°РЅРµ"
            if (currentTopic && currentTopic.id === 'favorites_mode') {
                renderFavoriteTopics(); // РџРѕРІРµСЂС‚Р°С”РјРѕСЃСЊ РґРѕ СЃРїРёСЃРєСѓ РѕР±СЂР°РЅРёС… СЂРѕР·РґС–Р»С–РІ
            } else {
                showScreen(topicsScreen, 'topics');
                renderTopics(); // РџРѕРІРµСЂС‚Р°С”РјРѕСЃСЊ РґРѕ Р·РІРёС‡Р°Р№РЅРёС… СЂРѕР·РґС–Р»С–РІ
            }
        } else if (currentScreenName === 'topics' || currentScreenName === 'favorites_list') {
            showScreen(homeScreen, 'home'); // Р—С– СЃРїРёСЃРєСѓ СЂРѕР·РґС–Р»С–РІ РїРѕРІРµСЂС‚Р°С”РјРѕСЃСЊ РЅР° РіРѕР»РѕРІРЅСѓ
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

    // --- РљР»С–РєРё РїРѕ РЅРёР¶РЅС–Р№ РїР°РЅРµР»С– РЅР°РІС–РіР°С†С–С— ---
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
            if (!isUserPro) { showProModal(); return; } // <--- Р”РћР”РђР›Р
            
            if (globalTopics.length === 0) {
                if(topicsPromise) globalTopics = await topicsPromise;
                else {
                    const res = await fetch(`${API_BASE}/api/topics');
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
            if (!isUserPro) { showProModal(); return; } // <--- Р”РћР”РђР›Р
            
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
            startExamMode(); // Р—Р°РїСѓСЃРєР°РµРј СЌРєР·Р°РјРµРЅ
        });
    }

    if (cardHard) {
        cardHard.addEventListener('click', async () => {
            addImpact();
            if (!isUserPro) { showProModal(); return; } // <--- Р”РћР”РђР›Р
            
            if (globalTopics.length === 0) {
                if(topicsPromise) globalTopics = await topicsPromise;
                else {
                    const res = await fetch(`${API_BASE}/api/topics');
                    globalTopics = await res.json();
                }
            }
            startHardMode(); 
        });
    }

    if (cardFavorites) {
        cardFavorites.addEventListener('click', () => {
            addImpact();
            if (!isUserPro) { showProModal(); return; } // <--- Р”РћР”РђР›Р
            
            if (globalTopics.length === 0) return; // Р§РµРєР°С”РјРѕ Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ
            renderFavoriteTopics();
        });
    }

    const inactiveCategories = document.querySelectorAll('.category-btn.inactive');
    inactiveCategories.forEach(btn => {
        btn.addEventListener('click', () => {
            addImpact(); 
            const catName = btn.getAttribute('data-cat');
            const msg = `РљР°С‚РµРіРѕСЂС–СЏ "${catName}" Р·РЅР°С…РѕРґРёС‚СЊСЃСЏ РІ СЂРѕР·СЂРѕР±С†С–! рџљ§\n\nР—Р°СЂР°Р· РґР»СЏ РІРёРІС‡РµРЅРЅСЏ РґРѕСЃС‚СѓРїРЅР° С‚С–Р»СЊРєРё РєР°С‚РµРіРѕСЂС–СЏ "B" (Р›РµРіРєРѕРІС– Р°РІС‚РѕРјРѕР±С–Р»С–).`;
            if(tg && tg.showAlert) tg.showAlert(msg);
            else alert(msg);
        });
    });

    const modernIcons = {
        // 1. Р—Р°РіР°Р»СЊРЅС– РїРѕР»РѕР¶РµРЅРЅСЏ (РљРЅРёРіР°)
        "topic_1": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`, 
        
        // 2. РћР±РѕРІ'СЏР·РєРё С– РїСЂР°РІР° РІРѕРґС–С—РІ (РљРµСЂРјРѕ)
        "topic_2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v10M12 22v-6M4.93 4.93l4.24 4.24M19.07 19.07l-4.24-4.24M19.07 4.93l-4.24 4.24M4.93 19.07l4.24-4.24"/></svg>`, 
        
        // 3. РЎРїРµС†СЃРёРіРЅР°Р»Рё (РњР°СЏС‡РѕРє/Р”Р·РІС–РЅРѕРє)
        "topic_3": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M5.3 5.3l1.4 1.4M18.7 5.3l-1.4 1.4M12 22H7a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5h-5z"/></svg>`, 
        
        // 4. РџС–С€РѕС…РѕРґРё (Р›СЋРґРёРЅР°)
        "topic_4": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v7M9 18l3-4 3 4M8 11h8"/></svg>`, 
        
        // 5. РџР°СЃР°Р¶РёСЂРё (Р›СЋРґРё РІ Р°РІС‚Рѕ)
        "topic_5": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, 
        
        // 6. Р’РµР»РѕСЃРёРїРµРґРёСЃС‚Рё (Р’РµР»РѕСЃРёРїРµРґ)
        "topic_6": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>`, 
        
        // 7. Р“СѓР¶РѕРІРёР№ С‚СЂР°РЅСЃРїРѕСЂС‚ (РљРѕР»РµСЃРѕ РІРѕР·Р°)
        "topic_7": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2v8M12 14v8M2 12h8M14 12h8M4.9 4.9l5.7 5.7M13.4 13.4l5.7 5.7M4.9 19.1l5.7-5.7M13.4 10.6l5.7-5.7"/></svg>`, 
        
        // 8. Р РµРіСѓР»СЋРІР°РЅРЅСЏ РґРѕСЂРѕР¶РЅСЊРѕРіРѕ СЂСѓС…Сѓ (РЎРІС–С‚Р»РѕС„РѕСЂ)
        "topic_8": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="17" r="2"/></svg>`,

        // 8.2. Р РµРіСѓР»СЋРІР°РЅРЅСЏ РґРѕСЂРѕР¶РЅСЊРѕРіРѕ СЂСѓС…Сѓ (РќРµСЂРµРіСѓР»СЊРѕРІР°РЅС– РїРµСЂРµС…СЂРµСЃС‚СЏ / Р РµРіСѓР»СЋРІР°Р»СЊРЅРёРє) - РљР°С€РєРµС‚
        "topic_8.2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h18"/><path d="M6 14v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3"/><circle cx="12" cy="10" r="2"/></svg>`,

        // 9. РџРѕРїРµСЂРµРґР¶СѓРІР°Р»СЊРЅС– СЃРёРіРЅР°Р»Рё (Р—РЅР°Рє РѕРєР»РёРєСѓ РІ С‚СЂРёРєСѓС‚РЅРёРєСѓ)
        "topic_9": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,

        // 10. РџРѕС‡Р°С‚РѕРє СЂСѓС…Сѓ С‚Р° Р·РјС–РЅР° РЅР°РїСЂСЏРјРєСѓ (РЎС‚СЂС–Р»РєР° РјР°РЅРµРІСЂСѓ)
        "topic_10": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>`,

        // 11. Р РѕР·С‚Р°С€СѓРІР°РЅРЅСЏ РўР— РЅР° РґРѕСЂРѕР·С– (РЎРјСѓРіРё СЂСѓС…Сѓ / Р”РѕСЂРѕРіР° РІ РїРµСЂСЃРїРµРєС‚РёРІС–)
        "topic_11": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22L8 2"/><path d="M20 22L16 2"/><path d="M12 6v2"/><path d="M12 12v2"/><path d="M12 18v2"/></svg>`,

        // 12. РЁРІРёРґРєС–СЃС‚СЊ СЂСѓС…Сѓ (РЎРїС–РґРѕРјРµС‚СЂ)
        "topic_12": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 12l3-3"/><path d="M19.4 15a9 9 0 1 0-14.8 0"/></svg>`,

        // 13. Р”РёСЃС‚Р°РЅС†С–СЏ, С–РЅС‚РµСЂРІР°Р» (РЎС‚СЂС–Р»РєРё РІС–РґСЃС‚Р°РЅС–)
        "topic_13": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12H2"/><path d="M18 8l4 4-4 4"/><path d="M6 8l-4 4 4 4"/></svg>`,

        // 14. РћР±РіС–РЅ (РЎС‚СЂС–Р»РєР° РІРёРїРµСЂРµРґР¶РµРЅРЅСЏ)
        "topic_14": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21V3"/><polyline points="4 7 8 3 12 7"/><path d="M16 21v-8a4 4 0 0 0-4-4"/><polyline points="9 12 12 9 15 12"/></svg>`,

        // 15. Р—СѓРїРёРЅРєР° С– СЃС‚РѕСЏРЅРєР° (Р—РЅР°Рє РџР°СЂРєСѓРІР°РЅРЅСЏ "P")
        "topic_15": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`,

        // 16. РџСЂРѕС—Р·Рґ РїРµСЂРµС…СЂРµСЃС‚СЊ (РџРµСЂРµС‚РёРЅ РґРѕСЂС–Рі)
        "topic_16.1": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12H3"/><path d="M12 21V3"/><path d="M16 8l-4-4-4 4"/><path d="M8 16l4 4 4-4"/></svg>`,

        // 16.2. РџСЂРѕС—Р·Рґ РїРµСЂРµС…СЂРµСЃС‚СЊ (РќРµСЂРµРіСѓР»СЊРѕРІР°РЅС– РїРµСЂРµС…СЂРµСЃС‚СЏ) - Р—РЅР°Рє "Р“РѕР»РѕРІРЅР° РґРѕСЂРѕРіР°"
        "topic_16.2": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(45 12 12)"/><rect x="8.5" y="8.5" width="7" height="7" rx="1" transform="rotate(45 12 12)"/></svg>`,

        // 17. РџРµСЂРµРІР°РіРё РјР°СЂС€СЂСѓС‚РЅРёС… РўР— (РђРІС‚РѕР±СѓСЃ)
        "topic_17": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 18v2"/><path d="M18 18v2"/><path d="M2 12h20"/><path d="M6 12v-2"/><path d="M10 12v-2"/><path d="M14 12v-2"/><path d="M18 12v-2"/></svg>`,

        // 18. РџСЂРѕС—Р·Рґ РїС–С€РѕС…С–РґРЅРёС… РїРµСЂРµС…РѕРґС–РІ (Р›СЋРґРёРЅР° РЅР° Р·РµР±СЂС–)
        "topic_18": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M12 6v6"/><path d="M10 17l2-5 2 5"/><path d="M8 10h8"/><path d="M3 20h18"/><path d="M3 16h18"/></svg>`,

        // 19. РљРѕСЂРёСЃС‚СѓРІР°РЅРЅСЏ СЃРІС–С‚Р»РѕРІРёРјРё РїСЂРёР»Р°РґР°РјРё (Р¤Р°СЂР° / РЎРІС–С‚Р»Рѕ)
        "topic_19": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/></svg>`,

        // 20. Р СѓС… С‡РµСЂРµР· Р·Р°Р»С–Р·РЅРёС‡РЅС– РїРµСЂРµС—Р·РґРё (РџРѕС‚СЏРі)
        "topic_20": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M8 17l-2 4"/><path d="M16 17l2 4"/><circle cx="8" cy="11" r="1"/><circle cx="16" cy="11" r="1"/><path d="M4 7h16"/></svg>`
    };

    // --- 4. РћРўР РРЎРћР’РљРђ Р РђР—Р”Р•Р›РћР’ (РЎ РЎР•Р Р’Р•Р Рђ) ---
    async function renderTopics(filter = "") {
        const grid = document.getElementById('topics-grid');

        // РџРѕРІРµСЂС‚Р°С”РјРѕ СЃС‚Р°РЅРґР°СЂС‚РЅС– Р·Р°РіРѕР»РѕРІРєРё С‚Р° РїРѕС€СѓРє
        const titleEl = document.querySelector('#topics-screen .section-title');
        const subEl = document.querySelector('#topics-screen .screen-subtitle');
        const searchContainer = document.getElementById('search-container-block');
        
        if (titleEl) titleEl.innerText = "Р РѕР·РґС–Р»Рё РЅР°РІС‡Р°РЅРЅСЏ";
        if (subEl) subEl.innerText = "РћР±РµСЂС–С‚СЊ С‚РµРјСѓ РґР»СЏ РїС–РґРіРѕС‚РѕРІРєРё";
        if (searchContainer) searchContainer.style.display = 'flex';
        
        updateBottomNav('learning'); // РџС–РґСЃРІС–С‡СѓС”РјРѕ РІРєР»Р°РґРєСѓ "РќР°РІС‡Р°РЅРЅСЏ"

        if (!grid) return;
        
        if (globalTopics.length === 0) {
            grid.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; width: 100%;">
                    <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--c-border-soft)" stroke-width="3"></circle>
                        <path d="M12 2 A 10 10 0 0 1 22 12" fill="none" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"></path>
                    </svg>
                    <div style="color: var(--c-text-soft); font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 1.05rem; font-weight: 600; letter-spacing: 0.3px; opacity: 0.8;">
                        Р—Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ СЂРѕР·РґС–Р»С–РІ...
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
                    const response = await fetch(`${API_BASE}/api/topics');
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
                const infoText = `${answeredCount}/${totalQ} &bull; ${successRate}% РІС–СЂРЅРѕ`;
                const colorClass = `c${(index % 6) + 1}`;
                const iconHtml = modernIcons[topic.id] || `<span style="font-size: 1.5rem;">${topic.icon || "рџљ¦"}</span>`;

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
                        showProModal(); // Р’С‹Р·РѕРІРµРј РѕРєРЅРѕ РїРѕРєСѓРїРєРё
                        return;
                    }
                    startQuiz(topic);
                };
                
                grid.appendChild(card);
            });

        } catch (error) {
            console.error("РџРѕРјРёР»РєР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ СЂРѕР·РґС–Р»С–РІ:", error);
            grid.innerHTML = '<div style="text-align:center; color: var(--c-danger);">РџРѕРјРёР»РєР° Р·\'С”РґРЅР°РЅРЅСЏ Р· СЃРµСЂРІРµСЂРѕРј</div>';
        }
    }

    const searchInput = document.getElementById('topic-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderTopics(e.target.value));
    }

    // ==========================================
    // Р Р•Р–РРњ "Р†РЎРџРРў" (EXAM MODE)
    // ==========================================
    
    let examQuestions = [];
    let examState = {
        answers: new Array(20).fill(null), // Р’РёР±СЂР°РЅС– РІР°СЂС–Р°РЅС‚Рё (С–РЅРґРµРєСЃРё)
        saved: new Array(20).fill(false),  // Р§Рё РЅР°С‚РёСЃРЅСѓРІ РєРѕСЂРёСЃС‚СѓРІР°С‡ "Р—Р±РµСЂРµРіС‚Рё"
        currentIndex: 0,
        endTime: null,
        timerInterval: null,
        isActive: false
    };

    const EXAM_DURATION_MS = 20 * 60 * 1000; // 20 С…РІРёР»РёРЅ

    // РџСЂРёРІ'СЏР·РєР° РєРЅРѕРїРѕРє Р·Р°РїСѓСЃРєСѓ С–СЃРїРёС‚Сѓ
    if (navExam) {
        navExam.addEventListener('click', (e) => {
            e.preventDefault();
            addImpact();
            startExamMode(); // Р—Р°РїСѓСЃРєР°РµРј СЌРєР·Р°РјРµРЅ
        });
    }
    
    if (cardExam) {
        cardExam.addEventListener('click', startExamMode);
    }

    async function startExamMode() {
        addImpact();
        
        // --- РќРћР’Рђ Р›РћР“Р†РљРђ: РћР±РјРµР¶РµРЅРЅСЏ С–СЃРїРёС‚Сѓ (1 СЂР°Р· РЅР° С‚РёР¶РґРµРЅСЊ) ---
        if (!isUserPro) {
            const lastExamTime = lastExamTimeFromServer;
            const now = Date.now();
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000; // 7 РґРЅС–РІ Сѓ РјС–Р»С–СЃРµРєСѓРЅРґР°С…

            if (lastExamTime > 0 && (now - lastExamTime) < oneWeekMs) {
                // Р Р°С…СѓС”РјРѕ СЃРєС–Р»СЊРєРё РґРЅС–РІ Р·Р°Р»РёС€РёР»РѕСЃСЊ
                const timeLeftMs = oneWeekMs - (now - lastExamTime);
                const daysLeft = Math.ceil(timeLeftMs / (1000 * 60 * 60 * 24));
                
                // РџСЂР°РІРёР»СЊРЅРµ Р·Р°РєС–РЅС‡РµРЅРЅСЏ РґР»СЏ СЃР»РѕРІР° "РґРµРЅСЊ"
                let timeStr = '';
                if (daysLeft === 1) timeStr = '1 РґРµРЅСЊ';
                else if (daysLeft >= 2 && daysLeft <= 4) timeStr = `${daysLeft} РґРЅС–`;
                else timeStr = `${daysLeft} РґРЅС–РІ`;

                // РџРѕРєР°Р·СѓС”РјРѕ РєСЂР°СЃРёРІРµ РІС–РєРЅРѕ Р· РїСЂРѕРїРѕР·РёС†С–С”СЋ PRO
                showCustomConfirm({
                    icon: 'вЏі',
                    color: '#F59E0B',
                    bgColor: 'rgba(245, 158, 11, 0.15)',
                    title: 'Р†СЃРїРёС‚ СЂР°Р· РЅР° С‚РёР¶РґРµРЅСЊ',
                    desc: `Р‘РµР·РєРѕС€С‚РѕРІРЅР° СЃРїСЂРѕР±Р° РѕРЅРѕРІРёС‚СЊСЃСЏ С‡РµСЂРµР· ${timeStr}. РћС‚СЂРёРјР°Р№С‚Рµ PRO-РґРѕСЃС‚СѓРї, С‰РѕР± СЃРєР»Р°РґР°С‚Рё С–СЃРїРёС‚Рё Р±РµР· Р¶РѕРґРЅРёС… РѕР±РјРµР¶РµРЅСЊ!`,
                    okText: 'в­ђпёЏ РћС‚СЂРёРјР°С‚Рё PRO',
                    isDanger: false,
                    onConfirm: () => showProModal() // Р’С–РґРєСЂРёРІР°С”РјРѕ РІС–РєРЅРѕ РїРѕРєСѓРїРєРё
                });
                return; // Р‘Р»РѕРєСѓС”РјРѕ РїРѕРґР°Р»СЊС€РёР№ Р·Р°РїСѓСЃРє С–СЃРїРёС‚Сѓ
            }
        }
        // ---------------------------------------------------------

        if (totalAnswersGiven >= FREE_ANSWERS_LIMIT && !isUserPro) {
            if (!isUserVerified) {
                document.getElementById('sub-modal').classList.add('active');
                return;
            } else {
                runSilentVerification(); // РџРµСЂРµРІС–СЂСЏС”РјРѕ РїС–РґРїРёСЃРєСѓ Сѓ С„РѕРЅС– РїРµСЂРµРґ С–СЃРїРёС‚РѕРј
            }
        }

        showCustomConfirm({
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
            color: '#8B5CF6', // Р¤С–РѕР»РµС‚РѕРІРёР№
            bgColor: 'rgba(139, 92, 246, 0.15)',
            title: 'Р РѕР·РїРѕС‡Р°С‚Рё С–СЃРїРёС‚?',
            desc: 'РЈ РІР°СЃ Р±СѓРґРµ 20 С…РІРёР»РёРЅ РЅР° 20 РїРёС‚Р°РЅСЊ. Р”РѕРїСѓСЃРєР°С”С‚СЊСЃСЏ РЅРµ Р±С–Р»СЊС€Рµ 2 РїРѕРјРёР»РѕРє.',
            okText: 'Р РѕР·РїРѕС‡Р°С‚Рё',
            isDanger: false,
            onConfirm: () => initExam()
        });
    }

    async function initExam() {
        showScreen(examScreen, 'exam');
        document.getElementById('exam-question-text').innerText = "Р¤РѕСЂРјСѓРІР°РЅРЅСЏ Р±С–Р»РµС‚Р°...";
        document.getElementById('exam-options').innerHTML = "";
        document.getElementById('exam-image').parentElement.style.display = 'none';
        
        // РҐРѕРІР°С”РјРѕ РЅРёР¶РЅСЋ РїР°РЅРµР»СЊ РЅР°РІС–РіР°С†С–С—
        const bottomNav = document.getElementById('bottom-nav');
        if (bottomNav) bottomNav.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE}/api/exam-questions');
            examQuestions = await response.json();
            
            if (!examQuestions || examQuestions.length === 0) throw new Error("Empty questions");

            // --- РќРћР’Р•: Р—Р°РїРёСЃСѓС”РјРѕ С‡Р°СЃ РїРѕС‡Р°С‚РєСѓ С–СЃРїРёС‚Сѓ РґР»СЏ Р±РµР·РєРѕС€С‚РѕРІРЅРёС… РєРѕСЂРёСЃС‚СѓРІР°С‡С–РІ ---
            if (!isUserPro) {
                lastExamTimeFromServer = Date.now();
            }
            // ------------------------------------------------------------------------

            // РЎРєРёРґР°С”РјРѕ СЃС‚Р°РЅ
            examState.answers = new Array(examQuestions.length).fill(null);
            examState.saved = new Array(examQuestions.length).fill(false);
            examState.currentIndex = 0;
            examState.isActive = true;
            
            // Р’СЃС‚Р°РЅРѕРІР»СЋС”РјРѕ С‡Р°СЃ Р·Р°РІРµСЂС€РµРЅРЅСЏ
            examState.endTime = Date.now() + EXAM_DURATION_MS;
            localStorage.setItem('pdr_exam_end_time', examState.endTime); // Р—Р°С…РёСЃС‚ РІС–Рґ Р·РіРѕСЂС‚Р°РЅРЅСЏ РґРѕРґР°С‚РєСѓ

            startExamTimer();
            renderExamQuestion();

        } catch (error) {
            console.error("РџРѕРјРёР»РєР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ С–СЃРїРёС‚Сѓ:", error);
            if(tg && tg.showAlert) tg.showAlert("РџРѕРјРёР»РєР° СЃРµСЂРІРµСЂР°. РЎРїСЂРѕР±СѓР№С‚Рµ РїС–Р·РЅС–С€Рµ.");
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
                finishExam(true); // true = С‡Р°СЃ РІРёР№С€РѕРІ
                return;
            }

            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            
            timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            if (timeLeft < 60000) { // РћСЃС‚Р°РЅРЅС– 60 СЃРµРєСѓРЅРґ
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
            if (examState.saved[i]) btn.classList.add('saved'); // Р–РѕРІС‚РёР№ РєРѕР»С–СЂ
            
            btn.addEventListener('click', () => {
                addImpact();
                examState.currentIndex = i;
                renderExamQuestion();
            });
            
            navBar.appendChild(btn);
        });

        // РћРЅРѕРІР»СЋС”РјРѕ Р»С–С‡РёР»СЊРЅРёРє Р·Р±РµСЂРµР¶РµРЅРёС…
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
            
            // РЇРєС‰Рѕ РІР°СЂС–Р°РЅС‚ РІРёР±СЂР°РЅРёР№ (РЅР°РІС–С‚СЊ СЏРєС‰Рѕ С‰Рµ РЅРµ Р·Р±РµСЂРµР¶РµРЅРёР№)
            if (examState.answers[examState.currentIndex] === index) {
                btn.classList.add('selected');
            }
            
            btn.addEventListener('click', () => {
                addImpact();
                // РџСЂРѕСЃС‚Рѕ РІРёРґС–Р»СЏС”РјРѕ, Р°Р»Рµ РЅРµ Р·Р±РµСЂС–РіР°С”РјРѕ РѕСЃС‚Р°С‚РѕС‡РЅРѕ
                examState.answers[examState.currentIndex] = index;
                renderExamQuestion(); // РџРµСЂРµРјР°Р»СЊРѕРІСѓС”РјРѕ, С‰РѕР± РѕРЅРѕРІРёС‚Рё РІРёРґС–Р»РµРЅРЅСЏ
            });
            
            optionsContainer.appendChild(btn);
        });

        // Р›РѕРіС–РєР° РєРЅРѕРїРѕРє "Р—Р±РµСЂРµРіС‚Рё" С‚Р° "РќР°СЃС‚СѓРїРЅРµ"
        const btnSave = document.getElementById('btn-exam-save');
        const btnNext = document.getElementById('btn-exam-next');

        // РљРЅРѕРїРєР° Р·Р±РµСЂРµР¶РµРЅРЅСЏ Р°РєС‚РёРІРЅР° С‚С–Р»СЊРєРё СЏРєС‰Рѕ РІРёР±СЂР°РЅРѕ СЏРєРёР№СЃСЊ РІР°СЂС–Р°РЅС‚
        btnSave.disabled = (examState.answers[examState.currentIndex] === null);
        
        if (examState.saved[examState.currentIndex]) {
            btnSave.innerText = "РћРЅРѕРІРёС‚Рё РІС–РґРїРѕРІС–РґСЊ";
            btnSave.style.background = "var(--c-surface)";
            btnSave.style.color = "var(--c-text)";
        } else {
            btnSave.innerText = "Р—Р±РµСЂРµРіС‚Рё РІС–РґРїРѕРІС–РґСЊ";
            btnSave.style.background = ""; // РџРѕРІРµСЂС‚Р°С”РјРѕ РґРµС„РѕР»С‚РЅРёР№ РіСЂР°РґС–С”РЅС‚
            btnSave.style.color = "";
        }

        btnSave.onclick = () => {
            addImpact();
            examState.saved[examState.currentIndex] = true;
            
            // --- РќРћР’Р•: Р”РѕРґР°С”РјРѕ РІ "РЎРєР»Р°РґРЅС– РїРёС‚Р°РЅРЅСЏ" СЏРєС‰Рѕ РІС–РґРїРѕРІС–РґСЊ РЅРµРїСЂР°РІРёР»СЊРЅР° ---
            const q = examQuestions[examState.currentIndex];
            const selectedAns = examState.answers[examState.currentIndex];
            
            if (selectedAns !== q.correctIndex) {
                const allSavedStates = JSON.parse(localStorage.getItem('pdr_quiz_states') || "{}");
                if (!allSavedStates[q.topicId]) allSavedStates[q.topicId] = [];
                
                // Р—Р°РїРёСЃСѓС”РјРѕ РїРѕРјРёР»РєСѓ. Р’РѕРЅР° Р°РІС‚РѕРјР°С‚РёС‡РЅРѕ Р·'СЏРІРёС‚СЊСЃСЏ РІ СЂРѕР·РґС–Р»С– "РЎРєР»Р°РґРЅС–"
                allSavedStates[q.topicId][q.originalIndex] = { selectedIndex: selectedAns, isCorrect: false };
                localStorage.setItem('pdr_quiz_states', JSON.stringify(allSavedStates));
                
                // Р—Р±РµСЂС–РіР°С”РјРѕ РІ С…РјР°СЂСѓ
                if (typeof scheduleCloudSave === 'function') scheduleCloudSave(q.topicId);
            }
            // -------------------------------------------------------------------

            // РџРµСЂРµРІС–СЂСЏС”РјРѕ, С‡Рё РІСЃС– РїРёС‚Р°РЅРЅСЏ Р·Р±РµСЂРµР¶РµРЅС–
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

    // Р”РѕСЃС‚СЂРѕРєРѕРІРµ Р·Р°РІРµСЂС€РµРЅРЅСЏ
    document.getElementById('btn-exam-finish-early').addEventListener('click', () => {
        showCustomConfirm({
            icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
            color: '#EF4444', // Р§РµСЂРІРѕРЅРёР№
            bgColor: 'rgba(239, 68, 68, 0.15)',
            title: 'Р—Р°РІРµСЂС€РёС‚Рё РґРѕСЃС‚СЂРѕРєРѕРІРѕ?',
            desc: 'Р’Рё РІРїРµРІРЅРµРЅС–, С‰Рѕ С…РѕС‡РµС‚Рµ Р·Р°РІРµСЂС€РёС‚Рё С–СЃРїРёС‚? РќРµ РІСЃС– РІС–РґРїРѕРІС–РґС– Р·Р±РµСЂРµР¶РµРЅС–.',
            okText: 'Р—Р°РІРµСЂС€РёС‚Рё',
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

        // --- РќРћР’Р•: Р¤РѕСЂРјСѓС”РјРѕ СЃРїРёСЃРѕРє С‚РµРј РґР»СЏ РїРѕРІС‚РѕСЂРµРЅРЅСЏ (С‚С–Р»СЊРєРё СЏРєС‰Рѕ С–СЃРїРёС‚ РїСЂРѕР№РґРµРЅРѕ РїРѕРІРЅС–СЃС‚СЋ) ---
        if (!isTimeout) {
            const weakTopicsSet = new Set();
            examQuestions.forEach((q, i) => {
                if (examState.answers[i] !== q.correctIndex) {
                    weakTopicsSet.add(q.topicId);
                }
            });
            // Р—Р±РµСЂС–РіР°С”РјРѕ СѓРЅС–РєР°Р»СЊРЅС– ID С‚РµРј, РґРµ Р±СѓР»Рё РїРѕРјРёР»РєРё
            localStorage.setItem('pdr_exam_weak_topics', JSON.stringify(Array.from(weakTopicsSet)));
        }
        // --------------------------------------------------------------------------------------

        examQuestions.forEach((q, i) => {
            if (!examState.saved[i] || examState.answers[i] === null) {
                unansweredCount++;
                wrongCount++; // РќРµР·Р±РµСЂРµР¶РµРЅР° РІС–РґРїРѕРІС–РґСЊ = РїРѕРјРёР»РєР°
            } else if (examState.answers[i] === q.correctIndex) {
                correctCount++;
            } else {
                wrongCount++;
            }
        });

        const isPassed = wrongCount <= 2;

        // Р—Р±РµСЂРµР¶РµРЅРЅСЏ СЃС‚Р°С‚РёСЃС‚РёРєРё С–СЃРїРёС‚С–РІ
        const examStats = JSON.parse(localStorage.getItem('pdr_exam_stats') || '{"total":0, "passed":0, "lastWrong":0}');
        examStats.total += 1;
        if (isPassed && !isTimeout) examStats.passed += 1;
        examStats.lastWrong = isTimeout ? 20 : wrongCount; // РЇРєС‰Рѕ С‡Р°СЃ РІРёР№С€РѕРІ, РІРІР°Р¶Р°С”РјРѕ С‰Рѕ РІСЃРµ РїРѕРіР°РЅРѕ
        localStorage.setItem('pdr_exam_stats', JSON.stringify(examStats));

        const modal = document.getElementById('exam-result-modal');
        const iconEl = document.getElementById('exam-result-icon');
        const titleEl = document.getElementById('exam-result-title');
        const descEl = document.getElementById('exam-result-desc');
        
        document.getElementById('exam-res-correct').innerText = correctCount;
        document.getElementById('exam-res-wrong').innerText = wrongCount;

        if (isTimeout) {
            iconEl.innerText = "вЏ±";
            titleEl.innerText = "Р§Р°СЃ РІРёР№С€РѕРІ!";
            titleEl.style.color = "var(--c-danger)";
            descEl.innerText = "Р†СЃРїРёС‚ РЅРµ СЃРєР»Р°РґРµРЅРѕ. Р’Рё РЅРµ РІСЃС‚РёРіР»Рё РґР°С‚Рё РІС–РґРїРѕРІС–РґС– РЅР° РІСЃС– РїРёС‚Р°РЅРЅСЏ.";
        } else if (isPassed) {
            iconEl.innerText = "рџЏ†";
            titleEl.innerText = "Р†СЃРїРёС‚ СЃРєР»Р°РґРµРЅРѕ!";
            titleEl.style.color = "var(--c-success)";
            descEl.innerText = "Р’С–С‚Р°С”РјРѕ! Р’Рё СѓСЃРїС–С€РЅРѕ РїСЂРѕР№С€Р»Рё С‚РµСЃС‚СѓРІР°РЅРЅСЏ.";
            
            // Р—Р°РїСѓСЃРєР°С”РјРѕ РєРѕРЅС„РµС‚С‚С–, СЏРєС‰Рѕ С” РїС–РґС‚СЂРёРјРєР° РІ РўР“
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            iconEl.innerText = "рџ›‘";
            titleEl.innerText = "Р†СЃРїРёС‚ РЅРµ СЃРєР»Р°РґРµРЅРѕ";
            titleEl.style.color = "var(--c-danger)";
            descEl.innerText = `Р’Рё РґРѕРїСѓСЃС‚РёР»Рё ${wrongCount} РїРѕРјРёР»РѕРє. Р”РѕРїСѓСЃРєР°С”С‚СЊСЃСЏ РЅРµ Р±С–Р»СЊС€Рµ 2.`;
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        }

        modal.classList.add('active');
    }

    document.getElementById('btn-exam-close-result').addEventListener('click', () => {
        document.getElementById('exam-result-modal').classList.remove('active');
        showScreen(homeScreen, 'home');
    });

    // --- РњРћР”РР¤Р†РљРђР¦Р†РЇ Р¤РЈРќРљР¦Р†Р‡ goBack() ---
    // Р—РЅР°Р№РґРё СЃРІРѕСЋ С–СЃРЅСѓСЋС‡Сѓ С„СѓРЅРєС†С–СЋ goBack() С– РґРѕРґР°Р№ С‚СѓРґРё РїРµСЂРµРІС–СЂРєСѓ РЅР° С–СЃРїРёС‚:
    const originalGoBack = goBack;
    goBack = function() {
        if (currentScreenName === 'exam' && examState.isActive) {
            showCustomConfirm({
                icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
                color: '#F59E0B', // РћСЂР°РЅР¶РµРІРёР№
                bgColor: 'rgba(245, 158, 11, 0.15)',
                title: 'РџРµСЂРµСЂРІР°С‚Рё С–СЃРїРёС‚?',
                desc: 'Р’Р°С€ РїСЂРѕРіСЂРµСЃ Р±СѓРґРµ РІС‚СЂР°С‡РµРЅРѕ, Р° С–СЃРїРёС‚ РІРІР°Р¶Р°С‚РёРјРµС‚СЊСЃСЏ РЅРµСЃРєР»Р°РґРµРЅРёРј.',
                okText: 'РџРµСЂРµСЂРІР°С‚Рё',
                isDanger: true,
                onConfirm: () => {
                    examState.isActive = false;
                    clearInterval(examState.timerInterval);
                    showScreen(homeScreen, 'home');
                }
            });
            return; 
        }
        
        // Р’РёРєР»РёРє РѕСЂРёРіС–РЅР°Р»СЊРЅРѕС— Р»РѕРіС–РєРё РґР»СЏ С–РЅС€РёС… РµРєСЂР°РЅС–РІ
        // (РўСѓС‚ РїСЂРѕСЃС‚Рѕ РІСЃС‚Р°РІ РєРѕРґ Р·С– СЃРІРѕС”С— СЃС‚Р°СЂРѕС— С„СѓРЅРєС†С–С— goBack, Р°Р±Рѕ Р·Р°Р»РёС€ СЏРє С”, СЏРєС‰Рѕ РІРёРєРѕСЂРёСЃС‚РѕРІСѓС”С€ РїРµСЂРµРІРёР·РЅР°С‡РµРЅРЅСЏ)
        
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

    // --- 5. Р›РћР“РРљРђ РўР•РЎРўРђ (LAZY LOADING) ---
    const CHUNK_SIZE = 25; 

    // --- Р Р•Р–РРњ "РЎРљР›РђР”РќР† РџРРўРђРќРќРЇ" (Р’РР РўРЈРђР›Р¬РќРР™ Р РћР—Р”Р†Р›) ---
    async function startHardMode() {
        updateBottomNav('hard'); // РџС–РґСЃРІС–С‡СѓС”РјРѕ РІРєР»Р°РґРєСѓ "РЎРєР»Р°РґРЅС–"
        
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
                    <div style="font-size: 3rem;">рџЋ‰</div>
                    <div style="line-height: 1.4; font-size: 1.15rem;">РЈ РІР°СЃ РЅРµРјР°С” СЃРєР»Р°РґРЅРёС… РїРёС‚Р°РЅСЊ!<br>Р’Рё РІС–РґРїРѕРІС–РґР°С”С‚Рµ С–РґРµР°Р»СЊРЅРѕ.</div>
                </div>
            `;
            showToast(emptyIcon);
            return;
        }

        currentTopic = {
            id: 'hard_mode',
            title: 'РЎРєР»Р°РґРЅС– РїРёС‚Р°РЅРЅСЏ',
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

    // --- Р›РћР“Р†РљРђ "РћР‘Р РђРќР•" ---
    
    // РћС‚СЂРёРјСѓС”РјРѕ СЂРµР°Р»СЊРЅС– РєРѕРѕСЂРґРёРЅР°С‚Рё РїРёС‚Р°РЅРЅСЏ (РЅР°РІС–С‚СЊ СЏРєС‰Рѕ РјРё Сѓ РІС–СЂС‚СѓР°Р»СЊРЅРѕРјСѓ СЂРѕР·РґС–Р»С–)
    function getRealQuestionRef() {
        if (!currentTopic) return null;
        if (currentTopic.isVirtual) {
            return currentTopic.refs[currentQuestionIndex];
        }
        return { topicId: currentTopic.id, originalIndex: currentQuestionIndex };
    }

    // РћРЅРѕРІР»РµРЅРЅСЏ РІС–Р·СѓР°Р»Сѓ РєРЅРѕРїРєРё Р·Р°РєР»Р°РґРєРё
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

    // РљР»С–Рє РїРѕ Р·Р°РєР»Р°РґС†С–
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
                // Р”РѕРґР°С”РјРѕ
                favs[ref.topicId].push(ref.originalIndex);
                favs[ref.topicId].sort((a, b) => a - b); // РЎРѕСЂС‚СѓС”РјРѕ РїРѕ РїРѕСЂСЏРґРєСѓ
                btnBookmark.classList.add('active');
            } else {
                // Р’РёРґР°Р»СЏС”РјРѕ
                favs[ref.topicId].splice(indexInArray, 1);
                if (favs[ref.topicId].length === 0) delete favs[ref.topicId];
                btnBookmark.classList.remove('active');
            }

            localStorage.setItem('pdr_favorites', JSON.stringify(favs));
            
            // Р—Р±РµСЂС–РіР°С”РјРѕ РІ С…РјР°СЂСѓ Telegram Р· РґРµР±Р°СѓРЅСЃРѕРј (Р·Р°С…РёСЃС‚ РІС–Рґ СЃРїР°РјСѓ РєР»С–РєР°РјРё)
            if (tg && tg.CloudStorage) {
                if (window.favCloudSaveTimeout) clearTimeout(window.favCloudSaveTimeout);
                window.favCloudSaveTimeout = setTimeout(() => {
                    tg.CloudStorage.setItem('pdr_favorites', JSON.stringify(favs));
                }, 1500); // Р’С–РґРїСЂР°РІР»СЏС”РјРѕ РІ С…РјР°СЂСѓ С‚С–Р»СЊРєРё С‡РµСЂРµР· 1.5 СЃРµРє РїС–СЃР»СЏ РѕСЃС‚Р°РЅРЅСЊРѕРіРѕ РєР»С–РєСѓ
            }
        });
    }

    // Р’С–РґРјР°Р»СЊРѕРІРєР° РµРєСЂР°РЅСѓ Р· СЂРѕР·РґС–Р»Р°РјРё РћР±СЂР°РЅРѕРіРѕ
    function renderFavoriteTopics() {
        const favs = JSON.parse(localStorage.getItem('pdr_favorites') || "{}");
        const favTopicIds = Object.keys(favs);

        if (favTopicIds.length === 0) {
            const emptyIcon = `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
                    <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(236, 72, 153, 0.12); display: flex; align-items: center; justify-content: center; color: #EC4899;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <div style="line-height: 1.4; font-size: 1.15rem;">РЈ РІР°СЃ РїРѕРєРё РЅРµРјР°С”<br>Р·Р±РµСЂРµР¶РµРЅРёС… РїРёС‚Р°РЅСЊ</div>
                </div>
            `;
            showToast(emptyIcon);
            return;
        }

        const grid = document.getElementById('topics-grid');
        grid.innerHTML = ""; 
        
        // Р—РјС–РЅСЋС”РјРѕ Р·Р°РіРѕР»РѕРІРєРё РµРєСЂР°РЅСѓ
        document.querySelector('#topics-screen .section-title').innerText = "Р’Р°С€С– РѕР±СЂР°РЅС– РїРёС‚Р°РЅРЅСЏ";
        document.querySelector('#topics-screen .screen-subtitle').innerText = "Р—РіСЂСѓРїРѕРІР°РЅС– Р·Р° СЂРѕР·РґС–Р»Р°РјРё РџР”Р ";
        
       // РҐРѕРІР°С”РјРѕ РїРѕС€СѓРє, РІС–РЅ С‚СѓС‚ РЅРµ РїРѕС‚СЂС–Р±РµРЅ
       const searchContainer = document.getElementById('search-container-block');
       if(searchContainer) searchContainer.style.display = 'none';
       
       updateBottomNav('favorites'); // РџС–РґСЃРІС–С‡СѓС”РјРѕ РІРєР»Р°РґРєСѓ "РћР±СЂР°РЅС–"

        favTopicIds.forEach((topicId, index) => {
            const topic = globalTopics.find(t => t.id === topicId);
            if (!topic) return;

            const questionsCount = favs[topicId].length;
            const colorClass = `c${(index % 6) + 1}`;
            const iconHtml = modernIcons[topic.id] || `<span style="font-size: 1.5rem;">${topic.icon || "рџ”–"}</span>`;

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
                    <span style="font-weight: 600;">Р—Р±РµСЂРµР¶РµРЅРѕ РїРёС‚Р°РЅСЊ: ${questionsCount}</span>
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

    // Р—Р°РїСѓСЃРє С‚РµСЃС‚Сѓ РїРѕ РѕР±СЂР°РЅРёРј РїРёС‚Р°РЅРЅСЏРј РєРѕРЅРєСЂРµС‚РЅРѕРіРѕ СЂРѕР·РґС–Р»Сѓ
    function startFavoritesQuiz(originalTopic, questionIndexes) {
        let refs = questionIndexes.map(idx => ({ topicId: originalTopic.id, originalIndex: idx }));

        currentTopic = {
            id: 'favorites_mode',
            title: 'РћР±СЂР°РЅРµ: ' + originalTopic.title,
            isVirtual: true,
            totalQuestions: refs.length,
            refs: refs 
        };

        currentQuestions = Array(refs.length).fill(null); 
        // Р”Р»СЏ РѕР±СЂР°РЅРѕРіРѕ РјРё РЅРµ Р·Р±РµСЂС–РіР°С”РјРѕ РїСЂРѕРіСЂРµСЃ РІС–РґРїРѕРІС–РґРµР№, РїСЂРѕСЃС‚Рѕ РґР°С”РјРѕ С‚СЂРµРЅСѓРІР°С‚РёСЃСЊ
        questionStates = Array(refs.length).fill(null).map(() => ({ selectedIndex: null, isCorrect: null }));
        currentQuestionIndex = 0;

        document.getElementById('quiz-topic-name').innerText = "РћР±СЂР°РЅРµ";
        showScreen(quizScreen, 'quiz');
        renderQuestion();
    }

    async function startQuiz(topic) {
        currentTopic = topic;
        document.getElementById('quiz-topic-name').innerText = topic.title;
        
        currentQuestions =[]; 
        noMoreQuestionsOnServer = false; 
        const total = topic.totalQuestions || 79;
        
        // questionStates вЂ” РґР»СЏ РІСЃС–С… Р·Р°РїР»Р°РЅРѕРІР°РЅРёС… РїРёС‚Р°РЅСЊ, С‰РѕР± СѓРЅРёРєРЅСѓС‚Рё РїРѕРјРёР»РѕРє РїСЂРё РєР»С–РєСѓ
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
        document.getElementById('quiz-question-text').innerText = "Р—Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ РїРёС‚Р°РЅСЊ...";
        document.getElementById('quiz-options').innerHTML = "";
        
        const limitToFetch = currentQuestionIndex + 20;
        await fetchQuestionsChunk(topic.id, 0, limitToFetch);
        
        renderQuestion();
    }

    async function fetchQuestionsChunk(topicId, offset, limit = CHUNK_SIZE) {
        if (isLoadingQuestions || noMoreQuestionsOnServer) return;
        isLoadingQuestions = true;

        try {
            const response = await fetch(`${API_BASE}/api/questions?topicId=${topicId}&user_id=${userId}&offset=${offset}&limit=${limit}`);
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
            console.error("РџРѕРјРёР»РєР° Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ РїРёС‚Р°РЅСЊ:", error);
        } finally {
            isLoadingQuestions = false;
        }
    }

    function renderNavBar() {
        const navBar = document.getElementById('question-nav-bar');
        navBar.innerHTML = '';

        const total = currentTopic.totalQuestions || 79;
        const actualTotal = currentTopic.actualQuestions || total; // СЃРєС–Р»СЊРєРё СЂРµР°Р»СЊРЅРѕ С” РІ Р‘Р”

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
            
            if (!currentTopic.isVirtual && i >= actualTotal) {
                // РџРёС‚Р°РЅРЅСЏ С‰Рµ РЅРµ РґРѕРґР°РЅРѕ РІ Р‘Р” вЂ” РЅР°РїС–РІРїСЂРѕР·РѕСЂРµ, РЅРµРєР»С–РєС‚Р°Р±РµР»СЊРЅРµ
                btn.classList.add('empty');
                btn.style.pointerEvents = 'none';
            } else {
                btn.addEventListener('click', () => {
                    addImpact();
                    currentQuestionIndex = i;
                    renderQuestion();
                    window.scrollTo(0, 70);
                });
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

        const total = currentTopic.totalQuestions || 79;
        const actualTotal = currentTopic.actualQuestions || total; // СЂРµР°Р»СЊРЅР° РєС–Р»СЊРєС–СЃС‚СЊ РІ Р‘Р”
        const q = currentQuestions[currentQuestionIndex];

        if (!currentQuestions[currentQuestionIndex + 5] && (currentQuestionIndex + 5) < actualTotal) {
            let offsetToFetch = currentQuestionIndex;
            while(currentQuestions[offsetToFetch]) offsetToFetch++;
            if (!isLoadingQuestions) {
                fetchQuestionsChunk(currentTopic.id, offsetToFetch, CHUNK_SIZE);
            }
        }

        if (!q) {
            if (noMoreQuestionsOnServer && !currentTopic.isVirtual) {
                currentQuestionIndex = currentQuestions.length - 1;
                const coneIcon = `<div style="display: flex; flex-direction: column; align-items: center; gap: 16px;"><div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(245, 158, 11, 0.12); display: flex; align-items: center; justify-content: center;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M4 20H20" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3L5.5 20H18.5L12 3Z" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 12H15.5" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 16H17" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div style="line-height: 1.4; font-size: 1.15rem;">РћР№! РќР°СЃС‚СѓРїРЅС– РїРёС‚Р°РЅРЅСЏ<br>Р±СѓРґСѓС‚СЊ РґРѕРґР°РЅС– РїС–Р·РЅС–С€Рµ</div></div>`;
                showToast(coneIcon);
                renderQuestion();
                return;
            }
            
            document.getElementById('quiz-question-text').innerText = "Р—Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ РїРёС‚Р°РЅРЅСЏ...";
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
                fetch(`${API_BASE}/api/questions?topicId=${ref.topicId}&user_id=${userId}&offset=${ref.originalIndex}&limit=1`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            currentQuestions[currentQuestionIndex] = data[0];
                        } else {
                            currentQuestions[currentQuestionIndex] = { text: "РџРѕРјРёР»РєР°: РџРёС‚Р°РЅРЅСЏ РЅРµ Р·РЅР°Р№РґРµРЅРѕ", options: ["Р”Р°Р»С–"], correctIndex: 0 };
                        }
                        isLoadingQuestions = false;
                        renderQuestion();
                    })
                    .catch(err => { 
                        console.error("РџРѕРјРёР»РєР° РјРµСЂРµР¶С–:", err); 
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
        updateBookmarkUI(); // РћРЅРѕРІР»СЋС”РјРѕ СЃС‚Р°РЅ Р·Р°РєР»Р°РґРєРё РґР»СЏ РїРѕС‚РѕС‡РЅРѕРіРѕ РїРёС‚Р°РЅРЅСЏ
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
            nextBtn.innerText = 'РќР°СЃС‚СѓРїРЅРµ РїРёС‚Р°РЅРЅСЏ в†’';
            nextBtn.onclick = () => {
                addImpact();
                currentQuestionIndex++;
                renderQuestion();
                window.scrollTo(0, 70); // Р’РѕР·РІСЂР°С‰Р°РµРј СЌРєСЂР°РЅ РІ РІРµСЂС…
            };
        } else {
            nextBtn.innerText = 'Р—Р°РІРµСЂС€РёС‚Рё СЂРѕР·РґС–Р»';
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
                            <div style="line-height: 1.4; font-size: 1.15rem;">Р’Рё РїСЂРѕР№С€Р»Рё РІСЃС– РґРѕСЃС‚СѓРїРЅС–<br>РЅР° РґР°РЅРёР№ РјРѕРјРµРЅС‚ РїРёС‚Р°РЅРЅСЏ</div>
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
        
        // РЈС‡РёС‚С‹РІР°РµРј РІСЃРµ РІРѕР·РјРѕР¶РЅС‹Рµ С„РѕСЂРјР°С‚С‹ РЅР°Р·РІР°РЅРёР№ РїРѕР»РµР№, РєРѕС‚РѕСЂС‹Рµ РјРѕР¶РµС‚ РїСЂРёСЃР»Р°С‚СЊ Р±РµРєРµРЅРґ
        const currentRuleText = q.ruleText || q.rule_text || q.rule;
        const currentExpText = q.explanationText || q.explanation_text || q.explanation;

        if (currentState && currentState.selectedIndex !== null && explanationWrapper && (currentRuleText || currentExpText)) {
            const detailsRule = document.getElementById('details-rule');
            const detailsExplanation = document.getElementById('details-explanation');
            
            // Р’РєР»СЋС‡Р°РµРј РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ (flex-direction: column СЃС‚Р°РІРёРј С‡С‚РѕР±С‹ РєРЅРѕРїРєРё РєСЂР°СЃРёРІРѕ С€Р»Рё РґСЂСѓРі РїРѕРґ РґСЂСѓРіРѕРј)
            explanationWrapper.style.display = 'flex';
            explanationWrapper.style.flexDirection = 'column';
            explanationWrapper.style.gap = '12px';
            
            if (currentRuleText && detailsRule) {
                document.getElementById('quiz-rule-text').innerHTML = currentRuleText;
                detailsRule.style.display = 'block';
                detailsRule.removeAttribute('open'); 
            } else if (detailsRule) {
                detailsRule.style.display = 'none';
            }
            
            if (currentExpText && detailsExplanation) {
                document.getElementById('quiz-explanation-text').innerHTML = currentExpText;
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

        if (totalAnswersGiven >= FREE_ANSWERS_LIMIT && !isUserPro) {
            // РЇРєС‰Рѕ РїРµСЂРµРІС–СЂРєР° Р·Р°СЂР°Р· С–РґРµ Сѓ С„РѕРЅС– вЂ” С‡РµРєР°С”РјРѕ С—С— Р·Р°РІРµСЂС€РµРЅРЅСЏ
            while (isCheckingNow) {
                await new Promise(r => setTimeout(r, 100));
            }

            // РЇРєС‰Рѕ РјРё РґРѕСЃС– РЅРµ Р·РЅР°С”РјРѕ СЃС‚Р°С‚СѓСЃ (РЅР°РїСЂРёРєР»Р°Рґ, С„РѕРЅРѕРІР° РїРµСЂРµРІС–СЂРєР° РЅРµ СЃРїСЂР°С†СЋРІР°Р»Р°) вЂ” РїРµСЂРµРІС–СЂСЏС”РјРѕ РїСЂСЏРјРѕ Р·Р°СЂР°Р·
            if (!isUserVerified) {
                await runSilentVerification();
            }

            // РЇРєС‰Рѕ РїС–СЃР»СЏ РІСЃСЊРѕРіРѕ С†СЊРѕРіРѕ РїС–РґРїРёСЃРєРё РґС–Р№СЃРЅРѕ РЅРµРјР°С” вЂ” РїРѕРєР°Р·СѓС”РјРѕ РІС–РєРЅРѕ
            if (!isUserVerified) {
                document.getElementById('sub-modal').classList.add('active');
                return; 
            } else if (totalAnswersGiven > 0 && totalAnswersGiven % 10 === 0) {
                // РљРѕР¶РЅС– 10 РІС–РґРїРѕРІС–РґРµР№ С‚РёС…Рѕ РїРµСЂРµРІС–СЂСЏС”РјРѕ РїС–РґРїРёСЃРєСѓ Сѓ С„РѕРЅС–
                runSilentVerification();
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

        if (totalAnswersGiven < FREE_ANSWERS_LIMIT && !isUserVerified) {
            fetch(`${API_BASE}/api/record-answer', {
                method: 'POST'
            })
            .then(res => res.json())
            .then(data => {
                if (data.answers_count) totalAnswersGiven = data.answers_count;
            })
            .catch(err => console.error("Error recording answer", err));
            
            totalAnswersGiven++;
        }

        // Р—Р°РїСѓСЃРєР°С”РјРѕ С‚РёС…Рµ Р·Р±РµСЂРµР¶РµРЅРЅСЏ Сѓ С…РјР°СЂСѓ РўРµР»РµРіСЂР°Рј.
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
                        <div style="font-size: 3.5rem; margin-bottom: 10px;">в­ђпёЏ</div>
                        <h3 style="font-size: 1.6rem; margin-bottom: 8px; font-weight: 800;">PRO Р”РѕСЃС‚СѓРї</h3>
                        <p style="color: var(--c-text-soft); font-size: 0.95rem; line-height: 1.4;">Р’С–РґРєСЂРёР№С‚Рµ РІСЃС– РїСЂРµРјС–СѓРј-СЂРѕР·РґС–Р»Рё С‚Р° РґРµС‚Р°Р»СЊРЅС– РїРѕСЏСЃРЅРµРЅРЅСЏ РґРѕ РїРёС‚Р°РЅСЊ.</p>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button class="btn-primary" onclick="buyPro('1_month')" style="display: flex; justify-content: space-between; width: 100%; padding: 16px 20px; background: var(--c-surface); color: var(--c-text); border: 1px solid var(--c-border-soft);">
                            <span style="font-weight: 600;">1 РјС–СЃСЏС†СЊ</span> <span style="font-weight: 800; color: #F59E0B;">в­ђпёЏ 50 (SALE)</span>
                        </button>
                        <button class="btn-primary" onclick="buyPro('3_months')" style="display: flex; justify-content: space-between; width: 100%; padding: 16px 20px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border: none; box-shadow: 0 8px 20px rgba(245, 158, 11, 0.3);">
                            <span style="font-weight: 700;">3 РјС–СЃСЏС†С– (Р’РёРіС–РґРЅРѕ)</span> <span style="font-weight: 800;">в­ђпёЏ 250</span>
                        </button>
                        <button class="btn-primary" onclick="buyPro('12_months')" style="display: flex; justify-content: space-between; width: 100%; padding: 16px 20px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); border: none; box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);">
                            <span style="font-weight: 700;">1 СЂС–Рє (РњР°РєСЃРёРјСѓРј)</span> <span style="font-weight: 800;">в­ђпёЏ 750</span>
                        </button>
                    </div>

                    <!-- РќРћР’Р«Р™ Р‘Р›РћРљ РЎ РџРћР”РЎРљРђР—РљРћР™ -->
                    <div style="margin-top: 20px; padding: 14px; background: rgba(66, 133, 244, 0.1); border: 1px solid rgba(66, 133, 244, 0.2); border-radius: 12px; text-align: left;">
                        <div style="font-size: 0.85rem; color: var(--c-text-soft); line-height: 1.4;">
                            <span style="font-weight: 700; color: var(--c-primary); display: block; margin-bottom: 4px;">рџ’Ў РЇРє РїРѕРїРѕРІРЅРёС‚Рё Р·С–СЂРєРё?</span>
                            РЇРєС‰Рѕ РїСЂРё РѕРїР»Р°С‚С– РІРёРЅРёРєР°С” РїРѕРјРёР»РєР° - РїСЂРёРґР±Р°Р№С‚Рµ Р·С–СЂРєРё С‡РµСЂРµР· РѕС„С–С†С–Р№РЅРѕРіРѕ Р±РѕС‚Р° Telegram <a href="https://t.me/PremiumBot" target="_blank" style="color: var(--c-primary); text-decoration: none; font-weight: 600;">@PremiumBot</a> Р°Р±Рѕ РІ РЅР°Р»Р°С€С‚СѓРІР°РЅРЅСЏС… Telegram.
                        </div>
                    </div>

                    <button class="btn-danger-outline" onclick="document.getElementById('pro-modal').classList.remove('active')" style="width: 100%; margin-top: 16px; border: none; color: var(--c-text-soft);">РЎРєР°СЃСѓРІР°С‚Рё</button>
                </div>
            `;
            document.body.appendChild(proModal);
        }
        proModal.classList.add('active');
    }

    // Р“Р»РѕР±Р°Р»СЊРЅР°СЏ С„СѓРЅРєС†РёСЏ РґР»СЏ РІС‹Р·РѕРІР° РёР· HTML
    window.buyPro = async function(tierId) {
        addImpact();
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span style="margin: 0 auto;">Р—Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ...</span>`;
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/api/create-invoice', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ user_id: userId, tier_id: tierId })
            });
            const data = await res.json();
            
            if (data.invoice_url) {
                // Р’С‹Р·С‹РІР°РµРј РЅР°С‚РёРІРЅРѕРµ РѕРєРЅРѕ РѕРїР»Р°С‚С‹ Telegram
                tg.openInvoice(data.invoice_url, (status) => {
                    if (status === 'paid') {
                        document.getElementById('pro-modal').classList.remove('active');
                        isUserPro = true;
                        renderTopics(); // РџРµСЂРµСЂРёСЃРѕРІС‹РІР°РµРј РјРµРЅСЋ, С‡С‚РѕР±С‹ СѓР±СЂР°С‚СЊ РїР»Р°С€РєРё PRO
                        updateHomeScreenProBadges(); // <--- Р”РћР”РђР›Р: РїСЂРёР±РёСЂР°С”РјРѕ РїР»Р°С€РєРё Р· РіРѕР»РѕРІРЅРѕРіРѕ РµРєСЂР°РЅСѓ
                        if(tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                        showCustomConfirm({
                            icon: 'рџЋ‰', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)',
                            title: 'РћРїР»Р°С‚Р° СѓСЃРїС–С€РЅР°!', desc: 'Р”СЏРєСѓС”РјРѕ! PRO РґРѕСЃС‚СѓРї Р°РєС‚РёРІРѕРІР°РЅРѕ. Р’СЃС– СЂРѕР·РґС–Р»Рё РІС–РґРєСЂРёС‚Рѕ.',
                            okText: 'РЎСѓРїРµСЂ!', isDanger: false
                        });
                    }
                });
            } else {
                alert("РџРѕРјРёР»РєР° СЃС‚РІРѕСЂРµРЅРЅСЏ СЂР°С…СѓРЅРєСѓ: " + data.error);
            }
        } catch (e) {
            alert("РџРѕРјРёР»РєР° Р·'С”РґРЅР°РЅРЅСЏ Р· СЃРµСЂРІРµСЂРѕРј");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // --- РџР РћР¤Р†Р›Р¬ РўРђ РЎРўРђРўРРЎРўРРљРђ ---
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
        let totalIncorrect = 0; // Р”РѕР±Р°РІРёР»Рё СЃС‡РµС‚С‡РёРє РѕС€РёР±РѕРє

        globalTopics.forEach(topic => {
            totalExpected += (topic.totalQuestions || 0);
            const topicStates = allSavedStates[topic.id] || [];
            
            topicStates.forEach(state => {
                if (state && state.selectedIndex !== null) {
                    totalAnswered++;
                    if (state.isCorrect) {
                        totalCorrect++;
                    } else {
                        totalIncorrect++; // РЎС‡РёС‚Р°РµРј РѕС€РёР±РєРё
                    }
                }
            });
        });

        const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
        const completionRate = totalExpected > 0 ? (totalAnswered / totalExpected) : 0;

        // Р’РѕР·РІСЂР°С‰Р°РµРј СЂР°СЃС€РёСЂРµРЅРЅС‹Р№ РѕР±СЉРµРєС‚ СЃРѕ СЃС‚Р°С‚РёСЃС‚РёРєРѕР№
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
            text = "РЎС…РѕР¶Рµ, РїСЂР°РІРёР»Р° РїРѕРєРё С‰Рѕ<br>РєРµСЂСѓСЋС‚СЊ РІР°РјРё рџ…";
            iconLeft = "рџљЁ"; iconRight = "вљ пёЏ";
        } else if (successRate <= 40) {
            text = "Р’Рё РІР¶Рµ СЂРѕР·СѓРјС–С”С‚Рµ, С‰Рѕ В«РіРѕР»РѕРІРЅР° РґРѕСЂРѕРіР°В» вЂ”<br>С†Рµ РЅРµ Р¶РёС‚С‚С”РІР° РїРѕР·РёС†С–СЏ";
            iconLeft = "рџ›ЈпёЏ"; iconRight = "рџ¤”";
        } else if (successRate <= 60) {
            text = "Р”РѕСЂРѕР¶РЅС– Р·РЅР°РєРё<br>РїРѕС‡РёРЅР°СЋС‚СЊ РІР°СЃ РїРѕРІР°Р¶Р°С‚Рё";
            iconLeft = "рџљё"; iconRight = "рџЋ";
        } else if (successRate <= 80) {
            text = "РќР°РІС–РіР°С‚РѕСЂ Р±С–Р»СЊС€Рµ РЅРµ РїРµСЂРµР¶РёРІР°С”<br>Р·Р° РІР°С€Рµ РјР°Р№Р±СѓС‚РЅС”";
            iconLeft = "рџ“±"; iconRight = "рџЊ";
        } else if (successRate <= 99) {
            text = "Р©Рµ С‚СЂРѕС…Рё вЂ” С– РІР°СЃ РїРѕС‡РЅСѓС‚СЊ<br>РїСЂРѕРїСѓСЃРєР°С‚Рё РЅР°РІС–С‚СЊ РјР°СЂС€СЂСѓС‚РєРё";
            iconLeft = "рџљђ"; iconRight = "рџ‘‘";
        } else {
            text = "РЎРІС–С‚Р»РѕС„РѕСЂ Р±Р°С‡РёС‚СЊ РІР°СЃ вЂ”<br>С– РїРµСЂРµРјРёРєР°С”С‚СЊСЃСЏ РЅР° <span style='color: var(--c-success); font-weight: 800;'>Р·РµР»РµРЅРёР№</span>";
            iconLeft = "рџЏ†"; iconRight = "рџљ¦";
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
                    const response = await fetch(`${API_BASE}/api/topics');
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

            // Р’РёРІС–Рґ СЃС‚Р°С‚РёСЃС‚РёРєРё С–СЃРїРёС‚С–РІ
            const examStats = JSON.parse(localStorage.getItem('pdr_exam_stats') || '{"total":0, "passed":0, "lastWrong":0}');
            document.getElementById('stat-exam-passed').innerText = examStats.passed;
            document.getElementById('stat-exam-total').innerText = examStats.total;
            
            const lastScoreEl = document.getElementById('stat-exam-last');
            if (examStats.total > 0) {
                lastScoreEl.innerText = `${examStats.lastWrong} РїРѕРј.`;
                // РЇРєС‰Рѕ РїРѕРјРёР»РѕРє <= 2 (Р·РґР°РІ) - Р·РµР»РµРЅРёР№, С–РЅР°РєС€Рµ - С‡РµСЂРІРѕРЅРёР№
                lastScoreEl.style.color = examStats.lastWrong <= 2 ? 'var(--c-success)' : 'var(--c-danger)';
            } else {
                lastScoreEl.innerText = '-';
                lastScoreEl.style.color = 'var(--c-text)';
            }

            // --- РќРћР’Р•: Р’РёРІС–Рґ С‚РµРј РґР»СЏ РїРѕРІС‚РѕСЂРµРЅРЅСЏ ---
            const weakTopicsContainer = document.getElementById('weak-topics-container');
            if (weakTopicsContainer) {
                const weakTopics = JSON.parse(localStorage.getItem('pdr_exam_weak_topics') || "[]");
                
                if (weakTopics.length > 0) {
                    let html = `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--c-border-soft);">
                                    <h4 style="font-size: 0.85rem; color: var(--c-text-soft); margin-bottom: 10px; font-weight: 600;">Р РµРєРѕРјРµРЅРґСѓС”РјРѕ РїРѕРІС‚РѕСЂРёС‚Рё:</h4>
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
                    
                    // Р”РѕРґР°С”РјРѕ РєР»С–РєРё РїРѕ С‚РµРјР°Рј
                    weakTopicsContainer.querySelectorAll('.weak-topic-chip').forEach(chip => {
                        chip.addEventListener('click', () => {
                            addImpact();
                            const tId = chip.getAttribute('data-topic');
                            const topicObj = globalTopics.find(t => t.id === tId);
                            if (topicObj) {
                                profileModal.classList.remove('active'); // Р—Р°РєСЂРёРІР°С”РјРѕ РїСЂРѕС„С–Р»СЊ
                                startQuiz(topicObj); // Р—Р°РїСѓСЃРєР°С”РјРѕ РІРёР±СЂР°РЅСѓ С‚РµРјСѓ
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
                color: '#EF4444', // Р§РµСЂРІРѕРЅРёР№
                bgColor: 'rgba(239, 68, 68, 0.15)',
                title: 'РћР±РЅСѓР»РёС‚Рё РґР°РЅС–?',
                desc: 'Р’Рё РІРїРµРІРЅРµРЅС–, С‰Рѕ С…РѕС‡РµС‚Рµ СЃРєРёРЅСѓС‚Рё РїРѕС‚РѕС‡РЅСѓ СЃС‚Р°С‚РёСЃС‚РёРєСѓ? Р’РµСЃСЊ РїСЂРѕРіСЂРµСЃ Р±СѓРґРµ РІС‚СЂР°С‡РµРЅРѕ РЅР°Р·Р°РІР¶РґРё!',
                okText: 'РћР±РЅСѓР»РёС‚Рё',
                isDanger: true,
                onConfirm: () => executeReset()
            });
        });
    }

    function executeReset() {
        localStorage.removeItem('pdr_topic_stats');
        localStorage.removeItem('pdr_quiz_states');
        
        // РћР§РР©РђР„РњРћ РҐРњРђР РЈ РўР•Р›Р•Р“Р РђРњ РџР Р РћР‘РќРЈР›Р•РќРќР†
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
            tg.showAlert("Р”Р°РЅС– СѓСЃРїС–С€РЅРѕ РѕР±РЅСѓР»РµРЅРѕ!");
        } else {
            alert("Р”Р°РЅС– СѓСЃРїС–С€РЅРѕ РѕР±РЅСѓР»РµРЅРѕ!");
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
    // CLOUD STORAGE (РЎРРќРҐР РћРќР†Р—РђР¦Р†РЇ РџР РћР“Р Р•РЎРЈ)
    // ==========================================
    
    // 1. РђСЂС…С–РІР°С‚РѕСЂ РґР°РЅРёС… (СЃС‚РёСЃРєР°С”РјРѕ РѕР±'С”РєС‚Рё РІ РјР°Р»С– РјР°СЃРёРІРё)
    function packState(stateArray) {
        return JSON.stringify(stateArray.map(s => {
            // РЇРєС‰Рѕ РїРёС‚Р°РЅРЅСЏ С‰Рµ РЅРµ РїСЂРѕР№РґРµРЅРµ, Р·Р±РµСЂС–РіР°С”РјРѕ РїСЂРѕСЃС‚Рѕ null (РµРєРѕРЅРѕРјРёРјРѕ РїР°Рј'СЏС‚СЊ С…РјР°СЂРё!)
            if (!s || s.selectedIndex === null) return null;
            return[s.selectedIndex, s.isCorrect ? 1 : 0];
        }));
    }

    // 2. Р РѕР·Р°СЂС…С–РІР°С‚РѕСЂ (Р· Р»С–РєСѓРІР°РЅРЅСЏРј Р±РёС‚РёС… РґР°РЅРёС…)
    function unpackState(packedStr) {
        try {
            const arr = JSON.parse(packedStr);
            return arr.map(item => {
                // РЇРєС‰Рѕ Р· С…РјР°СЂРё РїСЂРёР»РµС‚С–РІ РјСѓСЃРѕСЂ С‚РёРїСѓ [null, 0] вЂ” СЃС‚РёСЂР°С”РјРѕ Р№РѕРіРѕ РїРѕРІРЅС–СЃС‚СЋ
                if (!item || item[0] === null) return null;
                
                return { selectedIndex: item[0], isCorrect: !!item[1] };
            });
        } catch(e) { 
            return []; 
        }
    }

    // 3. Р’С–РґРЅРѕРІР»РµРЅРЅСЏ РїСЂРё РІС…РѕРґС–
    function syncFromCloud() {
        if (!tg || !tg.CloudStorage) return;
        
        // --- РќРћР’Р•: Р’С–РґРЅРѕРІР»СЋС”РјРѕ РћР±СЂР°РЅРµ Р· С…РјР°СЂРё Telegram ---
        tg.CloudStorage.getItem('pdr_favorites', (err, value) => {
            if (!err && value) {
                // РЇРєС‰Рѕ РІ С…РјР°СЂС– С” Р·Р±РµСЂРµР¶РµРЅС– Р·Р°РєР»Р°РґРєРё, Р·Р°РїРёСЃСѓС”РјРѕ С—С… Сѓ Р»РѕРєР°Р»СЊРЅСѓ РїР°Рј'СЏС‚СЊ
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

                        // Р’С–РґРЅРѕРІР»СЋС”РјРѕ СЃС‚Р°С‚РёСЃС‚РёРєСѓ
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

    // 4. РўРёС…Рµ Р·Р±РµСЂРµР¶РµРЅРЅСЏ (Р”РµР±Р°СѓРЅСЃ 1 СЃРµРє)
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

    // Р—Р°РїСѓСЃРєР°С”РјРѕ РІС–РґРЅРѕРІР»РµРЅРЅСЏ РїСЂРё СЃС‚Р°СЂС‚С– РґРѕРґР°С‚РєСѓ
    syncFromCloud();

// ==========================================
    // Р›РћР“Р†РљРђ РџРћР’РќРћР•РљР РђРќРќРћР“Рћ Р—РЈРњРЈ РљРђР РўРРќРћРљ
    // ==========================================
    
    function setupImageZoom(sourceImgId) {
        const sourceImg = document.getElementById(sourceImgId);
        if (!sourceImg) return;

        sourceImg.style.cursor = 'zoom-in';
        
        sourceImg.addEventListener('click', () => {
            if (typeof addImpact === 'function') addImpact();
            const viewer = document.getElementById('image-viewer-modal');
            const viewerImg = document.getElementById('viewer-img');
            
            if (viewer && viewerImg && sourceImg.src) {
                viewerImg.src = sourceImg.src;
                viewerImg.style.transform = 'scale(1)';
                viewer.style.display = 'flex';
                // РќРµРІРµР»РёРєР° Р·Р°С‚СЂРёРјРєР° РґР»СЏ РїР»Р°РІРЅРѕРіРѕ РїСЂРѕСЏРІР»РµРЅРЅСЏ (fade-in)
                setTimeout(() => { viewer.style.opacity = '1'; }, 10);
            }
        });
    }

    // Р’С–С€Р°С”РјРѕ РєР»С–РєРё РЅР° РєР°СЂС‚РёРЅРєРё РІ Р·РІРёС‡Р°Р№РЅРѕРјСѓ С‚РµСЃС‚С– С‚Р° РІ С–СЃРїРёС‚С–
    setupImageZoom('quiz-image');
    setupImageZoom('exam-image');

    const viewer = document.getElementById('image-viewer-modal');
    const viewerImg = document.getElementById('viewer-img');
    const closeBtn = document.getElementById('close-image-viewer');

    if (viewer && viewerImg) {
        // Р¤СѓРЅРєС†С–СЏ Р·Р°РєСЂРёС‚С‚СЏ
        const closeViewer = () => {
            viewer.style.opacity = '0';
            setTimeout(() => { viewer.style.display = 'none'; }, 200);
        };
        
        closeBtn.addEventListener('click', closeViewer);
        viewer.addEventListener('click', (e) => {
            // Р—Р°РєСЂРёРІР°С”РјРѕ, СЏРєС‰Рѕ РєР»С–РєРЅСѓР»Рё РїРѕРІР· СЃР°РјСѓ РєР°СЂС‚РёРЅРєСѓ (РЅР° С‚РµРјРЅРёР№ С„РѕРЅ)
            if (e.target === viewer) closeViewer();
        });

        // Р›РѕРіС–РєР° Р¶РµСЃС‚С–РІ (Pinch-to-zoom)
        let initialDist = 0;
        let currentScale = 1;

        viewer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Р’РёСЂР°С…РѕРІСѓС”РјРѕ РІС–РґСЃС‚Р°РЅСЊ РјС–Р¶ РґРІРѕРјР° РїР°Р»СЊС†СЏРјРё
                initialDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                viewerImg.style.transition = 'none'; // Р’РёРјРёРєР°С”РјРѕ Р°РЅС–РјР°С†С–СЋ РґР»СЏ РїР»Р°РІРЅРѕСЃС‚С– СЂСѓС…Сѓ
            }
        }, { passive: true });

        viewer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault(); // Р‘Р»РѕРєСѓС”РјРѕ СЃРєСЂРѕР» РµРєСЂР°РЅСѓ РїС–Рґ С‡Р°СЃ Р·СѓРјСѓ
                const currentDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                
                // Р Р°С…СѓС”РјРѕ РјР°СЃС€С‚Р°Р±
                const distChange = currentDist / initialDist;
                currentScale = Math.max(1, Math.min(distChange, 4)); // РћР±РјРµР¶РµРЅРЅСЏ: РЅРµ РјРµРЅС€Рµ 1x С– РЅРµ Р±С–Р»СЊС€Рµ 4x
                viewerImg.style.transform = `scale(${currentScale})`;
            }
        }, { passive: false });

        viewer.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                // РЇРє РІ Instagram: РєРѕР»Рё РІС–РґРїСѓСЃРєР°С”С€ РїР°Р»СЊС†С–, РєР°СЂС‚РёРЅРєР° "РІС–РґСЃС‚СЂРёР±СѓС”" РЅР° РјС–СЃС†Рµ
                viewerImg.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                viewerImg.style.transform = 'scale(1)';
                currentScale = 1;
            }
        });
    }

}); // <-- Р’РћРў РўРђ РЎРђРњРђРЇ Р—РђРљР Р«Р’РђР®Р©РђРЇ РЎРљРћР‘РљРђ