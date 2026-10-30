(function () {
  'use strict';
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const imageUrl = value => /^(\/[^/]|https:\/\/|data:image\/(png|jpe?g|webp);base64,)/i.test(String(value || '')) ? value : '';
  const empty = () => ({version:1, requests:[], events:[], demoLoaded:false});
  const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const symbols = {
    grid:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>',
    chat:'<path d="M7 3h10a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H8l-4 3 .6-4A4 4 0 0 1 3 16V7a4 4 0 0 1 4-4Z" transform="translate(0 -1)"/>',
    repeat:'<path d="M4 17a4 4 0 0 1-2-3v-4a4 4 0 0 1 4-4h13m-3-3 3 3-3 3m4-2a4 4 0 0 1 2 3v4a4 4 0 0 1-4 4H5m3-3-3 3 3 3"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    message:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
    repost:'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
    follow:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2M20 8v6M17 11h6"/>',
    arrow:'<path d="m9 5 7 7-7 7"/>', check:'<path d="m5 12 4 4L19 6"/>'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + (symbols[name] || symbols.follow) + '</svg>';
  const avatar = (person, badge) => {
    const photo = imageUrl(person && (person.avatar || person.photo));
    const name = person && person.name || 'Usuario';
    return '<span class="ps-avatar">' + (photo ? '<img src="' + escape(photo) + '" alt="" loading="lazy">' : '<span>' + escape(name.split(/\s+/).slice(0,2).map(part => part[0]).join('')) + '</span>') + (badge ? '<i class="ps-type ps-type-' + badge + '">' + icon(badge === 'like' ? 'heart' : badge) + '</i>' : '') + '</span>';
  };

  function createStore(storage, baseKey, profileId) {
    const key = baseKey + ':' + encodeURIComponent(String(profileId));
    const read = () => {
      try {
        const value = JSON.parse(storage.getItem(key) || 'null');
        if (!value || value.version !== 1) return empty();
        return {version:1,requests:Array.isArray(value.requests) ? value.requests : [],events:Array.isArray(value.events) ? value.events : [],demoLoaded:!!value.demoLoaded};
      } catch (_) { return empty(); }
    };
    const write = state => { storage.setItem(key, JSON.stringify(state)); return state; };
    const record = event => {
      if (!event || !['like','message','repost','follow'].includes(event.type)) return read();
      const state = read();
      const id = event.id || uid();
      const identity = event.identity || (event.type !== 'message' ? [event.type,event.source,event.postId,event.direction || 'outgoing'].join(':') : '');
      state.events = state.events.filter(item => item.id !== id && (!identity || item.identity !== identity));
      if (event.active !== false) state.events.unshift({...event,id,identity,createdAt:event.createdAt || new Date().toISOString(),read:false});
      return write(state);
    };
    return {
      key, read, record,
      decide(id, decision) {
        if (!['accepted','removed'].includes(decision)) return read();
        const state = read();
        const request = state.requests.find(item => item.id === id && item.status === 'pending');
        if (!request) return state;
        request.status = decision;
        if (decision === 'accepted') state.events.unshift({id:'accepted-' + id,type:'follow',direction:'incoming',source:request.source || 'home',peer:request.person,createdAt:new Date().toISOString(),accepted:true,read:false,demo:!!request.demo});
        return write(state);
      },
      markRead(id) { const state=read(); state.events.forEach(item=>{if(item.id===id)item.read=true;}); return write(state); },
      seedDemo() {
        const state=read(); if(state.demoLoaded)return state;
        const mariana={id:'mariana',name:'Mariana López',avatar:'/images/communities/category-wellness.png'};
        const diego={id:'diego',name:'Diego Ramírez',avatar:'/images/communities/category-sport.png'};
        const ana={id:'ana',name:'Ana Sofía Ruiz',avatar:'/images/communities/category-new.png'};
        const date=days=>new Date(Date.now()-days*86400000).toISOString();
        state.requests.push({id:'demo-mariana',person:mariana,status:'pending',source:'home',createdAt:date(.1),demo:true},{id:'demo-diego',person:diego,status:'pending',source:'communities',createdAt:date(.2),demo:true});
        state.events.push(
          {id:'demo-like',type:'like',peer:mariana,source:'home',postId:'post-1',image:'/images/communities/category-wellness.png',direction:'incoming',createdAt:date(.04),read:false,demo:true},
          {id:'demo-message',type:'message',peer:diego,source:'communities',communityId:'respira',postId:'community-respira-post-0',image:'/images/communities/category-wellness.png',text:'¡Qué buena práctica! Nos vemos en la próxima sesión.',direction:'incoming',createdAt:date(.2),read:false,demo:true},
          {id:'demo-repost',type:'repost',peer:ana,source:'home',postId:'post-2',image:'/images/communities/category-sport.png',direction:'incoming',createdAt:date(2),read:false,demo:true},
          {id:'demo-old-like',type:'like',peer:diego,source:'communities',communityId:'respira',postId:'community-respira-post-1',image:'/images/communities/category-wellness.png',direction:'incoming',createdAt:date(10),read:true,demo:true}
        );
        state.demoLoaded=true; return write(state);
      }
    };
  }

  function fromCommunityEvent(event) {
    const types={'post.liked':'like','post.reposted':'repost','message.sent':'message','message.replied':'message','user.follow-requested':'follow'};
    const data=event && event.data;
    if(!event || !types[event.type] || !data || !data.post)return null;
    return {id:data.messageId,type:types[event.type],identity:event.type==='user.follow-requested'?'follow:'+data.post.author.id:undefined,active:data.active,source:event.source || 'home',postId:data.post.id,communityId:data.post.communityId || '',peer:data.peer || data.post.author,image:data.post.image,text:data.text || '',direction:'outgoing'};
  }

  function groupEvents(events, now=new Date()) {
    const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    const groups=[{title:'Hoy',items:[]},{title:'Últimos 7 días',items:[]},{title:'Últimos 30 días',items:[]},{title:'Anteriores',items:[]}];
    [...events].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).forEach(item=>{
      const time=new Date(item.createdAt).getTime();
      const days=(midnight-time)/86400000;
      groups[days<=0?0:days<7?1:days<30?2:3].items.push(item);
    });
    return groups.filter(group=>group.items.length);
  }
  function timeLabel(value) {
    const minutes=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/60000));
    if(minutes<1)return 'Ahora';
    if(minutes<60)return minutes+' min';
    if(minutes<1440)return Math.floor(minutes/60)+' h';
    return Math.floor(minutes/1440)+' d';
  }
  function eventCopy(item) {
    const name='<strong>'+escape(item.peer && item.peer.name || 'Usuario')+'</strong>';
    if(item.direction==='incoming') return name+' '+({like:'indicó que le gusta tu publicación.',message:'te envió un mensaje.',repost:'reposteó tu publicación.',follow:item.accepted?'comenzó a seguirte.':'quiere seguirte.'}[item.type]);
    return ({like:'Te gustó una publicación de ',message:'Enviaste un mensaje a ',repost:'Reposteaste una publicación de ',follow:'Enviaste una solicitud para seguir a '}[item.type])+name+'.';
  }
  function renderEvent(item) {
    const image=imageUrl(item.image);
    const context=item.source==='communities'?'Comunidades':'Inicio';
    const body=avatar(item.peer,item.type)+'<span class="ps-event-copy"><span>'+eventCopy(item)+' <time datetime="'+escape(item.createdAt)+'">'+timeLabel(item.createdAt)+'</time></span>'+(item.text?'<span class="ps-message-preview">“'+escape(item.text)+'”</span>':'')+'<small>'+context+(item.demo?' · Ejemplo':'')+'</small></span>'+(image?'<img class="ps-thumbnail" src="'+escape(image)+'" alt="Publicación relacionada" loading="lazy">':'')+(!item.read?'<span class="ps-unread" aria-label="Sin leer"></span>':'');
    return '<li class="ps-event'+(!item.read?' is-unread':'')+'">'+(item.postId?'<button type="button" data-social-open="'+escape(item.id)+'">'+body+'</button>':'<div class="ps-event-static">'+body+'</div>')+'</li>';
  }
  function mount(root) {
    const panel=document.querySelector('[data-patient-profile-panel]');
    const baseKey=root.dataset.storageKey;
    let profileId='',store,filter='all',requestsOpen=false,error='';
    function selectProfile() {
      const profile=window.DrSamPatientProfilePanel?.getActiveProfile();
      const next=String(profile?.userId || profile?.id || panel.dataset.profileId);
      if(next!==profileId){profileId=next;store=createStore(window.localStorage,baseKey,next);filter='all';requestsOpen=false;error='';}
    }
    function render() {
      selectProfile();
      const state=store.read();
      const requests=state.requests.filter(item=>item.status==='pending');
      const groups=groupEvents(state.events.filter(item=>filter==='all'||item.type===filter));
      root.innerHTML='<button type="button" class="ps-requests-summary" data-social-requests aria-expanded="'+requestsOpen+'" aria-controls="ps-follow-requests"><span class="ps-avatar-stack">'+(requests.length?requests.slice(0,2).map(item=>avatar(item.person)).join(''):icon('follow'))+'</span><span><strong>Solicitudes de seguidores</strong><small>'+(requests.length?escape(requests[0].person.name)+(requests.length>1?' y '+(requests.length-1)+' más':' quiere seguirte'):'No tienes solicitudes pendientes')+'</small></span>'+(requests.length?'<b class="ps-request-count">'+requests.length+'</b>':'')+icon('arrow')+'</button>'+
        '<div class="ps-requests-reveal'+(requestsOpen?' is-open':'')+'" data-social-requests-panel aria-hidden="'+!requestsOpen+'"'+(!requestsOpen?' inert':'')+'><div class="ps-requests-clip"><section id="ps-follow-requests" class="ps-follow-requests"><h2>Solicitudes de seguidores</h2>'+(requests.length?requests.map(item=>'<article class="ps-request">'+avatar(item.person)+'<div><strong>'+escape(item.person.name)+'</strong><small>Quiere seguirte'+(item.demo?' · Ejemplo':'')+'</small><div class="ps-request-actions"><button type="button" data-social-accept="'+escape(item.id)+'">Confirmar</button><button type="button" data-social-remove="'+escape(item.id)+'">Eliminar</button></div></div></article>').join(''):'<p class="ps-empty">Estás al día. No hay solicitudes pendientes.</p>')+'</section></div></div>'+
        '<div class="ps-activity-heading"><h2>Tu actividad</h2></div><div class="ps-filters" role="group" aria-label="Filtrar interacciones">'+[['all','Todo','grid'],['like','Likes','heart'],['message','Mensajes','chat'],['repost','Reposts','repeat']].map(([value,label,symbol])=>'<button type="button" data-social-filter="'+value+'" aria-label="'+label+'" aria-pressed="'+(filter===value)+'">'+icon(symbol)+'</button>').join('')+'</div>'+
        (groups.length?groups.map(group=>'<section class="ps-activity-group"><h3>'+group.title+'</h3><ul>'+group.items.map(renderEvent).join('')+'</ul></section>').join(''):'<div class="ps-empty">'+icon('heart')+'<strong>Aquí empieza la conversación</strong><p>Los likes, mensajes y reposts de tus publicaciones aparecerán aquí.</p></div>')+
        '<p class="ps-demo-note">Actividad de demostración guardada en este navegador.</p>'+(root.dataset.demo==='true'&&!state.demoLoaded?'<button type="button" class="ps-load-demo" data-social-demo>Cargar ejemplo de solicitudes y actividad</button>':'')+(error?'<p class="ps-error" role="alert">'+escape(error)+'</p>':'')+'<p class="ps-status" role="status" data-social-status></p>';
    }
    const safely=callback=>{try{callback();error='';}catch(_){error='No se pudo guardar el cambio. Revisa el almacenamiento del navegador e inténtalo de nuevo.';}render();};
    root.addEventListener('click',event=>{
      const button=event.target.closest('button'); if(!button||!root.contains(button))return;
      if(button.hasAttribute('data-social-requests')){
        requestsOpen=!requestsOpen;
        const reveal=root.querySelector('[data-social-requests-panel]');
        button.setAttribute('aria-expanded',String(requestsOpen));
        reveal.inert=!requestsOpen;
        reveal.setAttribute('aria-hidden',String(!requestsOpen));
        reveal.classList.toggle('is-open',requestsOpen);
        button.focus({preventScroll:true});
      }
      if(button.hasAttribute('data-social-filter')){filter=button.dataset.socialFilter;render();root.querySelector('[data-social-filter="'+filter+'"]').focus();}
      if(button.hasAttribute('data-social-demo'))safely(()=>store.seedDemo());
      if(button.hasAttribute('data-social-accept')||button.hasAttribute('data-social-remove')){
        const accepted=button.hasAttribute('data-social-accept');
        safely(()=>store.decide(button.dataset.socialAccept||button.dataset.socialRemove,accepted?'accepted':'removed'));
        root.querySelector('[data-social-status]').textContent=error?'':accepted?'Solicitud confirmada.':'Solicitud eliminada.';
        root.querySelector('[data-social-requests]').focus({preventScroll:true});
      }
      if(button.hasAttribute('data-social-open')){
        const item=store.read().events.find(entry=>entry.id===button.dataset.socialOpen);
        if(!item)return;
        safely(()=>store.markRead(item.id));
        window.dispatchEvent(new CustomEvent('drsam:social-open',{detail:item}));
      }
    });
    window.addEventListener('drsam:communities-action',event=>{
      selectProfile();
      if(String(event.detail?.profileId)!==profileId)return;
      const item=fromCommunityEvent(event.detail);
      if(item)safely(()=>store.record(item));
    });
    window.addEventListener('drsam:patient-profile',event=>{if(event.detail?.action==='profile:active-changed')render();});
    window.addEventListener('storage',event=>{if(event.key===store.key)render();});
    document.addEventListener('click',event=>{if(event.target.closest('[data-profile-panel-open]'))render();});
    render();
    return {render};
  }
  window.KliniPatientSocial={createStore,fromCommunityEvent,groupEvents,renderEvent,mount};
  const root=document.querySelector('[data-patient-social]');
  if(root)mount(root);
})();
