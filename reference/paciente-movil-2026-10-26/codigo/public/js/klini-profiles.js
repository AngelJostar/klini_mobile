/** Klini profiles, supplied in Klini_Perfiles_Integracion.zip. Adapted for the patient portal. */
class KliniProfiles extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.items=[]; this.activeId=null; this.expandedId=null; this.busy=false;
    this.shadowRoot.innerHTML=`<style>
:host{--mint:#e5f8f5;--teal:#008e91;--navy:#10284f;font-family:system-ui,sans-serif;color:var(--navy)}*{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer;color:inherit;min-height:44px}button:focus-visible,input:focus-visible{outline:3px solid #008e91;outline-offset:3px}button:disabled{opacity:.6;cursor:wait}
.trigger{display:flex;align-items:center;gap:14px;width:100%;padding:16px;border:1px solid #afe3df;border-radius:20px;background:#f3fcfa;text-align:left}.avatar{display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:50%;background:var(--mint);color:var(--teal);font-weight:700}.name{display:block;font-weight:700;overflow-wrap:anywhere}.trigger>span:nth-child(2),.row>span:nth-child(2){flex:1;min-width:0}.avatar img{width:100%;height:100%;object-fit:cover;border-radius:inherit}.hint{display:block;font-size:13px;color:#64788d;margin-top:4px}.chevron{margin-left:auto;color:var(--teal)}
dialog{position:fixed;inset:0 0 0 auto;margin:0;border:0;padding:0;width:min(460px,92vw);height:100dvh;max-height:100dvh;max-width:100vw;border-radius:28px 0 0 28px;background:#fbfefd;color:var(--navy);box-shadow:-12px 0 45px #143b4020;overflow:hidden;transform:translateX(102%);opacity:0;transition:transform 560ms cubic-bezier(.22,.61,.36,1),opacity 560ms ease}dialog.open{transform:translateX(0);opacity:1}dialog::backdrop{background:#102f4200;transition:background-color 560ms ease}dialog.open::backdrop{background:#102f424d}.layout{display:flex;flex-direction:column;height:100%}header{padding:24px 24px 16px;flex:none}.back{width:44px;border:1px solid #d3e9e7;border-radius:50%;background:white;font-size:25px;color:var(--teal)}h2{font-size:27px;letter-spacing:-.6px;margin:20px 0 8px}p{color:#64788d;line-height:1.5;margin:0}.scroll{overflow:auto;overscroll-behavior:contain;padding:8px 16px 32px;flex:1}.card{border:1px solid #d5e8e6;border-radius:20px;background:white;margin-bottom:12px;box-shadow:0 5px 15px #0d635008;overflow:hidden}.card.expanded{border-color:#9dddd7;background:#f5fdfb}.row{border:0;background:transparent;display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:16px}.row .name{font-size:14px}.row .avatar{width:40px;height:40px}.row .hint{font-size:12px}.badge{font-size:11px;display:inline-block;color:var(--teal);background:var(--mint);border-radius:20px;padding:4px 8px;margin-top:6px}.arrow{margin-left:auto;transition:transform .25s;color:var(--teal)}.expanded .arrow{transform:rotate(180deg)}.fold{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s ease}.expanded .fold{grid-template-rows:1fr}.clip{overflow:hidden;min-height:0}.info{margin:0 12px 12px;padding:16px;border:1px solid #c8e8e4;background:#fff;border-radius:14px}h3{font-size:14px;margin:0 0 14px}dl{font-size:13px;margin:0}dt{color:#6c7f91;margin-top:10px}dd{margin:3px 0 0;overflow-wrap:anywhere}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.actions button,.add{padding:10px 12px;border:1px solid var(--teal);border-radius:11px;background:white;font-size:13px}.actions .primary{background:var(--teal);color:white}.add{width:100%;border-color:#c9e6e1;background:#f0fbf8;font-size:15px;padding:16px}.status{font-size:13px;margin:12px 0;color:#8b3446}label{display:block;font-size:13px;margin:12px 0}input{display:block;margin-top:6px;width:100%;padding:12px;border:1px solid #abcfc9;border-radius:9px}.demo-tag{font-size:11px} @media(prefers-reduced-motion:reduce){dialog,dialog::backdrop,.fold,.arrow{transition:none}}
/* Expanded profile information follows the supplied mobile reference. */
.card.expanded .info{padding:14px;border-radius:13px;border-color:#d5e9e8}
.card.expanded .info h3{font-size:13px;margin-bottom:12px}
.card.expanded .info dl{font-size:12px;line-height:1.35}
.card.expanded .info dt{margin-top:8px}
.card.expanded .info dt:first-child{margin-top:0}
.card.expanded .info dd{margin-top:2px}
.profile-info-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px;margin-top:16px}
.profile-info-actions button{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:42px;padding:9px 7px;border:1px solid #bcece8;border-radius:24px;background:#f7fcfb;font-size:11px;line-height:1.25;text-align:center}
.profile-info-actions .primary{background:#cef1ed;color:#008e87;border-color:#cef1ed;font-weight:700}
.profile-info-actions svg{width:18px;height:18px;flex:none;fill:none;stroke:#009a93;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:360px){.profile-info-actions button{padding-inline:7px;gap:5px;font-size:11px}}
.logout{display:flex;align-items:center;gap:13px;width:100%;min-height:66px;margin-top:12px;padding:10px 13px;border:1px solid #d9e8eb;border-radius:20px;background:#fff;color:var(--navy);box-shadow:0 8px 24px #102e3f14;text-align:left;font-size:14px}
.logout>span{display:grid;place-items:center;width:43px;height:43px;flex:none;border-radius:50%;background:#fff0f3;color:#d94754}.logout svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.logout:hover{border-color:#efb9c3;background:#fffbfc}
</style><button class="trigger" type="button" aria-haspopup="dialog"><span class="avatar"></span><span><span class="name"></span><span class="hint">Cambiar perfil</span></span><span class="chevron" aria-hidden="true">›</span></button><dialog aria-label="Perfiles"><div class="layout"><header><button class="back" type="button" aria-label="Atrás">›</button></header><div class="scroll"><div class="list"></div><button class="add" type="button">＋ Agregar perfil</button><button class="logout" type="button"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></svg></span><strong>Cerrar sesión</strong></button><p class="status" role="status" aria-live="polite"></p></div></div></dialog>`;
    this.$=s=>this.shadowRoot.querySelector(s);
    this.$('.trigger').onclick=()=>this.open();
    this.$('.back').onclick=()=>this.close();
    this.$('dialog').addEventListener('cancel',e=>{e.preventDefault();this.close()});
    this.$('dialog').addEventListener('click',e=>{if(e.target===this.$('dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right)this.close()}});
    this.$('.add').onclick=()=>this.dispatchEvent(new CustomEvent('profile-add',{bubbles:true,composed:true}));
    this.$('.logout').onclick=()=>this.dispatchEvent(new CustomEvent('profile-logout',{bubbles:true,composed:true}));
  }
  /** Supply only profiles already authorized by your server. */
  configure({profiles,activeId,onSwitch,onSave}){
    if(!Array.isArray(profiles)||!profiles.length||!profiles.some(p=>p.id===activeId))throw Error('Perfiles o perfil activo inválidos');
    if(profiles.some(p=>typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim()))throw Error('Cada perfil requiere id y name como textos no vacíos');
    if(new Set(profiles.map(p=>p.id)).size!==profiles.length)throw Error('IDs duplicados');
    this.items=profiles.map(p=>({...p}));this.activeId=activeId;this.onSwitch=onSwitch;this.onSave=onSave;this.render();
  }
  get isOpen(){return this.$('dialog').open}
  paintAvatar(element,profile){
    element.replaceChildren();element.setAttribute('aria-hidden','true');
    if(profile.photo){const image=document.createElement('img');image.src=profile.photo;image.alt='';element.append(image)}
    else element.textContent=this.initials(profile.name);
  }
  initials(name){return String(name).trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()}
  text(tag,value,cls){const el=document.createElement(tag);el.textContent=value??'';if(cls)el.className=cls;return el}
  render(){
    const active=this.items.find(p=>p.id===this.activeId);if(!active)return;
    this.$('.trigger .name').textContent=active.name;this.paintAvatar(this.$('.trigger .avatar'),active);
    const list=this.$('.list');list.replaceChildren();
    this.items.forEach((p,i)=>{
      const card=this.text('section','','card');card.dataset.id=p.id;
      const row=this.text('button','','row');row.type='button';row.id='profile-'+i;row.setAttribute('aria-controls','details-'+i);row.setAttribute('aria-expanded','false');
      const avatar=this.text('span','','avatar');this.paintAvatar(avatar,p);row.append(avatar);const labels=this.text('span','');labels.append(this.text('span',p.name,'name'),this.text('span',p.type,'hint'));if(p.id===this.activeId)labels.append(this.text('span','En uso ✓','badge'));row.append(labels,this.text('span','⌄','arrow'));
      const fold=this.text('div','','fold');fold.id='details-'+i;fold.setAttribute('role','region');fold.setAttribute('aria-labelledby',row.id);fold.inert=true;
      const clip=this.text('div','','clip');const info=this.text('div','','info');info.append(this.text('h3','Información del perfil'));const dl=this.text('dl','');[['Nombre',p.name],['Tipo',p.type],['ID de usuario',p.userId],['Cuenta vinculada',p.accountName]].filter(x=>x[1]).forEach(([k,v])=>dl.append(this.text('dt',k),this.text('dd',v)));info.append(dl);
      const actions=this.text('div','','actions profile-info-actions');const edit=this.text('button','Editar información');edit.type='button';edit.onclick=()=>this.edit(p,info);const use=this.text('button',p.id===this.activeId?'Perfil en uso':'Usar este perfil','primary');use.type='button';use.disabled=p.id===this.activeId;use.onclick=()=>this.switchTo(p);const pencil=document.createElementNS('http://www.w3.org/2000/svg','svg');pencil.setAttribute('viewBox','0 0 24 24');pencil.setAttribute('aria-hidden','true');pencil.innerHTML='<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/>';edit.prepend(pencil);const person=document.createElementNS('http://www.w3.org/2000/svg','svg');person.setAttribute('viewBox','0 0 24 24');person.setAttribute('aria-hidden','true');person.innerHTML='<circle cx="9" cy="6" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3H3m13-9 3 3 4-5"/>';use.prepend(person);actions.append(edit,use);info.append(actions);clip.append(info);fold.append(clip);card.append(row,fold);list.append(card);row.onclick=()=>this.expand(this.expandedId===p.id?null:p.id);
    });this.expand(this.expandedId);if(this.busy)this.shadowRoot.querySelectorAll('button,input').forEach(el=>el.disabled=true);
  }
  expand(id){this.expandedId=id;this.shadowRoot.querySelectorAll('.card').forEach(c=>{const open=c.dataset.id===id;c.classList.toggle('expanded',open);c.querySelector('.row').setAttribute('aria-expanded',String(open));c.querySelector('.fold').inert=!open})}
  open(){
    if(!this.items.length||this.isOpen)return;
    this.expand(null);this.$('.status').textContent='';this.$('dialog').showModal();
    this.openFrame=requestAnimationFrame(()=>{this.openFrame=requestAnimationFrame(()=>this.$('dialog').classList.add('open'))});
  }
  close(){
    if(this.busy)return Promise.resolve(false);
    if(this.closing)return this.closing;
    if(!this.isOpen)return Promise.resolve(true);
    cancelAnimationFrame(this.openFrame);
    this.$('dialog').classList.remove('open');
    this.closing=new Promise(resolve=>{setTimeout(()=>{
      this.$('dialog').close();this.$('.trigger').focus({preventScroll:true});this.closing=null;resolve(true);
    },matchMedia('(prefers-reduced-motion: reduce)').matches?0:560)});
    return this.closing;
  }
  lock(value){this.busy=value;this.shadowRoot.querySelectorAll('button,input').forEach(b=>b.disabled=value);if(!value)this.render()}
  async switchTo(p){if(this.busy)return;const previous=this.activeId;try{if(!this.onSwitch)throw Error('Conecta onSwitch a tu sistema.');this.lock(true);await this.onSwitch({...p});this.activeId=p.id;this.$('.status').textContent='Perfil activo actualizado';this.dispatchEvent(new CustomEvent('profile-change',{detail:{profile:{...p},previousId:previous},bubbles:true,composed:true}));}catch(e){this.$('.status').textContent=e.message||'No se pudo cambiar de perfil';}finally{this.lock(false);this.$('.list .row')?.focus()}}
  edit(p,info){
    info.replaceChildren();const form=document.createElement('form');form.append(this.text('h3','Editar información'));const label=this.text('label','Nombre');const input=document.createElement('input');input.value=p.name;input.required=true;input.maxLength=280;input.autocomplete='off';label.append(input);form.append(label);const actions=this.text('div','','actions');const cancel=this.text('button','Cancelar');cancel.type='button';cancel.onclick=()=>{this.render();this.$('.card.expanded .row')?.focus()};const save=this.text('button','Guardar cambios','primary');save.type='submit';actions.append(cancel,save);form.append(actions);info.append(form);input.focus();
    form.onsubmit=async e=>{e.preventDefault();if(this.busy)return;const name=input.value.trim();if(!name){input.setCustomValidity('Escribe un nombre');input.reportValidity();return}input.setCustomValidity('');try{if(!this.onSave)throw Error('Conecta onSave a tu sistema.');this.lock(true);const result=await this.onSave({...p,name});p.name=result?.name??name;this.$('.status').textContent='Información guardada';}catch(err){this.$('.status').textContent=err.message||'No se pudo guardar';}finally{this.lock(false);this.$('.card.expanded .row')?.focus()}};
    input.oninput=()=>input.setCustomValidity('');
  }
}
customElements.define('klini-profiles',KliniProfiles);
