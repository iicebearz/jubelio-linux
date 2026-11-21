// Desktop-only enhancements injected into the Jubelio Chat web app.
// No preload, no IPC. Runs in the page's main world via executeJavaScript.
(() => {
  if (window.__jubelioDesktopEnhancements) return;
  window.__jubelioDesktopEnhancements = true;

  const API_BASE = 'https://chat-api.jubelio.com';
  const TABLIST = '[role="tablist"][aria-label="Percakapan terbuka"]';
  const CLOSE_TAB = 'button[aria-label^="Tutup "]';
  const CLEAR_ID = 'jubelio-clear-tabs';
  const CHAT_LIST = 'section[aria-label="Daftar chat"]';

  function cookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function tenantId() {
    try {
      const raw = localStorage.getItem('chat_tenant_context');
      return raw ? JSON.parse(raw)?.state?.chatTenantId ?? null : null;
    } catch {
      return null;
    }
  }

  function openTabs() {
    try {
      const raw = localStorage.getItem('chat-tabs');
      const tabs = raw ? JSON.parse(raw)?.state?.tabs : null;
      return Array.isArray(tabs) ? tabs.map(String) : [];
    } catch {
      return [];
    }
  }

  function buyerIdFromFiber(element) {
    const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
    if (!key) return null;
    let fiber = element[key];
    for (let depth = 0; fiber && depth < 16; depth += 1, fiber = fiber.return) {
      const props = fiber.memoizedProps;
      const id = props?.chat?.buyerId ?? props?.conversation?.buyer_id;
      if (id !== undefined && id !== null) return String(id);
    }
    return null;
  }

  async function syncBuyer(buyerId) {
    const headers = { 'Content-Type': 'application/json' };
    const token = cookie('chat_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const tenant = tenantId();
    if (tenant) headers['X-TENANT-ID'] = String(tenant);

    const response = await fetch(
      `${API_BASE}/chat/${encodeURIComponent(buyerId)}/sync`,
      { method: 'POST', headers }
    );
    if (!response.ok) throw new Error(`sync failed: ${response.status}`);
  }

  // New conversation -> sync first, then let the web app open the tab.
  document.addEventListener(
    'click',
    async (event) => {
      if (!event.isTrusted || event.defaultPrevented) return;
      const target = event.target;
      const row = target instanceof Element
        ? target.closest(`${CHAT_LIST} div[data-index] button[aria-pressed]`)
        : null;
      if (!row) return;

      const buyerId = buyerIdFromFiber(row);
      if (buyerId === null || openTabs().includes(buyerId)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await syncBuyer(buyerId);
      } catch (error) {
        console.warn('[jubelio-desktop] sync gagal', error);
      }
      row.click(); // isTrusted === false, so this listener skips it.
    },
    true
  );

  function installClearButton() {
    const bar = document.querySelector(TABLIST);
    if (!bar || document.getElementById(CLEAR_ID)) return;

    const button = document.createElement('button');
    button.id = CLEAR_ID;
    button.type = 'button';
    button.title = 'Bersihkan semua tab chat';
    button.setAttribute('aria-label', 'Bersihkan semua tab chat');
    button.textContent = 'Bersihkan tab';
    button.style.cssText = [
      'flex:0 0 auto',
      'align-self:center',
      'margin:0 8px',
      'padding:4px 10px',
      'border:1px solid rgba(127,127,127,.35)',
      'border-radius:6px',
      'background:transparent',
      'color:inherit',
      'font:inherit',
      'font-size:12px',
      'line-height:18px',
      'white-space:nowrap',
      'cursor:pointer',
    ].join(';');

    button.addEventListener('click', async () => {
      if (!confirm('Tutup semua tab chat? Riwayat pesan tetap tersimpan.')) return;
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const currentBar = document.querySelector(TABLIST);
        const close = currentBar?.querySelector(CLOSE_TAB);
        if (!close) break;
        close.click();
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    });

    bar.appendChild(button);
  }

  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      installClearButton();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installClearButton();
})();
