import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const socialSource=readFileSync(new URL('../../public/js/patient-social.js',import.meta.url),'utf8');
const communitySource=readFileSync(new URL('../../public/js/communities.js',import.meta.url),'utf8');
function environment() {
  const records=new Map();
  const storage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)};
  const window={localStorage:storage,location:{hash:''},addEventListener:()=>{},requestAnimationFrame:fn=>fn(),scrollTo:()=>{}};
  const context={window,localStorage:storage,document:{querySelector:()=>null},Date,CustomEvent:class{},setTimeout,clearTimeout};
  vm.runInNewContext(socialSource,context);
  vm.runInNewContext(communitySource,context);
  const social=window.KliniPatientSocial;
  function mount(options={}) {
    const listeners={};
    const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,contains:()=>true,dispatchEvent:()=>{},addEventListener:(name,fn)=>(listeners[name]||=[]).push(fn)};
    const events=[];
    const app=window.KliniCommunities.mount(root,{patient:{id:'a',name:'Paciente A'},storageKey:'community:a',hideBottomNav:true,startView:'posts',onAction:event=>events.push(event),...options});
    return {app,root,events,click(action,id) {
      const control={getAttribute:key=>key==='data-action'?action:id};
      listeners.click.forEach(fn=>fn({target:{closest:selector=>selector==='[data-action]'?control:null}}));
    },input(attribute,value) {
      listeners.input.forEach(fn=>fn({target:{hasAttribute:name=>name===attribute,getAttribute:()=>null,value}}));
    }};
  }
  return {social,storage,records,mount};
}
const post={id:'post-1',author:{id:'mariana',name:'Mariana López'},image:'/images/communities/category-wellness.png'};

test('las interacciones persisten y quedan aisladas por perfil',()=>{
  const {social,storage}=environment();
  const a=social.createStore(storage,'social','a');
  a.record(social.fromCommunityEvent({type:'post.liked',source:'home',data:{post,active:true}}));
  assert.equal(social.createStore(storage,'social','a').read().events.length,1);
  assert.equal(social.createStore(storage,'social','b').read().events.length,0);
});

test('quitar likes o reposts retira la actividad y repetirlos no la duplica',()=>{
  const {social,storage}=environment();
  const store=social.createStore(storage,'social','a');
  for(const type of ['post.liked','post.reposted']) {
    const event=active=>social.fromCommunityEvent({type,source:'home',data:{post,active}});
    store.record(event(true));store.record(event(true));
    assert.equal(store.read().events.length,1);
    store.record(event(false));assert.equal(store.read().events.length,0);
  }
});

test('confirmar o eliminar solicitudes demo es persistente e idempotente',()=>{
  const {social,storage}=environment();
  const store=social.createStore(storage,'social','a');store.seedDemo();
  store.decide('demo-mariana','accepted');store.decide('demo-mariana','accepted');
  store.decide('demo-diego','removed');store.seedDemo();
  const state=social.createStore(storage,'social','a').read();
  assert.equal(state.requests.filter(item=>item.status==='pending').length,0);
  assert.equal(state.events.filter(item=>item.type==='follow').length,1);
  assert.equal(state.events.length,5);
});

test('mensajes distintos se conservan; redeliver un mensaje no duplica el registro',()=>{
  const {social,storage}=environment();
  const store=social.createStore(storage,'social','a');
  for(const id of ['one','two','one']) store.record(social.fromCommunityEvent({type:'message.sent',source:'communities',data:{post:{...post,communityId:'respira'},messageId:id,text:'Hola'}}));
  assert.equal(store.read().events.length,2);
  assert.equal(store.read().events[0].communityId,'respira');
  assert.equal(store.read().events[0].source,'communities');
});

test('solicitar seguir al mismo autor desde dos publicaciones no duplica solicitudes enviadas',()=>{
  const {social,storage}=environment();const store=social.createStore(storage,'social','a');
  store.record(social.fromCommunityEvent({type:'user.follow-requested',source:'home',data:{post,active:true}}));
  store.record(social.fromCommunityEvent({type:'user.follow-requested',source:'communities',data:{post:{...post,id:'community-respira-post-0'},active:true}}));
  assert.equal(store.read().events.length,1);
  store.record(social.fromCommunityEvent({type:'user.follow-requested',source:'home',data:{post,active:false}}));
  assert.equal(store.read().events.length,0);
});

test('los grupos ordenan actividad por fecha y distinguen hoy, semana y mes',()=>{
  const {social}=environment();const now=new Date(2026,9,7,12);
  const events=[1,10,0,40].map(days=>({id:days,createdAt:new Date(now.getTime()-days*86400000).toISOString()}));
  const groups=social.groupEvents(events,now);
  assert.deepEqual(Array.from(groups,group=>group.title),['Hoy','Últimos 7 días','Últimos 30 días','Anteriores']);
  assert.equal(groups[0].items[0].id,0);
});

test('la actividad escapa texto externo y rechaza imágenes con javascript',()=>{
  const {social}=environment();
  const html=social.renderEvent({id:'" onclick="bad',type:'message',postId:'p',peer:{name:'<script>bad</script>',avatar:'javascript:bad'},image:'javascript:bad',text:'<img src=x onerror=bad>',source:'home',createdAt:new Date().toISOString()});
  assert.doesNotMatch(html,/<script>|<img src=x|src="javascript:| onclick="bad/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&lt;img/);
});

test('un fallo de almacenamiento no se presenta como guardado',()=>{
  const {social}=environment();
  const store=social.createStore({getItem:()=>null,setItem:()=>{throw Error('Quota');}},'social','a');
  assert.throws(()=>store.record({type:'like',postId:'p'}),/Quota/);
  assert.equal(store.read().events.length,0);
});

test('los controles de Inicio emiten actividad con perfil y persisten sus acciones',()=>{
  const {mount}=environment();const {app,click,events}=mount();
  click('like','post-1');click('repost','post-1');click('follow-author','post-1');
  app.state.replyDrafts['post-1-new']='¡Hola!';click('send-post-message','post-1');
  app.state.replyDrafts['post-1-message-0']='Gracias';click('send-message-reply','post-1-message-0');
  assert.deepEqual(events.map(item=>item.type),['post.liked','post.reposted','user.follow-requested','message.sent','message.replied']);
  assert.ok(events.every(item=>item.profileId==='a' && item.source==='home' && item.data.post.id==='post-1'));
  const loaded=mount().app;
  assert.equal(loaded.state.likes['post-1'],true);assert.equal(loaded.state.reposts['post-1'],true);
  assert.equal(loaded.state.postComments['post-1'][0].text,'¡Hola!');
  assert.equal(loaded.state.replyThreads['post-1-message-0'][0].text,'Gracias');
});

test('las publicaciones de comunidades permiten las mismas acciones y enlaces de actividad',()=>{
  const {mount}=environment();const {app,root,click,events}=mount({startView:'feed',separateCalendar:true});
  app.openSocialPost('community-respira-post-0','respira',true);
  assert.equal(app.state.view,'detail');assert.equal(app.state.detailId,'respira');
  assert.match(root.innerHTML,/data-action="send-post-message" data-id="community-respira-post-0"/);
  click('like','community-respira-post-0');click('repost','community-respira-post-0');
  app.state.replyDrafts['community-respira-post-0-new']='Nos vemos';click('send-post-message','community-respira-post-0');
  const actions=events.filter(item=>item.data?.post);
  assert.equal(actions.length,3);
  assert.ok(actions.every(item=>item.source==='communities'&&item.data.post.communityId==='respira'));
  app.switchPatientProfile({id:'b',name:'Paciente B'},'community:b');
  assert.equal(Object.keys(app.state.likes).length,0);assert.equal(Object.keys(app.state.postComments).length,0);
});

test('mensajes vacíos se ignoran y el texto se escapa en la publicación',()=>{
  const {mount}=environment();const {app,click,events,root}=mount();
  app.state.replyDrafts['post-1-new']='   ';click('send-post-message','post-1');
  assert.equal(events.length,0);
  app.state.replyDrafts['post-1-new']='<script>bad</script>';click('send-post-message','post-1');
  assert.match(root.innerHTML,/&lt;script&gt;/);assert.doesNotMatch(root.innerHTML,/<script>bad/);
});

test('el buscador encuentra nombre, tema y ciudad sin distinguir acentos o mayúsculas',()=>{
  const {mount}=environment();const {app,root}=mount({startView:'feed',separateCalendar:true});
  assert.match(root.innerHTML,/type="search" data-community-search/);
  assert.doesNotMatch(root.innerHTML,/kc-community-workspace-title/);
  const community={name:'Respira y Avanza',category:'Yoga',description:'Respiración consciente',city:'Ciudad de México'};
  for(const query of ['respira','YOGA','respiracion','MEXICO','yoga mexico','']) assert.equal(app.communityMatchesSearch(community,query),true,query);
  assert.equal(app.communityMatchesSearch(community,'running'),false);
});

test('buscar oculta tarjetas sin reconstruir el input y limpiar recupera los resultados',()=>{
  const {mount}=environment();const {app,root,input}=mount({startView:'feed',separateCalendar:true});
  const communities=app.catalogCommunities();
  const cards=communities.map(item=>({hidden:false,getAttribute:()=>item.id}));
  const status={};const empty={};
  root.querySelectorAll=selector=>selector==='[data-community-feed-card]'?cards:[];
  root.querySelector=selector=>selector==='[data-community-search-status]'?status:selector==='[data-community-search-empty]'?empty:null;
  const html=root.innerHTML;
  input('data-community-search','inexistente-000');
  assert.ok(cards.every(card=>card.hidden));assert.equal(empty.hidden,false);assert.equal(status.textContent,'0 comunidades encontradas');
  assert.equal(root.innerHTML,html);
  input('data-community-search','respira');assert.ok(cards.some(card=>!card.hidden));
  input('data-community-search','');assert.ok(cards.every(card=>!card.hidden));assert.equal(status.hidden,true);assert.equal(empty.hidden,true);
});
