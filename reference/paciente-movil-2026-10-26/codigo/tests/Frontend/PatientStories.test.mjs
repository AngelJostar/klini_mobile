import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/js/patient-stories.js', import.meta.url), 'utf8');
const DAY = 86400000;
function setup() {
  let time = Date.parse('2026-10-12T12:00:00Z');
  class Clock extends Date { static now() { return time; } }
  const storage = new Map();
  const localStorage = {getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value)};
  const window = {addEventListener() {}};
  const document = {addEventListener() {}};
  vm.runInNewContext(source, {window, document, localStorage, Date: Clock, setTimeout: () => 1, clearTimeout() {}});
  const profile = {id: 'profile-a', name: 'Mi perfil', photo: '/avatar-original.jpg'};
  const app = {root: {querySelector: () => null}, activePatientProfile: () => profile, patientProfilePhoto: () => profile.photo};
  const create = options => window.KliniPatientStories.create(app, {url: '/patient/stories', ...options});
  const story = (id, expires = time + DAY) => ({id, photo: `/story-${id}.jpg`, createdAt: new Date(time).toISOString(), expiresAt: new Date(expires).toISOString()});
  return {create, profile, story, storage, advance: amount => { time += amount; }};
}

test('la historia nunca sustituye el avatar y sólo las historias nuevas muestran aro', () => {
  const {create, story} = setup(), stories = create();
  stories.groups = [{id:'1', own:true, name:'Mi perfil', stories:[story('own')]}, {id:'2', name:'Mariana', avatar:'/mariana.jpg', stories:[story('new')]}];
  let html = stories.render();
  assert.match(html, /src="\/avatar-original.jpg"/);
  assert.doesNotMatch(html, /src="\/story-/);
  assert.equal((html.match(/has-unseen/g) || []).length, 2);
  stories.markSeen(stories.groups[1].stories[0]);
  assert.equal(stories.unseen(stories.groups[1]), false);
  assert.equal((stories.render().match(/has-unseen/g) || []).length, 1);
  assert.equal(stories.allGroups()[1].stories.length, 1);
  stories.groups[1].stories.push(story('newer'));
  assert.equal(stories.unseen(stories.groups[1]), true);
});

test('ver una de varias fotos mantiene el aro hasta ver todas, sin borrar fotos', () => {
  const {create, story} = setup(), stories = create();
  const group = {id:'2', name:'Mariana', stories:[story('a'), story('b')]};
  stories.groups = [group];
  stories.markSeen(group.stories[0]);
  assert.equal(stories.unseen(group), true);
  stories.markSeen(group.stories[1]);
  assert.equal(stories.unseen(group), false);
  assert.equal(stories.allGroups()[0].stories.length, 2);
});

test('las vistas se conservan al recargar y no se heredan entre perfiles', async () => {
  const {create, story, profile} = setup(), first = create();
  const group = {id:'other', name:'Otro', stories:[story('a')]};
  first.markSeen(group.stories[0]);
  const reloaded = create();
  reloaded.request = async () => ({groups:[group], serverTime:'2026-10-12T12:00:00Z'});
  await reloaded.refresh();
  assert.equal(reloaded.unseen(group), false);
  profile.id = 'profile-b';
  await reloaded.refresh();
  assert.equal(reloaded.unseen(group), true);
});

test('el vencimiento exacto de 24 horas retira historias y cierra el visor', () => {
  const {create, story, advance} = setup(), stories = create();
  const photo = story('a');
  stories.groups = [{id:'other', name:'Otro', stories:[photo]}];
  stories.current = {story:photo};
  advance(DAY - 1);
  assert.equal(stories.allGroups().length, 1);
  advance(1);
  assert.equal(stories.allGroups().length, 0);
  stories.expire();
  assert.equal(stories.current, null);
});

test('la demo tiene perfiles sin historias, no se abren y la vigencia no se reinicia', () => {
  const {create, advance} = setup();
  const people = Array.from({length:5}, (_, i) => ({id:`person-${i}`, name:`Persona ${i}`}));
  const stories = create({demo:true, people});
  assert.equal(stories.allGroups().length, 5);
  assert.equal(stories.allGroups().filter(group => group.stories.length).length, 3);
  stories.open('demo-person-4');
  assert.equal(stories.modal, undefined);
  assert.match(stories.render(), /Persona 4: sin historias/);
  const created = stories.demoGroups()[0].stories[0].createdAt;
  advance(DAY);
  const reload = create({demo:true, people});
  assert.equal(reload.demoGroups()[0].stories[0].createdAt, created);
  assert.equal(reload.allGroups().filter(group => group.stories.length).length, 0);
});

test('una respuesta atrasada no mezcla las historias de otro perfil', async () => {
  const {create, profile} = setup(), stories = create();
  let finishFirst;
  stories.request = () => new Promise(resolve => { finishFirst = resolve; });
  const first = stories.refresh();
  profile.id = 'profile-b';
  stories.request = async () => ({serverTime:'2026-10-12T12:00:00Z', groups:[]});
  await stories.refresh();
  finishFirst({serverTime:'2026-10-12T12:00:00Z', groups:[{id:'profile-a', stories:[]}]});
  await first;
  assert.equal(stories.groups.length, 0);
});
