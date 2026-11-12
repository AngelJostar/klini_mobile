import assert from 'node:assert/strict';
import test from 'node:test';
import { createPharmacyClient, createPharmacyRequestId, pharmacyApiConfigured, pharmacyDecimalToCents, validatePharmacyApiUrl, type PharmacyOrderInput } from '../src/services/pharmacy-api';
import { getPharmacyOffers } from '../src/domain/pharmacy';

const BASE = 'http://127.0.0.1:8000/api/mobile/v1';
const KEY = '43a8389a-cf7e-4ccb-a85f-543e50a0b42d';
const product = { id: 1, name: 'Protector', presentation: '50 mL', laboratory: 'Lab', specialty: 'Piel', product_type: 'Cuidado', category: 'Piel', image_url: 'javascript:alert(1)', price: '320.01', compare_at_price: '360.00', stock: 5, requires_prescription: false, description: 'Descripción' };
const settings = { enabled: true, title: 'Farmacia', subtitle: 'Catálogo', currency: 'MXN', shipping_fee: '49.00', checkout_available: false, orders_available: true, purchase_terms: 'https://farmacia.example.test/terminos', notice: 'Solicitud sin cobro.' };
const order = { id: 3, status: 'submitted', payment_status: 'not_configured', created_at: '2026-11-11T18:00:00.000000Z', currency: 'MXN',
  items: [{ product_id: 1, name: 'Protector', quantity: 2, unit_price: '320.01', requires_prescription: false }],
  subtotal: '640.02', shipping_fee: '49.00', total: '689.02' };
const input = (): PharmacyOrderInput => ({ lines: [{ product: { id: '1', name: 'Protector', presentation: '50 mL', laboratory: 'Lab', specialty: 'Piel', type: 'Cuidado', priceCents: 1, stock: 5, requiresPrescription: false, description: 'Producto' }, quantity: 2 }],
  address: { name: 'Paciente demo', street: 'Calle ejemplo 1', neighborhood: 'Centro', postalCode: '03100' }, termsAccepted: true, clientRequestId: KEY });
function fixture(body: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const client = createPharmacyClient({ baseUrl: BASE, fetchImpl: async (url, init = {}) => {
    calls.push({ url: String(url), init }); return Response.json(body, { status });
  } });
  return { client, calls };
}

test('URL rejects external cleartext, credentials, query, fragment, and wrong API roots', () => {
  for (const url of [BASE, 'https://api.example.test/api/mobile/v1/', 'http://192.168.1.3/api/mobile/v1', 'http://[::1]:8000/api/mobile/v1']) assert.ok(validatePharmacyApiUrl(url));
  for (const url of ['http://api.example.test/api/mobile/v1', 'https://a:b@api.test/api/mobile/v1', BASE + '?token=x', BASE + '#x', BASE + '/pharmacy', 'http://172.32.1.2/api/mobile/v1', 'ftp://localhost/api/mobile/v1', '']) assert.throws(() => validatePharmacyApiUrl(url));
});
test('decimal money converts exactly and rejects unsupported/bad/oversized amounts', () => {
  for (const [amount, expected] of [['0', 0], ['0.01', 1], ['320.01', 32001], ['49.5', 4950], ['1000000.00', 100000000]] as const) assert.equal(pharmacyDecimalToCents(amount), expected);
  for (const amount of ['-1', '1.001', '1e2', '01.00', 'NaN', '1,000', '1000000.01', null, {}]) assert.throws(() => pharmacyDecimalToCents(amount));
});
test('catalog validates records, drops dangerous images, and retains honest settings', async () => {
  const { client, calls } = fixture({ data: { products: [product], settings } });
  const result = await client.loadPharmacyCatalog();
  assert.equal(result.products[0].priceCents, 32001);
  assert.equal(result.products[0].imageUrl, undefined);
  assert.equal(result.settings.shippingCents, 4900);
  assert.equal(result.settings.checkoutAvailable, false);
  assert.equal(result.settings.ordersAvailable, true);
  assert.equal(result.settings.termsText, 'Solicitud sin cobro.');
  assert.equal(result.settings.purchaseTermsUrl, 'https://farmacia.example.test/terminos');
  assert.equal(calls[0].init.credentials, 'omit');
  assert.equal(calls[0].init.redirect, 'error');
  assert.equal((calls[0].init.headers as Record<string,string>).Authorization, undefined);
});

test('catalog retains valid optional distributor metadata and rejects malformed values', async () => {
  const provider = { id: 12, name: ' Distribuidor de prueba ' };
  const valid = fixture({ data: { products: [{ ...product, provider }], settings } });
  assert.deepEqual((await valid.client.loadPharmacyCatalog()).products[0].provider, { id: '12', name: 'Distribuidor de prueba' });
  assert.equal((await fixture({ data: { products: [product], settings } }).client.loadPharmacyCatalog()).products[0].provider, undefined);
  for (const malformed of [{}, { id: 0, name: 'Distribuidor' }, { id: 'abc', name: 'Distribuidor' }, { id: 12, name: '' }, { id: 12, name: 42 }, { id: 12, name: 'x'.repeat(2001) }]) {
    const invalid = fixture({ data: { products: [{ ...product, provider: malformed }], settings } });
    await assert.rejects(invalid.client.loadPharmacyCatalog(), { code: 'invalid_response' });
  }
});
test('invalid catalogue never silently becomes demo products', async () => {
  const { client } = fixture({ data: { products: [{ ...product, price: 'NaN' }], settings } });
  await assert.rejects(client.loadPharmacyCatalog(), { code: 'invalid_response' });
  const disabled = fixture({ data: { products: [], settings: { ...settings, enabled: false } } });
  assert.deepEqual((await disabled.client.loadPharmacyCatalog()).products, []);
});
test('order request excludes client prices/totals and retries use the same UUID', async () => {
  const { client, calls } = fixture({ data: order }, 201);
  const draft = input();
  draft.lines[0].product.provider = { id: '999', name: 'Distribuidor no confiable del cliente' };
  const result = await client.submitPharmacyOrder('1|test-token', draft);
  await client.submitPharmacyOrder('1|test-token', draft);
  assert.equal(result.totalCents, 68902);
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(body.items, [{ product_id: 1, quantity: 2 }]);
  assert.equal(body.client_request_id, KEY);
  assert.equal(body.delivery_method, 'delivery');
  assert.equal(body.total, undefined);
  assert.equal(body.provider, undefined);
  assert.equal(JSON.stringify(body).includes('Distribuidor no confiable del cliente'), false);
  assert.equal(body.address.postal_code, '03100');
  assert.deepEqual(body, JSON.parse(String(calls[1].init.body)));
  assert.equal((calls[0].init.headers as Record<string,string>).Authorization, 'Bearer 1|test-token');
});
test('generated request id remains stable for the same submitted input on uncertain retry', async () => {
  const { client, calls } = fixture({ data: order });
  const draft = input(); delete draft.clientRequestId;
  await client.submitPharmacyOrder('token', draft); await client.submitPharmacyOrder('token', draft);
  assert.equal(JSON.parse(String(calls[0].init.body)).client_request_id, JSON.parse(String(calls[1].init.body)).client_request_id);
  assert.match(createPharmacyRequestId(), /^[a-f0-9-]{36}$/i);
});
test('orders reject bad address, repeated products, demo product id and absent terms before fetch', async () => {
  const { client, calls } = fixture({ data: order });
  for (const mutate of [(v:PharmacyOrderInput)=>{v.termsAccepted=false;},(v:PharmacyOrderInput)=>{v.lines[0].product.id='demo-sunscreen';},(v:PharmacyOrderInput)=>{v.address.postalCode='bad';},(v:PharmacyOrderInput)=>{v.lines.push(v.lines[0]);}]) {
    const value=input();mutate(value);await assert.rejects(client.submitPharmacyOrder('token',value));
  }
  assert.equal(calls.length,0);
});
test('price snapshot response mismatch is rejected instead of showing a false total', async () => {
  const { client } = fixture({ data: { ...order, total: '1.00' } });
  await assert.rejects(client.submitPharmacyOrder('token', input()), { code: 'invalid_response' });
});
test('login returns only runtime token for patient, never accepts doctor role', async () => {
  const { client, calls } = fixture({ success: true, data: { access_token: '1|runtime-token', user: { role: 'patient', name: 'Paciente' } } });
  assert.deepEqual(await client.loginPharmacy(' patient ', 'not-a-real-password'), { token: '1|runtime-token', name: 'Paciente' });
  assert.equal(JSON.parse(String(calls[0].init.body)).login, 'patient');
  const doctor = fixture({ data: { access_token: '2|runtime-token', user: { role: 'doctor' } } });
  await assert.rejects(doctor.client.loginPharmacy('doctor','test'), { code: 'role_not_allowed' });
  assert.equal(doctor.calls.length, 2);
  assert.equal(doctor.calls[1].url, BASE + '/auth/logout');
  assert.equal((doctor.calls[1].init.headers as Record<string,string>).Authorization, 'Bearer 2|runtime-token');
});
test('server failures are actionable and do not echo reflected secrets', async () => {
  const { client } = fixture({ error: { code: 'validation_error', message: 'private-password' } }, 422);
  await assert.rejects(client.loginPharmacy('patient','private-password'), error => {
    assert.equal((error as {code:string}).code,'validation_error');assert.ok(!(error as Error).message.includes('private-password'));return true;
  });
});
test('orders pagination consumes all pages with token and no server-directed URL traversal', async () => {
  const urls:string[]=[];
  const client=createPharmacyClient({baseUrl:BASE,fetchImpl:async(url)=>{
    urls.push(String(url));const page=urls.length;
    return Response.json({data:[{...order,id:page}],current_page:page,last_page:2,next_page_url:'https://evil.example/token'});
  }});
  assert.equal((await client.loadPharmacyOrders('token')).length,2);
  assert.deepEqual(urls,[BASE+'/pharmacy/orders?page=1',BASE+'/pharmacy/orders?page=2']);
});
test('abort and timeout are explicit, not silent demo fallback', async () => {
  const control=new AbortController();control.abort();
  const {client,calls}=fixture({data:order});
  await assert.rejects(client.loadPharmacyCatalog(control.signal),{code:'aborted'});assert.equal(calls.length,0);
  const slow=createPharmacyClient({baseUrl:BASE,timeoutMs:10,fetchImpl:(_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('abort'))))});
  await assert.rejects(slow.loadPharmacyCatalog(),{code:'timeout'});
});
test('prescription upload uses multipart, enforces file types and validates pending review response', async () => {
  const {client,calls}=fixture({data:{id:8,file_name:'receta.pdf',mime_type:'application/pdf',size_bytes:10,status:'pending_review',created_at:'2026-11-11T18:00:00Z'}},201);
  const result=await client.uploadPrescription('token',{uri:'blob:test',name:'receta.pdf',mimeType:'application/pdf',size:10,file:new Blob(['%PDF-test'],{type:'application/pdf'})});
  assert.equal(result.status,'pending_review');
  assert.ok(calls[0].init.body instanceof FormData);
  assert.equal((calls[0].init.headers as Record<string,string>)['Content-Type'],undefined);
  await assert.rejects(client.uploadPrescription('token',{uri:'file:bad',name:'bad.svg',mimeType:'image/svg+xml'}),{code:'validation'});
  await assert.rejects(client.uploadPrescription('token',{uri:'file:large',name:'large.pdf',mimeType:'application/pdf',size:9000000}),{code:'validation'});
  assert.equal(calls.length,1);
});
test('invalid configured endpoint remains connected-but-broken, never demo mode', () => {
  const previous=process.env.EXPO_PUBLIC_PHARMACY_API_URL;
  try {process.env.EXPO_PUBLIC_PHARMACY_API_URL='invalid-url';assert.equal(pharmacyApiConfigured(),true);}
  finally {if(previous===undefined)delete process.env.EXPO_PUBLIC_PHARMACY_API_URL;else process.env.EXPO_PUBLIC_PHARMACY_API_URL=previous;}
});


test('shared monetary and quantity contract accepts boundary totals and 99, rejects 100', async () => {
  const atLimit = fixture({data:{...order,items:[{product_id:1,name:'Producto',quantity:1,unit_price:'999999.99'}],subtotal:'999999.99',shipping_fee:'0.01',total:'1000000.00'}});
  const limitInput=input();limitInput.lines[0].quantity=1;
  assert.equal((await atLimit.client.submitPharmacyOrder('token',limitInput)).totalCents,100000000);
  const ninetyNine = fixture({data:{...order,items:[{product_id:1,name:'Producto',quantity:99,unit_price:'320.01'}],subtotal:'31680.99',shipping_fee:'49.00',total:'31729.99'}});
  const draft=input();draft.lines[0].quantity=99;
  assert.equal((await ninetyNine.client.submitPharmacyOrder('token',draft)).lines[0].quantity,99);
  draft.lines[0].quantity=100;
  await assert.rejects(ninetyNine.client.submitPharmacyOrder('token',draft));
  assert.equal(ninetyNine.calls.length,1);
  const aboveLimit=fixture({data:{...order,total:'1000000.01'}});
  await assert.rejects(aboveLimit.client.submitPharmacyOrder('token',input()),{code:'invalid_response'});
});
test('aborting a request cancels only transport; logout is a separate explicit request', async () => {
  const urls:string[]=[];const control=new AbortController();
  const client=createPharmacyClient({baseUrl:BASE,fetchImpl:async(url,init)=>{
    urls.push(String(url));
    return new Promise((_resolve,reject)=>{init?.signal?.addEventListener('abort',()=>reject(new Error('cancelled')));control.abort();});
  }});
  await assert.rejects(client.loadPharmacyOrders('runtime-token',control.signal),{code:'aborted'});
  assert.deepEqual(urls,[BASE+'/pharmacy/orders?page=1']);
  const logout=fixture({success:true,data:{message:'Sesión cerrada'}});
  await logout.client.logoutPharmacy('runtime-token');
  assert.equal(logout.calls[0].url,BASE+'/auth/logout');
  assert.equal(logout.calls[0].init.method,'POST');
  assert.equal((logout.calls[0].init.headers as Record<string,string>).Authorization,'Bearer runtime-token');
});
test('logout treats expired sessions as closed but surfaces network/server failure', async () => {
  await fixture({error:{code:'unauthenticated'}},401).client.logoutPharmacy('expired');
  await assert.rejects(fixture({error:{code:'failure'}},500).client.logoutPharmacy('token'),{status:500});
});



test('order field lengths and max50 unique lines match backend before network', async () => {
  const {client,calls}=fixture({data:order});
  for(const [field,length] of [['name',151],['street',251],['neighborhood',151],['reference',501]] as const){
    const value=input();value.address[field]='a'.repeat(length);
    await assert.rejects(client.submitPharmacyOrder('token',value),{code:'validation'});
  }
  const value=input();value.lines=Array.from({length:51},(_,index)=>({product:{...value.lines[0].product,id:String(index+1)},quantity:1}));
  await assert.rejects(client.submitPharmacyOrder('token',value),{code:'validation'});
  assert.equal(calls.length,0);
});
test('terms URL is mapped separately and null or unsafe values keep readable notice', async () => {
  for(const terms of [null,'javascript:alert(1)','https://secret:password@example.test/terms']){
    const {client}=fixture({data:{products:[],settings:{...settings,purchase_terms:terms,notice:undefined}}});
    const result=await client.loadPharmacyCatalog();
    assert.equal(result.settings.purchaseTermsUrl,undefined);
    assert.match(result.settings.termsText,/solicitud no implica pago/);
  }
});

const linkedOffer=(offerId:number,providerId:number,price:string,isKlini=false,catalogId=42)=>({...product,id:offerId,catalog_item_id:catalogId,
 currency:'MXN',price,provider:{id:providerId,name:isKlini?'Klini':'Distribuidor '+providerId,is_klini:isKlini}});
type RemoteOffer=Omit<ReturnType<typeof linkedOffer>,'provider'> & {provider:{id:number;name:string;is_klini?:boolean}};
const universalItem=(offers:RemoteOffer[],catalogId=42)=>({id:catalogId,name:'Producto universal',description:'Descripción oficial',presentation:'50 mL',
 category:'Cuidado',currency:'MXN',requires_prescription:false,available:offers.some(offer=>offer.stock>0),
 price_from:offers.some(offer=>offer.stock>0)?(Math.min(...offers.filter(offer=>offer.stock>0).map(offer=>Number(offer.price)))).toFixed(2):null,offers});

test('universal catalog groups exact catalog IDs, retains independent Klini price and keeps legacy products separate',async()=>{
 const offers=[linkedOffer(11,2,'305.00'),linkedOffer(12,1,'320.00',true),linkedOffer(13,3,'310.00'),linkedOffer(14,4,'330.00'),linkedOffer(15,5,'335.00')];
 const another=linkedOffer(21,2,'200.00',false,43);
 const legacy={...product,id:99,name:'Producto universal',provider:{id:9,name:'Distribuidor independiente'}};
 const {client}=fixture({data:{settings,products:[...offers,another,legacy],catalog_items:[universalItem(offers),universalItem([another],43)]}});
 const catalog=await client.loadPharmacyCatalog();
 assert.equal(catalog.products.length,3);
 assert.deepEqual(catalog.products.map(item=>item.catalogItemId),['42','43',undefined]);
 assert.equal(catalog.products[0].id,'12');
 assert.equal(catalog.products[0].priceCents,32000); // price_from is 305.00, never the Klini price.
 assert.equal(catalog.products[0].offers?.length,5);
 assert.deepEqual(getPharmacyOffers(catalog.products[0]).map(item=>[item.id,item.priceCents]),[['12',32000],['11',30500],['13',31000],['14',33000]]);
 assert.deepEqual(getPharmacyOffers(catalog.products[2])[0].provider,{id:'9',name:'Distribuidor independiente'});
 assert.ok(getPharmacyOffers(catalog.products[0]).every(item=>item.offers===undefined));
});

test('Klini is explicit, never inferred from name, cheapest price, or missing distributor metadata',async()=>{
 const offers=[{...linkedOffer(1,1,'10.00'),provider:{id:1,name:'Klini'}},linkedOffer(2,2,'20.00')];
 const {client}=fixture({data:{settings,products:offers,catalog_items:[universalItem(offers)]}});
 const selected=getPharmacyOffers((await client.loadPharmacyCatalog()).products[0]);
 assert.equal(selected.some(item=>item.provider?.isKlini===true),false);
 assert.equal(selected[0].priceCents,1000);
 const legacy=fixture({data:{settings,products:[product]}});
 assert.equal(getPharmacyOffers((await legacy.client.loadPharmacyCatalog()).products[0])[0].provider,undefined);
 for(const is_klini of ['true',1,null]) {
  await assert.rejects(fixture({data:{settings,products:[{...product,provider:{id:1,name:'Klini',is_klini}}]}}).client.loadPharmacyCatalog(),{code:'invalid_response'});
 }
});

test('universal offers reject contradictory catalog IDs, duplicate identities, stock and monetary metadata',async()=>{
 const a=linkedOffer(1,1,'320.00',true),b=linkedOffer(2,2,'305.00');
 const invalidItems=[
  {...universalItem([a]),offers:[{...a,catalog_item_id:43}]},
  {...universalItem([a]),offers:[a,a]},
  universalItem([a,{...b,provider:{...a.provider}}]),
  {...universalItem([a]),available:false},
  {...universalItem([a]),price_from:'1.00'},
  {...universalItem([a]),currency:'USD'},
  {...universalItem([a]),offers:[{...a,currency:'USD'}]},
  {...universalItem([a]),offers:[{...a,stock:1.5}]},
 ];
 for(const item of invalidItems) await assert.rejects(fixture({data:{settings,products:[],catalog_items:[item]}}).client.loadPharmacyCatalog(),{code:'invalid_response'});
 await assert.rejects(fixture({data:{settings,products:[],catalog_items:[universalItem([a]),universalItem([a])]}}).client.loadPharmacyCatalog(),{code:'invalid_response'});
 await assert.rejects(fixture({data:{settings,products:[a],catalog_items:[]}}).client.loadPharmacyCatalog(),{code:'invalid_response'});
 const soldOut={...a,stock:0};
 const unavailable=(await fixture({data:{settings,products:[],catalog_items:[universalItem([soldOut]),universalItem([],43)]}}).client.loadPharmacyCatalog()).products;
 assert.ok(unavailable.every(item=>item.stock===0 && getPharmacyOffers(item).length===0));
 assert.equal(unavailable[1].id,'catalog-43');
});

test('universal offers cannot contradict the canonical prescription requirement',async()=>{
 for(const requiresPrescription of [true,false]) {
  const offer={...linkedOffer(11,2,'305.00'),requires_prescription:!requiresPrescription};
  const item={...universalItem([offer]),requires_prescription:requiresPrescription};
  await assert.rejects(fixture({data:{settings,products:[offer],catalog_items:[item]}}).client.loadPharmacyCatalog(),{code:'invalid_response'});
  offer.requires_prescription=requiresPrescription;
  const accepted=await fixture({data:{settings,products:[offer],catalog_items:[item]}}).client.loadPharmacyCatalog();
  assert.equal(getPharmacyOffers(accepted.products[0])[0].requiresPrescription,requiresPrescription);
 }
});

test('universal catalog pagination consumes all pages without following arbitrary URLs',async()=>{
 const groups=Array.from({length:101},(_,index)=>universalItem([],index+1));
 const urls:string[]=[];
 const client=createPharmacyClient({baseUrl:BASE,fetchImpl:async(url)=>{
  const parsed=new URL(String(url));urls.push(String(url));
  if(parsed.pathname.endsWith('/catalog'))return Response.json({data:{settings,products:[product],catalog_items:groups.slice(0,100)}});
  assert.ok(parsed.pathname.endsWith('/catalog-items'));
  const page=Number(parsed.searchParams.get('page'));
  return Response.json({data:groups.slice((page-1)*24,page*24),current_page:page,last_page:5,next_page_url:'https://untrusted.example/catalog'});
 }});
 const catalog=await client.loadPharmacyCatalog();
 assert.equal(catalog.products.length,102);
 assert.equal(catalog.products[100].catalogItemId,'101');
 assert.deepEqual(urls,[BASE+'/pharmacy/catalog',...Array.from({length:5},(_,i)=>BASE+'/pharmacy/catalog-items?page='+(i+1))]);
});

test('selected concrete offer is submitted without seller/price overrides and response preserves historical seller snapshots',async()=>{
 const offers=[linkedOffer(11,2,'305.00'),linkedOffer(12,1,'320.00',true)];
 const catalog=await fixture({data:{settings,products:offers,catalog_items:[universalItem(offers)]}}).client.loadPharmacyCatalog();
 const selected=getPharmacyOffers(catalog.products[0])[1];
 const snapshot={...order,items:[{product_id:11,catalog_item_id:42,provider_id:2,provider_name:'Distribuidor histórico',provider_is_klini:false,name:'Producto universal',quantity:2,unit_price:'305.00',requires_prescription:false}],subtotal:'610.00',total:'659.00'};
 const {client,calls}=fixture({data:snapshot},201);
 const draft={...input(),lines:[{product:selected,quantity:2}]};
 const response=await client.submitPharmacyOrder('runtime-token',draft);
 assert.deepEqual(JSON.parse(String(calls[0].init.body)).items,[{product_id:11,quantity:2}]);
 assert.equal(response.lines[0].product.id,'11');
 assert.equal(response.lines[0].product.catalogItemId,'42');
 assert.deepEqual(response.lines[0].product.provider,{id:'2',name:'Distribuidor histórico',isKlini:false});
 assert.equal(response.lines[0].product.priceCents,30500);
 assert.equal(response.totalCents,65900);
 assert.equal(response.lines[0].product.offers,undefined);
 for(const bad of [{provider_id:undefined},{provider_name:''},{provider_is_klini:'false'},{catalog_item_id:'not-an-id'}]) {
  await assert.rejects(fixture({data:{...snapshot,items:[{...snapshot.items[0],...bad}]}}).client.submitPharmacyOrder('runtime-token',draft),{code:'invalid_response'});
 }
 const historical=await fixture({data:order}).client.submitPharmacyOrder('runtime-token',input());
 assert.equal(historical.lines[0].product.provider,undefined);
 assert.equal(historical.lines[0].product.catalogItemId,undefined);
});

test('valid long descriptions and image URLs remain selectable and persistable',async()=>{
 const long={...linkedOffer(11,2,'305.00'),description:'a'.repeat(3000),image_url:'https://images.example.test/'+ 'a'.repeat(1990)};
 const grouped={...universalItem([long]),description:long.description};
 const result=await fixture({data:{settings,products:[long],catalog_items:[grouped]}}).client.loadPharmacyCatalog();
 assert.equal(result.products[0].description.length,3000);
 const selected=getPharmacyOffers(result.products[0]);
 assert.equal(selected.length,1);
 assert.equal(selected[0].description.length,3000);
 assert.equal(selected[0].imageUrl,long.image_url);
});

test('submission rejects substituted offer IDs, quantities and duplicate response lines',async()=>{
 for(const items of [
  [{...order.items[0],product_id:2}],
  [{...order.items[0],quantity:1,unit_price:'640.02'}],
  [{...order.items[0],quantity:1},{...order.items[0],quantity:1}],
 ]) await assert.rejects(fixture({data:{...order,items}}).client.submitPharmacyOrder('runtime-token',input()),{code:'invalid_response'});
 const second={...input().lines[0],product:{...input().lines[0].product,id:'2'},quantity:1};
 const reordered={...order,items:[{...order.items[0],product_id:2,quantity:1},order.items[0]],subtotal:'960.03',total:'1009.03'};
 const result=await fixture({data:reordered}).client.submitPharmacyOrder('runtime-token',{...input(),lines:[...input().lines,second]});
 assert.deepEqual(result.lines.map(line=>line.product.id),['2','1']);
});

