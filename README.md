# Telegram Mini App Starter (HTML/JS)

Минимальный шаблон Telegram Mini App на чистом HTML/CSS/JS с подключением Telegram Web Apps SDK.

## Что внутри

- `index.html` — базовая разметка приложения и подключение SDK.
- `styles.css` — простые стили с поддержкой Telegram theme variables.
- `app.js` — инициализация `Telegram.WebApp`, работа с `MainButton` и `sendData()`.

## Локальный запуск

Откройте папку в любом статическом сервере, например:

```powershell
cd d:\_DEV\PDR-bot
python -m http.server 8080
```

После этого откройте URL через Telegram (Mini App в боте), чтобы SDK был доступен.

## Важно

- `sendData()` отправляет строку в вашего бота как событие `web_app_data`.
- Для продакшена обязательно добавьте проверку `initData` на стороне сервера.
