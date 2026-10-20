(function () {
  "use strict";

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(value) {
    try {
      return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
    } catch (error) {
      return "$" + value;
    }
  }

  function icon(name) {
    var paths = {
      plus: '<path d="M12 5v14M5 12h14"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      chevron: '<path d="m9 18 6-6-6-6"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      wallet: '<path d="M4 7h15a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z"/>',
      diamond: '<path d="M6 3h12l4 6-10 12L2 9Z"/><path d="m6 3 6 18 6-18M2 9h20"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      support: '<path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2Zm16 0h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2ZM17 19c0 1.1-2.2 2-5 2"/>',
      request: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>',
      bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM9 21h6"/>',
      sync: '<path d="M20 7h-6V1M4 17h6v6"/><path d="M20 7a9 9 0 0 0-15-3M4 17a9 9 0 0 0 15 3"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      paw: '<circle cx="6.7" cy="8" r="2"/><circle cx="12" cy="6.5" r="2"/><circle cx="17.3" cy="8" r="2"/><path d="M6.8 17.4c.5-3.3 2.3-5.5 5.2-5.5s4.7 2.2 5.2 5.5c.2 1.5-.9 2.6-2.3 2.2l-2.9-.9-2.9.9c-1.4.4-2.5-.7-2.3-2.2Z"/>',
      logout: '<path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>',
      camera: '<path d="M5 7h3l2-2h4l2 2h3a2 2 0 0 1 2 2v9H3V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      dots: '<path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>',
      alert: '<path d="M10.3 4.2 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
      list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 7h.01"/>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      cart: '<path d="M4 5h2l2 11h10l2-7H8"/><circle cx="10" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/>',
      dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/>',
      up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
      down: '<path d="M12 5v14M19 12l-7 7-7-7"/>'
    };
    return '<svg aria-hidden="true" viewBox="0 0 24 24">' + (paths[name] || paths.user) + '</svg>';
  }

  function initials(name) {
    return String(name || "Paciente").split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) {
      return part.charAt(0);
    }).join("").toUpperCase() || "PX";
  }

  var panel = $("[data-patient-profile-panel]");
  if (!panel) return;

  var shade = $("[data-patient-profile-shade]");
  var modal = $("[data-patient-profile-modal]");
  var modalDialog = $("[data-patient-profile-dialog]");
  var modalTitle = $("[data-patient-profile-modal-title]");
  var modalEyebrow = $("[data-patient-profile-modal-eyebrow]");
  var modalBody = $("[data-patient-profile-modal-body]");
  var photoInput = $("[data-patient-profile-photo]");
  var storageKey = panel.dataset.storageKey || "drsam_patient_profile_panel";
  var logoutUrl = panel.dataset.logoutUrl || "/logout";
  var homeUrl = panel.dataset.homeUrl || "/";
  var csrfToken = panel.dataset.csrfToken || "";
  var accountsTrack = $("[data-profile-accounts-track]");
  var accountsDots = $("[data-profile-accounts-dots]");
  var profileSelector = $("[data-patient-profile-selector]");
  var accountsPanTimer = 0;
  var accountsPanClickLockUntil = 0;
  var pendingProfilePhoto = "";
  var profilePhotoSaveError = "";
  var lastStateSaveError = "";
  var PROFILE_PHOTO_MAX_SIZE = 512;
  var PROFILE_PHOTO_QUALITY = 0.84;
  var PRIMARY_ACCOUNT_CARD_ID = "__primary_profile";
  var ACCOUNTS_PAN_START_PX = 14;
  var ACCOUNTS_TAP_SELECT_PX = 24;
  var accountsPanState = {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    moved: false,
    tapSwitchId: ""
  };

  var PROFILE_SCOPED_KEYS = ["wallet", "subscription", "requests", "messages", "alerts", "synchronizations"];

  var initialState = {
    profile: {
      name: panel.dataset.profileName || "Paciente",
      userId: panel.dataset.profileId || "100000001",
      curp: panel.dataset.profileCurp || "No registrado",
      email: panel.dataset.profileEmail || "paciente@demo.drsam.local",
      phone: panel.dataset.profilePhone || "No registrado",
      photo: "",
      status: panel.dataset.profileStatus || "Activo",
      doctor: panel.dataset.profileDoctor || "Sin asignar",
      completedAt: panel.dataset.profileCompleted || "Pendiente"
    },
    wallet: {
      balance: 860,
      movements: [
        { id: "MOV-003", date: "30/07/2026", concept: "Recarga con tarjeta", amount: 500 },
        { id: "MOV-002", date: "24/07/2026", concept: "Compra en farmacia digital", amount: -270 },
        { id: "MOV-001", date: "20/07/2026", concept: "Recarga con tarjeta", amount: 630 }
      ]
    },
    subscription: {
      current: "smart",
      plans: [
        { id: "basic", name: "Historial Básico", label: "Gratis", price: 0, period: "Sin costo", description: "Para empezar a guardar y consultar información médica reciente." },
        { id: "complete", name: "Historial Completo", label: "Individual", price: 20, period: "Mensuales", description: "Acceso permanente a toda tu historia clínica digital." },
        { id: "smart", name: "Salud Inteligente", label: "Con IA", price: 190, period: "Mensuales", description: "Apoyo en la organización y seguimiento de tu salud." },
        { id: "family", name: "Cuidado Familiar", label: "Multiusuario", price: 799, period: "Hasta 5 usuarios", description: "Administra la salud de tus familiares desde una misma plataforma." },
        { id: "premium", name: "Salud Premium 360", label: "Avanzado", price: 950, period: "Plan avanzado", description: "Una experiencia médica digital completa y personalizada." }
      ]
    },
    activeAlternateId: "",
    alternateAccounts: [
      { id: "mateo", name: "Mateo Salinas", role: "Niño", initials: "MS", kind: "child", tone: "blue", userId: "100000002", relationshipCode: "child", managedByProfileId: "100000001", accessProfileId: "100000001", canLoginIndependently: false },
      { id: "valentina", name: "Valentina Salinas", role: "Niña", initials: "VS", kind: "child", tone: "rose", userId: "100000003", relationshipCode: "child", managedByProfileId: "100000001", accessProfileId: "100000001", canLoginIndependently: false },
      { id: "max", name: "Max", role: "Mascota", initials: "MX", kind: "pet", tone: "gold", userId: "100000004", relationshipCode: "pet", managedByProfileId: "100000001", accessProfileId: "100000001", canLoginIndependently: false },
      { id: "luna", name: "Luna", role: "Mascota", initials: "LN", kind: "pet", tone: "gray", userId: "100000005", relationshipCode: "pet", managedByProfileId: "100000001", accessProfileId: "100000001", canLoginIndependently: false }
    ],
    requests: [
      { id: "REQ-001", source: "Hospital General Norte", type: "Unidad / área operativa", date: "01/08/2026", detail: "Solicita sincronizar resultados de laboratorio con tu historial clínico.", status: "pending" },
      { id: "REQ-002", source: "Dra. Ana Sofía Ramírez", type: "Médico tratante", date: "29/07/2026", detail: "Solicita enlazar notas de seguimiento con tu expediente.", status: "accepted" }
    ],
    messages: [
      { id: "MSG-001", sender: "Dr. Carter Jimmy", role: "Médico tratante", time: "Hoy, 09:20 a.m.", preview: "Tu seguimiento está confirmado para el viernes.", unread: true },
      { id: "MSG-002", sender: "Andrea Suarez", role: "Asesora de seguros", time: "Ayer, 04:10 p.m.", preview: "Recibí los documentos de tu solicitud.", unread: true },
      { id: "MSG-003", sender: "Hospital General Norte", role: "Unidad médica", time: "28 jul, 11:35 a.m.", preview: "Tus resultados ya se encuentran disponibles.", unread: true }
    ],
    alerts: [
      { id: "ALT-001", title: "Resultado disponible", detail: "Ya puedes consultar tu biometría hemática.", time: "Hoy", unread: true },
      { id: "ALT-002", title: "Próxima consulta", detail: "Tienes una consulta programada en 3 días.", time: "Ayer", unread: false }
    ],
    synchronizations: [
      { id: "SYN-001", name: "Dr. Carter Jimmy", type: "Médico", since: "16/06/2026", validity: "Indefinida" },
      { id: "SYN-002", name: "Hospital General Norte - Laboratorio", type: "Unidad / área operativa", since: "08/06/2026", validity: "Indefinida" }
    ],
    profileData: {}
  };

  var state = normalizeState(loadState());

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function platformDigits(value) {
    return String(value == null ? "" : value).replace(/\D/g, "");
  }

  function platformWidth(profileUserId) {
    return Math.max(9, platformDigits(profileUserId || initialState.profile.userId).length);
  }

  function normalizePlatformUserId(value, profileUserId) {
    var digits = platformDigits(value);
    if (!digits) return "";
    return digits.padStart(platformWidth(profileUserId), "0");
  }

  function accountPlatformUserId(account) {
    return account && (account.userId || account.platformNumber || account.platformId || account.patientId || "");
  }

  function nextAvailablePlatformUserId(usedIds, profileUserId) {
    var width = platformWidth(profileUserId);
    var max = Number(normalizePlatformUserId(profileUserId, profileUserId)) || 100000000;
    Object.keys(usedIds || {}).forEach(function (id) {
      var number = Number(platformDigits(id));
      if (Number.isFinite(number) && number > max) max = number;
    });
    var next = max + 1;
    var nextId = String(next).padStart(width, "0");
    while (usedIds[nextId]) {
      next += 1;
      nextId = String(next).padStart(width, "0");
    }
    return nextId;
  }

  function ensureAlternatePlatformIds(next) {
    var profileUserId = next.profile && next.profile.userId ? next.profile.userId : initialState.profile.userId;
    var usedIds = {};
    var primaryId = normalizePlatformUserId(profileUserId, profileUserId);
    if (primaryId) usedIds[primaryId] = true;
    next.alternateAccounts = (next.alternateAccounts || []).map(function (account, index) {
      var item = account && typeof account === "object" ? Object.assign({}, account) : {};
      if (!item.name) item.name = "Cuenta alterna";
      if (!item.role) item.role = "Familiar";
      if (!item.id) item.id = "ALT-" + index + "-" + Date.now();
      if (!item.initials) item.initials = initials(item.name);
      if (!item.kind) item.kind = accountKindForRole(item.role);
      if (!item.tone) item.tone = accountToneForRole(item.role);
      var candidate = normalizePlatformUserId(accountPlatformUserId(item), profileUserId);
      if (!candidate || usedIds[candidate]) {
        candidate = nextAvailablePlatformUserId(usedIds, profileUserId);
      }
      item.userId = candidate;
      item.managedByProfileId = normalizePlatformUserId(item.managedByProfileId || primaryId, profileUserId) || primaryId;
      item.accessProfileId = normalizePlatformUserId(item.accessProfileId || item.managedByProfileId || primaryId, profileUserId) || item.managedByProfileId || primaryId;
      item.relationshipCode = item.relationshipCode || accountRelationshipCode(item.role, item.kind);
      item.canLoginIndependently = Boolean(item.canLoginIndependently);
      usedIds[candidate] = true;
      return item;
    });
    return next;
  }

  function createPlatformUserId() {
    var usedIds = {};
    var primaryId = normalizePlatformUserId(state.profile && state.profile.userId, state.profile && state.profile.userId);
    if (primaryId) usedIds[primaryId] = true;
    (state.alternateAccounts || []).forEach(function (account) {
      var id = normalizePlatformUserId(accountPlatformUserId(account), state.profile && state.profile.userId);
      if (id) usedIds[id] = true;
    });
    return nextAvailablePlatformUserId(usedIds, state.profile && state.profile.userId);
  }

  function normalizeState(value) {
    var next = value || clone(initialState);
    if (!next.wallet) next.wallet = clone(initialState.wallet);
    if (!Array.isArray(next.wallet.movements)) next.wallet.movements = clone(initialState.wallet.movements);
    if (typeof next.wallet.balance !== "number") next.wallet.balance = initialState.wallet.balance;
    if (!next.subscription) next.subscription = clone(initialState.subscription);
    if (!Array.isArray(next.subscription.plans) || !next.subscription.plans.length) next.subscription.plans = clone(initialState.subscription.plans);
    if (!next.subscription.current || !next.subscription.plans.some(function (plan) { return plan.id === next.subscription.current; })) next.subscription.current = initialState.subscription.current;
    if (!Array.isArray(next.alternateAccounts)) next.alternateAccounts = clone(initialState.alternateAccounts);
    ensureAlternatePlatformIds(next);
    if (typeof next.activeAlternateId !== "string") next.activeAlternateId = "";
    if (next.activeAlternateId && !next.alternateAccounts.some(function (account) { return account.id === next.activeAlternateId; })) next.activeAlternateId = "";
    if (!Array.isArray(next.requests)) next.requests = clone(initialState.requests);
    if (!Array.isArray(next.messages)) next.messages = clone(initialState.messages);
    next.messages = next.messages.map(function (item) {
      return normalizeMessage(item);
    });
    if (!Array.isArray(next.alerts)) next.alerts = clone(initialState.alerts);
    if (!Array.isArray(next.synchronizations)) next.synchronizations = clone(initialState.synchronizations);
    if (!next.profileData || typeof next.profileData !== "object" || Array.isArray(next.profileData)) next.profileData = {};
    var primarySuffix = primaryProfileStorageSuffixFromState(next);
    if (!next.profileData[primarySuffix]) {
      next.profileData[primarySuffix] = profileDataBucketFromObject(next);
    }
    Object.keys(next.profileData).forEach(function (suffix) {
      next.profileData[suffix] = normalizeProfileDataBucket(next.profileData[suffix], suffix === primarySuffix);
    });
    return next;
  }

  function primaryProfileStorageSuffixFromState(source) {
    var profileUserId = source && source.profile ? source.profile.userId : initialState.profile.userId;
    return platformDigits(normalizePlatformUserId(profileUserId, profileUserId)) || "primary";
  }

  function defaultProfileDataBucket(isPrimary) {
    return {
      wallet: isPrimary ? clone(initialState.wallet) : { balance: 0, movements: [] },
      subscription: isPrimary ? clone(initialState.subscription) : {
        current: "basic",
        plans: clone(initialState.subscription.plans)
      },
      requests: isPrimary ? clone(initialState.requests) : [],
      messages: isPrimary ? clone(initialState.messages) : [],
      alerts: isPrimary ? clone(initialState.alerts) : [],
      synchronizations: isPrimary ? clone(initialState.synchronizations) : []
    };
  }

  function normalizeSubscriptionBucket(subscription) {
    var nextSubscription = subscription && typeof subscription === "object" ? clone(subscription) : clone(initialState.subscription);
    if (!Array.isArray(nextSubscription.plans) || !nextSubscription.plans.length) {
      nextSubscription.plans = clone(initialState.subscription.plans);
    }
    if (!nextSubscription.current || !nextSubscription.plans.some(function (plan) { return plan.id === nextSubscription.current; })) {
      nextSubscription.current = initialState.subscription.current;
    }
    return nextSubscription;
  }

  function normalizeProfileDataBucket(bucket, isPrimary) {
    var defaults = defaultProfileDataBucket(isPrimary);
    var source = bucket && typeof bucket === "object" ? bucket : {};
    var wallet = source.wallet && typeof source.wallet === "object" ? clone(source.wallet) : clone(defaults.wallet);
    if (!Array.isArray(wallet.movements)) wallet.movements = clone(defaults.wallet.movements || []);
    if (typeof wallet.balance !== "number") wallet.balance = Number(wallet.balance) || defaults.wallet.balance || 0;
    var messages = Array.isArray(source.messages) ? clone(source.messages) : clone(defaults.messages);
    return {
      wallet: wallet,
      subscription: normalizeSubscriptionBucket(source.subscription || defaults.subscription),
      requests: Array.isArray(source.requests) ? clone(source.requests) : clone(defaults.requests),
      messages: messages.map(function (item) { return normalizeMessage(item); }),
      alerts: Array.isArray(source.alerts) ? clone(source.alerts) : clone(defaults.alerts),
      synchronizations: Array.isArray(source.synchronizations) ? clone(source.synchronizations) : clone(defaults.synchronizations)
    };
  }

  function profileDataBucketFromObject(source) {
    var bucket = {};
    PROFILE_SCOPED_KEYS.forEach(function (key) {
      bucket[key] = clone(source && source[key] !== undefined ? source[key] : initialState[key]);
    });
    return normalizeProfileDataBucket(bucket, false);
  }

  function isPrimaryProfileActive() {
    return !state.activeAlternateId;
  }

  function ensureProfileDataBucket(suffix) {
    var key = suffix || activeProfileStorageSuffix();
    if (!state.profileData || typeof state.profileData !== "object" || Array.isArray(state.profileData)) state.profileData = {};
    if (!state.profileData[key]) {
      state.profileData[key] = defaultProfileDataBucket(isPrimaryProfileActive());
    }
    state.profileData[key] = normalizeProfileDataBucket(state.profileData[key], isPrimaryProfileActive());
    return state.profileData[key];
  }

  function applyProfileDataBucket(bucket) {
    PROFILE_SCOPED_KEYS.forEach(function (key) {
      state[key] = clone(bucket[key]);
    });
  }

  function persistActiveProfileData() {
    var suffix = activeProfileStorageSuffix();
    var bucket = profileDataBucketFromObject(state);
    if (!state.profileData || typeof state.profileData !== "object" || Array.isArray(state.profileData)) state.profileData = {};
    state.profileData[suffix] = normalizeProfileDataBucket(bucket, isPrimaryProfileActive());
  }

  function activateProfileData() {
    var bucket = ensureProfileDataBucket(activeProfileStorageSuffix());
    applyProfileDataBucket(bucket);
  }

  function normalizeMessage(item) {
    if (!Array.isArray(item.thread) || !item.thread.length) {
      item.thread = [
        { id: item.id + "-in", from: "contact", sender: item.sender, text: item.preview, time: item.time }
      ];
      if (item.id === "MSG-001") {
        item.thread.push({ id: item.id + "-ack", from: "patient", sender: "Tú", text: "Gracias. He recibido la información.", time: "Ahora" });
      }
    }
    return item;
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved && saved.profile) {
        saved.profile.name = saved.profile.nameSource === initialState.profile.name
          ? (saved.profile.name || initialState.profile.name)
          : initialState.profile.name;
        saved.profile.userId = initialState.profile.userId;
        saved.profile.status = initialState.profile.status;
        saved.profile.doctor = initialState.profile.doctor;
        saved.profile.completedAt = initialState.profile.completedAt;
        return saved;
      }
    } catch (error) {}
    return clone(initialState);
  }

  activateProfileData();

  function messageTime() {
    try {
      return new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date());
    } catch (error) {
      return "Ahora";
    }
  }

  function renderMessageBubble(item, message) {
    var isUser = message.from === "patient";
    return '<div class="patient-profile-chat-bubble ' + (isUser ? "is-user" : "") + '"><small>' + escapeHtml(isUser ? "Tú" : (message.sender || item.sender)) + '</small><p>' + escapeHtml(message.text) + '</p><span>' + escapeHtml(message.time || "Ahora") + '</span></div>';
  }

  function focusConversation() {
    window.setTimeout(function () {
      var chat = $("[data-profile-chat-log]", modalBody);
      var input = $("[data-profile-message-input]", modalBody);
      if (chat) chat.scrollTop = chat.scrollHeight;
      if (input) input.focus();
    }, 30);
  }

  function saveState() {
    persistActiveProfileData();
    lastStateSaveError = "";
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      lastStateSaveError = error && error.message ? error.message : "No se pudo guardar la información local.";
      if (window.console && console.warn) console.warn("Dr Sam profile state could not be saved", error);
      updateUI();
      return false;
    }
    updateUI();
    return true;
  }

  function emit(action, payload) {
    window.dispatchEvent(new CustomEvent("drsam:patient-profile", {
      detail: { action: action, payload: payload || {}, state: clone(state) }
    }));
  }

  function paintAvatarElement(element, profile) {
    if (!element) return;
    if (profile.photo) {
      element.innerHTML = '<img src="' + escapeHtml(profile.photo) + '" alt="Foto de perfil de ' + escapeHtml(profile.name) + '">';
    } else {
      element.textContent = initials(profile.name);
    }
  }

  function setAvatar(element) {
    paintAvatarElement(element, getActiveProfile());
  }

  function setPhotoPreview(element, profile, photo) {
    if (!element) return;
    var nextPhoto = photo || (profile && profile.photo) || "";
    if (nextPhoto) {
      element.innerHTML = '<img src="' + escapeHtml(nextPhoto) + '" alt="Foto de perfil">';
      return;
    }
    element.textContent = initials(profile && profile.name);
  }

  function renderAccountAvatarMedia(account) {
    if (account && account.photo) {
      return '<img src="' + escapeHtml(account.photo) + '" alt="Foto de perfil de ' + escapeHtml(account.name) + '">';
    }
    return '<b>' + escapeHtml(account && account.initials ? account.initials : initials(account && account.name)) + '</b>';
  }

  function accountKindForRole(role) {
    if (role === "Mascota") return "pet";
    if (role === "Familiar" || role === "Adulto") return "family";
    return "child";
  }

  function accountRelationshipCode(role, kind) {
    if (kind === "primary" || role === "Administrador") return "administrator";
    if (kind === "pet" || role === "Mascota") return "pet";
    if (role === "Familiar" || role === "Adulto") return "family";
    return "child";
  }

  function accountToneForRole(role) {
    if (role === "Mascota") return "gold";
    if (role === "Niña") return "rose";
    if (role === "Niño") return "blue";
    return "teal";
  }

  function primaryAccountCard() {
    var profile = state.profile || initialState.profile;
    return {
      id: PRIMARY_ACCOUNT_CARD_ID,
      name: profile.name || initialState.profile.name || "Paciente",
      role: "Administrador",
      initials: initials(profile.name),
      kind: "primary",
      tone: "teal",
      userId: primaryProfileId(),
      photo: profile.photo || "",
      relationshipCode: "administrator",
      accessProfileId: primaryProfileId(),
      canLoginIndependently: true
    };
  }

  function readImageFile(file, callback) {
    if (!file || !file.type || !file.type.match(/^image\//)) {
      callback("");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      optimizeProfilePhoto(String(reader.result || ""), callback);
    };
    reader.onerror = function () {
      callback("");
    };
    reader.readAsDataURL(file);
  }

  function optimizeProfilePhoto(dataUrl, callback) {
    if (!dataUrl) {
      callback("");
      return;
    }
    if (!window.Image || !document.createElement("canvas").getContext) {
      callback(dataUrl);
      return;
    }
    var image = new Image();
    image.onload = function () {
      try {
        var naturalWidth = image.naturalWidth || image.width;
        var naturalHeight = image.naturalHeight || image.height;
        var sourceSize = Math.min(naturalWidth, naturalHeight);
        if (!sourceSize) {
          callback(dataUrl);
          return;
        }
        var targetSize = Math.min(PROFILE_PHOTO_MAX_SIZE, Math.max(160, sourceSize));
        var canvas = document.createElement("canvas");
        var context = canvas.getContext("2d");
        if (!context) {
          callback(dataUrl);
          return;
        }
        var sourceX = Math.max(0, Math.round((naturalWidth - sourceSize) / 2));
        var sourceY = Math.max(0, Math.round((naturalHeight - sourceSize) / 2));
        canvas.width = targetSize;
        canvas.height = targetSize;
        context.fillStyle = "#f8fffe";
        context.fillRect(0, 0, targetSize, targetSize);
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, targetSize, targetSize);
        callback(canvas.toDataURL("image/jpeg", PROFILE_PHOTO_QUALITY) || dataUrl);
      } catch (error) {
        callback(dataUrl);
      }
    };
    image.onerror = function () {
      callback(dataUrl);
    };
    image.src = dataUrl;
  }

  function getActiveAccount() {
    if (!state.activeAlternateId) return null;
    return (state.alternateAccounts || []).find(function (account) {
      return account.id === state.activeAlternateId;
    }) || null;
  }

  function primaryProfileId() {
    return normalizePlatformUserId(state.profile && state.profile.userId, state.profile && state.profile.userId) || initialState.profile.userId;
  }

  function getActiveProfile() {
    var account = getActiveAccount();
    if (!account) return state.profile || initialState.profile;
    var base = state.profile || initialState.profile;
    return Object.assign({}, base, {
      id: account.id,
      name: account.name || "Cuenta alterna",
      userId: normalizePlatformUserId(accountPlatformUserId(account), base.userId) || accountPlatformUserId(account) || primaryProfileId(),
      curp: account.curp || "No registrado",
      email: account.email || base.email || "",
      phone: account.phone || "No registrado",
      photo: account.photo || "",
      status: account.status || "Activo",
      doctor: account.doctor || base.doctor || "Sin asignar",
      completedAt: account.completedAt || "Pendiente",
      role: account.role || "Familiar",
      sex: account.sex || "",
      birthDate: account.birthDate || "",
      kind: account.kind || (account.role === "Mascota" ? "pet" : "child")
    });
  }

  function activeProfileId() {
    var profile = getActiveProfile();
    return normalizePlatformUserId(profile && profile.userId, state.profile && state.profile.userId) || primaryProfileId();
  }

  function activeProfileStorageSuffix() {
    return platformDigits(activeProfileId()) || "primary";
  }

  function updateActiveProfile(fields) {
    var account = getActiveAccount();
    if (account) {
      Object.keys(fields || {}).forEach(function (key) {
        account[key] = fields[key];
      });
      if (!account.initials || fields.name) account.initials = initials(account.name);
      return;
    }
    Object.assign(state.profile, fields || {});
  }

  function activeProfilePayload() {
    var account = getActiveAccount();
    return {
      profile: clone(getActiveProfile()),
      profileId: activeProfileId(),
      profileKind: account ? "alternate" : "primary",
      accountId: account ? account.id : "",
      storageSuffix: activeProfileStorageSuffix()
    };
  }

  function emitActiveProfileChanged() {
    emit("profile:active-changed", activeProfilePayload());
  }

  function switchActiveProfile(accountId, options) {
    var previousState = clone(state);
    persistActiveProfileData();
    var requestedId = String(accountId || PRIMARY_ACCOUNT_CARD_ID);
    var requestedPlatformId = normalizePlatformUserId(requestedId, state.profile && state.profile.userId);
    var primaryId = primaryProfileId();
    var selectedAccount = null;
    if (requestedId === PRIMARY_ACCOUNT_CARD_ID || (requestedPlatformId && requestedPlatformId === primaryId)) {
      state.activeAlternateId = "";
      selectedAccount = primaryAccountCard();
    } else {
      selectedAccount = (state.alternateAccounts || []).find(function (account) {
        var accountPlatformId = normalizePlatformUserId(accountPlatformUserId(account), state.profile && state.profile.userId);
        return account.id === requestedId || (requestedPlatformId && accountPlatformId === requestedPlatformId);
      }) || null;
      if (!selectedAccount) return false;
      state.activeAlternateId = selectedAccount.id;
    }
    activateProfileData();
    var payload = activeProfilePayload();
    paintActiveProfileHeader(payload.profile);
    if (!saveState()) {
      state = previousState;
      updateUI();
      return false;
    }
    updateUI();
    emit("account:selected", Object.assign({
      accountId: state.activeAlternateId || "",
      userId: payload.profile.userId,
      name: payload.profile.name,
      role: selectedAccount.role || (state.activeAlternateId ? "Perfil" : "Administrador")
    }, payload));
    emitActiveProfileChanged();
    if (options && options.scrollIntoView && accountsTrack) {
      window.setTimeout(function () {
        var scrollTargetId = selectedAccount.id || PRIMARY_ACCOUNT_CARD_ID;
        var card = $all("[data-profile-account-switch]").find(function (item) {
          return item.dataset.profileAccountSwitch === scrollTargetId;
        });
        if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }, 80);
    }
    return true;
  }

  function updateUI() {
    var profile = getActiveProfile();
    paintActiveProfileHeader(profile);
    renderAlternateAccounts();
    renderProfileSelector();
    setCount("requests", state.requests.filter(function (item) { return item.status === "pending"; }).length, "Sin solicitudes pendientes", "Solicitud pendiente");
    setCount("messages", state.messages.filter(function (item) { return item.unread; }).length, "Sin mensajes pendientes", "Médicos, seguros y unidades");
    setCount("alerts", state.alerts.filter(function (item) { return item.unread; }).length, "Sin alertas pendientes", "Recordatorios y avisos importantes");
    setCount("sync", state.synchronizations.length, "Sin enlaces activos", state.synchronizations.length + " enlaces activos");
  }

  function paintActiveProfileHeader(profile) {
    profile = profile || getActiveProfile();
    panel.dataset.activeProfileId = activeProfileId();
    panel.dataset.activeAccountId = state.activeAlternateId || "";
    panel.dataset.activeProfileName = profile.name || "";
    panel.dataset.activeProfileUserId = profile.userId || "";
    $all("[data-profile-panel-name]").forEach(function (element) { element.textContent = profile.name; });
    $all("[data-profile-panel-id]").forEach(function (element) { element.textContent = profile.userId; });
    $all("[data-profile-panel-avatar]").forEach(function (element) { paintAvatarElement(element, profile); });
  }

  function accountBadge(account) {
    return icon(account && account.kind === "pet" ? "paw" : "user");
  }

  function renderProfileSelector() {
    if (!profileSelector || typeof profileSelector.configure !== "function") return;
    profileSelector.configure({
      profiles: managedProfileCards().map(function (account) {
        return {
          id: account.id,
          name: account.name,
          type: account.kind === "primary" ? "Perfil principal" : account.role,
          accountName: state.profile.name,
          userId: account.userId,
          photo: account.photo || ""
        };
      }),
      activeId: activeAccountCardId(),
      onSwitch: function (profile) {
        if (!switchActiveProfile(profile.id)) {
          throw new Error(lastStateSaveError || "No se pudo cambiar de perfil.");
        }
      },
      onSave: function (profile) {
        var name = String(profile.name || "").trim();
        var account = profile.id === PRIMARY_ACCOUNT_CARD_ID ? state.profile : (state.alternateAccounts || []).find(function (item) {
          return item.id === profile.id;
        });
        if (!account || !name || name.length > 280) throw new Error("Revisa el nombre del perfil.");
        var previousState = clone(state);
        account.name = name;
        account.initials = initials(name);
        if (profile.id === PRIMARY_ACCOUNT_CARD_ID) account.nameSource = initialState.profile.name;
        if (!saveState()) {
          state = previousState;
          updateUI();
          throw new Error(lastStateSaveError || "No se pudo guardar el perfil.");
        }
        if (profile.id === activeAccountCardId()) {
          emit("profile:updated", activeProfilePayload());
          emitActiveProfileChanged();
        }
        return { name: name };
      }
    });
  }

  function renderAlternateAccounts() {
    if (!accountsTrack) return;
    var accounts = [primaryAccountCard()].concat(Array.isArray(state.alternateAccounts) ? state.alternateAccounts : []);
    accountsTrack.innerHTML = accounts.map(function (account) {
      var isPrimary = account.id === PRIMARY_ACCOUNT_CARD_ID;
      var isActive = isPrimary ? !state.activeAlternateId : state.activeAlternateId === account.id;
      return '<button class="patient-profile-account-card ' + (isActive ? "is-active" : "") + '" type="button" data-profile-account-switch="' + escapeHtml(account.id) + '" data-profile-account-user-id="' + escapeHtml(account.userId || "") + '" aria-label="' + escapeHtml(account.name + ", ID de plataforma " + (account.userId || "")) + '" aria-pressed="' + (isActive ? "true" : "false") + '">' +
        '<span class="patient-profile-account-avatar is-' + escapeHtml(account.tone || "teal") + '">' + renderAccountAvatarMedia(account) + '<i aria-hidden="true">' + accountBadge(account) + '</i></span>' +
        '<strong>' + escapeHtml(account.name) + '</strong>' +
      '</button>';
    }).join("") + '<button class="patient-profile-account-card is-add" type="button" data-profile-add-account><span class="patient-profile-account-avatar"><b>+</b></span><strong>Agregar</strong><small>cuenta</small></button>';
    syncAccountsDots();
  }

  function syncAccountsDots() {
    if (!accountsTrack || !accountsDots) return;
    var maxScroll = Math.max(1, accountsTrack.scrollWidth - accountsTrack.clientWidth);
    var page = accountsTrack.scrollLeft > maxScroll / 2 ? 1 : 0;
    accountsDots.innerHTML = '<span class="' + (page === 0 ? "is-active" : "") + '"></span><span class="' + (page === 1 ? "is-active" : "") + '"></span>';
  }

  function clampAccountsScroll(value) {
    if (!accountsTrack) return 0;
    var maxScroll = Math.max(0, accountsTrack.scrollWidth - accountsTrack.clientWidth);
    return Math.max(0, Math.min(maxScroll, value));
  }

  function finishAccountsPanTo(left) {
    if (!accountsTrack) return;
    window.clearTimeout(accountsPanTimer);
    accountsTrack.classList.remove("is-panning");
    accountsTrack.classList.add("is-pan-settling");
    accountsTrack.scrollTo({ left: clampAccountsScroll(left), behavior: "smooth" });
    accountsPanTimer = window.setTimeout(function () {
      accountsTrack.classList.remove("is-pan-settling");
      syncAccountsDots();
    }, 340);
  }

  function panAccountsBy(direction) {
    if (!accountsTrack) return;
    var distance = Math.max(120, accountsTrack.clientWidth * .72);
    finishAccountsPanTo(accountsTrack.scrollLeft + (Number(direction) || 0) * distance);
  }

  function endAccountsPan(event) {
    if (!accountsTrack || !accountsPanState.active) return;
    if (event && accountsPanState.pointerId !== event.pointerId) return;
    var releaseDx = event ? event.clientX - accountsPanState.startX : 0;
    var releaseDy = event ? event.clientY - accountsPanState.startY : 0;
    var shouldSelectTap = accountsPanState.tapSwitchId &&
      Math.abs(releaseDx) <= ACCOUNTS_TAP_SELECT_PX &&
      Math.abs(releaseDy) <= ACCOUNTS_TAP_SELECT_PX;
    accountsPanState.active = false;
    if (event && accountsTrack.releasePointerCapture) {
      try {
        accountsTrack.releasePointerCapture(event.pointerId);
      } catch (error) {}
    }
    if (shouldSelectTap) {
      accountsPanClickLockUntil = Date.now() + 220;
      accountsTrack.classList.remove("is-panning", "is-pan-settling");
      syncAccountsDots();
      switchActiveProfile(accountsPanState.tapSwitchId, { scrollIntoView: true });
      accountsPanState.tapSwitchId = "";
      return;
    }
    accountsPanState.tapSwitchId = "";
    if (accountsPanState.moved) {
      accountsPanClickLockUntil = Date.now() + 220;
      finishAccountsPanTo(accountsTrack.scrollLeft + accountsPanState.velocity * -180);
    } else {
      accountsTrack.classList.remove("is-panning", "is-pan-settling");
      syncAccountsDots();
    }
  }

  function setupAccountsPan() {
    if (!accountsTrack || accountsTrack.dataset.panReady) return;
    accountsTrack.dataset.panReady = "true";
    accountsTrack.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      accountsPanState.active = true;
      accountsPanState.pointerId = event.pointerId;
      accountsPanState.startX = event.clientX;
      accountsPanState.startY = event.clientY;
      accountsPanState.startScrollLeft = accountsTrack.scrollLeft;
      accountsPanState.lastX = event.clientX;
      accountsPanState.lastTime = window.performance ? performance.now() : Date.now();
      accountsPanState.velocity = 0;
      accountsPanState.moved = false;
      var accountSwitch = event.target && event.target.closest ? event.target.closest("[data-profile-account-switch]") : null;
      accountsPanState.tapSwitchId = accountSwitch ? accountSwitch.dataset.profileAccountSwitch : "";
      window.clearTimeout(accountsPanTimer);
      accountsTrack.classList.remove("is-pan-settling");
      accountsTrack.classList.add("is-panning");
      if (accountsTrack.setPointerCapture) accountsTrack.setPointerCapture(event.pointerId);
    });
    accountsTrack.addEventListener("pointermove", function (event) {
      if (!accountsPanState.active || accountsPanState.pointerId !== event.pointerId) return;
      var dx = event.clientX - accountsPanState.startX;
      var dy = event.clientY - accountsPanState.startY;
      var now = window.performance ? performance.now() : Date.now();
      var elapsed = Math.max(16, now - accountsPanState.lastTime);
      accountsPanState.velocity = (event.clientX - accountsPanState.lastX) / elapsed;
      accountsPanState.lastX = event.clientX;
      accountsPanState.lastTime = now;
      if (!accountsPanState.moved && Math.abs(dx) > ACCOUNTS_PAN_START_PX && Math.abs(dx) > Math.abs(dy) * 1.15) {
        accountsPanState.moved = true;
      }
      if (!accountsPanState.moved) return;
      event.preventDefault();
      accountsTrack.scrollLeft = clampAccountsScroll(accountsPanState.startScrollLeft - dx);
      syncAccountsDots();
    });
    accountsTrack.addEventListener("pointerup", endAccountsPan);
    accountsTrack.addEventListener("pointercancel", endAccountsPan);
    accountsTrack.addEventListener("pointerleave", endAccountsPan);
  }

  function renderAddAccount() {
    openModal("Agregar cuenta", "CUENTAS ALTERNAS", '<form class="patient-profile-stack" data-profile-alternate-form>' +
      '<section class="patient-profile-add-photo">' +
        '<button class="patient-profile-add-photo-preview" type="button" data-profile-alternate-photo-pick aria-label="Seleccionar foto de perfil"><span data-profile-alternate-photo-preview>' + icon("camera") + '</span><i aria-hidden="true">' + icon("plus") + '</i></button>' +
        '<div><strong>Foto de perfil</strong><small>Agrega una imagen para identificar esta cuenta.</small><button class="patient-profile-button is-ghost" type="button" data-profile-alternate-photo-pick>Seleccionar foto</button></div>' +
        '<input type="file" name="photo" accept="image/*" data-profile-alternate-photo-input hidden>' +
      '</section>' +
      '<div class="patient-profile-field-grid">' +
        '<label class="patient-profile-field"><span>Nombre</span><input name="name" placeholder="Ej. Mateo Salinas" required></label>' +
        '<label class="patient-profile-field"><span>Tipo de cuenta</span><select name="role" required><option value="Niño">Niño</option><option value="Niña">Niña</option><option value="Mascota">Mascota</option><option value="Familiar">Familiar</option></select></label>' +
        '<label class="patient-profile-field"><span>Sexo</span><select name="sex" required><option value="">Selecciona</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="No especificado">No especificado</option></select></label>' +
        '<label class="patient-profile-field"><span>Fecha de nacimiento</span><input type="date" name="birthDate" required></label>' +
      '</div>' +
      '<button class="patient-profile-button is-primary" type="submit">' + icon("check") + ' Guardar perfil</button>' +
    '</form>');
  }

  function renderAddAccountSuccess(account) {
    openModal("Perfil guardado", "CUENTAS ALTERNAS", '<section class="patient-profile-account-success">' +
      '<button class="patient-profile-success-close" type="button" data-profile-close-modal aria-label="Cerrar">' + icon("close") + '</button>' +
      '<span class="patient-profile-success-dot is-one" aria-hidden="true"></span><span class="patient-profile-success-dot is-two" aria-hidden="true"></span><span class="patient-profile-success-dot is-three" aria-hidden="true"></span><span class="patient-profile-success-heart is-one" aria-hidden="true"></span><span class="patient-profile-success-heart is-two" aria-hidden="true"></span>' +
      '<span class="patient-profile-success-avatar is-' + escapeHtml(account.tone || "teal") + '">' + renderAccountAvatarMedia(account) + '<i aria-hidden="true">' + icon("check") + '</i></span>' +
      '<h3>&iexcl;Perfil guardado<br><span>con &eacute;xito!</span></h3>' +
      '<p>' + escapeHtml(account.name) + ' ya forma parte de tus cuentas alternas.</p>' +
      '<article class="patient-profile-success-card">' +
        '<span class="patient-profile-success-card-avatar is-' + escapeHtml(account.tone || "teal") + '">' + renderAccountAvatarMedia(account) + '</span>' +
        '<span><strong>' + escapeHtml(account.name) + '</strong><small>' + escapeHtml(account.role) + ' &middot; ID ' + escapeHtml(account.userId || "") + '</small></span>' +
        '<b aria-hidden="true">' + accountBadge(account) + '</b>' +
      '</article>' +
      '<button class="patient-profile-button is-primary" type="button" data-profile-close-modal>Listo</button>' +
    '</section>', false, "account-success");
  }

  function setCount(name, count, emptyText, activeText) {
    var badge = $('[data-profile-count="' + name + '"]');
    var label = $('[data-profile-count-label="' + name + '"]');
    if (badge) {
      badge.textContent = count;
      badge.hidden = count === 0;
    }
    if (label) label.textContent = count ? activeText : emptyText;
  }

  function openPanel() {
    panel.hidden = false;
    shade.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("patient-profile-open");
    updateUI();
  }

  function closePanel() {
    panel.hidden = true;
    shade.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("patient-profile-open");
  }

  function openModal(title, eyebrow, html, wide, variant) {
    modalTitle.textContent = title;
    modalEyebrow.textContent = eyebrow || "PERFIL DEL PACIENTE";
    modalBody.innerHTML = html;
    modalDialog.classList.toggle("is-wide", !!wide);
    modalDialog.classList.toggle("is-wallet", variant === "wallet");
    modalDialog.classList.toggle("is-subscription", variant === "subscription");
    modalDialog.classList.toggle("is-account-success", variant === "account-success");
    modalDialog.classList.toggle("is-profile-flow", variant === "profile-flow" || variant === "profile-success");
    modalDialog.classList.toggle("is-profile-success", variant === "profile-success");
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("patient-profile-modal-open");
    modalBody.querySelectorAll("[data-profile-panel-avatar]").forEach(setAvatar);
    var firstControl = modal.querySelector("button, input, textarea, select");
    if (firstControl) window.setTimeout(function () { firstControl.focus(); }, 30);
  }

  function closeModal() {
    pendingProfilePhoto = "";
    profilePhotoSaveError = "";
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modalBody.innerHTML = "";
    modalDialog.classList.remove("is-wide", "is-wallet", "is-subscription", "is-account-success", "is-profile-flow", "is-profile-success");
    document.body.classList.remove("patient-profile-modal-open");
  }

  function emptyState(iconName, title, description) {
    return '<div class="patient-profile-empty">' + icon(iconName) + '<h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(description) + '</p></div>';
  }

  function getSubscriptionPlans() {
    return state.subscription && Array.isArray(state.subscription.plans) ? state.subscription.plans : initialState.subscription.plans;
  }

  function getSubscriptionPlan(planId) {
    var plans = getSubscriptionPlans();
    return plans.find(function (plan) { return plan.id === planId; }) || null;
  }

  function getCurrentSubscriptionPlan() {
    return getSubscriptionPlan(state.subscription.current) || getSubscriptionPlans()[0];
  }

  function subscriptionPlanIcon(plan) {
    if (!plan) return "card";
    if (plan.id === "premium") return "diamond";
    if (plan.id === "family") return "users";
    if (plan.id === "smart") return "check";
    return "card";
  }

  function subscriptionPrice(plan) {
    var price = Number(plan && plan.price) || 0;
    return price > 0 ? money(price) : "Gratis";
  }

  function subscriptionBenefits(plan) {
    var benefits = {
      basic: ["Historial reciente", "Datos principales", "Acceso inicial"],
      complete: ["Historial completo", "Documentos clinicos", "Consulta organizada"],
      smart: ["Seguimiento con IA", "Recordatorios", "Organizacion de salud"],
      family: ["Hasta 5 usuarios", "Gestion familiar", "Permisos por familiar"],
      premium: ["Historial completo", "Seguimiento avanzado", "Experiencia medica premium", "Mas herramientas de bienestar"]
    };
    return benefits[plan && plan.id] || ["Acceso al plan", "Soporte de la plataforma", "Beneficios activos"];
  }

  function renderSubscriptionBenefitList(plan) {
    return '<ul class="patient-subscription-benefits">' + subscriptionBenefits(plan).map(function (benefit) {
      return '<li><span>' + icon("check") + '</span>' + escapeHtml(benefit) + '</li>';
    }).join("") + '</ul>';
  }

  function renderSubscriptionUpgrade(selectedPlanId) {
    var plans = getSubscriptionPlans();
    var currentPlan = getCurrentSubscriptionPlan();
    var selectablePlans = plans.filter(function (plan) { return plan.id !== currentPlan.id; });
    var selectedPlan = getSubscriptionPlan(selectedPlanId);
    if (!selectedPlan || selectedPlan.id === currentPlan.id) {
      selectedPlan = selectablePlans.find(function (plan) { return plan.id === "premium"; }) || selectablePlans[0] || currentPlan;
    }
    var planCards = selectablePlans.map(function (plan) {
      var isSelected = plan.id === selectedPlan.id;
      var isRecommended = plan.id === "premium";
      return '<button type="button" class="patient-subscription-plan-card ' + (isSelected ? "is-selected" : "") + '" data-profile-upgrade-select="' + escapeHtml(plan.id) + '">' +
        '<span class="patient-subscription-plan-icon">' + icon(subscriptionPlanIcon(plan)) + '</span>' +
        '<span class="patient-subscription-radio" aria-hidden="true"></span>' +
        (isRecommended ? '<b class="patient-subscription-recommended">' + icon("check") + ' Recomendado</b>' : '') +
        '<strong>' + escapeHtml(plan.name) + '</strong>' +
        '<em>' + subscriptionPrice(plan) + ' / mes</em>' +
        '<small>' + escapeHtml(plan.period || "") + '</small>' +
        renderSubscriptionBenefitList(plan) +
      '</button>';
    }).join("");
    openModal("Mejorar suscripci&oacute;n", "SUSCRIPCIONES", '<div class="patient-subscription-flow">' +
      '<button type="button" class="patient-subscription-back" data-profile-subscription-back="wallet" aria-label="Volver a billetera">' + icon("back") + '</button>' +
      '<header class="patient-subscription-title"><h2>Mejorar suscripci&oacute;n</h2><p>Cambia tu plan para obtener m&aacute;s beneficios</p></header>' +
      '<section class="patient-subscription-current"><span>' + icon(subscriptionPlanIcon(currentPlan)) + '</span><div><small>PLAN ACTUAL</small><strong>' + escapeHtml(currentPlan.name) + '</strong><em>' + subscriptionPrice(currentPlan) + ' / mes</em></div><b>' + icon("check") + ' Activo</b></section>' +
      '<h3 class="patient-subscription-section-title">Elige tu nuevo plan</h3>' +
      '<div class="patient-subscription-options">' + planCards + '</div>' +
      '<section class="patient-subscription-summary"><div><span>' + icon(subscriptionPlanIcon(selectedPlan)) + '</span><div><small>NUEVO PLAN</small><strong>' + escapeHtml(selectedPlan.name) + '</strong><em>' + subscriptionPrice(selectedPlan) + ' / mes</em></div></div><button type="button" class="patient-profile-button is-primary" data-profile-subscription-payment="' + escapeHtml(selectedPlan.id) + '">Continuar al pago ' + icon("arrow") + '</button><button type="button" class="patient-subscription-link">Ver comparaci&oacute;n de planes</button></section>' +
    '</div>', false, "subscription");
  }

  function renderSubscriptionPayment(planId) {
    var plan = getSubscriptionPlan(planId);
    var currentPlan = getCurrentSubscriptionPlan();
    if (!plan) return renderFinance();
    openModal("Pago", "SUSCRIPCIONES", '<form class="patient-subscription-flow patient-subscription-payment" data-profile-subscription-payment-form data-plan-id="' + escapeHtml(plan.id) + '">' +
      '<button type="button" class="patient-subscription-back" data-profile-subscription-back="upgrade" data-plan-id="' + escapeHtml(plan.id) + '" aria-label="Volver a planes">' + icon("back") + '</button>' +
      '<header class="patient-subscription-title"><h2>Pago</h2><p>Confirma tu m&eacute;todo de pago</p></header>' +
      '<section class="patient-subscription-current is-payment"><span>' + icon(subscriptionPlanIcon(plan)) + '</span><div><strong>' + escapeHtml(plan.name) + '</strong><em>' + subscriptionPrice(plan) + ' / mes</em><b>' + icon("up") + ' Upgrade desde ' + escapeHtml(currentPlan.name) + '</b></div></section>' +
      '<h3 class="patient-subscription-section-title">M&eacute;todo de pago</h3>' +
      '<section class="patient-subscription-pay-method"><span>' + icon("card") + '</span><div><strong>Tarjeta de cr&eacute;dito o d&eacute;bito</strong><small>Visa, Mastercard, American Express</small></div><b aria-hidden="true"></b></section>' +
      '<section class="patient-subscription-card-form">' +
        '<label>Nombre del titular<input name="holder" autocomplete="cc-name" placeholder="Nombre completo como aparece en la tarjeta" required></label>' +
        '<label>N&uacute;mero de tarjeta<input name="card" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" required></label>' +
        '<label>MM/AA<input name="expiry" autocomplete="cc-exp" placeholder="MM/AA" required></label>' +
        '<label>CVV<input name="cvv" inputmode="numeric" autocomplete="cc-csc" placeholder="123" required></label>' +
        '<label class="patient-subscription-save-card"><input type="checkbox" checked> Guardar tarjeta para pr&oacute;ximos pagos</label>' +
      '</section>' +
      '<section class="patient-subscription-total"><div><span>Subtotal</span><strong>' + subscriptionPrice(plan) + '</strong></div><div><span>IVA incluido</span></div><hr><div><b>Total de hoy</b><strong>' + subscriptionPrice(plan) + '</strong></div></section>' +
      '<button type="submit" class="patient-profile-button is-primary patient-subscription-pay-button">Pagar y mejorar plan ' + icon("arrow") + '</button>' +
      '<p class="patient-subscription-secure">' + icon("lock") + ' Pago seguro</p>' +
    '</form>', false, "subscription");
  }

  function renderSubscriptionSuccess(planId) {
    var plan = getSubscriptionPlan(planId) || getCurrentSubscriptionPlan();
    openModal("Upgrade confirmado", "SUSCRIPCIONES", '<div class="patient-subscription-flow patient-subscription-success">' +
      '<button type="button" class="patient-subscription-back" data-profile-subscription-home aria-label="Volver a billetera">' + icon("back") + '</button>' +
      '<header class="patient-subscription-title"><span class="patient-subscription-success-mark">' + icon("check") + '</span><h2>&iexcl;Upgrade confirmado!</h2><p>Tu suscripci&oacute;n fue actualizada correctamente.</p></header>' +
      '<section class="patient-subscription-current"><span>' + icon(subscriptionPlanIcon(plan)) + '</span><div><small>NUEVO PLAN ACTIVO</small><strong>' + escapeHtml(plan.name) + '</strong><em>' + subscriptionPrice(plan) + ' / mes</em></div><b>' + icon("check") + ' Activo</b></section>' +
      '<div class="patient-subscription-confirm-list"><p><span>' + icon("card") + '</span>Pago procesado con &eacute;xito</p><p><span>' + icon("calendar") + '</span>Facturaci&oacute;n mensual activada</p><p><span>' + icon("diamond") + '</span>Beneficios premium disponibles ahora</p></div>' +
      '<p class="patient-subscription-activation">' + icon("calendar") + ' Fecha de activaci&oacute;n: <strong>Hoy</strong></p>' +
      '<button type="button" class="patient-profile-button is-primary patient-subscription-pay-button" data-profile-subscription-home>Ir a mi suscripci&oacute;n</button>' +
      '<button type="button" class="patient-profile-button patient-subscription-outline" data-profile-close-modal>Volver al inicio</button>' +
    '</div>', false, "subscription");
  }

  function renderFinance() {
    var totalCredits = state.wallet.movements.reduce(function (sum, item) { return sum + Math.max(0, Number(item.amount) || 0); }, 0);
    var totalDebits = state.wallet.movements.reduce(function (sum, item) { return sum + Math.abs(Math.min(0, Number(item.amount) || 0)); }, 0);
    var plans = getSubscriptionPlans();
    var currentPlan = getCurrentSubscriptionPlan();
    var subscriptionCards = plans.map(function (plan) {
      var isCurrent = plan.id === currentPlan.id;
      var price = Number(plan.price) || 0;
      return '<article class="patient-wallet-plan ' + (isCurrent ? "is-current" : "") + '">' +
        '<div class="patient-wallet-plan-head"><span>' + icon(isCurrent ? "check" : "card") + '</span><div><small>' + escapeHtml(plan.label || "Plan") + '</small><h4>' + escapeHtml(plan.name) + '</h4></div></div>' +
        '<strong>' + (price > 0 ? money(price) : "Gratis") + '</strong><em>' + escapeHtml(plan.period || "") + '</em><p>' + escapeHtml(plan.description || "") + '</p>' +
        '<button type="button" class="patient-profile-button ' + (isCurrent ? "is-ghost" : "is-primary") + '" data-profile-plan="' + escapeHtml(plan.id) + '"' + (isCurrent ? " disabled" : "") + '>' + (isCurrent ? "Plan activo" : "Elegir plan") + '</button>' +
      '</article>';
    }).join("");
    var movements = state.wallet.movements.map(function (item) {
      var amount = Number(item.amount) || 0;
      var isCredit = amount >= 0;
      return '<article class="patient-wallet-movement ' + (isCredit ? "is-credit" : "is-debit") + '">' +
        '<span class="patient-wallet-movement-icon">' + icon(isCredit ? "wallet" : "cart") + '</span>' +
        '<div class="patient-wallet-movement-copy"><strong>' + escapeHtml(item.concept) + '</strong><small>' + escapeHtml(item.date) + ' · ' + escapeHtml(item.id) + '</small></div>' +
        '<span class="patient-wallet-status ' + (isCredit ? "is-ok" : "is-debit") + '">' + (isCredit ? "Completado" : "Débito") + '</span>' +
        '<strong class="patient-wallet-amount ' + (isCredit ? "is-credit" : "is-debit") + '">' + (isCredit ? "+ " : "- ") + money(Math.abs(amount)) + '</strong>' +
        '<span class="patient-wallet-arrow">' + icon("chevron") + '</span>' +
      '</article>';
    }).join("");
    openModal("Billetera", "PAGOS Y RECARGAS", '<div class="patient-wallet-redesign">' +
      '<section class="patient-wallet-hero"><span class="patient-wallet-hero-icon">' + icon("wallet") + '</span><div><small>Saldo disponible</small><strong>' + money(state.wallet.balance) + '</strong><p>Administra tus pagos y recargas desde un solo lugar.</p></div><span class="patient-wallet-orb is-card">' + icon("card") + '</span><span class="patient-wallet-orb is-money">' + icon("dollar") + '</span></section>' +
      '<section class="patient-wallet-recharge"><div class="patient-wallet-recharge-main"><small>BILLETERA</small><h3>Recargar saldo</h3><form class="patient-wallet-recharge-form" data-profile-recharge-form><label><span>Monto a recargar</span><div class="patient-wallet-amount-field"><b>$</b><input name="amount" type="number" min="10" step="10" value="200" required></div></label><button class="patient-profile-button is-primary" type="submit">' + icon("card") + ' Recargar</button></form></div><aside class="patient-wallet-help"><span>' + icon("info") + '</span><div><h4>¿Cómo funciona?</h4><p>Ingresa el monto y recárgalo con tu método de pago preferido.</p></div></aside></section>' +
      '<section class="patient-wallet-subscriptions"><div class="patient-wallet-section-head"><div><span class="patient-wallet-section-icon">' + icon("check") + '</span><h3>Suscripciones</h3></div><span class="patient-wallet-current-plan">Plan actual: ' + escapeHtml(currentPlan.name) + '</span></div><div class="patient-wallet-plan-grid">' + subscriptionCards + '</div></section>' +
      '<section class="patient-wallet-movements"><div class="patient-wallet-section-head"><div><span class="patient-wallet-section-icon">' + icon("list") + '</span><h3>Movimientos recientes</h3></div><button type="button" class="patient-wallet-filter">' + icon("calendar") + ' Filtrar por fecha ' + icon("chevron") + '</button></div><div class="patient-wallet-movement-list">' + movements + '</div><div class="patient-wallet-summary"><div><span class="patient-wallet-summary-icon is-credit">' + icon("up") + '</span><small>Total recargas</small><strong>' + money(totalCredits) + '</strong></div><div><span class="patient-wallet-summary-icon is-debit">' + icon("down") + '</span><small>Total consumos</small><strong>' + money(totalDebits) + '</strong></div><div><span class="patient-wallet-summary-icon is-count">' + icon("dollar") + '</span><small>Movimientos</small><strong>' + state.wallet.movements.length + '</strong></div></div></section>' +
    '</div>', true, "wallet");
  }

  function renderRequests() {
    var pending = state.requests.filter(function (item) { return item.status === "pending"; });
    var history = state.requests.filter(function (item) { return item.status !== "pending"; });
    var pendingHtml = pending.length ? pending.map(function (item) {
      return '<article class="patient-profile-request-card"><div class="patient-profile-row-icon">' + icon("request") + '</div><div><small>' + escapeHtml(item.type) + ' · ' + escapeHtml(item.date) + '</small><h3>' + escapeHtml(item.source) + '</h3><p>' + escapeHtml(item.detail) + '</p><div class="patient-profile-actions"><button class="patient-profile-button is-primary" data-profile-request-action="accept" data-id="' + item.id + '">Aceptar</button><button class="patient-profile-button is-danger" data-profile-request-action="reject" data-id="' + item.id + '">Rechazar</button></div></div></article>';
    }).join("") : emptyState("request", "Sin solicitudes pendientes", "Las nuevas solicitudes aparecerán aquí.");
    var historyHtml = history.map(function (item) {
      return '<li class="patient-profile-list-item"><span><strong>' + escapeHtml(item.source) + '</strong><small>' + escapeHtml(item.type) + ' · ' + escapeHtml(item.date) + '</small></span><span class="patient-profile-status is-ok">Autorizada</span></li>';
    }).join("");
    openModal("Solicitudes", "SOPORTE MÉDICO", '<div class="patient-profile-stack"><section class="patient-profile-section-block"><div class="patient-profile-section-heading"><div><small>PENDIENTES</small><h3>Solicitudes de vinculación</h3></div><span class="patient-profile-badge">' + pending.length + '</span></div><div class="patient-profile-stack">' + pendingHtml + '</div></section>' + (history.length ? '<section class="patient-profile-section-block"><div class="patient-profile-section-heading"><h3>Actividad reciente</h3></div><ul class="patient-profile-list">' + historyHtml + '</ul></section>' : '') + '</div>');
  }

  function renderMessages() {
    var rows = state.messages.map(function (item) {
      return '<button class="patient-profile-message-row ' + (item.unread ? "is-unread" : "") + '" data-profile-message-id="' + item.id + '"><span class="patient-profile-message-avatar">' + initials(item.sender) + '</span><span><small>' + escapeHtml(item.role) + ' · ' + escapeHtml(item.time) + '</small><strong>' + escapeHtml(item.sender) + '</strong><p>' + escapeHtml(item.preview) + '</p></span><span class="patient-profile-message-dot" aria-hidden="true"></span></button>';
    }).join("");
    openModal("Mensajes", "SOPORTE MÉDICO", '<section class="patient-profile-section-block"><div class="patient-profile-section-heading"><div><small>BANDEJA</small><h3>Médicos, seguros y unidades</h3></div></div><div class="patient-profile-stack">' + rows + '</div></section>');
  }

  function renderConversation(messageId) {
    var item = state.messages.find(function (entry) { return entry.id === messageId; });
    if (!item) return;
    item = normalizeMessage(item);
    item.unread = false;
    var thread = item.thread.map(function (message) {
      return renderMessageBubble(item, message);
    }).join("");
    saveState();
    openModal(item.sender, item.role.toUpperCase(), '<div class="patient-profile-chat" data-profile-chat-log>' + thread + '</div><form class="patient-profile-composer" data-profile-message-form data-message-id="' + escapeHtml(item.id) + '" data-recipient="' + escapeHtml(item.sender) + '"><input name="message" placeholder="Escribe un mensaje" maxlength="700" autocomplete="off" data-profile-message-input required><button class="patient-profile-button is-primary" type="submit" aria-label="Enviar">' + icon("arrow") + '</button></form>');
    focusConversation();
  }

  function renderAlerts() {
    var rows = state.alerts.length ? state.alerts.map(function (item) {
      return '<article class="patient-profile-alert-row ' + (item.unread ? "is-unread" : "") + '"><div class="patient-profile-row-icon">' + icon("bell") + '</div><div><small>' + escapeHtml(item.time) + '</small><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.detail) + '</p></div>' + (item.unread ? '<button class="patient-profile-button is-ghost" data-profile-alert-read="' + item.id + '">Marcar leída</button>' : '<span class="patient-profile-status">Leída</span>') + '</article>';
    }).join("") : emptyState("bell", "Sin alertas", "Las alertas de tu cuenta aparecerán aquí.");
    openModal("Alertas", "SOPORTE MÉDICO", '<section class="patient-profile-section-block"><div class="patient-profile-section-heading"><div><small>CENTRO DE ALERTAS</small><h3>Actividad de tu cuenta</h3></div><button class="patient-profile-button is-ghost" data-profile-read-all>Marcar todas</button></div><div class="patient-profile-stack">' + rows + '</div></section>');
  }

  function renderSynchronizations() {
    var rows = state.synchronizations.length ? state.synchronizations.map(function (item) {
      return '<article class="patient-profile-sync-card"><div class="patient-profile-row-icon">' + icon("sync") + '</div><div><small>' + escapeHtml(item.type) + '</small><h3>' + escapeHtml(item.name) + '</h3><p>Inicio: ' + escapeHtml(item.since) + ' · Vigencia: ' + escapeHtml(item.validity) + '</p></div><button class="patient-profile-button is-danger" data-profile-remove-sync="' + item.id + '">' + icon("trash") + ' Eliminar</button></article>';
    }).join("") : emptyState("sync", "Sin sincronizaciones activas", "Los enlaces con médicos, unidades y aseguradoras aparecerán aquí.");
    openModal("Sincronización", "SOPORTE MÉDICO", '<section class="patient-profile-section-block"><div class="patient-profile-section-heading"><div><small>ENLACES ACTIVOS</small><h3>Control de datos compartidos</h3></div><span class="patient-profile-badge">' + state.synchronizations.length + '</span></div><div class="patient-profile-stack">' + rows + '</div></section>');
  }

  function activeAccountCardId() {
    return state.activeAlternateId || PRIMARY_ACCOUNT_CARD_ID;
  }

  function managedProfileCards() {
    return [primaryAccountCard()].concat((state.alternateAccounts || []).map(function (account) {
      return Object.assign({}, account, {
        userId: normalizePlatformUserId(accountPlatformUserId(account), state.profile && state.profile.userId) || accountPlatformUserId(account),
        initials: account.initials || initials(account.name),
        role: account.role || "Familiar",
        kind: account.kind || accountKindForRole(account.role),
        tone: account.tone || accountToneForRole(account.role),
        relationshipCode: account.relationshipCode || accountRelationshipCode(account.role, account.kind),
        managedByProfileId: normalizePlatformUserId(account.managedByProfileId || primaryProfileId(), state.profile && state.profile.userId) || primaryProfileId(),
        accessProfileId: normalizePlatformUserId(account.accessProfileId || account.managedByProfileId || primaryProfileId(), state.profile && state.profile.userId) || primaryProfileId(),
        canLoginIndependently: Boolean(account.canLoginIndependently)
      });
    }));
  }

  function activeManagedProfileCard() {
    var activeId = activeAccountCardId();
    return managedProfileCards().find(function (account) {
      return account.id === activeId;
    }) || primaryAccountCard();
  }

  function profileTypeLabel(profile, account) {
    var role = (profile && profile.role) || (account && account.role) || "";
    if (account && account.kind === "primary") return "Administrador";
    if (role === "Administrador") return "Administrador";
    return role || "Adulto";
  }

  function parseBirthDate(value) {
    var raw = String(value || "").trim();
    var match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return null;
  }

  function ageFromBirthDate(value) {
    var date = parseBirthDate(value);
    if (!date || Number.isNaN(date.getTime())) return "";
    var today = new Date();
    var age = today.getFullYear() - date.getFullYear();
    var hasHadBirthday = today.getMonth() > date.getMonth() || (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
    if (!hasHadBirthday) age -= 1;
    return age >= 0 ? String(age) + " años" : "";
  }

  function profileAgeLabel(profile, account) {
    var explicitAge = (profile && profile.age) || (account && account.age) || "";
    if (explicitAge) return String(explicitAge).match(/años?$/) ? String(explicitAge) : String(explicitAge) + " años";
    return ageFromBirthDate((profile && profile.birthDate) || (account && account.birthDate));
  }

  function profileMetaLabel(profile, account) {
    var type = profileTypeLabel(profile, account);
    var age = profileAgeLabel(profile, account);
    return escapeHtml(type) + (age ? " &bull; " + escapeHtml(age) : "");
  }

  function displayDate(value) {
    var raw = String(value || "").trim();
    var match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return match[3] + "/" + match[2] + "/" + match[1];
    return raw || "No registrada";
  }

  function dateInputValue(value) {
    var raw = String(value || "").trim();
    var match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return raw;
    match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return match[3] + "-" + match[2] + "-" + match[1];
    return "";
  }

  function profileGenderLabel(profile, account) {
    var type = profileTypeLabel(profile, account);
    return type === "Mascota" ? "Género (animal)" : "Sexo";
  }

  function profileAvatarToneClass(account) {
    return " is-" + escapeHtml((account && account.tone) || accountToneForRole(account && account.role));
  }

  function profileIconForAccount(account) {
    return account && account.kind === "pet" ? icon("paw") : icon("user");
  }

  function profileDirectoryCard(account) {
    var active = account.id === activeAccountCardId();
    var adminBadge = account.relationshipCode === "administrator" || account.kind === "primary" || account.role === "Administrador"
      ? '<em class="patient-profile-directory-role">Administrador</em>'
      : '';
    return '<button type="button" class="patient-profile-directory-card ' + (active ? "is-active" : "") + '" data-profile-detail-account="' + escapeHtml(account.id) + '">' +
      '<span class="patient-profile-directory-avatar' + profileAvatarToneClass(account) + '">' + renderAccountAvatarMedia(account) + '<i>' + profileIconForAccount(account) + '</i></span>' +
      '<span class="patient-profile-directory-copy"><strong>' + escapeHtml(account.name) + '</strong><small>ID: <b>' + escapeHtml(account.userId) + '</b></small>' + adminBadge + '</span>' +
      '<span class="patient-profile-directory-arrow">' + icon("chevron") + '</span>' +
    '</button>';
  }

  function renderProfileInfo() {
    var admin = primaryAccountCard();
    var cards = managedProfileCards().map(profileDirectoryCard).join("");
    openModal("", "", '<section class="patient-profile-flow patient-profile-directory-flow" data-profile-flow>' +
      '<header class="patient-profile-flow-admin">' +
        '<button class="patient-profile-flow-back" type="button" data-profile-close-modal aria-label="Volver">' + icon("back") + '</button>' +
        '<div class="patient-profile-flow-admin-copy"><small>Administrados por</small><strong>' + escapeHtml(admin.name) + '</strong><span>ID DE USUARIO - <b>' + escapeHtml(admin.userId) + '</b></span></div>' +
        '<span class="patient-profile-flow-admin-avatar' + profileAvatarToneClass(admin) + '">' + renderAccountAvatarMedia(admin) + '</span>' +
      '</header>' +
      '<h3 class="patient-profile-flow-section-title">Mis perfiles</h3>' +
      '<div class="patient-profile-directory-list">' + cards + '</div>' +
    '</section>', false, "profile-flow");
  }

  function profileDetailRow(iconName, label, value) {
    return '<div class="patient-profile-detail-row"><span>' + icon(iconName) + '</span><div><small>' + escapeHtml(label) + '</small><strong>' + escapeHtml(value || "No registrado") + '</strong></div></div>';
  }

  function renderProfileDetail(accountId) {
    if (accountId) switchActiveProfile(accountId, { scrollIntoView: true });
    var account = activeManagedProfileCard();
    var p = getActiveProfile();
    var canDelete = account.id !== PRIMARY_ACCOUNT_CARD_ID;
    openModal("", "", '<section class="patient-profile-flow patient-profile-detail-flow" data-profile-flow>' +
      '<header class="patient-profile-flow-topbar"><button class="patient-profile-flow-back" type="button" data-profile-info-list aria-label="Volver">' + icon("back") + '</button><strong>Detalle del perfil</strong><span></span></header>' +
      '<section class="patient-profile-detail-hero"><span class="patient-profile-detail-avatar' + profileAvatarToneClass(account) + '" data-profile-panel-avatar></span><h3>' + escapeHtml(p.name) + '</h3><p>' + profileMetaLabel(p, account) + '</p><b>ID: ' + escapeHtml(p.userId) + '</b></section>' +
      '<h4 class="patient-profile-flow-subtitle">Información personal</h4>' +
      '<section class="patient-profile-detail-card">' +
        profileDetailRow("user", "Nombre", p.name) +
        profileDetailRow(account.kind === "pet" ? "paw" : "users", "Tipo de perfil", profileTypeLabel(p, account)) +
        profileDetailRow("calendar", "Fecha de nacimiento", displayDate(p.birthDate)) +
        profileDetailRow("users", profileGenderLabel(p, account), p.sex || "No registrado") +
        profileDetailRow("request", "Notas", p.notes || "Sin notas") +
      '</section>' +
      '<section class="patient-profile-action-card"><button type="button" data-profile-detail-edit><span>' + icon("edit") + '</span><strong>Editar</strong></button><button type="button" data-profile-detail-delete ' + (canDelete ? "" : "disabled") + '><span>' + icon("trash") + '</span><strong>Eliminar</strong></button></section>' +
    '</section>', false, "profile-flow");
    $all("[data-profile-panel-avatar]", modalBody).forEach(setAvatar);
  }

  function renderProfileRoleOptions(selected) {
    return ["Niño", "Niña", "Mascota", "Familiar", "Adulto"].map(function (role) {
      return '<option value="' + escapeHtml(role) + '"' + (role === selected ? " selected" : "") + '>' + escapeHtml(role) + '</option>';
    }).join("");
  }

  function renderProfileSexOptions(selected, role) {
    var options = role === "Mascota" ? ["Macho", "Hembra", "No especificado"] : ["Femenino", "Masculino", "Otro", "No especificado"];
    return options.map(function (value) {
      return '<option value="' + escapeHtml(value) + '"' + (value === selected ? " selected" : "") + '>' + escapeHtml(value) + '</option>';
    }).join("");
  }

  function renderProfileEdit() {
    var account = activeManagedProfileCard();
    var p = getActiveProfile();
    var role = profileTypeLabel(p, account);
    openModal("", "", '<form class="patient-profile-flow patient-profile-edit-flow" data-profile-detail-edit-form data-profile-flow>' +
      '<header class="patient-profile-flow-topbar"><button class="patient-profile-flow-back" type="button" data-profile-detail-back aria-label="Volver">' + icon("back") + '</button><strong>Editar perfil</strong><span></span></header>' +
      '<section class="patient-profile-edit-photo"><button class="patient-profile-edit-avatar' + profileAvatarToneClass(account) + '" type="button" data-profile-edit-photo-pick aria-label="Cambiar foto"><span data-profile-edit-photo-preview data-profile-panel-avatar></span><i>' + icon("camera") + '</i></button><button class="patient-profile-edit-photo-link" type="button" data-profile-edit-photo-pick>Cambiar foto</button><input type="file" accept="image/*" data-profile-edit-photo-input hidden></section>' +
      '<label class="patient-profile-field"><span>Nombre *</span><input name="name" value="' + escapeHtml(p.name) + '" required></label>' +
      '<label class="patient-profile-field"><span>Tipo de perfil *</span><select name="role" data-profile-edit-role required>' + renderProfileRoleOptions(role) + '</select></label>' +
      '<label class="patient-profile-field"><span>Fecha de nacimiento *</span><input name="birthDate" type="date" value="' + escapeHtml(dateInputValue(p.birthDate)) + '" required></label>' +
      '<label class="patient-profile-field"><span data-profile-edit-sex-label>' + escapeHtml(profileGenderLabel(p, account)) + ' *</span><select name="sex" required>' + renderProfileSexOptions(p.sex || "", role) + '</select></label>' +
      '<label class="patient-profile-field"><span>Notas</span><textarea name="notes" maxlength="200" rows="5">' + escapeHtml(p.notes || "") + '</textarea><small>' + String(p.notes || "").length + '/200</small></label>' +
      '<div class="patient-profile-edit-actions"><button class="patient-profile-button" type="button" data-profile-detail-back>Cancelar</button><button class="patient-profile-button is-primary" type="submit">Guardar cambios</button></div>' +
    '</form>', false, "profile-flow");
    $all("[data-profile-panel-avatar]", modalBody).forEach(setAvatar);
  }

  function renderProfileUpdateSuccess(profile) {
    var p = profile || getActiveProfile();
    openModal("", "", '<section class="patient-profile-flow patient-profile-update-success" data-profile-flow>' +
      '<span class="patient-profile-update-confetti is-one"></span><span class="patient-profile-update-confetti is-two"></span><span class="patient-profile-update-confetti is-three"></span><span class="patient-profile-update-confetti is-four"></span>' +
      '<div class="patient-profile-update-check">' + icon("check") + '</div>' +
      '<h3>Perfil actualizado</h3><p>La información de ' + escapeHtml(p.name) + ' se ha actualizado correctamente.</p>' +
      '<button class="patient-profile-button is-primary" type="button" data-profile-success-accept>Aceptar</button>' +
    '</section>', false, "profile-success");
  }

  function renderProfileDeleteConfirm() {
    if (!state.activeAlternateId) {
      return;
    }
    var account = activeManagedProfileCard();
    var p = getActiveProfile();
    openModal("", "", '<section class="patient-profile-flow patient-profile-delete-confirm" data-profile-flow>' +
      '<header class="patient-profile-flow-topbar"><button class="patient-profile-flow-back" type="button" data-profile-detail-back aria-label="Volver">' + icon("back") + '</button><strong>Eliminar perfil</strong><span></span></header>' +
      '<section class="patient-profile-delete-hero"><span class="patient-profile-detail-avatar' + profileAvatarToneClass(account) + '" data-profile-panel-avatar></span><h3>' + escapeHtml(p.name) + '</h3><b>ID: ' + escapeHtml(p.userId) + '</b></section>' +
      '<section class="patient-profile-delete-warning"><span>' + icon("alert") + '</span><div><h3>¿Eliminar este perfil?</h3><p>Esta acción no se puede deshacer. Se eliminará toda la información asociada a este perfil.</p></div></section>' +
      '<div class="patient-profile-delete-actions"><button class="patient-profile-button is-danger-solid" type="button" data-profile-delete-confirm>Eliminar perfil</button><button class="patient-profile-button" type="button" data-profile-delete-cancel>Cancelar</button></div>' +
    '</section>', false, "profile-flow");
    $all("[data-profile-panel-avatar]", modalBody).forEach(setAvatar);
  }

  function renderProfileDeleteSuccess(profile) {
    var p = profile || { name: "El perfil" };
    openModal("", "", '<section class="patient-profile-flow patient-profile-delete-success" data-profile-flow>' +
      '<span class="patient-profile-update-confetti is-one"></span><span class="patient-profile-update-confetti is-two"></span><span class="patient-profile-update-confetti is-three"></span><span class="patient-profile-update-confetti is-four"></span>' +
      '<div class="patient-profile-delete-trash">' + icon("trash") + '</div>' +
      '<h3>Perfil eliminado</h3><p>El perfil de ' + escapeHtml(p.name) + ' ha sido eliminado correctamente.</p>' +
      '<button class="patient-profile-button is-primary" type="button" data-profile-delete-success-close>Cerrar</button>' +
    '</section>', false, "profile-success");
  }

  function deleteActiveManagedProfile() {
    if (!state.activeAlternateId) {
      return;
    }
    var deleted = clone(getActiveProfile());
    var deletedSuffix = activeProfileStorageSuffix();
    state.alternateAccounts = (state.alternateAccounts || []).filter(function (account) {
      return account.id !== state.activeAlternateId;
    });
    if (state.profileData && deletedSuffix) delete state.profileData[deletedSuffix];
    state.activeAlternateId = "";
    activateProfileData();
    saveState();
    emit("profile:deleted", { profile: deleted, profileId: deleted.userId });
    emitActiveProfileChanged();
    updateUI();
    renderProfileDeleteSuccess(deleted);
  }

  function renderPhotoEditor() {
    var p = getActiveProfile();
    var error = profilePhotoSaveError ? '<p class="patient-profile-photo-error">' + escapeHtml(profilePhotoSaveError) + '</p>' : "";
    openModal("Foto de perfil", "IDENTIDAD DEL PACIENTE", '<section class="patient-profile-photo-view"><div class="patient-profile-photo-picker"><button class="patient-profile-large-avatar" type="button" data-profile-change-photo data-profile-photo-preview aria-label="Seleccionar nueva foto de perfil"></button><button class="patient-profile-photo-plus" type="button" data-profile-change-photo aria-label="Cambiar foto">' + icon("plus") + '</button></div><h3>' + escapeHtml(p.name) + '</h3><p>Selecciona una imagen cuadrada para obtener mejores resultados.</p>' + error + '<div class="patient-profile-actions" style="justify-content:center"><button class="patient-profile-button is-primary" type="button" data-profile-save-photo>' + icon("check") + ' Guardar foto</button>' + (p.photo ? '<button class="patient-profile-button is-danger" type="button" data-profile-remove-photo>' + icon("trash") + ' Eliminar</button>' : "") + '</div></section>');
    setPhotoPreview($("[data-profile-photo-preview]", modalBody), p, pendingProfilePhoto);
  }

  function renderLogout() {
    openModal("Cerrar sesión", "SEGURIDAD", '<section class="patient-profile-empty"><div class="patient-profile-row-icon" style="margin:0 auto 12px;color:#d72b43;background:#fff0f3">' + icon("logout") + '</div><h3>¿Quieres cerrar tu sesión?</h3><p>Tu información local permanecerá guardada en este dispositivo.</p><div class="patient-profile-actions" style="justify-content:center"><button class="patient-profile-button" data-profile-close-modal>Cancelar</button><button class="patient-profile-button is-danger" data-profile-confirm-logout>Cerrar sesión</button></div><p data-profile-logout-error role="alert" hidden></p></section>');
  }

  async function submitLogout(button) {
    if (button && button.disabled) return;
    if (button) {
      button.disabled = true;
      button.textContent = "Cerrando...";
    }
    var errorBox = $("[data-profile-logout-error]");
    if (errorBox) errorBox.hidden = true;
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);
    try {
      if (!csrfToken) throw new Error("Recarga la página e intenta cerrar sesión de nuevo.");
      var response = await fetch(logoutUrl, {
        method: "POST", credentials: "same-origin", signal: controller.signal,
        headers: { "Accept": "application/json", "X-CSRF-TOKEN": csrfToken }
      });
      if (!response.ok) throw new Error(response.status === 419 ? "La sesión cambió. Recarga la página e inténtalo de nuevo." : "No se pudo cerrar la sesión. Inténtalo de nuevo.");
      var result = await response.json();
      var destination = result.redirect || homeUrl;
      emit("logout");
      try { sessionStorage.removeItem("patientPortalView"); } catch (error) {}
      // Leave the Android preview iframe after the server invalidates the session.
      try { window.top.location.assign(destination); }
      catch (error) { window.location.assign(destination); }
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error.name === "AbortError" ? "La conexión tardó demasiado. Inténtalo de nuevo." : error.message;
        errorBox.hidden = false;
      }
      if (button) { button.disabled = false; button.textContent = "Cerrar sesión"; }
    } finally {
      clearTimeout(timeout);
    }
  }

  function openView(view) {
    if (view === "photo") {
      pendingProfilePhoto = "";
      profilePhotoSaveError = "";
    }
    var renderers = {
      finance: renderFinance,
      requests: renderRequests,
      messages: renderMessages,
      alerts: renderAlerts,
      sync: renderSynchronizations,
      profile: renderProfileInfo,
      photo: renderPhotoEditor,
      logout: renderLogout
    };
    if (renderers[view]) {
      renderers[view]();
      emit("open:" + view);
    }
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest("button, [data-profile-view], [data-profile-panel-open]");
    if (!button) return;

    if (button.matches("[data-profile-panel-open]")) {
      event.preventDefault();
      openPanel();
      return;
    }
    if (button.matches("[data-profile-panel-close]")) closePanel();
    if (button.matches("[data-profile-close-modal]")) closeModal();
    if (button.matches("[data-profile-support-toggle]")) {
      var support = $("[data-profile-support-group]");
      var menu = $("[data-profile-support-menu]");
      var expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      support.classList.toggle("is-open", !expanded);
      menu.hidden = expanded;
    }
    if (button.dataset.profileAccountStep && accountsTrack) {
      event.preventDefault();
      panAccountsBy(button.dataset.profileAccountStep);
      return;
    }
    if ((button.dataset.profileAccountSwitch || button.matches("[data-profile-add-account]")) && Date.now() < accountsPanClickLockUntil) {
      event.preventDefault();
      return;
    }
    if (button.dataset.profileAccountSwitch) {
      event.preventDefault();
      switchActiveProfile(button.dataset.profileAccountSwitch, { scrollIntoView: true });
      return;
    }
    if (button.matches("[data-profile-add-account]")) {
      event.preventDefault();
      renderAddAccount();
      return;
    }
    if (button.matches("[data-profile-alternate-photo-pick]")) {
      event.preventDefault();
      var alternatePhotoForm = button.closest("[data-profile-alternate-form]");
      var alternatePhotoInput = alternatePhotoForm && $("[data-profile-alternate-photo-input]", alternatePhotoForm);
      if (alternatePhotoInput) alternatePhotoInput.click();
      return;
    }
    if (button.matches("[data-profile-info-list]")) {
      event.preventDefault();
      renderProfileInfo();
      return;
    }
    if (button.dataset.profileDetailAccount) {
      event.preventDefault();
      renderProfileDetail(button.dataset.profileDetailAccount);
      return;
    }
    if (button.matches("[data-profile-detail-back]")) {
      event.preventDefault();
      renderProfileDetail();
      return;
    }
    if (button.matches("[data-profile-detail-edit]")) {
      event.preventDefault();
      renderProfileEdit();
      return;
    }
    if (button.matches("[data-profile-detail-delete]")) {
      event.preventDefault();
      renderProfileDeleteConfirm();
      return;
    }
    if (button.matches("[data-profile-delete-cancel]")) {
      event.preventDefault();
      renderProfileDetail();
      return;
    }
    if (button.matches("[data-profile-delete-confirm]")) {
      event.preventDefault();
      deleteActiveManagedProfile();
      return;
    }
    if (button.matches("[data-profile-delete-success-close]")) {
      event.preventDefault();
      closeModal();
      return;
    }
    if (button.matches("[data-profile-edit-photo-pick]")) {
      event.preventDefault();
      var editPhotoForm = button.closest("[data-profile-detail-edit-form]");
      var editPhotoInput = editPhotoForm && $("[data-profile-edit-photo-input]", editPhotoForm);
      if (editPhotoInput) editPhotoInput.click();
      return;
    }
    if (button.matches("[data-profile-success-accept]")) {
      event.preventDefault();
      renderProfileDetail();
      return;
    }
    if (button.dataset.profileView) {
      openView(button.dataset.profileView);
      return;
    }
    if (button.matches("[data-profile-change-photo]")) {
      event.preventDefault();
      if (photoInput) photoInput.click();
      return;
    }
    if (button.matches("[data-profile-save-photo]")) {
      event.preventDefault();
      var savedPhoto = pendingProfilePhoto || (getActiveProfile().photo || "");
      if (!savedPhoto) {
        if (photoInput) photoInput.click();
        return;
      }
      button.disabled = true;
      button.innerHTML = icon("check") + ' Guardando...';
      var previousPhoto = getActiveProfile().photo || "";
      updateActiveProfile({ photo: savedPhoto });
      if (!saveState()) {
        updateActiveProfile({ photo: previousPhoto });
        updateUI();
        pendingProfilePhoto = savedPhoto;
        profilePhotoSaveError = "No se pudo guardar la foto en este navegador. Intenta con una imagen más pequeña.";
        renderPhotoEditor();
        return;
      }
      pendingProfilePhoto = "";
      profilePhotoSaveError = "";
      emit("profile:photo-updated", activeProfilePayload());
      emitActiveProfileChanged();
      updateUI();
      closeModal();
      return;
    }
    if (button.matches("[data-profile-remove-photo]")) {
      event.preventDefault();
      pendingProfilePhoto = "";
      profilePhotoSaveError = "";
      var removedPhoto = getActiveProfile().photo || "";
      updateActiveProfile({ photo: "" });
      if (!saveState()) {
        updateActiveProfile({ photo: removedPhoto });
        updateUI();
        profilePhotoSaveError = "No se pudo eliminar la foto en este navegador. Intenta de nuevo.";
        renderPhotoEditor();
        return;
      }
      emit("profile:photo-removed", activeProfilePayload());
      emitActiveProfileChanged();
      renderPhotoEditor();
      return;
    }
    if (button.dataset.profileMessageId) renderConversation(button.dataset.profileMessageId);
    if (button.dataset.profileRequestAction) {
      var request = state.requests.find(function (item) { return item.id === button.dataset.id; });
      if (request) request.status = button.dataset.profileRequestAction === "accept" ? "accepted" : "rejected";
      saveState();
      renderRequests();
    }
    if (button.dataset.profileAlertRead) {
      var alert = state.alerts.find(function (item) { return item.id === button.dataset.profileAlertRead; });
      if (alert) alert.unread = false;
      saveState();
      renderAlerts();
    }
    if (button.matches("[data-profile-read-all]")) {
      state.alerts.forEach(function (item) { item.unread = false; });
      saveState();
      renderAlerts();
    }
    if (button.dataset.profileRemoveSync) {
      state.synchronizations = state.synchronizations.filter(function (item) { return item.id !== button.dataset.profileRemoveSync; });
      saveState();
      renderSynchronizations();
    }
    if (button.dataset.profileSubscriptionBack === "wallet") {
      event.preventDefault();
      renderFinance();
      return;
    }
    if (button.dataset.profileSubscriptionBack === "upgrade") {
      event.preventDefault();
      renderSubscriptionUpgrade(button.dataset.planId);
      return;
    }
    if (button.dataset.profileUpgradeSelect) {
      event.preventDefault();
      renderSubscriptionUpgrade(button.dataset.profileUpgradeSelect);
      return;
    }
    if (button.dataset.profileSubscriptionPayment) {
      event.preventDefault();
      renderSubscriptionPayment(button.dataset.profileSubscriptionPayment);
      return;
    }
    if (button.matches("[data-profile-subscription-home]")) {
      event.preventDefault();
      renderFinance();
      return;
    }
    if (button.dataset.profilePlan) {
      event.preventDefault();
      renderSubscriptionUpgrade(button.dataset.profilePlan);
      return;
    }
    if (button.matches("[data-profile-confirm-logout]")) {
      event.preventDefault();
      submitLogout(button);
    }
  });

  document.addEventListener("submit", function (event) {
    if (event.target.matches("[data-profile-recharge-form]")) {
      event.preventDefault();
      var amount = Number(new FormData(event.target).get("amount"));
      if (!amount || amount < 10) return;
      state.wallet.balance += amount;
      state.wallet.movements.unshift({ id: "MOV-" + Date.now(), date: new Date().toLocaleDateString("es-MX"), concept: "Recarga con tarjeta", amount: amount });
      saveState();
      emit("wallet:recharged", { amount: amount });
      renderFinance();
    }
    if (event.target.matches("[data-profile-subscription-payment-form]")) {
      event.preventDefault();
      var plan = getSubscriptionPlan(event.target.dataset.planId);
      if (!plan) return;
      state.subscription.current = plan.id;
      if (Number(plan.price) > 0) {
        state.wallet.movements.unshift({ id: "SUB-" + Date.now(), date: new Date().toLocaleDateString("es-MX"), concept: "Suscripcion " + plan.name, amount: -Number(plan.price) });
      }
      saveState();
      emit("subscription:upgraded", { planId: plan.id, planName: plan.name, amount: Number(plan.price) || 0 });
      renderSubscriptionSuccess(plan.id);
    }
    if (event.target.matches("[data-profile-detail-edit-form]")) {
      event.preventDefault();
      var editForm = event.target;
      var editData = new FormData(editForm);
      var editName = String(editData.get("name") || "").trim();
      var editRole = String(editData.get("role") || "Adulto").trim();
      var editSex = String(editData.get("sex") || "").trim();
      var editBirthDate = String(editData.get("birthDate") || "").trim();
      var editNotes = String(editData.get("notes") || "").trim();
      if (!editName) return;
      var profileFields = {
        name: editName,
        role: editRole,
        sex: editSex,
        birthDate: editBirthDate,
        notes: editNotes,
        kind: accountKindForRole(editRole),
        tone: accountToneForRole(editRole)
      };
      if (editForm._profilePhotoData) profileFields.photo = editForm._profilePhotoData;
      updateActiveProfile(profileFields);
      saveState();
      emit("profile:updated", activeProfilePayload());
      emitActiveProfileChanged();
      updateUI();
      renderProfileUpdateSuccess(getActiveProfile());
      return;
    }
    if (event.target.matches("[data-profile-form]")) {
      event.preventDefault();
      var formData = new FormData(event.target);
      var profileFields = {};
      ["curp", "phone"].forEach(function (key) {
        profileFields[key] = String(formData.get(key) || "No registrado").trim();
      });
      updateActiveProfile(profileFields);
      saveState();
      emit("profile:updated", activeProfilePayload());
      emitActiveProfileChanged();
      closeModal();
    }
    if (event.target.matches("[data-profile-alternate-form]")) {
      event.preventDefault();
      var alternateElement = event.target;
      var alternateForm = new FormData(alternateElement);
      var accountName = String(alternateForm.get("name") || "").trim();
      var accountRole = String(alternateForm.get("role") || "Niño").trim();
      var accountSex = String(alternateForm.get("sex") || "").trim();
      var accountBirthDate = String(alternateForm.get("birthDate") || "").trim();
      if (!accountName) return;
      var submitButton = $("button[type='submit']", alternateElement);
      var selectedPhotoInput = $("[data-profile-alternate-photo-input]", alternateElement);
      var selectedPhotoFile = selectedPhotoInput && selectedPhotoInput.files && selectedPhotoInput.files[0];
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = icon("check") + ' Guardando...';
      }
      var saveAlternateAccount = function (photo) {
        var account = {
          id: "ALT-" + Date.now(),
          name: accountName,
          role: accountRole,
          sex: accountSex,
          birthDate: accountBirthDate,
          photo: photo || alternateElement._profilePhotoData || "",
          userId: createPlatformUserId(),
          initials: initials(accountName),
          kind: accountKindForRole(accountRole),
          tone: accountToneForRole(accountRole),
          relationshipCode: accountRelationshipCode(accountRole, accountKindForRole(accountRole)),
          managedByProfileId: primaryProfileId(),
          accessProfileId: primaryProfileId(),
          canLoginIndependently: false,
          createdAt: new Date().toISOString()
        };
        state.alternateAccounts.push(account);
        switchActiveProfile(account.id, { scrollIntoView: true });
        emit("account:added", Object.assign({ accountId: account.id, userId: account.userId, name: account.name, role: account.role, sex: account.sex, birthDate: account.birthDate, hasPhoto: !!account.photo }, activeProfilePayload()));
        renderAddAccountSuccess(account);
      };
      if (selectedPhotoFile && !alternateElement._profilePhotoData) {
        readImageFile(selectedPhotoFile, saveAlternateAccount);
      } else {
        saveAlternateAccount(alternateElement._profilePhotoData || "");
      }
    }
    if (event.target.matches("[data-profile-message-form]")) {
      event.preventDefault();
      var form = event.target;
      var text = String(new FormData(form).get("message") || "").trim();
      if (!text) return;
      var item = state.messages.find(function (entry) { return entry.id === form.dataset.messageId; });
      if (!item) return;
      item = normalizeMessage(item);
      var time = messageTime();
      item.thread.push({ id: "MSG-OUT-" + Date.now(), from: "patient", sender: "Tú", text: text, time: time });
      item.preview = text;
      item.time = time;
      item.unread = false;
      state.messages = [item].concat(state.messages.filter(function (entry) { return entry.id !== item.id; }));
      saveState();
      emit("message:sent", { messageId: item.id, recipient: item.sender, text: text, time: time });
      renderConversation(item.id);
    }
  });

  document.addEventListener("change", function (event) {
    if (event.target.matches("[data-profile-edit-role]")) {
      var roleField = event.target;
      var roleForm = roleField.closest("[data-profile-detail-edit-form]");
      var sexLabel = roleForm && $("[data-profile-edit-sex-label]", roleForm);
      var sexSelect = roleForm && $("select[name='sex']", roleForm);
      var roleValue = String(roleField.value || "");
      if (sexLabel) sexLabel.textContent = (roleValue === "Mascota" ? "Género (animal)" : "Sexo") + " *";
      if (sexSelect) sexSelect.innerHTML = renderProfileSexOptions(sexSelect.value || "", roleValue);
      return;
    }
    if (event.target.matches("[data-profile-edit-photo-input]")) {
      var editInput = event.target;
      var editForm = editInput.closest("[data-profile-detail-edit-form]");
      var editFile = editInput.files && editInput.files[0];
      if (!editForm || !editFile) return;
      readImageFile(editFile, function (photo) {
        if (!photo) return;
        editForm._profilePhotoData = photo;
        var preview = $("[data-profile-edit-photo-preview]", editForm);
        if (preview) preview.innerHTML = '<img src="' + escapeHtml(photo) + '" alt="Vista previa de foto de perfil">';
      });
      return;
    }
    if (!event.target.matches("[data-profile-alternate-photo-input]")) return;
    var input = event.target;
    var form = input.closest("[data-profile-alternate-form]");
    var file = input.files && input.files[0];
    if (!form || !file) return;
    readImageFile(file, function (photo) {
      if (!photo) return;
      form._profilePhotoData = photo;
      var preview = $("[data-profile-alternate-photo-preview]", form);
      if (preview) preview.innerHTML = '<img src="' + escapeHtml(photo) + '" alt="Vista previa de foto de perfil">';
    });
  });

  if (photoInput) {
    photoInput.addEventListener("change", function () {
      var file = photoInput.files && photoInput.files[0];
      if (!file || !file.type.match(/^image\//)) return;
      readImageFile(file, function (photo) {
        if (!photo) return;
        pendingProfilePhoto = photo;
        profilePhotoSaveError = "";
        renderPhotoEditor();
        photoInput.value = "";
      });
    });
  }

  if (shade) shade.addEventListener("click", closePanel);
  if (accountsTrack) {
    accountsTrack.addEventListener("scroll", syncAccountsDots, { passive: true });
    setupAccountsPan();
  }
  if (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });
  }
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (profileSelector && profileSelector.isOpen) return;
    if (!modal.hidden) closeModal();
    else if (!panel.hidden) closePanel();
  });

  if (profileSelector) {
    profileSelector.addEventListener("profile-add", async function () {
      await profileSelector.close();
      renderAddAccount();
    });
    profileSelector.addEventListener("profile-logout", async function () {
      await profileSelector.close();
      renderLogout();
    });
  }

  window.DrSamPatientProfilePanel = {
    open: openPanel,
    close: closePanel,
    openView: openView,
    getState: function () { return clone(state); },
    getActiveProfile: function () { return clone(getActiveProfile()); },
    getActiveProfileId: activeProfileId,
    getActiveProfileStorageSuffix: activeProfileStorageSuffix,
    selectAccount: function (accountId) {
      return switchActiveProfile(accountId || PRIMARY_ACCOUNT_CARD_ID, { scrollIntoView: true });
    }
  };

  updateUI();
})();
(() => {
  if (window.__drSamSubscriptionsMobilePanLoader) return;
  // Carga el carrusel táctil de suscripciones en las vistas del paciente.
  window.__drSamSubscriptionsMobilePanLoader = true;

  const source = document.currentScript?.src || `${window.location.origin}/js/patient-profile-panel.js`;
  const cssHref = new URL("../css/subscriptions-mobile-pan.css", source).href;
  const jsSrc = new URL("subscriptions-mobile-pan.js", source).href;

  if (!document.querySelector('link[data-drsam-subscriptions-pan]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssHref;
    link.dataset.drsamSubscriptionsPan = "";
    (document.head || document.documentElement).appendChild(link);
  }

  const loadPanBehavior = () => {
    if (document.querySelector('script[data-drsam-subscriptions-pan]')) return;
    const script = document.createElement("script");
    script.src = jsSrc;
    script.defer = true;
    script.dataset.drsamSubscriptionsPan = "";
    (document.head || document.documentElement).appendChild(script);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPanBehavior, { once: true });
  } else {
    loadPanBehavior();
  }
})();
