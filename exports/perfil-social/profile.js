(() => {
  'use strict';
  // Set window.KliniProfileConfig BEFORE this script when integrating with Laravel.
  const config = { endpoint: '/social/profile', logoutUrl: '/social/logout', loginUrl: '/login', ...window.KliniProfileConfig };
  const panel = document.getElementById('social-profile');
  if (!panel) return;
  let profile = { id: 'preview', userId: 'preview', name: 'Usuario', ...config.user };
  const form = document.getElementById('profile-form');
  const $ = selector => panel.querySelector(selector);
  const identity = () => ({ ...profile });
  window.DrSamPatientProfilePanel = { getActiveProfile: identity };
  function paint() {
    panel.dataset.profileId = String(profile.userId || profile.id);
    $('[data-profile-name]').textContent = profile.name;
    $('[data-profile-initials]').textContent = profile.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    form.elements.name.value = profile.name;
    window.dispatchEvent(new CustomEvent('drsam:patient-profile', { detail: { action: 'profile:active-changed', profile: identity() } }));
  }
  function view(name) {
    for (const id of ['home', 'edit', 'logout']) document.getElementById('profile-' + id).hidden = id !== name;
  }
  async function request(url, method = 'GET', body) {
    const destination = new URL(url, location.href);
    if (destination.origin !== location.origin) throw Error('Usa una ruta del mismo servidor.');
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    if (method !== 'GET' && !token) throw Error('Recarga la página para obtener el token de sesión.');
    const response = await fetch(destination, { method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { 'X-CSRF-TOKEN': token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || response.redirected) throw Error(Object.values(data.errors || {}).flat().join(' ') || data.message || 'No se pudo completar la operación. Revisa tu sesión.');
    return data;
  }
  async function open() {
    view('home'); if (!panel.open) panel.showModal();
    try { const data = await request(config.endpoint); profile = { ...data.user, userId: String(data.user.id) }; paint(); }
    catch (error) { $('[data-profile-save-status]').textContent = error.message; if (!config.user) { view('edit'); form.querySelector('[type=submit]').disabled = true; } }
  }
  window.KliniProfile = { open, getActiveProfile: identity };
  document.querySelectorAll('[data-profile-panel-open]').forEach(button => button.addEventListener('click', open));
  $('[data-profile-close]').addEventListener('click', () => panel.close());
  $('[data-profile-edit]').addEventListener('click', () => { view('edit'); $('[data-profile-save-status]').textContent = ''; form.elements.name.focus(); });
  $('[data-profile-logout]').addEventListener('click', () => { view('logout'); $('[data-profile-logout-error]').textContent = ''; });
  panel.querySelectorAll('[data-profile-back]').forEach(button => button.addEventListener('click', () => view('home')));
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { const data = await request(config.endpoint, 'PUT', { name: form.elements.name.value.trim() }); profile = { ...data.user, userId: String(data.user.id) }; paint(); view('home'); }
    catch (error) { $('[data-profile-save-status]').textContent = error.message; }
    finally { button.disabled = false; }
  });
  document.getElementById('profile-confirm-logout').addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true; button.textContent = 'Cerrando…';
    try { await request(config.logoutUrl, 'POST'); window.dispatchEvent(new Event('social:logout')); const destination = new URL(config.loginUrl, location.href); location.assign(destination.origin === location.origin ? destination.href : '/'); }
    catch (error) { $('[data-profile-logout-error]').textContent = error.message; button.disabled = false; button.textContent = 'Cerrar sesión'; }
  });
  window.addEventListener('drsam:social-open', event => { panel.close(); window.dispatchEvent(new CustomEvent('social:open-post', { detail: event.detail })); });
  paint();
})();
