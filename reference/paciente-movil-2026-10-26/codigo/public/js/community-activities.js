(function (root) {
  'use strict';
  const kinds={class:'Clase',event:'Evento',workshop:'Taller',podcast:'Podcast',live:'Live'};
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cost=value=>Number(value)===0?'Gratuito':new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(value))+' MXN';
  const date=item=>{const parts=String(item.starts_at).split('T');const d=new Date(parts[0]+'T12:00:00');return Number.isNaN(d.getTime())?'Fecha por definir':d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'})+' · '+(parts[1]||'Horario por definir')+' · '+item.timezone;};
  function legacyActivity(event,community) {
    const zone=event.timezone||'America/Mexico_City';
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(event.startAt));
    const get=type=>parts.find(part=>part.type===type).value;
    return {source_key:event.id,community_key:event.communityId,community_name:community.name,kind:'event',title:event.title,description:event.description||event.shortDescription||'',starts_at:get('year')+'-'+get('month')+'-'+get('day')+'T'+get('hour')+':'+get('minute'),timezone:zone,cost:Number(event.cost||0),capacity:Number(event.capacity)||null,published:event.status==='published'};
  }
  function attendeeRows(people){
    return people.length ? '<ul class="kc-attendee-list">'+people.map(person=>{
      const initials=String(person.name||'').trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
      const reserved=new Date(person.reserved_at);
      const when=Number.isNaN(reserved.getTime())?'':reserved.toLocaleString('es-MX',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      return '<li><span class="kc-attendee-avatar" aria-hidden="true">'+escape(initials)+'</span><div><strong>'+escape(person.name)+'</strong>'+(person.username?'<small>@'+escape(person.username)+'</small>':'')+'<small>Reserva confirmada'+(when?' · '+escape(when):'')+'</small></div></li>';
    }).join('')+'</ul>' : '<div class="kc-attendee-empty"><strong>Aún no hay personas inscritas</strong><p>Las reservas de la app aparecerán aquí.</p></div>';
  }
  const helpers={kinds,cost,date,legacyActivity,attendeeRows};
  if(typeof module==='object'&&module.exports){module.exports=helpers;return;}
  async function request(path='',method='GET',data){
    const token=document.querySelector('meta[name="csrf-token"]')?.content||document.querySelector('[data-csrf-token]')?.dataset.csrfToken||document.querySelector('input[name="_token"]')?.value||'';
    const multipart=data instanceof FormData;
    const response=await fetch('/communities/activities'+path,{method,credentials:'same-origin',headers:{Accept:'application/json',...(!multipart?{'Content-Type':'application/json'}:{}),'X-CSRF-TOKEN':token},...(data?{body:multipart?data:JSON.stringify(data)}:{})});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(response.status===401||response.status===419?'Tu sesión terminó. Vuelve a ingresar.':Object.values(body.errors||{}).flat().join(' ')||body.message||'No se pudo completar la operación.');
    return body;
  }
  const api=root.KliniCommunityActivities={...helpers,request,items:[],async load(){const data=await request();this.items=data.activities;return this.items;}};
  let adminRefresh;
  api.refreshAdmin=()=>{
    if(adminRefresh)return adminRefresh;
    adminRefresh=request('?manage=1').then(({activities})=>{
      const changed=!api.adminLoaded||api.adminError||JSON.stringify(api.adminItems)!==JSON.stringify(activities);
      api.adminItems=activities;api.adminLoaded=true;api.adminError='';
      if(changed)root.dispatchEvent(new Event('klini:admin-activities'));
      return activities;
    }).finally(()=>{adminRefresh=null;});
    return adminRefresh;
  };
  api.openAttendees=(id,title,trigger,localPeople=[])=>{
    if(document.querySelector('.kc-attendees-dialog'))return;
    const dialog=document.createElement('dialog');dialog.className='kc-attendees-dialog';
    dialog.setAttribute('aria-labelledby','kcAttendeesTitle');dialog.setAttribute('aria-describedby','kcAttendeesEvent');
    dialog.innerHTML='<header><span class="kc-attendees-symbol" aria-hidden="true">'+calendarIcon+'</span><div><h2 id="kcAttendeesTitle">Personas inscritas</h2><p id="kcAttendeesEvent">'+escape(title)+'</p></div><button type="button" data-attendees-close aria-label="Cerrar personas inscritas">×</button></header><p class="kc-attendees-count" data-attendees-count></p><div class="kc-attendees-body" data-attendees-body aria-live="polite"><p role="status">Cargando inscripciones…</p></div><footer><nav aria-label="Páginas de inscritos"><button type="button" data-attendees-prev aria-label="Página anterior">‹</button><span data-attendees-page></span><button type="button" data-attendees-next aria-label="Página siguiente">›</button></nav><button type="button" data-attendees-close>Cerrar</button></footer>';
    const content=dialog.querySelector('[data-attendees-body]'),count=dialog.querySelector('[data-attendees-count]'),prev=dialog.querySelector('[data-attendees-prev]'),next=dialog.querySelector('[data-attendees-next]');
    let page=1,lastPage=1,busy=false,timer,lastContent='';
    async function load(){
      if(busy||!dialog.open)return;busy=true;prev.disabled=next.disabled=true;
      try{
        let data=id?await request('/'+encodeURIComponent(id)+'/attendees?page='+page):{attendees:localPeople,total:localPeople.length,page:1,last_page:1};
        if(page>data.last_page){page=data.last_page;data=await request('/'+encodeURIComponent(id)+'/attendees?page='+page);}
        if(!dialog.open)return;
        page=data.page;lastPage=data.last_page;
        count.textContent=data.total+' '+(data.total===1?'persona inscrita':'personas inscritas');
        const html=attendeeRows(data.attendees);
        if(html!==lastContent){content.innerHTML=html;lastContent=html;}
        dialog.querySelector('[data-attendees-page]').textContent='Página '+page+' de '+lastPage;
        dialog.querySelector('nav').hidden=lastPage===1;
        const activity=(api.adminItems||[]).find(item=>String(item.id)===String(id));
        if(activity&&activity.reservations!==data.total){activity.reservations=data.total;root.dispatchEvent(new Event('klini:admin-activities'));}
      }catch(error){if(dialog.open){content.innerHTML='<div class="kc-attendee-empty"><p role="alert">'+escape(error.message)+'</p><button type="button" data-attendees-retry>Reintentar</button></div>';lastContent='';}}
      finally{busy=false;prev.disabled=page<=1;next.disabled=page>=lastPage;}
    }
    dialog.addEventListener('click',event=>{
      if(event.target===dialog||event.target.closest('[data-attendees-close]'))dialog.close();
      else if(event.target.closest('[data-attendees-prev]')&&!busy&&page>1){page--;load();}
      else if(event.target.closest('[data-attendees-next]')&&!busy&&page<lastPage){page++;load();}
      else if(event.target.closest('[data-attendees-retry]'))load();
    });
    dialog.addEventListener('close',()=>{clearInterval(timer);dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true});},{once:true});
    document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-attendees-close]').focus();load();
    if(id)timer=setInterval(()=>{if(!document.hidden)load();},15000);
  };
  function notify(message){let el=document.querySelector('[data-activity-notice]');if(!el){el=document.createElement('p');el.dataset.activityNotice='';el.className='kc-activity-notice';el.setAttribute('role','status');document.body.append(el);}el.textContent=message;clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.remove(),5000);}
  const calendarIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-10 4h4"/></svg>';
  function openReservation(item,trigger){
    const cancel=!!item.reserved;
    const dialog=document.createElement('dialog');dialog.className='kc-reservation-dialog';dialog.setAttribute('aria-labelledby','kcReservationTitle');
    let busy=false,method='card';
    function close(){if(!busy)dialog.close();}
    function cleanup(){dialog.querySelectorAll('input').forEach(input=>{input.value='';});dialog.remove();const target=trigger.isConnected?trigger:document.querySelector('[data-activity-reserve="'+item.id+'"]');target?.focus({preventScroll:true});}
    dialog.addEventListener('close',cleanup,{once:true});
    dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    dialog.addEventListener('click',event=>{if(event.target===dialog)close();if(event.target.closest('[data-reservation-close]'))close();});
    async function reserve(){
      if(busy)return;busy=true;
      dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
      const status=dialog.querySelector('[data-reservation-status]');status.textContent='Confirmando…';
      try{
        await request('/'+item.id+'/reservation',cancel?'DELETE':'POST');
        item.reserved=!cancel;
        item.reservations=Math.max(0,Number(item.reservations||0)+(cancel?-1:1));
        busy=false;
        completed();
        // Confirm as soon as the reservation is saved; a slow feed must not hide the popup.
        root.dispatchEvent(new Event('klini:activities'));
        api.load().then(()=>root.dispatchEvent(new Event('klini:activities'))).catch(()=>{});
      }
      catch(error){busy=false;status.textContent=error.message;dialog.querySelectorAll('button').forEach(button=>button.disabled=false);}
    }
    function completed(){
      dialog.classList.remove('is-payment');
      dialog.classList.add('is-result',cancel?'is-cancelled':'is-confirmed');
      dialog.setAttribute('aria-describedby','kcReservationResultDescription');
      const title=cancel?'Reserva cancelada':'Reserva confirmada';
      const description=cancel?'Tu lugar ha sido liberado.':Number(item.cost)>0?'Pago de demostración sin cargos reales.':'Evento gratuito. Tu lugar está reservado.';
      const mark=cancel?'M9 13l6 6m0-6-6 6':'M8 16l3 3 5-6';
      dialog.innerHTML='<button type="button" class="kc-reservation-close" data-reservation-close aria-label="Cerrar confirmación">×</button><span class="kc-reservation-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 10h16'+mark+'"/></svg></span><h2 id="kcReservationTitle" tabindex="-1">'+title+'</h2><p id="kcReservationResultDescription" class="kc-reservation-question">'+description+'</p><div class="kc-reservation-actions"><button type="button" class="is-primary" data-reservation-close>Entendido</button></div>';
      dialog.querySelector('.is-primary').focus();
    }
    function confirmation(){
      dialog.classList.remove('is-payment');
      dialog.innerHTML='<button type="button" class="kc-reservation-close" data-reservation-close aria-label="Cerrar">×</button><span class="kc-reservation-symbol">'+calendarIcon+'</span><h2 id="kcReservationTitle">'+(cancel?'Cancelar reserva':'Reservar evento')+'</h2><p class="kc-reservation-question">'+(cancel?'¿Deseas cancelar tu reserva?':'¿Deseas reservar tu lugar?')+'</p><p class="kc-reservation-summary">'+escape(item.title)+' · '+escape(date(item))+'</p><div class="kc-reservation-actions"><button type="button" class="is-secondary" data-reservation-close>No</button><button type="button" class="is-primary" data-reservation-yes>Sí'+(cancel?', cancelar':', reservar')+'</button></div><p data-reservation-status role="status"></p>';
      dialog.querySelector('[data-reservation-yes]').addEventListener('click',()=>{if(!cancel&&Number(item.cost)>0)payment();else reserve();});
    }
    function payment(){
      dialog.classList.add('is-payment');
      dialog.innerHTML='<button type="button" class="kc-reservation-close" data-reservation-close aria-label="Cerrar">×</button><h2 id="kcReservationTitle">Reservar evento</h2><div class="kc-reservation-total"><strong>'+escape(item.title)+'</strong><b>'+escape(cost(item.cost))+'</b></div><div class="kc-reservation-methods" role="tablist" aria-label="Método de pago"><button type="button" role="tab" aria-selected="true" data-pay-method="card">Tarjeta</button><button type="button" role="tab" aria-selected="false" data-pay-method="wallet">Billetera</button></div><form autocomplete="off" data-demo-payment><div class="kc-reservation-card" data-card-fields><label>Número de tarjeta<input data-demo-card inputmode="numeric" maxlength="19" placeholder="4242 4242 4242 4242" autocomplete="off" required></label><label>Nombre del titular<input data-demo-holder maxlength="80" placeholder="Titular de prueba" autocomplete="off" required></label><div class="kc-reservation-card-row"><label>Vencimiento<input data-demo-expiry inputmode="numeric" maxlength="5" placeholder="MM/AA" pattern="(0[1-9]|1[0-2])/[0-9]{2}" autocomplete="off" required></label><label>CVV<input data-demo-cvv type="password" inputmode="numeric" maxlength="4" placeholder="123" pattern="[0-9]{3,4}" autocomplete="off" required></label></div></div><div class="kc-reservation-wallet" data-wallet-fields hidden><p>Pagar con la billetera de Klini</p><strong>'+escape(cost(item.cost))+'</strong><p>Demostración de pago con billetera. Tu saldo y tus Tokens no se modificarán.</p></div><p class="kc-reservation-demo">Demostración · sin cargos reales. Usa únicamente la tarjeta de prueba 4242 4242 4242 4242.</p><div class="kc-reservation-actions"><button type="button" class="is-secondary" data-reservation-close>Cancelar</button><button type="submit" class="is-primary">Pagar '+escape(cost(item.cost))+'</button></div><p data-reservation-status role="status"></p></form>';
      const form=dialog.querySelector('form'),fields=dialog.querySelector('[data-card-fields]');
      dialog.querySelectorAll('[data-pay-method]').forEach(button=>button.addEventListener('click',()=>{
        method=button.dataset.payMethod;
        dialog.querySelectorAll('[data-pay-method]').forEach(tab=>tab.setAttribute('aria-selected',String(tab===button)));
        fields.hidden=method!=='card';dialog.querySelector('[data-wallet-fields]').hidden=method!=='wallet';
        fields.querySelectorAll('input').forEach(input=>{input.disabled=method!=='card';input.required=method==='card';if(method!=='card')input.value='';});
        dialog.querySelector('[data-reservation-status]').textContent='';
      }));
      form.addEventListener('submit',event=>{
        event.preventDefault();
        if(method==='card'){
          const number=form.querySelector('[data-demo-card]').value.replace(/\s/g,'');
          if(number!=='4242424242424242'){dialog.querySelector('[data-reservation-status]').textContent='Usa la tarjeta de prueba 4242 4242 4242 4242.';return;}
          if(!form.querySelector('[data-demo-holder]').value.trim()){form.querySelector('[data-demo-holder]').focus();return;}
        }
        // Card fields stay in this dialog and are never serialized or sent to the API.
        fields.querySelectorAll('input').forEach(input=>{input.value='';});reserve();
      });
      dialog.querySelector('[data-pay-method]').focus();
    }
    confirmation();document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-reservation-close]').focus();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-activity-reserve]');if(!button)return;
    const item=api.items.find(x=>String(x.id)===button.dataset.activityReserve);if(!item||document.querySelector('.kc-reservation-dialog'))return;
    openReservation(item,button);
  });
  let syncingLegacy=false,legacySyncPending=false;
  async function syncLegacyEvents(){
    if(document.body.dataset.communityMode!=='admin'||!root.KliniWellnessCommunity?.getCreatedEventPublications)return;
    if(syncingLegacy){legacySyncPending=true;return;}
    syncingLegacy=true;
    try{
      const legacyRecords=root.KliniWellnessCommunity.getCreatedEventPublications();
      for(const {event,community} of legacyRecords){
        if(!community)continue;
        let id=event.publicActivityId;
        if(!id){
          const payload=new FormData();
          for(const [key,value] of Object.entries(legacyActivity(event,community)))if(value!==null)payload.set(key,typeof value==='boolean'?Number(value):value);
          const image=event.imageUrl||'';
          if(/^data:image\/(png|jpeg|webp|gif);base64,/.test(image)){
            const response=await fetch(image),blob=await response.blob();
            payload.set('image_file',blob,'event.'+(blob.type.split('/')[1]||'png'));
          }else if(/^(?:https:\/\/|\/images\/)/.test(image))payload.set('image',image);
          id=(await request('','POST',payload)).id;
        }else if(event.publicActivityStatus!==event.status){
          await request('/'+id,'PATCH',{published:event.status==='published'});
        }
        root.KliniWellnessCommunity.linkPublicEvent(event.id,id,event.status);
      }
      await api.refreshAdmin();
    }catch(error){notify('No se pudo sincronizar el evento con Comunidades: '+error.message);}
    finally{syncingLegacy=false;if(legacySyncPending){legacySyncPending=false;syncLegacyEvents();}}
  }
  root.addEventListener('klini:legacy-events',syncLegacyEvents);
  root.addEventListener('online',syncLegacyEvents);
  async function admin(){
    if(document.body.dataset.communityMode!=='admin')return;
    await syncLegacyEvents();
    const panel=document.createElement('section');panel.className='kc-activity-admin';
    panel.innerHTML='<header><h2>Actividades de la comunidad</h2><p>Crea una actividad y decide cuándo publicarla en la aplicación.</p></header><form data-activity-form><label>Comunidad<input name="community_name" maxlength="255" required></label><label>Tipo<select name="kind">'+Object.entries(kinds).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select></label><label>Título<input name="title" maxlength="255" required></label><label>Descripción<textarea name="description" maxlength="5000"></textarea></label><label>Imagen (URL HTTPS o /images/…)<input name="image" maxlength="2048" placeholder="https://…"></label><label>Fecha y hora<input name="starts_at" type="datetime-local" required></label><label>Zona horaria<select name="timezone"><option>America/Mexico_City</option><option>America/Cancun</option><option>America/Tijuana</option><option>UTC</option></select></label><label>Costo en MXN<input name="cost" type="number" min="0" max="99999999" step="0.01" value="0" required></label><label>Cupo (opcional)<input name="capacity" type="number" min="1" max="1000000"></label><label class="kc-activity-check"><input name="published" type="checkbox"> Publicar en comunidades</label><p>La reserva registra un lugar; no realiza cobros.</p><button type="submit">Guardar actividad</button><p role="status" data-activity-admin-status></p></form><div data-activity-admin-list></div>';
    const dialog=document.createElement('dialog');dialog.className='kc-activity-dialog';dialog.setAttribute('aria-labelledby','kcActivityDialogTitle');
    panel.querySelector('h2').id='kcActivityDialogTitle';
    const close=document.createElement('button');close.type='button';close.className='kc-activity-dialog-close';close.setAttribute('aria-label','Cerrar actividades');close.textContent='×';close.addEventListener('click',()=>dialog.close());
    panel.append(close);dialog.append(panel);document.body.append(dialog);
    let context={kind:'',community:''};
    const form=panel.querySelector('form'),status=panel.querySelector('[data-activity-admin-status]'),list=panel.querySelector('[data-activity-admin-list]');
    function renderList(){const activities=(api.adminItems||[]).filter(x=>(!context.kind||x.kind===context.kind)&&(!context.community||x.community_name===context.community));list.innerHTML=activities.map(x=>'<article><div><strong>'+escape(x.title)+'</strong><p>'+escape(x.community_name)+' · '+kinds[x.kind]+'</p><p>'+escape(date(x))+' · '+escape(cost(x.cost))+'</p><small>'+x.reservations+' reservaciones · '+(x.published?'Publicado':'Borrador')+'</small></div><button type="button" data-activity-publish="'+x.id+'" data-published="'+x.published+'">'+(x.published?'Retirar publicación':'Publicar')+'</button></article>').join('')||'<p>Aún no has creado actividades en esta sección.</p>';}
    async function render(){await api.refreshAdmin();renderList();}
    api.openAdmin=(kind,community)=>{context={kind,community};form.elements.kind.value=kind;form.elements.community_name.value=community;panel.querySelector('h2').textContent='Crear '+(kinds[kind]||'actividad').toLowerCase();status.textContent=api.adminError||'';renderList();if(!dialog.open)dialog.showModal();form.elements.title.focus();};
    document.addEventListener('click',event=>{const trigger=event.target.closest('[data-activity-create]');if(trigger)api.openAdmin(trigger.dataset.activityCreate,trigger.dataset.communityName||'');});
    form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='Guardando…';const values=Object.fromEntries(new FormData(form));values.published=form.elements.published.checked;values.capacity=values.capacity?Number(values.capacity):null;values.community_key=values.community_name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');try{await request('','POST',values);form.reset();form.elements.kind.value=context.kind;form.elements.community_name.value=context.community;await render();status.textContent=values.published?'Actividad publicada en comunidades.':'Borrador guardado. No aparece en la aplicación.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
    list.addEventListener('click',async event=>{const button=event.target.closest('[data-activity-publish]');if(!button)return;button.disabled=true;try{await request('/'+button.dataset.activityPublish,'PATCH',{published:button.dataset.published!=='true'});await render();status.textContent='Publicación actualizada.';}catch(error){status.textContent=error.message;button.disabled=false;}});
    try{await render();}catch(error){api.adminLoaded=true;api.adminError=error.message;status.textContent=error.message;root.dispatchEvent(new Event('klini:admin-activities'));}
    // Bookings may arrive from another device while the administration panel is open.
    const refresh=()=>{if(!document.hidden)api.refreshAdmin().catch(()=>{});};
    root.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    setInterval(refresh,15000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',admin);else admin();
})(typeof window==='undefined'?globalThis:window);
