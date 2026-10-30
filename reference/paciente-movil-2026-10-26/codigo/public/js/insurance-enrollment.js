(function () {
  'use strict';
  const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n)) + ' MXN';
  function total(plan, addons) {
    if (plan.price === null) return null;
    return Number(plan.price) + addons.reduce((sum, key) => sum + Number(plan.details.addons?.[key]?.price || 0), 0);
  }
  window.KliniInsuranceEnrollment = { total, mount(root, quoteForm) {
    if (!root) return null;
    const field = s => root.querySelector(s), all = s => [...root.querySelectorAll(s)];
    const plans = JSON.parse(field('[data-enroll-catalog]').textContent);
    if (quoteForm) field('[data-enroll-quote-container]').append(quoteForm);
    if (!plans.length) return { back: () => false };
    let step = 1, signed = false, drawing = false, videoUrl = null;
    const selected = () => plans.find(plan => String(plan.id) === field('[name=enroll_plan]:checked')?.value);
    const addons = () => all('[data-enroll-addon]:checked').map(i => i.dataset.enrollAddon);
    const amountText = n => n === null ? 'Por cotizar' : money(n);
    const addText = (parent, tag, value) => { const node = document.createElement(tag); node.textContent = value; parent.append(node); return node; };
    const quotePlan = document.createElement('input');
    quotePlan.type = 'hidden'; quotePlan.name = 'insurance_plan_id'; quoteForm?.append(quotePlan);
    function summary(node, text) {
      node.replaceChildren(); addText(node, 'strong', selected().name); addText(node, 'p', text);
    }
    function update() {
      const plan = selected();
      if (!plan) return;
      const amount = total(plan, addons());
      all('[data-enroll-total]').forEach(n => n.textContent = amountText(amount));
      all('[data-enroll-plan-summary]').forEach(n => summary(n, amountText(plan.price) + (plan.price === null ? '' : '/mes') + ' · ' + plan.carrier + (plan.is_demo ? ' · Demostración' : '')));
      const annual = field('[name=enroll_frequency]:checked')?.value === 'annual';
      summary(field('[data-enroll-payment-summary]'), amountText(amount === null ? null : amount * (annual ? 12 : 1)) + ' · ' + (annual ? 'Anual estimado' : 'Mensual') + ' · Sin cargo');
      summary(field('[data-enroll-final-summary]'), amountText(amount) + ' · Sin contratación real');
      quotePlan.value = plan.id;
    }
    function planDetails() {
      const plan = selected(), details = plan.details || {};
      const container = field('[data-enroll-addons]'); container.replaceChildren();
      Object.entries(details.addons || {}).forEach(([key, addon]) => {
        const label = document.createElement('label'); label.className = 'ki-enroll-addon';
        const span = document.createElement('span'); addText(span, 'strong', addon.name); addText(span, 'small', '+ ' + money(addon.price) + '/mes');
        const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.enrollAddon = key; label.append(span, input); container.append(label);
      });
      if (!container.children.length) addText(container, 'p', 'Este plan no tiene complementos opcionales.');
      const benefits = field('[data-enroll-benefits]'); benefits.replaceChildren();
      addText(benefits, 'p', details.coverages || 'Coberturas por definir.');
      const extraFields = { main_coverage: 'Cobertura principal', teleconsultations: 'Teleconsultas', ambulance: 'Ambulancia', term: 'Plazo', beneficiaries: 'Beneficiarios' };
      Object.entries(extraFields).forEach(([key, label]) => { if (details[key]) addText(benefits, 'p', label + ': ' + details[key]); });
      const terms = field('[data-enroll-terms]'); terms.replaceChildren();
      Object.entries({ conditions: 'Condiciones', coverages: 'Coberturas', exclusions: 'Exclusiones', waiting_periods: 'Periodos de espera', cancellation: 'Cancelación y privacidad', beneficiaries: 'Beneficiarios' }).forEach(([key, label]) => {
        const item = document.createElement('details'); item.className = 'ki-row'; addText(item, 'summary', label); addText(item, 'p', details[key] || 'Por definir'); terms.append(item);
      });
      const documents = field('[data-enroll-documents]'); documents.replaceChildren();
      addText(documents, 'h3', 'Documentos del plan');
      if (!plan.documents.length) addText(documents, 'p', 'No hay documentos adjuntos.');
      plan.documents.forEach(doc => { const link = addText(documents, 'a', doc.name); link.href = doc.url; link.className = 'ki-outline'; });
      all('[data-enroll-confirm]').forEach(input => input.checked = false);
      update();
    }
    function categoryChanged() {
      const category = field('[data-enroll-category]').value;
      all('[data-plan-category]').forEach(node => node.hidden = node.dataset.planCategory !== category);
      all('[name=enroll_plan]').forEach(input => input.disabled = input.closest('[data-plan-category]').hidden);
      const first = field('[name=enroll_plan]:not(:disabled)');
      if (first) first.checked = true;
      planDetails();
    }
    function show(next) {
      step = next; all('[data-enroll-step]').forEach(n => n.hidden = Number(n.dataset.enrollStep) !== step);
      field('[data-enroll-counter]').textContent = step + ' de 10'; field('[data-enroll-progress]').value = step;
      field('[data-enroll-error]').textContent = ''; update();
      const pane = field('[data-enroll-step="' + step + '"]');
      if (!matchMedia('(prefers-reduced-motion:reduce)').matches) pane.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 450, easing: 'cubic-bezier(.22,.61,.36,1)' });
      const scroll = root.closest('.patient-insurance-drawer-content'); if (scroll) scroll.scrollTop = 0;
    }
    function validate() {
      const pane = field('[data-enroll-step="' + step + '"]');
      const invalid = [...pane.querySelectorAll('[required]:not(:disabled)')].find(n => !n.checkValidity());
      if (invalid) { invalid.reportValidity(); return false; }
      if (step === 4) {
        const sum = all('[data-beneficiary-percent]').reduce((s, n) => s + Number(n.value), 0);
        if (sum !== 100) { field('[data-enroll-error]').textContent = 'Los porcentajes de personas beneficiarias deben sumar 100%.'; return false; }
        if (field('[data-enroll-field=birth]').value > new Date().toISOString().slice(0, 10)) { field('[data-enroll-error]').textContent = 'La fecha de nacimiento no puede ser futura.'; return false; }
      }
      if (step === 8 && !signed) { field('[data-enroll-error]').textContent = 'Dibuja tu firma de prueba antes de continuar.'; return false; }
      return true;
    }
    function beneficiary() {
      const box = document.createElement('div'); box.className = 'ki-feature';
      for (const [name, type] of [['Nombre', 'text'], ['Parentesco', 'text'], ['Porcentaje', 'number']]) {
        const label = addText(box, 'label', name), input = document.createElement('input'); input.type = type; input.required = true;
        if (type === 'number') { input.min = 1; input.max = 100; input.step = 1; input.dataset.beneficiaryPercent = ''; input.value = field('[data-enroll-beneficiaries]').children.length ? '' : '100'; } else input.maxLength = 180;
        label.append(input);
      }
      const remove = addText(box, 'button', 'Eliminar persona beneficiaria'); remove.type = 'button'; remove.className = 'ki-outline';
      remove.onclick = () => { if (field('[data-enroll-beneficiaries]').children.length > 1) box.remove(); };
      field('[data-enroll-beneficiaries]').append(box);
    }
    const canvas = field('[data-enroll-signature]'), ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#10284f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    function point(e) { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; }
    canvas.addEventListener('pointerdown', e => { drawing = true; canvas.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...point(e)); });
    canvas.addEventListener('pointermove', e => { if (drawing) { ctx.lineTo(...point(e)); ctx.stroke(); signed = true; } });
    canvas.addEventListener('pointerup', () => drawing = false); canvas.addEventListener('pointercancel', () => drawing = false);
    function clearVideo() {
      if (videoUrl) URL.revokeObjectURL(videoUrl); videoUrl = null;
      field('[data-enroll-video-preview]').removeAttribute('src'); field('[data-enroll-video-preview]').hidden = true; field('[data-enroll-video]').value = '';
    }
    field('[data-enroll-video]').addEventListener('change', function () {
      const file = this.files[0]; if (!file) return;
      if (!file.type.startsWith('video/') || file.size > 50 * 1024 * 1024) { field('[data-enroll-error]').textContent = 'Elige un video de hasta 50 MB.'; return; }
      if (videoUrl) URL.revokeObjectURL(videoUrl); videoUrl = URL.createObjectURL(file);
      field('[data-enroll-video-preview]').src = videoUrl; field('[data-enroll-video-preview]').hidden = false;
    });
    window.addEventListener('pagehide', clearVideo);
    root.addEventListener('change', e => {
      if (e.target.matches('[data-enroll-category]')) categoryChanged();
      else if (e.target.matches('[name=enroll_plan]')) planDetails();
      else update();
    });
    root.addEventListener('click', e => {
      if (e.target.closest('[data-enroll-next]') && validate()) show(Math.min(10, step + 1));
      if (e.target.closest('[data-enroll-add-beneficiary]')) beneficiary();
      if (e.target.closest('[data-enroll-clear-signature]')) { ctx.clearRect(0, 0, canvas.width, canvas.height); signed = false; }
      if (e.target.closest('[data-enroll-clear-video]')) clearVideo();
    });
    beneficiary(); categoryChanged();
    return { get step() { return step; }, back() { if (step <= 1) return false; show(step - 1); return true; } };
  } };
})();
