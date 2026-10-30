(() => {
'use strict';
const modal=document.querySelector('[data-wallet-dialog]');
if(!modal)return;
const modalBody=modal.querySelector('[data-wallet-body]');
let config={storageKey:'social-wallet-demo',initialBalance:0};
let state={activeAlternateId:null,wallet:{balance:0,movements:[]}};
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value)||0);
const paths={wallet:'<path d="M4 7h15a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z"/>',card:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',dollar:'<path d="M12 2v20M17 6H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 6v1"/>',list:'<path d="M5 6h14M5 12h14M5 18h14"/>',up:'<path d="m6 12 6-6 6 6M12 6v14"/>',down:'<path d="m6 12 6 6 6-6M12 4v14"/>'};
function icon(name){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.wallet)+'</svg>';}
function saveState(){localStorage.setItem(config.storageKey,JSON.stringify(state.wallet));}
function openModal(){modalBody.innerHTML=arguments[2];if(!modal.open)modal.showModal();}
function loadState(){try{const saved=JSON.parse(localStorage.getItem(config.storageKey)||'null');state.wallet=saved&&Number.isFinite(saved.balance)&&Array.isArray(saved.movements)?saved:{balance:config.initialBalance,movements:[]};}catch{state.wallet={balance:config.initialBalance,movements:[]};}}
window.KliniWallet={open(options={}){config={...config,...options};loadState();renderFinance();},close(){modal.close();}};
document.querySelectorAll('[data-wallet-open]').forEach(button=>button.addEventListener('click',()=>window.KliniWallet.open()));
modal.querySelector('[data-wallet-close]').addEventListener('click',()=>modal.close());
modal.addEventListener('submit',event=>{
 if(!event.target.matches('[data-profile-recharge-form]'))return;
 event.preventDefault();
 const amount=Number(new FormData(event.target).get('amount'));
 if(!Number.isFinite(amount)||amount<10||amount>100000||amount%10!==0)return;
 const previous=JSON.parse(JSON.stringify(state.wallet));
 state.wallet.balance=Math.round((state.wallet.balance+amount)*100)/100;
 state.wallet.movements.unshift({id:'MOV-'+Date.now(),date:new Date().toLocaleDateString('es-MX'),concept:'Recarga de demostración',amount});
 try{saveState();renderFinance();window.dispatchEvent(new CustomEvent('social:wallet-recharged',{detail:{amount,demo:true}}));}catch{state.wallet=previous;const message=document.createElement('p');message.setAttribute('role','alert');message.textContent='No se pudo guardar la recarga local.';event.target.append(message);}
});
  async function loadWalletTokens() {
    var target = modalBody.querySelector('[data-wallet-tokens]');
    if (!target) return;
    try {
      var response = await fetch('/wallet/tokens', { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('No se pudo consultar tu saldo de Tokens.');
      var wallet = await response.json();
      if (!target.isConnected) return;
      target.innerHTML = '<div class="patient-wallet-token-heading"><span>' + icon('wallet') + '</span><div><small>Tokens de tu cuenta</small><strong>' + escapeHtml(wallet.balance) + ' ' + (wallet.balance === 1 ? 'Token' : 'Tokens') + '</strong><p>Gana 1 Token por cada evento que creas.</p></div></div>' +
        (wallet.movements.length ? '<details><summary>Movimientos de Tokens</summary><ul>' + wallet.movements.map(function (entry) {
          var date = new Date(String(entry.created_at).replace(' ', 'T') + 'Z').toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' });
          return '<li><span><strong>' + escapeHtml(entry.concept) + '</strong><small>' + escapeHtml(date) + '</small></span><b>+' + escapeHtml(entry.amount) + ' Token</b></li>';
        }).join('') + '</ul></details>' : '<p>Tus recompensas aparecerán aquí al crear un evento.</p>');
    } catch (error) {
      if (!target.isConnected) return;
      target.innerHTML = '<p role="status">' + escapeHtml(error.message) + '</p><button type="button" class="patient-profile-button">Reintentar</button>';
      target.querySelector('button').addEventListener('click', loadWalletTokens);
    }
  }

  function renderFinance() {
    var totalCredits = state.wallet.movements.reduce(function (sum, item) { return sum + Math.max(0, Number(item.amount) || 0); }, 0);
    var totalDebits = state.wallet.movements.reduce(function (sum, item) { return sum + Math.abs(Math.min(0, Number(item.amount) || 0)); }, 0);
    var movements = state.wallet.movements.map(function (item) {
      var amount = Number(item.amount) || 0;
      var isCredit = amount >= 0;
      return '<article class="patient-wallet-movement ' + (isCredit ? "is-credit" : "is-debit") + '">' +
        '<span class="patient-wallet-movement-icon">' + icon(isCredit ? "wallet" : "cart") + '</span>' +
        '<div class="patient-wallet-movement-copy"><strong>' + escapeHtml(item.concept) + '</strong><small>' + escapeHtml(item.date) + ' · ' + escapeHtml(item.id) + '</small></div>' +
        '<span class="patient-wallet-status ' + (isCredit ? "is-ok" : "is-debit") + '">' + (isCredit ? "Completado" : "Débito") + '</span>' +
        '<strong class="patient-wallet-amount ' + (isCredit ? "is-credit" : "is-debit") + '">' + (isCredit ? "+ " : "- ") + money(Math.abs(amount)) + '</strong>' +
        '<span class="patient-wallet-arrow">' + icon("chevron") + '</span>' +
      '</article>';
    }).join("");
    openModal("Billetera", "PAGOS Y RECARGAS", '<div class="patient-wallet-redesign">' +
      (!state.activeAlternateId ? '<section class="patient-wallet-tokens" data-wallet-tokens aria-label="Tokens de tu cuenta"><p role="status">Consultando Tokens…</p></section>' : '') +
      '<section class="patient-wallet-hero"><span class="patient-wallet-hero-icon">' + icon("wallet") + '</span><div><small>Saldo disponible</small><strong>' + money(state.wallet.balance) + '</strong><p>Administra tus pagos y recargas desde un solo lugar.</p></div><span class="patient-wallet-orb is-card">' + icon("card") + '</span><span class="patient-wallet-orb is-money">' + icon("dollar") + '</span></section>' +
      '<section class="patient-wallet-recharge"><div class="patient-wallet-recharge-main"><small>BILLETERA</small><h3>Recargar saldo</h3><form class="patient-wallet-recharge-form" data-profile-recharge-form><label><span>Monto a recargar</span><div class="patient-wallet-amount-field"><b>$</b><input name="amount" type="number" min="10" step="10" value="200" required></div></label><button class="patient-profile-button is-primary" type="submit">' + icon("card") + ' Recargar</button></form></div><aside class="patient-wallet-help"><span>' + icon("info") + '</span><div><h4>¿Cómo funciona?</h4><p>Ingresa el monto y recárgalo con tu método de pago preferido.</p></div></aside></section>' +
      '<section class="patient-wallet-movements"><div class="patient-wallet-section-head"><div><span class="patient-wallet-section-icon">' + icon("list") + '</span><h3>Movimientos recientes</h3></div></div><div class="patient-wallet-movement-list">' + movements + '</div><div class="patient-wallet-summary"><div><span class="patient-wallet-summary-icon is-credit">' + icon("up") + '</span><small>Total recargas</small><strong>' + money(totalCredits) + '</strong></div><div><span class="patient-wallet-summary-icon is-debit">' + icon("down") + '</span><small>Total consumos</small><strong>' + money(totalDebits) + '</strong></div><div><span class="patient-wallet-summary-icon is-count">' + icon("dollar") + '</span><small>Movimientos</small><strong>' + state.wallet.movements.length + '</strong></div></div></section>' +
    '</div>', true, "wallet");
    loadWalletTokens();
  }

})();
