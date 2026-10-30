import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const require=createRequire(import.meta.url);
const {attendeeRows}=require('../../public/js/community-activities.js');

test('attendee list uses real identities, escapes content, and explains an empty list',()=>{
  const html=attendeeRows([{name:'Ana <script>alert(1)</script>',username:'ana"<img>',reserved_at:'2030-10-23T15:30:00Z'}]);
  assert.match(html,/Ana &lt;script&gt;/);
  assert.match(html,/@ana&quot;&lt;img&gt;/);
  assert.match(html,/Reserva confirmada/);
  assert.doesNotMatch(html,/<script>|<img>/);
  assert.match(attendeeRows([]),/Aún no hay personas inscritas/);
});

test('admin refresh deduplicates overlapping requests and publishes new server counts',async()=>{
  const events=[],pending=[];
  const window={addEventListener(){},dispatchEvent:event=>events.push(event.type)};
  const document={readyState:'loading',querySelector:()=>null,addEventListener(){}};
  vm.runInNewContext(readFileSync(new URL('../../public/js/community-activities.js',import.meta.url),'utf8'),{
    window,document,FormData,Event,Intl,Date,
    fetch:()=>new Promise(resolve=>pending.push(data=>resolve({ok:true,json:async()=>data}))),
  });
  const api=window.KliniCommunityActivities;
  const first=api.refreshAdmin(),overlap=api.refreshAdmin();
  assert.equal(first,overlap);
  pending.shift()({activities:[{id:7,reservations:2}]});
  await first;
  assert.equal(api.adminItems[0].reservations,2);
  assert.deepEqual(events,['klini:admin-activities']);
  const unchanged=api.refreshAdmin();
  pending.shift()({activities:[{id:7,reservations:2}]});
  await unchanged;
  assert.equal(events.length,1);
  const cancelled=api.refreshAdmin();
  pending.shift()({activities:[{id:7,reservations:1}]});
  await cancelled;
  assert.equal(api.adminItems[0].reservations,1);
  assert.equal(events.length,2);
});
