(function () {
  'use strict';
  window.KliniInsuranceDrawer = {
    mount: function (portal) {
      var view = portal.querySelector('[data-patient-view="insurance"]');
      if (!view) return null;
      var dialog = document.createElement('dialog');
      dialog.className = 'patient-insurance-drawer';
      dialog.setAttribute('aria-label', 'Mi Seguro');
      dialog.innerHTML = '<div class="patient-insurance-drawer-sheet"><header class="patient-insurance-drawer-toolbar"><button type="button" aria-label="Volver" data-insurance-drawer-back><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><img class="patient-insurance-brand" src="/brand/klini/klini.svg" alt="Klini"><button type="button" aria-label="Cerrar Mi Seguro" data-insurance-drawer-close><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="patient-insurance-drawer-content"></div></div>';
      portal.appendChild(dialog);
      dialog.querySelector('.patient-insurance-drawer-content').appendChild(view);
      var flow = view.querySelector('[data-insurance-flow]');
      var legacy = view.querySelector('.patient-insurance-shell');
      var showScreen, enrollment, currentScreen = null, screenHistory = [];
      if (flow && legacy) {
        flow.querySelector('[data-insurance-edit-container]').appendChild(legacy.querySelector('.patient-insurance-overview'));
        var editForm = legacy.querySelector('[data-insurance-form]');
        flow.querySelector('[data-insurance-edit-container]').appendChild(editForm);
        legacy.hidden = true;
        enrollment = window.KliniInsuranceEnrollment?.mount(flow.querySelector('[data-insurance-enroll]'), flow.querySelector('[data-request-type=quote]'));
        showScreen = function (name, backNavigation) {
          if (!flow.querySelector('[data-insurance-screen-panel="' + name + '"]')) return;
          if (!backNavigation && currentScreen && currentScreen !== name) screenHistory.push(currentScreen);
          currentScreen = name;
          flow.querySelectorAll('[data-insurance-screen-panel]').forEach(function (panel) { panel.hidden = panel.dataset.insuranceScreenPanel !== name; });

          flow.querySelectorAll('[data-insurance-screen]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.insuranceScreen === name); });
          var activePanel = flow.querySelector('[data-insurance-screen-panel="' + name + '"]');
          activePanel.getAnimations?.().forEach(function (animation) { animation.cancel(); });
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && activePanel.animate) activePanel.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}], {duration:280,easing:'cubic-bezier(.22,.61,.36,1)'});
          if (name === 'settings') editForm.hidden = false;
          dialog.querySelector('.patient-insurance-drawer-content').scrollTop = 0;
          flow.querySelector('[data-insurance-screen-panel="' + name + '"] h2')?.setAttribute('tabindex', '-1');
          flow.querySelector('[data-insurance-screen-panel="' + name + '"] h2')?.focus({preventScroll:true});
        }
        flow.addEventListener('click', function (e) {
          var target = e.target.closest('[data-insurance-screen]');
          if (target) showScreen(target.dataset.insuranceScreen);
          if (e.target.closest('[data-insurance-form-open]')) { if (e.target.closest('.patient-insurance-upload')) { showScreen('documents'); flow.querySelector('[data-insurance-document-upload]').click(); } else showScreen('settings'); }
          if (e.target.closest('[data-insurance-form-close]')) showScreen('entry');

        });
        flow.querySelector('[data-insurance-network-search]').addEventListener('input', function (e) {
          var term = e.target.value.toLocaleLowerCase();
          flow.querySelectorAll('[data-insurance-provider]').forEach(function (p) { p.hidden = !p.textContent.toLocaleLowerCase().includes(term); });
        });
        async function uploadInsuranceFile(file, category) {
          var body = new FormData(); body.append('file', file); body.append('record_id', 'seg-' + Date.now()); body.append('category', category);
          var response = await fetch('/patient/register-attachments', {method:'POST', body:body, headers:{'X-CSRF-TOKEN':editForm.querySelector('[name=_token]').value, 'Accept':'application/json'}});
          var result = await response.json(); if (!response.ok) throw new Error(Object.values(result.errors || {}).flat().join(' ') || result.message || 'No se pudo guardar el archivo.');
          return result.document_id;
        }
        var uploader = flow.querySelector('[data-insurance-document-upload]');
        uploader.addEventListener('change', async function () {
          if (!uploader.files[0]) return;
          var status = flow.querySelector('[data-insurance-document-status]'); uploader.disabled = true; status.textContent = 'Guardando documento…';
          try { await uploadInsuranceFile(uploader.files[0], 'insurance_document'); sessionStorage.setItem('patientPortalView','insurance');sessionStorage.setItem('kliniInsuranceScreen','documents');location.reload(); }
          catch(e) { status.textContent = e.message; uploader.disabled = false; }
        });
        flow.querySelectorAll('[data-insurance-request-form]').forEach(function (form) {
          var step = 1, busy = false;
          function changeStep(next) {
            step = next;
            form.querySelectorAll('[data-insurance-step]').forEach(function (p) { p.hidden = Number(p.dataset.insuranceStep) !== step; });
            var label = form.querySelector('[data-insurance-step-label]');
            label.replaceChildren();
            var track = document.createElement('div'); track.className = 'ki-step-track';
            for (var i=1;i<=3;i++) { if(i>1) track.appendChild(document.createElement('i')); var circle=document.createElement('span');circle.textContent=String(i);if(i<=step)circle.className='is-current';track.appendChild(circle); }
            var description=document.createElement('p');description.textContent='Paso ' + step + ' de 3 · ' + ['Datos del gasto','Documentos necesarios','Confirmación'][step-1];label.append(track,description);
            form.querySelector('[data-insurance-step-back]').hidden = step === 1;
            form.querySelector('[data-insurance-step-next]').hidden = step === 3;
            form.querySelector('[data-insurance-request-send]').hidden = step !== 3;
            if (step === 3) {
              var review = form.querySelector('[data-insurance-request-review]'); review.replaceChildren();
              ['attention_date','provider','concept','amount'].forEach(function (key) { var p = document.createElement('p'); p.textContent = form.elements[key].value + (key === 'amount' ? ' MXN' : ''); review.appendChild(p); });
            }
          }
          form.querySelector('[data-insurance-step-next]')?.addEventListener('click', function () {
            var invalid = Array.from(form.querySelectorAll('[data-insurance-step="'+step+'"] [required]')).find(function (input) {return !input.checkValidity();});
            if (invalid) { invalid.reportValidity(); return; } changeStep(Math.min(3, step+1));
          });
          form.querySelector('[data-insurance-step-back]')?.addEventListener('click', function () {changeStep(Math.max(1, step-1));});
          form.addEventListener('submit', async function (e) {
            e.preventDefault(); if (busy || !form.reportValidity()) return;
            busy = true; var status = form.querySelector('[data-insurance-request-status]'); var buttons = form.querySelectorAll('button'); buttons.forEach(function(b){b.disabled=true;}); status.textContent = 'Enviando solicitud…';
            try {
              var body = new FormData(form);
              if (form.dataset.requestType === 'refund') {
                for (var input of form.querySelectorAll('[data-insurance-refund-file]')) {
                  var cached = input.dataset.documentId;
                  if (!cached) { cached = await uploadInsuranceFile(input.files[0], 'insurance_refund'); input.dataset.documentId = cached; }
                  body.append('documents[]', cached);
                }
              }
              var response = await fetch(form.action, {method:'POST', body:body, headers:{'Accept':'application/json'}});
              var result = await response.json();
              if (!response.ok) throw new Error(Object.values(result.errors || {}).flat().join(' ') || result.message || 'No se pudo enviar.');
              status.textContent = result.message + ' Folio: ' + result.id;
              form.querySelectorAll('input,textarea,button').forEach(function(el){el.disabled=true;});
              var follow = document.createElement('button'); follow.type='button'; follow.className='ki-outline'; follow.textContent='Ver seguimiento'; follow.onclick=function(){sessionStorage.setItem('patientPortalView','insurance');sessionStorage.setItem('kliniInsuranceScreen','tracking');location.reload();}; form.appendChild(follow);
            } catch(error) { status.textContent=error.message; busy=false; buttons.forEach(function(b){b.disabled=false;}); }
          });
          form.querySelectorAll('[data-insurance-refund-file]').forEach(function(input){input.addEventListener('change',function(){delete input.dataset.documentId;});});
        });
        showScreen('entry');
      }
      var closingTimer, openFrame, originalOverflow, closing = false;
      var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      var trigger = portal.querySelector('[data-support-toggle]');
      function close(immediate) {
        if (!dialog.open) return;
        cancelAnimationFrame(openFrame);
        clearTimeout(closingTimer);
        closing = true;
        dialog.classList.remove('is-open');
        function finish() {
          dialog.close();

          closing = false;
          view.classList.remove('is-active');
          document.body.style.overflow = originalOverflow;
          if (!immediate && trigger) trigger.focus({preventScroll: true});
        }
        if (immediate || reducedMotion.matches) finish();
        else closingTimer = setTimeout(finish, 480);
      }
      dialog.querySelector('[data-insurance-drawer-back]').addEventListener('click', function () {
        if (currentScreen === 'purchase' && enrollment?.back()) return;
        if (currentScreen === 'entry' || !showScreen) { close(false); return; }
        showScreen(screenHistory.pop() || 'entry', true);
      });
      dialog.querySelector('[data-insurance-drawer-close]').addEventListener('click', function () { close(false); });
      dialog.addEventListener('cancel', function (event) { event.preventDefault(); close(false); });
      dialog.addEventListener('click', function (event) {
        if (event.target !== dialog) return;
        var rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right) close(false);
      });
      return {
        open: function () {
          clearTimeout(closingTimer);
          view.classList.add('is-active');
          if (!dialog.open) {
            originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            dialog.showModal();
            // Start the transform after the browser has laid out the closed position.
            dialog.getBoundingClientRect();
          }
          screenHistory = []; currentScreen = null;
          if (flow) { var initial = sessionStorage.getItem('kliniInsuranceScreen'); sessionStorage.removeItem('kliniInsuranceScreen'); showScreen(initial || 'entry'); }
          closing = false;
          openFrame = requestAnimationFrame(function () { if (dialog.open && !closing) dialog.classList.add('is-open'); });
          dialog.querySelector('[data-insurance-drawer-close]').focus({preventScroll: true});
          var notice = portal.querySelector('[data-policy-saved-overlay]');
          if (notice) dialog.appendChild(notice);
        },
        close: function () { close(true); }
      };
    }
  };
})();
