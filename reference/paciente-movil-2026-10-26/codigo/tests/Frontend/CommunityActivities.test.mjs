import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const helpers=require('../../public/js/community-activities.js');
const source=readFileSync(new URL('../../public/js/communities.js',import.meta.url),'utf8');
function mount(items=[]){
 const storage=new Map();const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[],closest:()=>null,addEventListener:()=>{},dispatchEvent:()=>{},contains:()=>true};
 const window={location:{hash:''},localStorage,addEventListener:()=>{},requestAnimationFrame:f=>f(),scrollTo:()=>{},KliniCommunityActivities:{...helpers,items,load:()=>Promise.resolve(items)}};
 vm.runInNewContext(source,{window,localStorage,document:{querySelector:()=>null},Date,CustomEvent:class{},setTimeout,clearTimeout});
 const app=window.KliniCommunities.mount(root,{startView:'feed',hideBottomNav:true,separateCalendar:true});
 app.state.reservations={}; return {app,root,preview:window.KliniCommunities.renderEventPreview};
}
const activity={id:900,community_key:'respira',community_name:'Respira y Avanza',kind:'class',title:'Yoga y respiración',description:'Clase tranquila',starts_at:'2030-10-31T09:00',timezone:'America/Mexico_City',cost:'250.00',published:true,capacity:10,reservations:0,reserved:false};
test('published activities appear below their image with real cost, date and reservation control',()=>{
 const {root}=mount([activity]);assert.match(root.innerHTML,/Yoga y respiración/);assert.match(root.innerHTML,/\$250\.00 MXN/);assert.match(root.innerHTML,/data-activity-reserve="900"/);assert.ok(root.innerHTML.indexOf('kc-post-actions')<root.innerHTML.indexOf('kc-activity-details'));assert.doesNotMatch(root.innerHTML,/-3 personas/);
});
test('unpublished reserved activities remain in own calendar but never in the public feed',()=>{
 const {app,root}=mount([{...activity,published:false,reserved:true}]);assert.doesNotMatch(root.innerHTML,/data-activity-reserve="900"/);const saved=app.calendarReservations();assert.equal(saved.length,1);assert.equal(saved[0].item.title,activity.title);assert.match(app.renderCalendarCard(saved[0],true),/Cancelar reserva/);
});

test('feed puts new publications first without using event dates or mutating calendar data',()=>{
 const items=[{...activity,id:10,title:'Antigua',created_at:'2026-10-20 10:00:00',starts_at:'2030-10-24T09:00'}, {...activity,id:11,title:'Reciente',created_at:'2026-10-23 10:00:00',starts_at:'2030-11-24T09:00'}, {...activity,id:12,title:'Ultima',created_at:'2026-10-23 10:00:00',starts_at:'2031-11-24T09:00'}];
 const {root}=mount(items);
 assert.ok(root.innerHTML.indexOf('data-activity-reserve="12"')<root.innerHTML.indexOf('data-activity-reserve="11"'));
 assert.ok(root.innerHTML.indexOf('data-activity-reserve="11"')<root.innerHTML.indexOf('data-activity-reserve="10"'));
 assert.deepEqual(items.map(item=>item.id),[10,11,12]);
});
test('search combines type filters with accent-insensitive words and keeps the search input intact',()=>{
 const {app,root}=mount();const cards=[{dataset:{communityResult:'activities',activityKind:'class',searchText:'Respiración clase yoga'},hidden:false},{dataset:{communityResult:'profiles',searchText:'Mariana López'},hidden:false},{dataset:{communityResult:'posts',searchText:'Yoga en casa'},hidden:false}];
 root.querySelectorAll=()=>cards;const markup=root.innerHTML;app.state.communitySearch='respiracion';app.state.communitySearchScope='class';app.applyCommunitySearch();assert.deepEqual(cards.map(c=>c.hidden),[false,true,true]);assert.equal(root.innerHTML,markup);
 app.state.communitySearch='';app.state.communitySearchScope='profiles';app.applyCommunitySearch();assert.deepEqual(cards.map(c=>c.hidden),[true,false,true]);
});
test('all five activity types render and free activities show no invented price',()=>{
 for(const kind of Object.keys(helpers.kinds)){const {root}=mount([{...activity,kind,cost:0}]);assert.match(root.innerHTML,new RegExp(helpers.kinds[kind]));assert.match(root.innerHTML,/Gratuito/);}
});

test('event preview reuses exactly the public activity card and escapes user content',()=>{
 const item={...activity,kind:'event',title:'Yoga <script>alert(1)</script>',description:'Respira <img src=x onerror=alert(1)>',image:'/images/communities/category-wellness.png'};
 const {app,preview}=mount([item]);
 const community=app.catalogCommunities().find(c=>c.name===item.community_name);
 const rendered=preview(item);
 assert.equal(rendered.card,app.renderActivityCard(item,community));
 assert.match(rendered.stories,/Tu historia/);
 assert.match(rendered.card,/&lt;script&gt;/);
 assert.doesNotMatch(rendered.card,/<script>|<img src=x/);
 assert.ok(rendered.card.indexOf('kc-community-feed-description')<rendered.card.indexOf('kc-community-feed-cover'));
 assert.ok(rendered.card.indexOf('kc-community-feed-cover')<rendered.card.indexOf('kc-post-actions'));
});

test('legacy administrator event maps date, community and publication without inventing content',()=>{
 const event={id:'event-1792770000000-abc123',communityId:'community-yoga-mente',title:'Taller de Barro',description:'En Desierto de los Leones',startAt:'2026-10-24T00:00:00Z',timezone:'America/Mexico_City',cost:125,capacity:20,status:'published'};
 const payload=helpers.legacyActivity(event,{name:'Respira y Avanza'});
 assert.equal(payload.starts_at,'2026-10-23T18:00');assert.equal(payload.source_key,event.id);assert.equal(payload.community_name,'Respira y Avanza');assert.equal(payload.cost,125);assert.equal(payload.published,true);
 assert.equal(helpers.legacyActivity({...event,status:'draft'},{name:'Respira y Avanza'}).published,false);
});
