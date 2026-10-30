(() => {
  'use strict';
  const host = document.querySelector('.social-menu-host');
  if (!host) return;
  const toggle = host.querySelector('[data-social-menu-toggle]');
  const menu = host.querySelector('.social-side-menu');
  const interactions = host.querySelector('[data-social-interactions-toggle]');
  const submenu = host.querySelector('.social-menu-submenu');
  function setOpen(open, restoreFocus = false) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (!open) { submenu.hidden = true; interactions.setAttribute('aria-expanded', 'false'); }
    if (restoreFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(menu.hidden));
  interactions.addEventListener('click', () => {
    submenu.hidden = !submenu.hidden;
    interactions.setAttribute('aria-expanded', String(!submenu.hidden));
  });
  document.addEventListener('click', event => { if (!host.contains(event.target)) setOpen(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) setOpen(false, true); });
  host.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (!host.contains(document.activeElement)) setOpen(false); });
  });
  menu.addEventListener('click', event => {
    const button = event.target.closest('[data-social-destination]');
    if (!button) return;
    const destination = button.dataset.socialDestination;
    setOpen(false, true);
    window.dispatchEvent(new CustomEvent('social:menu-navigate', { detail: { destination } }));
    const status = document.querySelector('[data-social-menu-status]');
    if (status) status.textContent = 'Destino seleccionado: ' + button.textContent.trim().replace(/\s+/g, ' ');
  });
})();
