import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState } from '../src/domain/seed';
import { switchProfile, editStoredProfile } from '../src/domain/family';
import { appReducer, parseStoredState, validateAppState } from '../src/domain/reducer';
const child = {id:'child-mateo',name:'Mateo Salinas',kind:'Niño' as const};
test('switching profiles isolates clinical data and restores each record set after reload',()=>{
const owner=createDemoState();let active=switchProfile(owner,child);assert.equal(active.profile.name,child.name);assert.equal(active.profile.birthDate,'');
for(const key of ['appointments','records','policies','claims','medications','messages'] as const) assert.equal(active[key].length,0);
active=appReducer(active,{type:'ADD_RECORD',record:{id:'child-note',type:'Nota',title:'Nota infantil',date:'2026-10-27',doctorName:'',description:'Registro de Mateo'}});
active=switchProfile(active);assert.deepEqual(active.records,owner.records);assert.deepEqual(active.appointments,owner.appointments);assert.equal(active.profile.id,owner.profile.id);
active=switchProfile(parseStoredState(JSON.stringify(active)),child);assert.equal(active.records.length,1);assert.equal(active.records[0].id,'child-note');assert.equal(validateAppState(active),true);
});
test('editing inactive owner or child preserves identity and other family data',()=>{
const owner=createDemoState();let active=switchProfile(owner,child);active=editStoredProfile(active,owner.profile.id,{name:'Sofía Actualizada'});assert.equal(active.profile.name,'Mateo Salinas');active=editStoredProfile(active,child.id,{name:'Mateo Editado',birthDate:'2020-05-15',email:'padre@example.com',kind:'Niño'});active=switchProfile(active);assert.equal(active.profile.name,'Sofía Actualizada');active=switchProfile(active,child);assert.equal(active.profile.name,'Mateo Editado');assert.equal(active.profile.birthDate,'2020-05-15');assert.equal(validateAppState(active),true);
});
test('malformed stored family data is rejected',()=>{const active=switchProfile(createDemoState(),child);active.family!.profiles[child.id].profile.email='invalid';assert.equal(validateAppState(active),false);});
