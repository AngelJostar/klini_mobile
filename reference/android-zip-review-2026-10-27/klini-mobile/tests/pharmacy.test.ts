import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PRODUCTS, createPharmacyDemoOrder, createPharmacyWriter, emptyPharmacyState, filterPharmacyProducts, getPharmacyOffers, getProfilePharmacy, isPharmacyProduct, isPharmacyState, pharmacyOfferSnapshot, pharmacyTotals, type CartLine, type Product } from '../src/domain/pharmacy';
import { createDemoState } from '../src/domain/seed';
import { appReducer, hydrateState, validateAppState } from '../src/domain/reducer';
import { switchProfile } from '../src/domain/family';
const cart=():CartLine[]=>[{product:{...DEMO_PRODUCTS[0]},quantity:1},{product:{...DEMO_PRODUCTS[1]},quantity:1}];
const address={name:'Paciente de ejemplo',street:'Calle Ejemplo 123',neighborhood:'Colonia de ejemplo',postalCode:'03100'};
const input=()=>({lines:cart(),address:{...address},paymentMethod:'card' as const,prescriptionAccepted:false});
const child={id:'pharmacy-child',name:'Mateo de prueba',kind:'Niño' as const};

test('amounts use cents and empty carts do not accrue shipping',()=>{
 assert.deepEqual(pharmacyTotals(cart()),{subtotalCents:50000,shippingCents:4900,totalCents:54900});
 assert.deepEqual(pharmacyTotals([]),{subtotalCents:0,shippingCents:0,totalCents:0});
});
test('reject negative, fractional, duplicate and unavailable quantities and malformed money',()=>{
 for(const quantity of [-1,0,1.2,21,Infinity,NaN]) assert.throws(()=>pharmacyTotals([{product:DEMO_PRODUCTS[0],quantity}]));
 assert.throws(()=>pharmacyTotals([cart()[0],cart()[0]]));
 assert.throws(()=>pharmacyTotals([{product:{...DEMO_PRODUCTS[0],priceCents:1.2},quantity:1}]));
});
test('filters combine accent-insensitive search with facets, promotion and program flags',()=>{
 assert.equal(filterPharmacyProducts(DEMO_PRODUCTS,{query:'protector',specialty:'Dermatología',promotionsOnly:true}).length,1);
 assert.equal(filterPharmacyProducts(DEMO_PRODUCTS,{laboratory:'Lab. Derma'}).length,2);
 assert.equal(filterPharmacyProducts(DEMO_PRODUCTS,{programsOnly:true})[0].id,'demo-medicine');
 assert.equal(filterPharmacyProducts(DEMO_PRODUCTS,{type:'Medicamento',promotionsOnly:true}).length,0);
});
test('orders copy immutable product/address snapshots and are explicitly unpaid demo records',()=>{
 const request=input(); const order=createPharmacyDemoOrder(request,'DEMO-1');
 request.lines[0].product.name='Later edit'; request.address.street='Later street';
 assert.equal(order.lines[0].product.name,'Protector solar FPS 50'); assert.equal(order.address.street,address.street);
 assert.equal(order.mode,'demo'); assert.equal(order.status,'preparing'); assert.equal(order.totalCents,54900);
 assert.equal(isPharmacyState({...emptyPharmacyState(),orders:[order]}),true);
});
test('checkout never trusts supplied price, unknown IDs, or bypassed prescription flag',()=>{
 assert.throws(()=>createPharmacyDemoOrder({...input(),lines:[{product:{...DEMO_PRODUCTS[0],priceCents:1},quantity:1}]},'price'));
 assert.throws(()=>createPharmacyDemoOrder({...input(),lines:[{product:{...DEMO_PRODUCTS[0],id:'live-product'},quantity:1}]},'id'));
 assert.throws(()=>createPharmacyDemoOrder({...input(),lines:[{product:DEMO_PRODUCTS[3],quantity:1}]},'rx'));
 const rx=createPharmacyDemoOrder({...input(),lines:[{product:DEMO_PRODUCTS[3],quantity:1}],prescriptionAccepted:true},'rx');
 assert.equal(rx.prescriptionAccepted,true);
 assert.throws(()=>createPharmacyDemoOrder({...input(),address:{...address,postalCode:'123'}},'bad-address'));
});
test('old schemaVersion 1 needs no pharmacy data and hydration rejects malformed nested pharmacy',()=>{
 const old=createDemoState(); assert.equal(validateAppState(old),true);
 const loaded=hydrateState(JSON.stringify(old)); assert.equal(loaded.error,null); assert.equal(loaded.state.pharmacy,undefined);
 const invalid={...old,pharmacy:{...emptyPharmacyState(),cart:[{product:DEMO_PRODUCTS[0],quantity:-1}]}};
 assert.equal(validateAppState(invalid),false); assert.ok(hydrateState(JSON.stringify(invalid)).error);
});

test('optional distributor metadata survives hydration while malformed snapshots are rejected',()=>{
 const owner=createDemoState();
 const state={...owner,pharmacy:{...emptyPharmacyState(),cart:cart()}};
 assert.equal(hydrateState(JSON.stringify(state)).error,null);
 const provider={id:'12',name:'Distribuidor de prueba'};
 state.pharmacy.cart[0].product.provider=provider;
 const loaded=hydrateState(JSON.stringify(state));
 assert.equal(loaded.error,null); assert.deepEqual(loaded.state.pharmacy?.cart[0].product.provider,provider);
 for(const malformed of [null,{}, {id:12,name:'Distribuidor'}, {id:'0',name:'Distribuidor'}, {id:'abc',name:'Distribuidor'}, {id:'12',name:''}, {id:'12',name:'x'.repeat(2001)}]) {
  const invalid={...state,pharmacy:{...state.pharmacy,cart:[{product:{...state.pharmacy.cart[0].product,provider:malformed},quantity:1}]}};
  assert.equal(validateAppState(invalid),false); assert.ok(hydrateState(JSON.stringify(invalid)).error);
 }
});
test('orders with altered totals, payment flags or duplicate program requests fail hydration',()=>{
 const order=createPharmacyDemoOrder(input(),'DEMO-1');
 assert.equal(isPharmacyState({...emptyPharmacyState(),orders:[{...order,totalCents:1}]}),false);
 assert.equal(isPharmacyState({...emptyPharmacyState(),orders:[{...order,mode:'live'}]}),false);
 const request={id:'r',programId:'continuidad',createdAt:new Date().toISOString(),status:'review',mode:'demo'};
 assert.equal(isPharmacyState({...emptyPharmacyState(),programRequests:[request,{...request,id:'r2'}]}),false);
});
test('profile switching isolates pharmacy and round-trips owner cart',()=>{
 const owner=createDemoState(); const state=appReducer(owner,{type:'SET_PHARMACY',profileId:owner.profile.id,pharmacy:{...emptyPharmacyState(),cart:cart()}});
 const switched=switchProfile(state,child); assert.equal(switched.pharmacy,undefined);
 const updated=appReducer(switched,{type:'SET_PHARMACY',profileId:child.id,pharmacy:{...emptyPharmacyState(),favorites:['demo-glucose']}});
 const back=switchProfile(updated); assert.deepEqual(back.pharmacy?.cart,cart()); assert.deepEqual(switchProfile(back,child).pharmacy?.favorites,['demo-glucose']);
 assert.equal(validateAppState(back),true);
 const malformed={...back,family:{...back.family!,profiles:{...back.family!.profiles,[child.id]:{...back.family!.profiles[child.id],pharmacy:{cart:[]}}}}};
 assert.equal(validateAppState(malformed),false);
});
const wait=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
test('failed persisted change rolls back original profile only and preserves unrelated edits',async()=>{
 let current=createDemoState(); const ownerId=current.profile.id; let rejectWrite!:(error:Error)=>void; let calls=0;
 const write=createPharmacyWriter({current:()=>current,generation:()=>0,publish:next=>{current=next;},reduce:appReducer,persist:()=>++calls===1?new Promise<void>((_,reject)=>{rejectWrite=reject;}):Promise.resolve()});
 const operation=write(ownerId,p=>({pharmacy:{...p,cart:cart()},result:undefined}));
 const rejected=assert.rejects(operation,/storage/); await wait();
 current=switchProfile(current,child); current=appReducer(current,{type:'UPDATE_PROFILE',patch:{name:'Updated child'}});
 rejectWrite(new Error('storage')); await rejected;
 assert.equal(getProfilePharmacy(current,ownerId),undefined); assert.equal(current.profile.name,'Updated child'); assert.equal(current.profile.id,child.id);
 assert.equal(validateAppState(current),true);
});
test('queued changes serialize and failure does not poison the next write',async()=>{
 let current=createDemoState(); const id=current.profile.id; let fail=true;
 const write=createPharmacyWriter({current:()=>current,generation:()=>0,publish:next=>{current=next;},reduce:appReducer,persist:async()=>{if(fail){fail=false;throw new Error('first');}}});
 const a=write(id,p=>({pharmacy:{...p,cart:cart()},result:'a'})); const rejected=assert.rejects(a,/first/);
 const b=write(id,p=>({pharmacy:{...p,favorites:['demo-glucose']},result:'b'})); await rejected; assert.equal(await b,'b');
 assert.deepEqual(current.pharmacy?.cart,[]); assert.deepEqual(current.pharmacy?.favorites,['demo-glucose']);
});
test('reset invalidates pending successes and queued writes without reviving old state',async()=>{
 let current=createDemoState(); const id=current.profile.id; let generation=0; let complete!:()=>void;
 const write=createPharmacyWriter({current:()=>current,generation:()=>generation,publish:next=>{current=next;},reduce:appReducer,persist:()=>new Promise<void>(resolve=>{complete=resolve;})});
 const a=write(id,p=>({pharmacy:{...p,cart:cart()},result:'a'})); const b=write(id,p=>({pharmacy:{...p,favorites:['demo-glucose']},result:'b'}));
 const rejectedA=assert.rejects(a,/restablecer/); const rejectedB=assert.rejects(b,/restablecer/); await wait(); generation++;current=createDemoState();complete();await rejectedA;await rejectedB;assert.equal(current.pharmacy,undefined);
});
test('reset plus failed persistence cannot roll old pharmacy into reset state',async()=>{
 let current=createDemoState(); let generation=0; let rejectWrite!:(error:Error)=>void;
 const write=createPharmacyWriter({current:()=>current,generation:()=>generation,publish:next=>{current=next;},reduce:appReducer,persist:()=>new Promise<void>((_,reject)=>{rejectWrite=reject;})});
 const a=write(current.profile.id,p=>({pharmacy:{...p,cart:cart()},result:undefined})); const rejected=assert.rejects(a,/failed/);await wait();generation++;current=createDemoState();rejectWrite(new Error('failed'));await rejected;assert.equal(current.pharmacy,undefined);
});

test('demo catalog has four authoritative seller offers and independent Klini pricing',()=>{
 for(const product of DEMO_PRODUCTS) {
  const offers=getPharmacyOffers(product);
  assert.equal(offers.length,4);
  assert.deepEqual(offers.map(offer=>offer.provider?.name),['Klini','Farmasoma','Surtiplaza','Distribuidor C']);
  assert.equal(offers[0].provider?.isKlini,true);
  assert.ok(offers.slice(1).every(offer=>offer.provider?.isKlini===false));
  assert.ok(offers.every(offer=>offer.catalogItemId===product.id && offer.offers===undefined && offer.stock>0));
  assert.equal(new Set(offers.map(offer=>offer.id)).size,4);
 }
 assert.deepEqual(getPharmacyOffers(DEMO_PRODUCTS[0]).map(offer=>offer.priceCents),[32000,30500,31000,33000]);
});

test('offer choices retain catalog order, cap distributors, deduplicate sellers and never infer Klini',()=>{
 const base=pharmacyOfferSnapshot(DEMO_PRODUCTS[0]);
 const offer=(id:string,providerId:string,name='Distribuidor',isKlini=false,stock=5):Product=>({...base,id,stock,provider:{id:providerId,name,isKlini}});
 const options=[offer('1','1','Klini'),offer('2','2'),offer('3','2'),offer('4','4'),offer('5','5'),offer('6','6','Klini autorizado',true),offer('7','7','Agotado',false,0)];
 const selected=getPharmacyOffers({...base,offers:options});
 assert.deepEqual(selected.map(item=>item.id),['6','1','2','4']);
 assert.equal(selected[1].provider?.isKlini,false);
 assert.ok(selected.every(item=>item.offers===undefined));
 selected[0].provider!.name='Later edit';
 assert.equal(options[5].provider?.name,'Klini autorizado');
 const unknown=pharmacyOfferSnapshot(base);delete unknown.provider;
 assert.equal(getPharmacyOffers(unknown)[0].provider,undefined);
 assert.equal(getPharmacyOffers({...base,offers:[]}).length,0);
 assert.equal(getPharmacyOffers({...base,stock:0}).length,0);
});

test('selected distributor keeps its concrete ID, price and immutable snapshot through demo checkout',()=>{
 const options=getPharmacyOffers(DEMO_PRODUCTS[0]);
 const lines=[{product:options[1],quantity:2},{product:options[0],quantity:1}];
 assert.deepEqual(pharmacyTotals(lines),{subtotalCents:93000,shippingCents:4900,totalCents:97900});
 const order=createPharmacyDemoOrder({...input(),lines},'selected-offers');
 assert.equal(order.lines[0].product.id,'demo-sunscreen-farmasoma');
 assert.equal(order.lines[0].product.priceCents,30500);
 assert.deepEqual(order.lines[0].product.provider,{id:'9002',name:'Farmasoma',isKlini:false});
 assert.equal(order.lines[0].product.offers,undefined);
 options[1].provider!.name='Client edit';options[1].priceCents=1;
 assert.equal(order.lines[0].product.provider?.name,'Farmasoma');
 assert.equal(order.lines[0].product.priceCents,30500);
 assert.equal(getPharmacyOffers(DEMO_PRODUCTS[0])[1].provider?.name,'Farmasoma');
 for(const replacement of [{priceCents:1},{id:'demo-sunscreen-unknown'},{catalogItemId:'another-item'},{provider:{id:'9001',name:'Klini',isKlini:true}}]) {
  const product={...getPharmacyOffers(DEMO_PRODUCTS[0])[1],...replacement};
  assert.throws(()=>createPharmacyDemoOrder({...input(),lines:[{product,quantity:1}]},'tampered'));
 }
});

test('legacy carts and orders without new seller fields hydrate without rewriting history',()=>{
 const oldProduct=pharmacyOfferSnapshot(DEMO_PRODUCTS[0]);
 delete oldProduct.provider;delete oldProduct.catalogItemId;
 const oldLines=[{product:{...oldProduct,priceCents:31000},quantity:1}];
 const oldOrder={...createPharmacyDemoOrder(input(),'historic'),lines:oldLines,...pharmacyTotals(oldLines)};
 const state={...createDemoState(),pharmacy:{...emptyPharmacyState(),cart:[{product:oldProduct,quantity:1}],orders:[oldOrder]}};
 const loaded=hydrateState(JSON.stringify(state));
 assert.equal(loaded.error,null);
 assert.deepEqual(loaded.state.pharmacy,state.pharmacy);
 assert.equal(loaded.state.pharmacy?.orders[0].lines[0].product.priceCents,31000);
 assert.equal(loaded.state.pharmacy?.orders[0].lines[0].product.provider,undefined);
 // A fresh checkout of the former base ID still resolves the original Klini demo offer.
 assert.equal(createPharmacyDemoOrder({...input(),lines:[{product:oldProduct,quantity:1}]},'legacy-new').lines[0].product.provider?.isKlini,true);
 for(const malformed of [{catalogItemId:''},{provider:{id:'1',name:'Seller',isKlini:'true'}},{offers:[{...oldProduct,offers:[oldProduct]}]},{offers:[oldProduct,oldProduct]}]) {
  assert.equal(isPharmacyProduct({...oldProduct,...malformed}),false);
 }
});
