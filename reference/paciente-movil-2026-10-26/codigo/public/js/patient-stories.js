(function () {
  "use strict";
  var DAY = 24 * 60 * 60 * 1000;
  var DURATION = 6000;
  function escape(value) { return String(value || "").replace(/[&<>"']/g, function (c) { return {"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]; }); }
  function initials(name) { return String(name || "Tu historia").trim().split(/\s+/).slice(0, 2).map(function (word) { return word[0]; }).join(""); }
  function activeGroups(groups, now) {
    return groups.map(function (group) {
      return Object.assign({}, group, {stories: group.stories.filter(function (story) { return Date.parse(story.expiresAt) > now; })});
    }).filter(function (group) { return group.stories.length || group.demo; });
  }
  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

  function Stories(app, options) {
    this.app = app;
    this.options = options;
    this.groups = [];
    this.offset = 0;
    this.generation = 0;
    this.seen = {};
    this.error = "";
    var self = this;
    window.addEventListener("drsam:stories-changed", function () { self.refresh(); });
    window.addEventListener("storage", function (event) {
      if (event.key === self.seenKey()) { self.seen = read(self.seenKey(), {}); self.paint(); }
      if (event.key === "klini-stories-updated") self.refresh();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) self.pause();
      else { self.expire(); self.refresh(); }
    });
  }
  Stories.prototype.profile = function () { return this.app.activePatientProfile(); };
  Stories.prototype.profileId = function () { var p = this.profile(); return String(p.userId || p.id); };
  Stories.prototype.seenKey = function () { return "klini-story-seen:" + this.profileId(); };
  Stories.prototype.now = function () { return Date.now() + this.offset; };
  Stories.prototype.allGroups = function () { return activeGroups(this.groups.concat(this.demoGroups()), this.now()); };
  Stories.prototype.unseen = function (group) {
    var self = this;
    return group.stories.some(function (story) { return !story.seen && !self.seen[story.id]; });
  };
  Stories.prototype.demoGroups = function () {
    if (!this.options.demo) return [];
    var key = "klini-demo-stories-created-v1";
    var created = Number(read(key, 0));
    if (!created) { created = this.now(); write(key, created); }
    var photos = ["/images/patient-export/9bfe0ef87111af6547ae.jpg", "/images/patient-export/053bd5cb0be986bb99b7.jpg", "/images/patient-export/a875f0e9e033f205a761.jpg"];
    return (this.options.people || []).slice(0, 5).map(function (person, index) {
      return Object.assign({}, person, {id: "demo-" + person.id, demo: true, stories: index < 3 ? [{
        id: "demo-" + person.id + "-" + created, photo: photos[index],
        createdAt: new Date(created).toISOString(), expiresAt: new Date(created + DAY).toISOString()
      }] : []});
    });
  };
  Stories.prototype.request = async function (url, options) {
    var response = await fetch(url, Object.assign({credentials: "same-origin", headers: {Accept: "application/json", "X-CSRF-TOKEN": this.options.csrf}}, options));
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var validation = data.errors && Object.values(data.errors)[0];
      throw new Error(response.status === 413 ? "La foto es demasiado grande. Elige una de hasta 10 MB." : response.status === 419 || response.status === 401 ? "Tu sesión terminó. Vuelve a ingresar para continuar." : (validation && validation[0]) || data.message || "No se pudieron cargar las historias. Intenta de nuevo.");
    }
    return data;
  };
  Stories.prototype.refresh = async function () {
    var self = this, generation = ++this.generation, profile = this.profileId();
    clearTimeout(this.poll);
    this.seen = read(this.seenKey(), {});
    try {
      var data = await this.request(this.options.url + "?profile_id=" + encodeURIComponent(profile));
      if (generation !== this.generation || profile !== this.profileId()) return;
      this.offset = Date.parse(data.serverTime) - Date.now();
      this.groups = data.groups;
      this.error = "";
    } catch (error) {
      if (generation !== this.generation || profile !== this.profileId()) return;
      this.error = error.message;
    }
    this.paint();
    this.expire();
    this.poll = setTimeout(function () { self.refresh(); }, 45000);
    this.scheduleExpiry();
  };
  Stories.prototype.scheduleExpiry = function () {
    var self = this, expiries = [];
    this.allGroups().forEach(function (group) { group.stories.forEach(function (story) { expiries.push(Date.parse(story.expiresAt)); }); });
    clearTimeout(this.expiryTimer);
    if (expiries.length) this.expiryTimer = setTimeout(function () { self.expire(); self.paint(); self.scheduleExpiry(); }, Math.max(50, Math.min.apply(Math, expiries) - this.now() + 20));
  };
  Stories.prototype.expire = function () {
    if (this.current && Date.parse(this.current.story.expiresAt) <= this.now()) this.close();
  };
  Stories.prototype.reset = function () {
    this.generation++;
    this.close();
    this.groups = [];
    this.seen = read(this.seenKey(), {});
    this.refresh();
  };
  Stories.prototype.avatar = function (person) {
    return person.avatar ? '<img src="' + escape(person.avatar) + '" alt="" draggable="false">' : '<span class="kp-story-initials">' + escape(initials(person.name)) + '</span>';
  };
  Stories.prototype.render = function () {
    var self = this, profile = this.profile(), groups = this.allGroups();
    var own = groups.find(function (group) { return group.own; });
    var hasOwn = own && own.stories.length;
    var ownAvatar = this.avatar({name: profile.name, avatar: this.app.patientProfilePhoto() || (own && own.avatar)});
    var html = '<div class="kp-stories"><div class="kc-stories" data-pan data-carousel="stories" aria-label="Historias">' +
      '<div class="kp-story-item kp-story-own"><button type="button" class="kc-story" data-action="' + (hasOwn ? 'open-story' : 'upload-story') + '" data-id="patient" aria-label="' + (hasOwn ? 'Ver tu historia' : 'Agregar tu historia') + '"><span class="kp-story-avatar' + (hasOwn ? ' has-unseen' : '') + '">' + ownAvatar + '</span><b>Tu historia</b></button>' +
      '<button type="button" class="kp-story-add" data-action="upload-story" data-id="patient" aria-label="Agregar foto a tu historia">+</button></div>';
    groups.filter(function (group) { return !group.own; }).forEach(function (group) {
      var unseen = self.unseen(group), available = group.stories.length > 0;
      html += '<div class="kp-story-item"><button type="button" class="kc-story" data-action="open-story" data-id="' + escape(group.id) + '" aria-label="' + escape(group.name) + ': ' + (available ? unseen ? 'historia nueva' : 'historia vista' : 'sin historias') + '"' + (available ? '' : ' aria-disabled="true"') + '><span class="kp-story-avatar' + (unseen ? ' has-unseen' : '') + '">' + self.avatar(group) + '</span><b>' + escape(group.short || group.name.split(' ')[0]) + '</b></button></div>';
    });
    if (!groups.length) html += '<span class="kp-story-empty">Comparte un momento</span>';
    html += '</div><div class="kp-story-status" role="status">' + escape(this.error) + (this.error ? ' <button type="button" data-action="retry-stories">Reintentar</button>' : '') + '</div></div>';
    return html;
  };
  Stories.prototype.paint = function () {
    var old = this.app.root.querySelector('.kp-stories');
    if (!old) return;
    var track = old.querySelector('[data-carousel="stories"]'), left = track ? track.scrollLeft : 0;
    // Do not replace a track while the user is dragging it.
    if (track && track.dataset.dragging === '1') return;
    old.outerHTML = this.render();
    this.app.root.querySelector('[data-carousel="stories"]').scrollLeft = left;
  };
  Stories.prototype.dialog = function (className, label) {
    if (this.modal) this.close();
    var self = this, dialog = document.createElement('dialog');
    dialog.className = 'kp-story-dialog ' + className;
    dialog.setAttribute('aria-label', label);
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); if (!self.busy) self.close(); });
    this.returnFocus = document.activeElement;
    document.body.appendChild(dialog);
    this.modal = dialog;
    return dialog;
  };
  Stories.prototype.close = function () {
    clearTimeout(this.timer);
    this.current = null;
    if (this.modal) { this.modal.close(); this.modal.remove(); this.modal = null; }
    if (this.previewUrl) { URL.revokeObjectURL(this.previewUrl); this.previewUrl = null; }
    this.paint();
    var target = this.returnFocus;
    if (target && target.isConnected) target.focus({preventScroll: true});
    else { target = this.app.root.querySelector('.kp-story-own .kc-story'); if (target) target.focus({preventScroll: true}); }
  };
  Stories.prototype.upload = function () {
    var self = this, profile = this.profileId(), input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.hidden = true;
    input.addEventListener('cancel', function () { input.remove(); });
    input.addEventListener('change', function () {
      var file = input.files[0]; input.remove();
      if (!file || profile !== self.profileId()) return;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
        self.error = 'Elige una foto JPG, PNG o WebP de hasta 10 MB.'; self.paint(); return;
      }
      self.compose(file, profile);
    }, {once: true});
    document.body.appendChild(input); input.click();
  };
  Stories.prototype.compose = function (file, profile) {
    var self = this, dialog = this.dialog('kp-story-compose', 'Publicar tu historia');
    this.previewUrl = URL.createObjectURL(file);
    dialog.innerHTML = '<header><strong>Tu historia</strong><button type="button" data-close aria-label="Cancelar publicación">×</button></header>' +
      '<img class="kp-story-photo" src="' + escape(this.previewUrl) + '" alt="Vista previa de tu historia">' +
      '<footer><p role="status" data-status></p><button type="button" class="kp-story-publish">Compartir historia</button></footer>';
    dialog.querySelector('[data-close]').onclick = function () { if (!self.busy) self.close(); };
    dialog.querySelector('.kp-story-publish').onclick = async function () {
      if (self.busy || profile !== self.profileId()) return;
      self.busy = true;
      this.disabled = true; this.textContent = 'Publicando…';
      var status = dialog.querySelector('[data-status]'); status.textContent = '';
      try {
        var form = new FormData(); form.append('profile_id', profile); form.append('photo', file);
        // A separate, small snapshot of the existing avatar; never assign the story to the profile.
        var avatar = await self.avatarFile(self.app.patientProfilePhoto());
        if (avatar) form.append('avatar', avatar, 'avatar.jpg');
        await self.request(self.options.url, {method: 'POST', body: form});
        self.busy = false; self.close(); self.broadcast();
      } catch (error) {
        status.textContent = error.message;
        self.busy = false; this.disabled = false; this.textContent = 'Compartir historia';
      }
    };
    dialog.showModal();
  };
  Stories.prototype.avatarFile = function (source) {
    if (!source) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var image = new Image(), timeout = setTimeout(function () { resolve(null); }, 3000);
      image.onload = function () {
        clearTimeout(timeout);
        try {
          var canvas = document.createElement('canvas'); canvas.width = canvas.height = 160;
          var size = Math.min(image.naturalWidth, image.naturalHeight);
          canvas.getContext('2d').drawImage(image, (image.naturalWidth-size)/2, (image.naturalHeight-size)/2, size, size, 0, 0, 160, 160);
          canvas.toBlob(resolve, 'image/jpeg', 0.85);
        } catch (_) { resolve(null); }
      };
      image.onerror = function () { clearTimeout(timeout); resolve(null); };
      image.src = source;
    });
  };
  Stories.prototype.broadcast = function () {
    write('klini-stories-updated', Date.now());
    window.dispatchEvent(new CustomEvent('drsam:stories-changed'));
  };
  Stories.prototype.open = function (id) {
    var self = this;
    this.playlist = this.allGroups().filter(function (group) { return group.stories.length; });
    var index = this.playlist.findIndex(function (group) { return id === 'patient' ? group.own : group.id === id; });
    if (index < 0) return;
    this.dialog('kp-story-viewer', 'Historias');
    this.groupIndex = index;
    var firstUnseen = this.playlist[index].stories.findIndex(function (story) { return !story.seen && !self.seen[story.id]; });
    this.photoIndex = Math.max(0, firstUnseen);
    this.show(); this.modal.showModal();
  };
  Stories.prototype.markSeen = function (story) {
    this.seen[story.id] = story.expiresAt;
    Object.keys(this.seen).forEach(function (id) { if (Date.parse(this.seen[id]) <= this.now()) delete this.seen[id]; }, this);
    write(this.seenKey(), this.seen); this.paint();
    if (story.seenUrl) {
      var form = new FormData(); form.append('profile_id', this.profileId());
      this.request(story.seenUrl, {method: 'POST', body: form}).catch(function () {});
    }
  };
  Stories.prototype.show = function () {
    var self = this, group = this.playlist[this.groupIndex], story = group && group.stories[this.photoIndex];
    clearTimeout(this.timer);
    if (!story || Date.parse(story.expiresAt) <= this.now()) { this.close(); return; }
    this.current = {group: group, story: story};
    this.paused = true; this.loaded = false; this.remaining = DURATION;
    var elapsed = Math.max(0, this.now() - Date.parse(story.createdAt));
    var age = elapsed < 60000 ? 'Ahora' : elapsed < 3600000 ? Math.floor(elapsed/60000) + ' min' : Math.floor(elapsed/3600000) + ' h';
    this.modal.setAttribute('aria-label', 'Historia de ' + group.name);
    this.modal.innerHTML = '<div class="kp-story-progress" aria-hidden="true">' + group.stories.map(function (_, i) {
      return '<span><i class="' + (i < self.photoIndex ? 'is-done' : i === self.photoIndex ? 'is-current' : '') + '"></i></span>';
    }).join('') + '</div><header>' + this.avatar(group) + '<div><strong>' + escape(group.name) + '</strong><small>' + age + (group.demo ? ' · Ejemplo' : '') + '</small></div>' +
      '<button type="button" data-pause aria-label="Pausar historia">Ⅱ</button><button type="button" data-close aria-label="Cerrar historia">×</button></header>' +
      '<div class="kp-story-stage"><img class="kp-story-photo" src="' + escape(story.photo) + '" alt="Historia de ' + escape(group.name) + '"><button class="kp-story-prev" aria-label="Historia anterior"></button><button class="kp-story-next" aria-label="Siguiente historia"></button></div>' +
      '<footer>' + (group.own ? '<button type="button" data-delete>Eliminar historia</button>' : '') + '<p data-status role="status"></p></footer>';
    this.modal.querySelector('[data-close]').onclick = function () { self.close(); };
    this.modal.querySelector('[data-pause]').onclick = function () { if (self.paused) self.resume(); else self.pause(); };
    this.modal.querySelector('.kp-story-prev').onclick = function () { if (!self.suppressClick) self.move(-1); };
    this.modal.querySelector('.kp-story-next').onclick = function () { if (!self.suppressClick) self.move(1); };
    this.modal.onkeydown = function (event) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); self.move(event.key === 'ArrowRight' ? 1 : -1); }
      if (event.code === 'Space' && event.target.tagName !== 'BUTTON') { event.preventDefault(); self.paused ? self.resume() : self.pause(); }
    };
    var stage = this.modal.querySelector('.kp-story-stage'), down;
    stage.onpointerdown = function (event) { down = {x:event.clientX, y:event.clientY, time:Date.now(), paused:self.paused}; self.pause(); stage.setPointerCapture(event.pointerId); };
    stage.onpointerup = function (event) {
      if (!down) return;
      var dx = event.clientX - down.x, dy = event.clientY - down.y;
      var tap = Date.now() - down.time <= 220 && Math.abs(dx) < 15 && Math.abs(dy) < 15;
      self.suppressClick = true;
      if (Math.abs(dx) > 50) self.moveGroup(dx < 0 ? 1 : -1);
      else if (dy > 90) self.close();
      else if (tap) self.move(event.clientX - stage.getBoundingClientRect().left < stage.clientWidth / 2 ? -1 : 1);
      else if (!down.paused) self.resume();
      setTimeout(function () { self.suppressClick = false; }, 0); down = null;
    };
    stage.onpointercancel = function () { if (down && !down.paused) self.resume(); down = null; };
    var photo = this.modal.querySelector('.kp-story-photo');
    photo.onload = function () { if (!self.current || self.current.story.id !== story.id) return; self.expire(); if (!self.current) return; self.loaded = true; self.markSeen(story); self.resume(); };
    photo.onerror = function () { if (self.modal) self.modal.querySelector('[data-status]').textContent = 'Esta historia ya no está disponible. Puedes pasar a la siguiente.'; };
    var remove = this.modal.querySelector('[data-delete]');
    if (remove) remove.onclick = async function () {
      self.pause(); remove.disabled = true;
      try { await self.request(story.deleteUrl + '?profile_id=' + encodeURIComponent(self.profileId()), {method: 'DELETE'}); self.close(); self.broadcast(); }
      catch (error) { if (self.modal) self.modal.querySelector('[data-status]').textContent = error.message; remove.disabled = false; }
    };
    this.modal.querySelector('[data-close]').focus({preventScroll: true});
  };
  Stories.prototype.pause = function () {
    if (!this.current || this.paused) return;
    clearTimeout(this.timer); this.remaining = Math.max(0, this.remaining - (Date.now() - this.started)); this.paused = true;
    var bar = this.modal.querySelector('.is-current'); if (bar) bar.style.animationPlayState = 'paused';
    var button = this.modal.querySelector('[data-pause]'); button.textContent = '▶'; button.setAttribute('aria-label', 'Reanudar historia');
  };
  Stories.prototype.resume = function () {
    if (!this.current || !this.loaded || document.hidden) return;
    this.expire(); if (!this.current || !this.paused) return;
    var self = this; this.paused = false; this.started = Date.now();
    var bar = this.modal.querySelector('.is-current'); if (bar) bar.style.animationPlayState = 'running';
    var button = this.modal.querySelector('[data-pause]'); button.textContent = 'Ⅱ'; button.setAttribute('aria-label', 'Pausar historia');
    this.timer = setTimeout(function () { self.move(1); }, this.remaining);
  };
  Stories.prototype.move = function (direction) {
    if (!this.current) return;
    this.photoIndex += direction;
    if (this.photoIndex >= this.playlist[this.groupIndex].stories.length) { this.moveGroup(1); return; }
    if (this.photoIndex < 0) {
      if (this.groupIndex > 0) { this.groupIndex--; this.photoIndex = this.playlist[this.groupIndex].stories.length - 1; }
      else this.photoIndex = 0;
    }
    this.show();
  };
  Stories.prototype.moveGroup = function (direction) {
    this.groupIndex += direction; this.photoIndex = 0;
    if (this.groupIndex >= this.playlist.length) { this.close(); return; }
    this.groupIndex = Math.max(0, this.groupIndex); this.show();
  };
  window.KliniPatientStories = {create: function (app, options) { return new Stories(app, options); }, activeGroups: activeGroups};
})();
