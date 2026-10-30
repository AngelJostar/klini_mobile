import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/js/communities.js', import.meta.url), 'utf8');
const today = new Date(2026, 9, 6, 12);
class CalendarDate extends Date {
  constructor(...args) { super(...(args.length ? args : [today.getTime()])); }
}

function mount(options = {}) {
  const storage = new Map(), listeners = {};
  const root = {
    innerHTML:'', querySelector:()=>null, querySelectorAll:()=>[], closest:()=>null,
    addEventListener:(name,fn)=>{(listeners[name] ||= []).push(fn);},
    dispatchEvent:()=>{}, contains:()=>true,
  };
  const localStorage = {getItem:key=>storage.get(key) || null,setItem:(key,value)=>storage.set(key,value)};
  const window = {location:{hash:''}, localStorage, addEventListener:()=>{}, requestAnimationFrame:fn=>fn(),scrollTo:()=>{}};
  vm.runInNewContext(source, {window,localStorage,document:{querySelector:()=>null},Date:CalendarDate,CustomEvent:class{},setTimeout,clearTimeout});
  const app = window.KliniCommunities.mount(root, {storageKey:'patient-a', hideBottomNav:true, ...options});
  app.state.reservations = {};
  return {app,root,storage,click(action,id) {
    const control = {getAttribute:name=>name === 'data-action' ? action : id};
    const target = {closest:selector=>selector === '[data-action]' ? control : null};
    listeners.click.forEach(fn=>fn({target}));
  }};
}

function activity(app, id, date, extra = {}) {
  app.state.adminCreatedEvents.push({id,title:id,communityId:'respira',dateKey:date,time:'10:00',place:'Estudio Klini',...extra});
  app.reserve(id);
}

test('reservadas y anteriores incluyen sólo reservas vigentes y ordenan por fecha',()=>{
  const {app,root,click} = mount();
  activity(app,'later','2026-10-10'); activity(app,'sooner','2026-10-08');
  activity(app,'old','2026-09-01'); activity(app,'recent','2026-10-05');
  activity(app,'cancelled','2026-10-09'); app.cancel('cancelled');
  app.state.reservations.unknown = true;
  app.state.reservations.falseValue = false;
  click('community-section','calendar');
  assert.match(root.innerHTML,/Mis reservaciones/);
  assert.match(root.innerHTML,/2 reservaciones/);
  assert.ok(root.innerHTML.indexOf('>sooner<') < root.innerHTML.indexOf('>later<'));
  assert.doesNotMatch(root.innerHTML,/>old<|>cancelled<|>unknown</);
  click('calendar-filter','past');
  assert.match(root.innerHTML,/2 reservaciones anteriores/);
  assert.ok(root.innerHTML.indexOf('>recent<') < root.innerHTML.indexOf('>old<'));
  assert.doesNotMatch(root.innerHTML,/>sooner<|>later</);
});

test('la clasificación respeta años, fechas españolas, mediodía y el final de una actividad',()=>{
  const {app} = mount();
  activity(app,'midnight','2026-10-06',{time:'12:00 a.m.'});
  activity(app,'noon','2026-10-06',{time:'12:00 p.m.'});
  activity(app,'ongoing','2026-10-06',{time:'11:00 AM - 01:00 PM'});
  activity(app,'dayOnly','2026-10-06',{time:''});
  activity(app,'newYear','2027-01-01');
  const records = app.calendarReservations(new Date(2026,9,6,12,1));
  assert.equal(records.find(x=>x.id === 'midnight').past,true);
  assert.equal(records.find(x=>x.id === 'noon').past,true);
  assert.equal(records.find(x=>x.id === 'ongoing').past,false);
  assert.equal(records.find(x=>x.id === 'dayOnly').past,false);
  assert.equal(records.find(x=>x.id === 'newYear').date.getFullYear(),2027);
  assert.equal(app.calendarItemDate({date:'Martes, 27 de mayo 2025'}).getFullYear(),2025);
  assert.equal(app.calendarItemDate({date:'08/10/2026'}).getMonth(),9);
  assert.equal(app.calendarItemDate({dateKey:'2026-02-31'}),null);
  assert.equal(app.calendarItemDate({number:22,month:'jul'}).getFullYear(),2026);
});

test('clases y eventos creados comparten listado, detalle y navegación del switch',()=>{
  const {app,root,click} = mount();
  app.state.adminCreatedClasses.push({id:'class-test',communityId:'respira',title:'Yoga de prueba',dateKey:'2026-10-08',time:'08:00',modality:'Presencial'});
  app.reserve('class-test');
  click('community-section','calendar');
  assert.match(root.innerHTML,/Yoga de prueba/);
  click('calendar-detail','class-test');
  assert.match(root.innerHTML,/Tu reservación/);
  assert.match(root.innerHTML,/Modalidad: Presencial/);
  click('calendar-back');
  assert.match(root.innerHTML,/Mis reservaciones/);
  click('community-section','feed');
  assert.match(root.innerHTML,/aria-selected="true" tabindex="0" data-action="community-section" data-id="feed"/);
  assert.doesNotMatch(root.innerHTML,/Mis reservaciones/);
});

test('la confirmación existente aparece en el calendario y conserva la reserva al recargar',()=>{
  const {app,storage,click} = mount();
  app.openReservationFlow('class-respira-1'); app.confirmReservationFlow(); app.save();
  assert.ok(JSON.parse(storage.get('patient-a')).reservations['class-respira-1']);
  app.state.reservations = {}; app.load();
  assert.ok(app.calendarReservations(today).some(x=>x.id === 'class-respira-1'));
  click('reservation-view-reservations');
  assert.equal(app.state.view,'calendar');
  assert.equal(app.state.calendarFilter,'reserved');
});

test('el cambio de perfil no muestra reservaciones del paciente anterior',()=>{
  const {app,root,storage} = mount();
  activity(app,'private-activity','2026-10-08'); app.save();
  storage.set('patient-b',JSON.stringify({reservations:{}}));
  app.switchPatientProfile({id:'b',name:'Paciente B'},'patient-b');
  app.state.view='calendar'; app.render();
  assert.match(root.innerHTML,/0 reservaciones/);
  assert.doesNotMatch(root.innerHTML,/private-activity/);
  app.switchPatientProfile({id:'a',name:'Paciente A'},'patient-a');
  assert.ok(app.calendarReservations(today).some(x=>x.id === 'private-activity'));
});

test('datos sin fecha no se pierden y el contenido de las tarjetas se escapa',()=>{
  const {app,root,click} = mount();
  activity(app,'undated','',{title:'<script>alert(1)</script>',time:''});
  click('community-section','calendar');
  assert.match(root.innerHTML,/Fecha por confirmar/);
  assert.match(root.innerHTML,/&lt;script&gt;/);
  assert.doesNotMatch(root.innerHTML,/<script>/);
});

test('la carga demo agrega tres futuras y dos anteriores sin duplicar ni recuperar canceladas',()=>{
  const {app,storage} = mount();
  activity(app,'existing','2026-10-12');
  assert.equal(app.seedDemoReservations(),true);
  const demo = app.calendarReservations(today).filter(item=>item.item.demo);
  assert.equal(demo.filter(item=>!item.past).length,3);
  assert.equal(demo.filter(item=>item.past).length,2);
  assert.ok(app.state.reservations.existing);
  app.cancel('demo-calendar-v1-yoga'); app.save();
  app.load();
  assert.equal(app.seedDemoReservations(),false);
  assert.equal(app.state.adminCreatedEvents.length,6);
  assert.equal(app.state.reservations['demo-calendar-v1-yoga'],undefined);
  assert.equal(JSON.parse(storage.get('patient-a')).demoReservationsSeeded,true);
});

test('las reservas demo permanecen sólo en el perfil donde se cargaron',()=>{
  const {app,storage} = mount();
  app.seedDemoReservations();
  storage.set('patient-b',JSON.stringify({reservations:{}}));
  app.switchPatientProfile({id:'b',name:'Paciente B'},'patient-b');
  assert.equal(app.state.demoReservationsSeeded,false);
  assert.equal(app.calendarReservations(today).length,0);
  app.switchPatientProfile({id:'a',name:'Paciente A'},'patient-a');
  assert.equal(app.state.demoReservationsSeeded,true);
  assert.equal(app.calendarReservations(today).filter(item=>item.item.demo).length,5);
});

test('el calendario integrado conserva reservas y notifica la navegación hacia calendario y comunidades',()=>{
  const destinations = [];
  const {app,root,click} = mount({separateCalendar:true,onNavigate:view=>destinations.push(view)});
  assert.doesNotMatch(root.innerHTML,/data-action="community-section"/);
  activity(app,'upcoming','2026-10-08');
  activity(app,'previous','2026-10-01');
  click('reservation-view-reservations');
  assert.deepEqual(destinations,['calendar']);
  assert.match(root.innerHTML,/>upcoming</);
  assert.doesNotMatch(root.innerHTML,/kc-community-calendar-tab/);
  click('calendar-filter','past');
  click('calendar-detail','previous');
  assert.match(root.innerHTML,/Tu reservación/);
  click('calendar-back');
  assert.match(root.innerHTML,/>previous</);
  assert.deepEqual(destinations,['calendar']);
  click('open-directory-filter','explore');
  assert.deepEqual(destinations,['calendar','directory']);
  app.showCalendar();
  assert.match(root.innerHTML,/>previous</);
  assert.equal(app.calendarReservations(today).length,2);
});


test('la tarjeta conserva asistentes y abre la comunidad vinculada',()=>{
  const {app,root,storage,click} = mount({separateCalendar:true});
  app.openReservationFlow('class-respira-1');
  app.updateReservationAttendees(2);
  app.confirmReservationFlow();
  app.save();
  app.load();
  assert.equal(JSON.parse(storage.get('patient-a')).reservations['class-respira-1'].attendees,3);
  const reservation = app.calendarReservations(today).find(item=>item.id === 'class-respira-1');
  assert.match(app.renderCalendarCard(reservation,false),/3 lugares reservados/);
  assert.match(app.renderCalendarCard(reservation,false),/data-action="open-community-panel" data-id="respira"/);
  click('open-community-panel','respira');
  assert.equal(app.state.detailId,'respira');
  assert.equal(app.state.view,'detail');
});
