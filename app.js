(function bootstrapMiniApp() {
  const startBtn = document.getElementById("start-btn");

  if (!startBtn) {
    return;
  }

  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  startBtn.addEventListener("click", () => {
    const firstName = tg?.initDataUnsafe?.user?.first_name || "друже";
    const message = `Вітаємо, ${firstName}! Починаємо навчання ПДД України 2026.`;

    if (tg?.showAlert) {
      tg.showAlert(message);
    } else {
      window.alert(message);
    }
  });
})();
