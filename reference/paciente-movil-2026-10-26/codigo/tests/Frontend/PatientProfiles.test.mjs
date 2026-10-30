import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/js/patient-profile-panel.js', import.meta.url), 'utf8');
const primaryId = '__primary_profile';

function mount({storage = new Map(), serverName = 'Paciente Principal', fetch = async()=>({ok:true,json:async()=>({redirect:'/'})})} = {}) {
  const events = [];
  const listeners = {}, destinations = [], removedSessionKeys = [];
  const errorBox = {hidden:true,textContent:''};
  const panel = {dataset: {storageKey: 'profile-test', profileName: serverName, profileId: '100000001',csrfToken:'test-csrf',logoutUrl:'/logout',homeUrl:'/'}};
  const selector = {configure(config) { this.config = config; }, addEventListener() {}};
  const localStorage = {
    fail: false,
    getItem: key => storage.get(key) || null,
    setItem(key, value) {
      if (this.fail) throw new Error('Almacenamiento no disponible');
      storage.set(key, value);
    },
  };
  const document = {
    querySelector: query => ({'[data-patient-profile-panel]': panel, '[data-patient-profile-selector]': selector,'[data-profile-logout-error]':errorBox}[query] || null),
    querySelectorAll: () => [],
    addEventListener(name,fn) { (listeners[name] ||= []).push(fn); },
  };
  const window = {__drSamSubscriptionsMobilePanLoader: true, dispatchEvent: event => events.push(event)};
  window.top={location:{assign:url=>destinations.push(url)}};
  window.location={assign:url=>destinations.push('frame:'+url)};
  vm.runInNewContext(source, {
    window, document, localStorage, fetch, AbortController, setTimeout, clearTimeout,
    sessionStorage:{removeItem:key=>removedSessionKeys.push(key)},
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  return {api: window.DrSamPatientProfilePanel, selector, storage, localStorage, events,destinations,errorBox,removedSessionKeys,
    async logout() {
      const button={disabled:false,textContent:'Cerrar sesión',dataset:{},matches:selector=>selector==='[data-profile-confirm-logout]'};
      const event={target:{closest:selector=>selector==='button, [data-profile-view], [data-profile-panel-open]'?button:null},preventDefault(){}};
      listeners.click.forEach(fn=>fn(event));
      await new Promise(resolve=>setTimeout(resolve,0));
      return button;
    }
  };
}

test('el selector usa los perfiles existentes sin cambiar la cuenta al mostrarlos', () => {
  const {api, selector, events} = mount();
  assert.equal(selector.config.activeId, primaryId);
  assert.equal(selector.config.profiles.length, 5);
  assert.equal(selector.config.profiles.find(p => p.id === 'mateo').userId, '100000002');
  assert.equal(api.getActiveProfileId(), '100000001');
  assert.equal(events.length, 0);
});

test('el cambio explícito conserva los datos separados de cada perfil', () => {
  const {api, selector} = mount();
  const originalWallet = JSON.stringify(api.getState().wallet);
  selector.config.onSwitch({id: 'mateo'});
  assert.equal(api.getActiveProfileId(), '100000002');
  assert.equal(api.getState().wallet.movements.length, 0);
  selector.config.onSwitch({id: primaryId});
  assert.equal(JSON.stringify(api.getState().wallet), originalWallet);
});

test('editar una ficha inactiva guarda su nombre sin cambiar de usuario', () => {
  const {api, selector, storage, events} = mount();
  selector.config.onSave({id: 'mateo', name: 'Mateo Actualizado'});
  assert.equal(api.getActiveProfileId(), '100000001');
  assert.equal(api.getState().profile.name, 'Paciente Principal');
  assert.equal(events.length, 0);
  const reloaded = mount({storage});
  assert.equal(reloaded.selector.config.profiles.find(p => p.id === 'mateo').name, 'Mateo Actualizado');
});

test('el nombre local principal persiste y una actualización del servidor prevalece', () => {
  const {selector, storage} = mount();
  selector.config.onSave({id: primaryId, name: 'Nombre Local'});
  assert.equal(mount({storage}).api.getActiveProfile().name, 'Nombre Local');
  assert.equal(mount({storage, serverName: 'Nombre del Servidor'}).api.getActiveProfile().name, 'Nombre del Servidor');
});

test('un fallo al guardar conserva el perfil y sus datos sin anunciar cambios', () => {
  const {api, selector, localStorage, events} = mount();
  const before = JSON.stringify(api.getState());
  localStorage.fail = true;
  assert.throws(() => selector.config.onSwitch({id: 'mateo'}), /Almacenamiento/);
  assert.equal(JSON.stringify(api.getState()), before);
  assert.throws(() => selector.config.onSave({id: 'mateo', name: 'No guardado'}), /Almacenamiento/);
  assert.equal(JSON.stringify(api.getState()), before);
  assert.equal(events.length, 0);
});

test('rechaza cuentas desconocidas y nombres vacíos', () => {
  const {api, selector} = mount();
  assert.throws(() => selector.config.onSwitch({id: 'unknown'}), /cambiar de perfil/);
  assert.throws(() => selector.config.onSave({id: 'unknown', name: 'Otro'}), /nombre/);
  assert.throws(() => selector.config.onSave({id: 'mateo', name: '  '}), /nombre/);
  assert.equal(api.getActiveProfileId(), '100000001');
});

test('cerrar sesión hace POST con CSRF y navega la ventana completa al inicio',async()=>{
  const requests=[];
  const page=mount({fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>({redirect:'/'})};}});
  await page.logout();
  assert.equal(requests.length,1);assert.equal(requests[0].url,'/logout');
  assert.equal(requests[0].options.method,'POST');assert.equal(requests[0].options.headers['X-CSRF-TOKEN'],'test-csrf');
  assert.deepEqual(page.destinations,['/']);assert.deepEqual(page.removedSessionKeys,['patientPortalView']);
  assert.equal(page.events.at(-1).detail.action,'logout');
});

test('un error al cerrar sesión conserva la vista y permite reintentar',async()=>{
  const page=mount({fetch:async()=>({ok:false,status:419})});
  const button=await page.logout();
  assert.equal(button.disabled,false);assert.equal(button.textContent,'Cerrar sesión');
  assert.equal(page.errorBox.hidden,false);assert.match(page.errorBox.textContent,/Recarga/);
  assert.equal(page.destinations.length,0);assert.equal(page.events.length,0);
});

test('la desconexión al salir libera el botón sin afirmar que cerró la sesión',async()=>{
  const page=mount({fetch:async()=>{throw new TypeError('Sin conexión');}});
  const button=await page.logout();
  assert.equal(button.disabled,false);assert.equal(page.destinations.length,0);
  assert.equal(page.errorBox.hidden,false);
});
