import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createDemoState } from '../src/domain/seed';
import { STORAGE_KEY } from '../src/domain/reducer';

const origin='http://127.0.0.1:8098';
const terms='https://terms.klini.invalid/terms';
const fixtureProduct={id:1,name:'Producto receta QA',presentation:'10 unidades',laboratory:'Laboratorio QA',specialty:'General',product_type:'Medicamento',category:'General',price:'100.00',compare_at_price:null,stock:20,requires_prescription:true,description:'Producto ficticio de QA.',image_url:null,adherence_program_id:null};
const settings={enabled:true,title:'Farmacia QA conectada',subtitle:'Catálogo ficticio interceptado',currency:'MXN',shipping_fee:'49.00',delivery_estimate:'Por confirmar',purchase_terms:terms,notice:'Solicitud sin pago ni dispensación.',checkout_available:false,orders_available:true};
const token=(account:string)=>'qa-ephemeral-'+account;
type Body=Record<string,unknown>;
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const forbidden:string[]=[];const errors:string[]=[];const orderRequests:Body[]=[];const logouts:string[]=[];const orders=new Map<string,Body[]>();
 const controls:{mode:'normal'|'empty'|'disabled'|'error';failFirst:boolean;late:boolean;release?:()=>void;lateStarted:boolean}={mode:'normal',failFirst:true,late:false,lateStarted:false};
 let uploads=0;let termsOpened=0;
 await mkdir('test-results/pharmacy-connected',{recursive:true});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  const json=(data:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(url.href===terms){termsOpened++;await route.fulfill({status:200,contentType:'text/html',body:'<h1>Términos ficticios QA</h1>'});return;}
  if(url.origin===origin&&url.pathname.startsWith('/api/mobile/v1/')){
   const path=url.pathname.replace('/api/mobile/v1','');
   if(path==='/pharmacy/catalog'){
    if(controls.mode==='error'){await json({error:{code:'unavailable'}},503);return;}
    await json({data:{settings:{...settings,enabled:controls.mode!=='disabled'},products:controls.mode==='normal'?[fixtureProduct]:[],categories:[],programs:[]}});return;
   }
   if(path==='/auth/login'){
    const body=req.postDataJSON() as {login:string};const account=body.login;
    if(controls.late){controls.lateStarted=true;await new Promise<void>(resolve=>{controls.release=resolve;});}
    await json({success:true,data:{access_token:token(account),user:{role:'patient',name:account}}}).catch(()=>undefined);return;
   }
   const auth=req.headers().authorization??'';
   const account=auth.replace('Bearer qa-ephemeral-','');
   if(path==='/auth/logout'){logouts.push(account);await json({success:true,data:{message:'closed'}});return;}
   if(path==='/pharmacy/prescription-uploads'&&req.method()==='POST'){
    uploads++;await json({success:true,data:{id:81,file_name:'receta-qa.pdf',mime_type:'application/pdf',size_bytes:24,status:'pending_review',created_at:new Date().toISOString()}},201);return;
   }
   if(path==='/pharmacy/orders'&&req.method()==='GET'){await json({data:orders.get(account)??[],current_page:1,last_page:1});return;}
   if(path==='/pharmacy/orders'&&req.method()==='POST'){
    const body=req.postDataJSON() as Body;orderRequests.push({...body,qa_account:account});
    const list=orders.get(account)??[];let order=list.find(x=>x.client_request_id===body.client_request_id);
    if(!order){order={id:account==='AccountA'?101:102,client_request_id:body.client_request_id,created_at:'2026-11-11T20:00:00Z',status:'submitted',payment_status:'not_configured',prescription_status:'pending_review',currency:'MXN',items:[{product_id:1,name:fixtureProduct.name,quantity:1,unit_price:'100.00',total:'100.00',requires_prescription:true}],subtotal:'100.00',shipping_fee:'49.00',total:'149.00'};list.push(order);orders.set(account,list);}
    if(controls.failFirst){controls.failFirst=false;await route.abort('connectionfailed');return;}
    await json({data:order},201);return;
   }
   forbidden.push(req.method()+' '+url.pathname);await route.abort();return;
  }
  if(url.origin!==origin||req.method()!=='GET'){forbidden.push(req.method()+' '+url.origin+url.pathname);await route.abort();return;}
  await route.continue();
 });
 await context.addInitScript(({state,key})=>{
  if(!sessionStorage.getItem('pharmacy-connected-qa')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('pharmacy-connected-qa','1');}
 },{state:createDemoState(),key:STORAGE_KEY});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const login=async(account:string)=>{
  await page.getByRole('tab',{name:'Mis compras',exact:true}).click();
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await page.getByLabel('Correo o usuario',{exact:true}).fill(account);
  await page.getByLabel('Contraseña',{exact:true}).fill('QA-only-password');
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await expect(page.getByRole('button',{name:'Cerrar sesión de '+account,exact:true})).toBeVisible();
 };
 const addRx=async()=>{
  await page.getByRole('tab',{name:'Productos',exact:true}).click();
  await page.getByRole('button',{name:'Agregar '+fixtureProduct.name,exact:true}).click();
  await expect(page.getByTestId('pharmacy-seller-popup')).toBeVisible();
  await page.getByTestId('pharmacy-seller-option-'+fixtureProduct.id).click();
  await page.getByTestId('pharmacy-seller-add').click();
  await page.getByTestId('pharmacy-cart').click();await page.getByTestId('pharmacy-checkout').click();
 };
 const address=async(name:string)=>{
  await page.getByLabel('Nombre',{exact:true}).fill(name);
  await page.getByLabel('Calle y número',{exact:true}).fill(name+' calle privada QA');
  await page.getByLabel('Colonia',{exact:true}).fill('Colonia ficticia');
  await page.getByLabel('Código postal',{exact:true}).fill('03100');
  await page.getByTestId('pharmacy-address-next').click();
 };
 try{
  await page.goto(origin+'/pharmacy');await expect(page.getByTestId('pharmacy-product-1')).toBeVisible({timeout:120000});
  await login('AccountA');await addRx();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Seleccionar receta PDF o imagen',exact:true}).click();
  await (await chooser).setFiles({name:'receta-qa.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nQA ficticio\n%%EOF')});
  await page.getByRole('checkbox',{name:'Enviar este archivo privado a Klini para revisar mi receta',exact:true}).click();
  await page.getByRole('button',{name:'Enviar receta a revisión',exact:true}).click();
  await expect(page.getByText('Receta recibida. Pendiente de revisión; no está aprobada.',{exact:true})).toBeVisible();
  expect(uploads).toBe(1);
  await page.getByRole('button',{name:'Continuar a revisión',exact:true}).click();
  await address('PII-AccountA');
  await expect(page.getByRole('checkbox',{name:'Acepto las condiciones de la solicitud',exact:true})).not.toBeChecked();
  await page.getByRole('button',{name:'Ver condiciones',exact:true}).click();
  const popupPromise=context.waitForEvent('page');
  await page.getByRole('button',{name:'Leer términos de compra',exact:true}).click();
  const popup=await popupPromise;await popup.waitForLoadState();expect(termsOpened).toBe(1);await popup.close();
  await page.getByRole('button',{name:'Cerrar condiciones',exact:true}).click();
  await page.getByRole('checkbox',{name:'Acepto las condiciones de la solicitud',exact:true}).click();
  await page.getByTestId('pharmacy-submit').click();await expect(page.getByTestId('pharmacy-error')).toBeVisible();
  await page.getByTestId('pharmacy-submit').click();await expect(page.getByText('Solicitud recibida',{exact:true})).toBeVisible();
  expect(orderRequests).toHaveLength(2);expect(orderRequests[0].client_request_id).toBe(orderRequests[1].client_request_id);expect(orders.get('AccountA')).toHaveLength(1);
  expect(orderRequests[1].prescription_upload_id).toBe(81);
  await page.screenshot({path:'test-results/pharmacy-connected/solicitud-pendiente.png'});
  await page.waitForTimeout(650);await page.getByRole('button',{name:'Ver pedido',exact:true}).click();
  await page.getByRole('button',{name:'Volver a mis compras',exact:true}).click();
  await page.getByRole('button',{name:'Cerrar sesión de AccountA',exact:true}).click();
  await expect.poll(()=>logouts.includes('AccountA')).toBe(true);
  await expect(page.getByTestId('pharmacy-cart')).toHaveAttribute('aria-label','Carrito, 0 productos');
  await login('AccountB');await expect(page.getByRole('button',{name:'Ver pedido 101',exact:true})).toHaveCount(0);
  await addRx();
  await expect(page.getByRole('button',{name:'Continuar a revisión',exact:true})).toBeDisabled();
  await expect(page.getByText('receta-qa.pdf',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Folio de receta en tu cuenta Klini',{exact:true})).toHaveValue('');
  await page.getByLabel('Folio de receta en tu cuenta Klini',{exact:true}).fill('22');
  await page.getByRole('button',{name:'Continuar a revisión',exact:true}).click();
  await expect(page.getByLabel('Nombre',{exact:true})).toHaveValue('');
  await expect(page.getByLabel('Calle y número',{exact:true})).toHaveValue('');
  await address('PII-AccountB');
  await expect(page.getByRole('checkbox',{name:'Acepto las condiciones de la solicitud',exact:true})).not.toBeChecked();
  await page.getByRole('checkbox',{name:'Acepto las condiciones de la solicitud',exact:true}).click();await page.getByTestId('pharmacy-submit').click();
  await expect(page.getByText('Solicitud recibida',{exact:true})).toBeVisible();
  expect(orderRequests[2].client_request_id).not.toBe(orderRequests[0].client_request_id);
  expect(orderRequests[2].prescription_upload_id).toBeUndefined();expect(orderRequests[2].prescription_id).toBe(22);
  const stored=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}));
  for(const privateValue of ['PII-AccountA','PII-AccountB','QA-only-password','qa-ephemeral-AccountA','qa-ephemeral-AccountB','receta-qa.pdf'])expect(stored).not.toContain(privateValue);
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await expect.poll(()=>logouts.includes('AccountB')).toBe(true);

  for(const mode of ['empty','disabled','error'] as const){
   controls.mode=mode;await page.goto(origin+'/pharmacy');await expect(page.getByTestId('pharmacy-search')).toBeVisible();
   if(mode==='empty')await expect(page.getByText('Sin productos',{exact:true})).toBeVisible();
   if(mode==='disabled')await expect(page.getByText('Farmacia temporalmente no disponible',{exact:true})).toBeVisible();
   if(mode==='error')await expect(page.getByTestId('pharmacy-error')).toBeVisible();
   await expect(page.locator('[data-testid^="pharmacy-product-"]')).toHaveCount(0);
   await expect(page.getByText('Protector solar FPS 50',{exact:true})).toHaveCount(0);
  }
  controls.mode='normal';await page.goto(origin);await expect(page.getByTestId('header-menu')).toBeVisible();
  await page.getByTestId('header-menu').click();await page.getByTestId('nav-pharmacy').click();
  await expect(page.getByTestId('pharmacy-product-1')).toBeVisible();
  await page.getByTestId('pharmacy-filters').click();await page.keyboard.press('Escape');await expect(page.getByTestId('pharmacy-apply-filters')).toHaveCount(0);
  await page.getByRole('tab',{name:'Mis compras',exact:true}).click();await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await page.getByLabel('Correo o usuario',{exact:true}).fill('LateAccount');await page.getByLabel('Contraseña',{exact:true}).fill('QA-only-password');
  controls.late=true;await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await expect.poll(()=>controls.lateStarted).toBe(true);
  await page.goBack();await expect(page.getByTestId('header-menu')).toBeVisible();controls.release?.();
  await expect.poll(()=>logouts.includes('LateAccount'),{timeout:10000}).toBe(true);
  expect(forbidden).toEqual([]);expect(errors).toEqual([]);
  const result={mockOnly:true,checks:['pending-prescription-upload','idempotent-uncertain-retry','A-logout-B-PII-cart-consent-prescription-reset','new-account-new-UUID','no-private-storage','terms-link','close-revokes-session','empty-disabled-error-no-demo-fallback','menu-entry','Escape-popup','late-login-after-unmount-revokes-token'],orderRequests:orderRequests.length,ordersCreated:[...orders.values()].reduce((n,a)=>n+a.length,0),uploads,termsOpened,errors,forbidden};
  await writeFile('test-results/pharmacy-connected/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(error){
  await page.screenshot({path:'test-results/pharmacy-connected/failure.png'}).catch(()=>undefined);
  await writeFile('test-results/pharmacy-connected/failure.txt',String(error)+'\n'+await page.locator('body').innerText()).catch(()=>undefined);
  throw error;
 }finally{controls.release?.();await context.close();await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});


