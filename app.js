(function bootstrapMiniApp() {
  const statusEl = document.getElementById("status");
  const userDataEl = document.getElementById("user-data");
  const sendBtn = document.getElementById("send-btn");
  const themeBtn = document.getElementById("theme-btn");

  if (!window.Telegram || !window.Telegram.WebApp) {
    statusEl.textContent = "Telegram Web Apps SDK не найден. Откройте страницу через Telegram.";
    userDataEl.textContent = "SDK недоступен";
    return;
  }

  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  const user = tg.initDataUnsafe?.user || null;
  const payload = {
    user,
    platform: tg.platform,
    colorScheme: tg.colorScheme,
    version: tg.version
  };

  userDataEl.textContent = JSON.stringify(payload, null, 2);
  statusEl.textContent = "Mini App инициализирован.";

  tg.MainButton.setText("Отправить в бота");
  tg.MainButton.onClick(() => {
    tg.sendData(JSON.stringify({ action: "main_button_clicked", at: Date.now() }));
    statusEl.textContent = "Данные отправлены через MainButton.";
  });
  tg.MainButton.show();

  sendBtn.addEventListener("click", () => {
    tg.sendData(
      JSON.stringify({
        action: "manual_send",
        userId: user?.id || null,
        ts: new Date().toISOString()
      })
    );
    statusEl.textContent = "Данные отправлены в бота через sendData().";
  });

  themeBtn.addEventListener("click", () => {
    statusEl.textContent = `Тема: ${tg.colorScheme}, platform: ${tg.platform}`;
  });
})();
