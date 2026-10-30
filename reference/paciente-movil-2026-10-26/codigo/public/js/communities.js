(function () {
  "use strict";

  var DEFAULTS = {
    patient: { id: "100000002", name: "Guillermo Guerrero Herzig" },
    storageKey: "klini_communities_portable",
    catalogStorageKey: "klini_communities_catalog_repository",
    profileStorageKey: "",
    startView: "feed",
    hideBottomNav: false,
    separateCalendar: false,
    onNavigate: function () {},
    onAction: function () {}
  };

  var people = [
    { id: "mariana", name: "Mariana López", short: "Mariana", avatar: "/images/communities/category-wellness.png" },
    { id: "diego", name: "Diego Ramírez", short: "Diego", avatar: "/images/communities/category-sport.png" },
    { id: "ana", name: "Ana Sofía Ruiz", short: "Ana Sofía", avatar: "/images/communities/category-new.png" },
    { id: "carlos", name: "Carlos Méndez", short: "Carlos", avatar: "/images/communities/avatar-carlos.png" }
  ];

  people = people.concat([
    { id: "camila", name: "Camila Torres", short: "Camila", avatar: "/images/patient-export/9640e7795c8db2cdba57.jpg" },
    { id: "andres", name: "Andres Vega", short: "Andres", avatar: "/images/patient-export/e7553043d2dd01250832.jpg" },
    { id: "lucia", name: "Lucia Herrera", short: "Lucia", avatar: "/images/patient-export/93b6a487565a6d983f8e.jpg" },
    { id: "mateo", name: "Mateo Silva", short: "Mateo", avatar: "/images/patient-export/d48389cc338d6118e8b2.jpg" },
    { id: "renata", name: "Renata Cruz", short: "Renata", avatar: "/images/patient-export/42dee029eaeb6a9103fc.jpg" },
    { id: "pablo", name: "Pablo Neri", short: "Pablo", avatar: "/images/patient-export/a8739ed0eb5ad2677255.jpg" },
    { id: "valeria", name: "Valeria Montes", short: "Valeria", avatar: "/images/patient-export/df94a43f03f910053436.jpg" },
    { id: "ivan", name: "Ivan Rojas", short: "Ivan", avatar: "/images/patient-export/41d374994b6ce1850cc2.jpg" },
    { id: "sofia", name: "Sofia Palma", short: "Sofia", avatar: "/images/patient-export/f0d4bfbd855cbea59304.jpg" },
    { id: "emilio", name: "Emilio Fuentes", short: "Emilio", avatar: "/images/patient-export/38d14bf66ff30240c8bc.jpg" },
    { id: "paulina", name: "Paulina Leon", short: "Paulina", avatar: "/images/patient-export/fdae6f1f9d838e48f96e.jpg" },
    { id: "ricardo", name: "Ricardo Cano", short: "Ricardo", avatar: "/images/patient-export/3984b99af2b59454d85e.jpg" },
    { id: "ximena", name: "Ximena Arias", short: "Ximena", avatar: "/images/patient-export/66b4b1b9c976d3999ae6.jpg" },
    { id: "lara", name: "Lara Medina", short: "Lara", avatar: "/images/patient-export/2b4d0e28bd24e5cc52dc.jpg" },
    { id: "natalia", name: "Natalia Sol", short: "Natalia", avatar: "/images/patient-export/4e8616057ba3ddd057c2.jpg" },
    { id: "hector", name: "Hector Pineda", short: "Hector", avatar: "/images/patient-export/d170c3103974c5febbd0.jpg" },
    { id: "brenda", name: "Brenda Santos", short: "Brenda", avatar: "/images/patient-export/e49873da2b386a07d76a.jpg" },
    { id: "daniel", name: "Daniel Ortiz", short: "Daniel", avatar: "/images/patient-export/7c6c94b37faf68177701.jpg" },
    { id: "oscar", name: "Oscar Molina", short: "Oscar", avatar: "/images/patient-export/de157019d31e6c6f8325.jpg" },
    { id: "tomas", name: "Tomas Rey", short: "Tomas", avatar: "/images/patient-export/aa061533cdffccf31974.jpg" },
    { id: "isabel", name: "Isabel Luna", short: "Isabel", avatar: "/images/patient-export/6de0a7f0c746ad783b31.jpg" },
    { id: "miranda", name: "Miranda Paz", short: "Miranda", avatar: "/images/patient-export/17bcd799e74650458a0e.jpg" },
    { id: "elena", name: "Elena Vargas", short: "Elena", avatar: "/images/patient-export/97828858e7cb4ebc41c2.jpg" },
    { id: "alejandro", name: "Alejandro Ruiz", short: "Alejandro", avatar: "/images/patient-export/f8f0f44d6906551ddbcd.jpg" },
    { id: "samuel", name: "Samuel Diaz", short: "Samuel", avatar: "/images/patient-export/fe4d65015c1a79c1acae.jpg" },
    { id: "jorge", name: "Jorge Vidal", short: "Jorge", avatar: "/images/patient-export/41fafeca192d22ac1c04.jpg" },
    { id: "raul", name: "Raul Campos", short: "Raul", avatar: "/images/patient-export/fd7ce2230d3ca6a58cae.jpg" },
    { id: "maria", name: "Maria Aguilar", short: "Maria", avatar: "/images/patient-export/23deab93472032b80cf5.jpg" },
    { id: "fernando", name: "Fernando Gil", short: "Fernando", avatar: "/images/patient-export/408d9fc2edb97e4d641f.jpg" },
    { id: "claudia", name: "Claudia Romero", short: "Claudia", avatar: "/images/patient-export/6b0b240436ac1414521e.jpg" }
  ]);

  var posts = [
    {
      id: "post-1", author: people[0], time: "Hoy · 8:30 a.m.",
      text: "Iniciando el día con gratitud y respiración consciente. Pequeños pasos, grandes cambios.",
      image: "/images/patient-export/9bfe0ef87111af6547ae.jpg",
      likes: 128, comments: 24, shares: 15
    },
    {
      id: "post-2", author: people[1], time: "Ayer · 7:15 p.m.",
      text: "Nada como una buena caminata al aire libre para limpiar la mente y recargar energía.",
      image: "/images/patient-export/053bd5cb0be986bb99b7.jpg",
      likes: 96, comments: 18, shares: 7
    },
    {
      id: "post-3", author: people[2], time: "2 días · 9:45 a.m.",
      text: "Mi smoothie favorito para empezar el día con toda la energía.",
      image: "/images/patient-export/a875f0e9e033f205a761.jpg",
      likes: 74, comments: 12, shares: 6
    }
  ];

  var postMessages = {
    "post-1": [
      { author: people[1], time: "Hoy · 8:42 a.m.", text: "Me encantó esta idea. Empezar con respiración cambia mucho el ritmo del día." },
      { author: people[2], time: "Hoy · 8:51 a.m.", text: "Gracias por compartirlo, Mariana. Lo intentaré antes de mi caminata." },
      { author: people[3], time: "Hoy · 9:05 a.m.", text: "Pequeños pasos, pero constantes. Esa frase me sirve para esta semana." }
    ],
    "post-2": [
      { author: people[0], time: "Ayer · 7:28 p.m.", text: "Caminar al aire libre también me ayuda a bajar el estrés." },
      { author: people[2], time: "Ayer · 8:02 p.m.", text: "Diego, ¿qué ruta recomiendas para empezar suave?" },
      { author: people[3], time: "Ayer · 8:16 p.m.", text: "Excelente recordatorio para movernos sin presionarnos." }
    ],
    "post-3": [
      { author: people[0], time: "2 días · 10:04 a.m.", text: "Se ve buenísimo. ¿Qué fruta usaste esta vez?" },
      { author: people[1], time: "2 días · 10:19 a.m.", text: "Me gusta para después de entrenar, sencillo y práctico." },
      { author: people[3], time: "2 días · 10:33 a.m.", text: "Lo voy a probar con proteína vegetal." }
    ]
  };

  var communities = [
    {
      id: "ash-olmo",
      catalogId: "community-ash-and-olmo",
      slug: "ash-and-olmo",
      repositorySource: "catalogo-base",
      name: "Ash and Olmo",
      category: "Bienestar",
      access: "open",
      visibility: "public",
      members: 1,
      city: "Ciudad de Mexico",
      region: "CDMX",
      language: "Espanol",
      description: "Yoga suave, respiracion y constancia semanal.",
      longDescription: "Comunidad administrada por el usuario para compartir bienestar, actividades y publicaciones de seguimiento.",
      rules: "Mantener respeto, privacidad y participacion responsable dentro de la comunidad.",
      pinnedMessage: "Bienvenidos a Ash and Olmo. Comparte historias y avances de bienestar desde la comunidad.",
      initials: "AA",
      logoInitials: "AA",
      tone: "mint",
      role: "admin",
      heroImage: "/images/communities/category-mine.png",
      profileImage: "/images/communities/category-mine.png",
      features: ["Bienestar integral", "Stories de comunidad", "Comunidad administrada"],
      adminPermissions: { stories: true, communityPosts: true, events: true, classes: true, editPage: true },
      classes: []
    },
    {
      id: "respira",
      catalogId: "community-yoga-mente",
      slug: "respira-y-avanza",
      repositorySource: "catalogo-base",
      name: "Respira y Avanza",
      category: "Yoga",
      access: "open",
      visibility: "public",
      members: 129,
      city: "Ciudad de Mexico",
      region: "CDMX",
      language: "Espanol",
      description: "Yoga suave, respiracion y constancia semanal.",
      longDescription: "Comunidad para pacientes que buscan construir habitos de calma, movilidad y respiracion consciente con acompanamiento respetuoso.",
      rules: "Mantener respeto, compartir experiencias de bienestar y evitar recomendaciones medicas sin supervision profesional.",
      pinnedMessage: "Bienvenidos a Respira y Avanza. Revisa los eventos de la semana y reserva tu lugar con anticipacion.",
      initials: "RY",
      logoInitials: "RA",
      tone: "mint",
      role: "admin",
      heroImage: "/images/patient-export/44d5adc37ae04f49c009.jpg",
      features: ["Bienestar integral", "Eventos semanales", "Comunidad activa"],
      classes: [
        { id: "class-respira-1", communityId: "respira", category: "Yoga", title: "Respiracion consciente", date: "lunes, 27 de julio", day: "lun", number: "27", month: "jul", time: "07:30 a.m.", place: "Casa Klini Roma Norte", modality: "Presencial", capacity: 18, available: 9, detail: "Rutina guiada de 12 minutos", icon: "leaf" },
        { id: "class-respira-2", communityId: "respira", category: "Movilidad", title: "Movilidad suave", date: "miercoles, 29 de julio", day: "mie", number: "29", month: "jul", time: "08:00 a.m.", place: "Remoto", modality: "Remoto", capacity: 30, available: 18, detail: "Practica para iniciar el dia", icon: "sparkles" },
        { id: "class-respira-3", communityId: "respira", category: "Yoga", title: "Yoga restaurativo", date: "viernes, 31 de julio", day: "vie", number: "31", month: "jul", time: "07:00 p.m.", place: "Casa Klini Condesa", modality: "Presencial", capacity: 16, available: 7, detail: "Sesion para cierre de semana", icon: "heart" }
      ]
    },
    {
      id: "nutricion",
      catalogId: "community-nutricion-inteligente",
      slug: "nutricion-inteligente-klini",
      repositorySource: "catalogo-base",
      name: "Nutricion Inteligente Klini",
      category: "Nutricion",
      access: "closed",
      visibility: "public",
      members: 42,
      city: "Ciudad de Mexico",
      region: "CDMX",
      language: "Espanol",
      description: "Planificacion, adherencia y recetas saludables.",
      longDescription: "Espacio para organizar objetivos de nutricion, revisar progreso semanal y compartir sesiones educativas con acompanamiento profesional.",
      rules: "Compartir recetas y avances de forma respetuosa. Las recomendaciones clinicas deben validarse con el equipo medico.",
      pinnedMessage: "Esta semana revisaremos compras inteligentes, menu semanal y adherencia a objetivos personales.",
      initials: "NI",
      logoInitials: "NI",
      tone: "gold",
      role: "member",
      heroImage: "/images/patient-export/a3dde8d27437d87d2bd8.jpg",
      features: ["Plan semanal", "Recetas saludables", "Comunidad moderada"],
      classes: [
        { id: "class-nutricion-1", communityId: "nutricion", category: "Nutricion", title: "Menu semanal practico", date: "martes, 28 de julio", day: "mar", number: "28", month: "jul", time: "06:30 p.m.", place: "Remoto", modality: "Remoto", capacity: 40, available: 23, detail: "Organiza comidas para 5 dias", icon: "calendar" },
        { id: "class-nutricion-2", communityId: "nutricion", category: "Nutricion", title: "Compras inteligentes", date: "jueves, 30 de julio", day: "jue", number: "30", month: "jul", time: "05:30 p.m.", place: "Casa Klini Polanco", modality: "Presencial", capacity: 20, available: 11, detail: "Lista base y sustituciones", icon: "tag" },
        { id: "class-nutricion-3", communityId: "nutricion", category: "Habitos", title: "Adherencia simple", date: "sabado, 1 de agosto", day: "sab", number: "01", month: "ago", time: "10:00 a.m.", place: "Remoto", modality: "Remoto", capacity: 35, available: 19, detail: "Seguimiento sin culpa", icon: "check" }
      ]
    },
    { id: "ritmo", catalogId: "community-running-cardio", slug: "ritmo-cardiometabolico", repositorySource: "catalogo-base", name: "Ritmo Cardiometabolico", category: "Running", access: "closed", visibility: "public", members: 86, city: "Ciudad de Mexico", description: "Caminatas, running ligero y metas medicas seguras.", longDescription: "Grupo de seguimiento para mejorar actividad fisica, compartir avances y organizar sesiones presenciales con enfoque preventivo.", initials: "RC", logoInitials: "RC", tone: "blue", role: "requested", heroImage: "/images/patient-export/b59b76e1620259f879ce.jpg", features: ["Caminatas guiadas", "Metas medicas", "Seguimiento semanal"] },
    { id: "mente", catalogId: "community-mental-balance", slug: "mente-en-equilibrio", repositorySource: "catalogo-base", name: "Mente en Equilibrio", category: "Salud mental", access: "open", visibility: "public", members: 71, city: "Queretaro", description: "Meditacion, descanso y acompanamiento entre pares.", longDescription: "Espacio seguro para practicar meditacion, descanso y pequenas pausas de regulacion emocional.", initials: "ME", logoInitials: "ME", tone: "violet", role: "none", heroImage: "/images/patient-export/8b44dedfdfafe0addfce.jpg", features: ["Pausas conscientes", "Descanso", "Apoyo entre pares"] },
    { id: "sendero", catalogId: "community-senderos-proposito", slug: "senderos-con-proposito", repositorySource: "catalogo-base", name: "Senderos con Proposito", category: "Senderismo", access: "open", visibility: "public", members: 55, city: "Monterrey", description: "Naturaleza, comunidad y movimiento consciente.", longDescription: "Comunidad para conectar con la naturaleza, preparar caminatas y moverse en grupo con seguridad.", initials: "SP", logoInitials: "SP", tone: "mint", role: "none", heroImage: "/images/patient-export/4bc03be023db6becef69.jpg", features: ["Salidas grupales", "Preparacion", "Naturaleza"] },
    { id: "fuerza", catalogId: "community-fuerza-funcional", slug: "fuerza-funcional", repositorySource: "catalogo-base", name: "Fuerza Funcional", category: "Fuerza", access: "closed", visibility: "public", members: 64, city: "Guadalajara", description: "Entrenamiento progresivo y bienestar integral.", longDescription: "Entrenamiento funcional progresivo con foco en fuerza, movilidad y prevencion.", initials: "FF", logoInitials: "FF", tone: "blue", role: "none", heroImage: "/images/patient-export/2b9f2acde9605c18f665.jpg", features: ["Fuerza segura", "Movilidad", "Progresion"] }
  ];

  communities = communities.concat([
    { id: "yoga-calma", catalogId: "community-yoga-calma", slug: "yoga-en-calma", repositorySource: "catalogo-base", exploreCategory: "yoga", name: "Yoga en Calma", category: "Yoga", access: "closed", visibility: "public", members: 84, city: "Ciudad de Mexico", description: "Practicas suaves para respirar, estirar y descansar mejor.", longDescription: "Sesiones guiadas para construir calma diaria con ejercicios de respiracion, movilidad ligera y meditacion.", initials: "YC", logoInitials: "YC", tone: "mint", role: "none", heroImage: "/images/patient-export/37242dce71befb619f94.jpg", features: ["Yoga suave", "Respiracion", "Descanso"] },
    { id: "meditacion-movimiento", catalogId: "community-meditacion-movimiento", slug: "meditacion-en-movimiento", repositorySource: "catalogo-base", exploreCategory: "yoga", name: "Meditacion en Movimiento", category: "Yoga", access: "open", visibility: "public", members: 97, city: "Queretaro", description: "Meditacion activa, movilidad consciente y pausas breves.", longDescription: "Comunidad para integrar pausas conscientes durante el dia con movimiento amable y respiracion guiada.", initials: "MM", logoInitials: "MM", tone: "blue", role: "none", heroImage: "/images/patient-export/44d5adc37ae04f49c009.jpg", features: ["Meditacion activa", "Pausas", "Movimiento"] },
    { id: "equilibrio-interior", catalogId: "community-equilibrio-interior", slug: "equilibrio-interior", repositorySource: "catalogo-base", exploreCategory: "yoga", name: "Equilibrio Interior", category: "Yoga", access: "closed", visibility: "public", members: 76, city: "Guadalajara", description: "Rutinas de meditacion y respiracion para recuperar equilibrio.", longDescription: "Espacio para practicar respiracion, estiramientos sencillos y habitos de recuperacion emocional.", initials: "EI", logoInitials: "EI", tone: "gold", role: "none", heroImage: "/images/patient-export/18ff3de3a304845f9d98.jpg", features: ["Meditacion", "Balance", "Respiracion"] },
    { id: "paso-constante", catalogId: "community-paso-constante", slug: "paso-constante", repositorySource: "catalogo-base", exploreCategory: "running", name: "Paso Constante", category: "Running", access: "open", visibility: "public", members: 68, city: "Ciudad de Mexico", description: "Caminata, trote ligero y metas semanales faciles de seguir.", longDescription: "Comunidad para comenzar actividad fisica con caminatas progresivas y seguimiento amable.", initials: "PC", logoInitials: "PC", tone: "blue", role: "none", heroImage: "/images/patient-export/b59b76e1620259f879ce.jpg", features: ["Caminata", "Trote ligero", "Metas"] },
    { id: "running-klini", catalogId: "community-running-klini", slug: "running-klini", repositorySource: "catalogo-base", exploreCategory: "running", name: "Running Klini", category: "Running", access: "closed", visibility: "public", members: 73, city: "Monterrey", description: "Entrenamiento seguro para retomar carrera sin presion.", longDescription: "Planes simples para correr o caminar con seguimiento de esfuerzo, descanso y progreso.", initials: "RK", logoInitials: "RK", tone: "mint", role: "none", heroImage: "/images/patient-export/b59ab911e2e7afa4f63e.jpg", features: ["Carrera suave", "Progreso", "Prevencion"] },
    { id: "caminata-metabolica", catalogId: "community-caminata-metabolica", slug: "caminata-metabolica", repositorySource: "catalogo-base", exploreCategory: "running", name: "Caminata Metabolica", category: "Running", access: "open", visibility: "public", members: 92, city: "Ciudad de Mexico", description: "Caminatas guiadas para energia, glucosa y bienestar diario.", longDescription: "Grupo de caminatas con enfoque cardiometabolico, seguimiento semanal y actividades al aire libre.", initials: "CM", logoInitials: "CM", tone: "blue", role: "none", heroImage: "/images/patient-export/847391ad6e1a2d5a1665.jpg", features: ["Caminatas", "Metabolismo", "Habitos"] },
    { id: "cocina-saludable", catalogId: "community-cocina-saludable", slug: "cocina-saludable", repositorySource: "catalogo-base", exploreCategory: "nutricion", name: "Cocina Saludable", category: "Nutricion", access: "open", visibility: "public", members: 74, city: "Ciudad de Mexico", description: "Recetas simples y listas de compra para comer mejor.", longDescription: "Ideas de menu, sustituciones y preparacion sencilla para mejorar adherencia nutricional.", initials: "CS", logoInitials: "CS", tone: "gold", role: "none", heroImage: "/images/patient-export/d058a3cf7b1d172870e0.jpg", features: ["Recetas", "Compras", "Menu"] },
    { id: "nutricion-consciente", catalogId: "community-nutricion-consciente", slug: "nutricion-consciente", repositorySource: "catalogo-base", exploreCategory: "nutricion", name: "Nutricion Consciente", category: "Nutricion", access: "open", visibility: "public", members: 73, city: "Puebla", description: "Planificacion, porciones y seguimiento sin culpa.", longDescription: "Acompanamiento comunitario para construir habitos de alimentacion sostenibles.", initials: "NC", logoInitials: "NC", tone: "mint", role: "none", heroImage: "/images/patient-export/a3dde8d27437d87d2bd8.jpg", features: ["Porciones", "Planificacion", "Habitos"] },
    { id: "fuerza-en-equilibrio", catalogId: "community-fuerza-equilibrio", slug: "fuerza-en-equilibrio", repositorySource: "catalogo-base", exploreCategory: "fuerza", name: "Fuerza en Equilibrio", category: "Fuerza", access: "open", visibility: "public", members: 65, city: "Guadalajara", description: "Entrenamiento progresivo, movilidad y tecnica segura.", longDescription: "Ejercicios de fuerza funcional adaptados para crear constancia sin sobrecarga.", initials: "FE", logoInitials: "FE", tone: "violet", role: "none", heroImage: "/images/patient-export/2b9f2acde9605c18f665.jpg", features: ["Fuerza", "Tecnica", "Movilidad"] },
    { id: "movilidad-funcional", catalogId: "community-movilidad-funcional", slug: "movilidad-funcional", repositorySource: "catalogo-base", exploreCategory: "fuerza", name: "Movilidad Funcional", category: "Fuerza", access: "closed", visibility: "public", members: 58, city: "Ciudad de Mexico", description: "Rutinas de movilidad y fuerza para cuidar articulaciones.", longDescription: "Sesiones cortas para mejorar movilidad, postura y fuerza de forma progresiva.", initials: "MF", logoInitials: "MF", tone: "blue", role: "none", heroImage: "/images/patient-export/88ac192570ebecf4e969.jpg", features: ["Movilidad", "Postura", "Fuerza"] },
    { id: "mente-serena", catalogId: "community-mente-serena", slug: "mente-serena", repositorySource: "catalogo-base", exploreCategory: "salud-mental", name: "Mente Serena", category: "Salud mental", access: "open", visibility: "public", members: 88, city: "Queretaro", description: "Herramientas de calma, descanso y regulacion emocional.", longDescription: "Espacio para aprender pausas de respiracion, higiene del sueno y estrategias de autocuidado.", initials: "MS", logoInitials: "MS", tone: "violet", role: "none", heroImage: "/images/patient-export/8b44dedfdfafe0addfce.jpg", features: ["Calma", "Descanso", "Autocuidado"] },
    { id: "pausa-consciente", catalogId: "community-pausa-consciente", slug: "pausa-consciente", repositorySource: "catalogo-base", exploreCategory: "salud-mental", name: "Pausa Consciente", category: "Salud mental", access: "open", visibility: "public", members: 62, city: "Ciudad de Mexico", description: "Pausas breves para manejar estres durante el dia.", longDescription: "Practicas simples para integrar respiracion, enfoque y descanso mental en rutinas diarias.", initials: "PA", logoInitials: "PA", tone: "mint", role: "none", heroImage: "/images/patient-export/44d5adc37ae04f49c009.jpg", features: ["Estres", "Pausas", "Respiracion"] },
    { id: "habitos-en-equilibrio", catalogId: "community-habitos-equilibrio", slug: "habitos-en-equilibrio", repositorySource: "catalogo-base", exploreCategory: "bienestar", name: "Habitos en Equilibrio", category: "Bienestar", access: "open", visibility: "public", members: 81, city: "Ciudad de Mexico", description: "Metas pequenas para agua, descanso, movimiento y energia.", longDescription: "Comunidad para construir habitos integrales y celebrar avances diarios.", initials: "HE", logoInitials: "HE", tone: "mint", role: "none", heroImage: "/images/patient-export/8de7f3abd9b1451e2fc4.jpg", features: ["Habitos", "Metas", "Bienestar"] },
    { id: "ciclos-de-bienestar", catalogId: "community-ciclos-bienestar", slug: "ciclos-de-bienestar", repositorySource: "catalogo-base", exploreCategory: "bienestar", name: "Ciclos de Bienestar", category: "Bienestar", access: "open", visibility: "public", members: 51, city: "Merida", description: "Rutinas semanales para cuidar cuerpo, energia y descanso.", longDescription: "Seguimiento por ciclos con recomendaciones simples para sostener bienestar personal.", initials: "CB", logoInitials: "CB", tone: "blue", role: "none", heroImage: "/images/patient-export/f8bdbee90198bf11fadc.jpg", features: ["Rutinas", "Energia", "Descanso"] },
    { id: "menu-inteligente", catalogId: "community-menu-inteligente", slug: "menu-inteligente", repositorySource: "catalogo-base", exploreCategory: "nutricion", name: "Menu Inteligente", category: "Nutricion", access: "closed", visibility: "public", members: 69, city: "Ciudad de Mexico", description: "Planeacion de comidas, adherencia y recetas practicas.", longDescription: "Grupo para preparar menus semanales, revisar objetivos nutricionales y compartir alternativas saludables.", initials: "MI", logoInitials: "MI", tone: "gold", role: "none", heroImage: "/images/patient-export/998ce081eeca9ff6b6eb.jpg", features: ["Menu", "Recetas", "Adherencia"] },
    { id: "core-seguro", catalogId: "community-core-seguro", slug: "core-seguro", repositorySource: "catalogo-base", exploreCategory: "fuerza", name: "Core Seguro", category: "Fuerza", access: "open", visibility: "public", members: 60, city: "Monterrey", description: "Fuerza central, estabilidad y progresion sin dolor.", longDescription: "Ejercicios de core y estabilidad con niveles para avanzar de forma segura.", initials: "CO", logoInitials: "CO", tone: "violet", role: "none", heroImage: "/images/patient-export/5f8ec1f0b28698a301dc.jpg", features: ["Core", "Estabilidad", "Progresion"] },
    { id: "descanso-profundo", catalogId: "community-descanso-profundo", slug: "descanso-profundo", repositorySource: "catalogo-base", exploreCategory: "salud-mental", name: "Descanso Profundo", category: "Salud mental", access: "closed", visibility: "public", members: 79, city: "Ciudad de Mexico", description: "Rutinas de descanso, sueno y pausas para recuperar energia.", longDescription: "Practicas para mejorar descanso, reducir tension y preparar el cuerpo para dormir mejor.", initials: "DP", logoInitials: "DP", tone: "violet", role: "none", heroImage: "/images/patient-export/93851cce76f290545d44.jpg", features: ["Sueno", "Descanso", "Calma"] },
    { id: "bienestar-integral-klini", catalogId: "community-bienestar-integral-klini", slug: "bienestar-integral-klini", repositorySource: "catalogo-base", exploreCategory: "bienestar", name: "Bienestar Integral Klini", category: "Bienestar", access: "open", visibility: "public", members: 93, city: "Guadalajara", description: "Seguimiento integral para metas pequenas y sostenibles.", longDescription: "Comunidad para combinar hidratacion, movimiento, descanso y seguimiento de metas personales.", initials: "BI", logoInitials: "BI", tone: "mint", role: "none", heroImage: "/images/patient-export/44d5adc37ae04f49c009.jpg", features: ["Integral", "Metas", "Seguimiento"] },
    { id: "respira-profundo", catalogId: "community-respira-profundo", slug: "respira-profundo", repositorySource: "catalogo-base", exploreCategory: "yoga", name: "Respira Profundo", category: "Yoga", access: "open", visibility: "public", members: 102, city: "Puebla", description: "Respiracion guiada y calma para todos los dias.", longDescription: "Comunidad para practicar respiracion profunda, estiramientos suaves y pausas de bienestar en grupo.", initials: "RP", logoInitials: "RP", tone: "mint", role: "none", heroImage: "/images/patient-export/58f5ec6b1b32fa8dfa5a.jpg", features: ["Respiracion", "Calma", "Pausas"] },
    { id: "energia-matutina", catalogId: "community-energia-matutina", slug: "energia-matutina", repositorySource: "catalogo-base", exploreCategory: "bienestar", name: "Energia Matutina", category: "Bienestar", access: "open", visibility: "public", members: 57, city: "Ciudad de Mexico", description: "Rutinas cortas para iniciar el dia con energia.", longDescription: "Grupo para compartir rituales de manana, hidratacion, movilidad breve y metas personales.", initials: "EM", logoInitials: "EM", tone: "gold", role: "none", heroImage: "/images/patient-export/8de7f3abd9b1451e2fc4.jpg", features: ["Manana", "Energia", "Habitos"] },
    { id: "control-glucosa", catalogId: "community-control-glucosa", slug: "control-glucosa", repositorySource: "catalogo-base", exploreCategory: "nutricion", name: "Control de Glucosa", category: "Nutricion", access: "closed", visibility: "public", members: 48, city: "Ciudad de Mexico", description: "Habitos, comida y seguimiento para control metabolico.", longDescription: "Comunidad de apoyo para registrar glucosa, preparar menus sencillos y compartir avances de adherencia.", initials: "CG", logoInitials: "CG", tone: "blue", role: "none", heroImage: "/images/patient-export/2249ee14324419269d99.jpg", features: ["Glucosa", "Menu", "Seguimiento"] },
    { id: "movimiento-suave", catalogId: "community-movimiento-suave", slug: "movimiento-suave", repositorySource: "catalogo-base", exploreCategory: "fuerza", name: "Movimiento Suave", category: "Fuerza", access: "open", visibility: "public", members: 66, city: "Merida", description: "Movilidad, fuerza ligera y rutinas seguras.", longDescription: "Espacio para retomar movimiento con ejercicios simples, fuerza progresiva y cuidado articular.", initials: "MV", logoInitials: "MV", tone: "violet", role: "none", heroImage: "/images/patient-export/88ac192570ebecf4e969.jpg", features: ["Movilidad", "Fuerza ligera", "Rutinas"] },
    { id: "familia-saludable", catalogId: "community-familia-saludable", slug: "familia-saludable", repositorySource: "catalogo-base", exploreCategory: "bienestar", name: "Familia Saludable", category: "Bienestar", access: "open", visibility: "public", members: 90, city: "Monterrey", description: "Metas de bienestar para pacientes y familias.", longDescription: "Comunidad para coordinar habitos familiares, movimiento, alimentacion sencilla y recordatorios de salud.", initials: "FS", logoInitials: "FS", tone: "mint", role: "none", heroImage: "/images/patient-export/79c1f3731e62fb9ad0ec.jpg", features: ["Familia", "Recordatorios", "Metas"] },
    { id: "estres-bajo-control", catalogId: "community-estres-bajo-control", slug: "estres-bajo-control", repositorySource: "catalogo-base", exploreCategory: "salud-mental", name: "Estres Bajo Control", category: "Salud mental", access: "closed", visibility: "public", members: 52, city: "Queretaro", description: "Tecnicas sencillas para regular estres y descansar mejor.", longDescription: "Grupo para practicar respiracion, pausas conscientes, higiene del sueno y seguimiento emocional.", initials: "EC", logoInitials: "EC", tone: "violet", role: "none", heroImage: "/images/patient-export/93851cce76f290545d44.jpg", features: ["Estres", "Descanso", "Regulacion"] }
  ]);

  var events = [
    { id: "e1", group: "week", communityId: "respira", category: "Yoga", title: "Respiracion y movilidad suave", date: "miercoles, 22 de julio", day: "mie", number: "22", month: "jul", time: "07:00 p.m.", place: "Casa Klini Roma Norte", modality: "Presencial", capacity: 18, available: 14 },
    { id: "e2", group: "week", communityId: "respira", category: "Yoga", title: "Postura y respiracion", date: "jueves, 23 de julio", day: "jue", number: "23", month: "jul", time: "06:00 p.m.", place: "Casa Klini Condesa", modality: "Presencial", capacity: 20, available: 20 },
    { id: "e3", group: "week", communityId: "ritmo", category: "Running", title: "Caminata metabolica", date: "viernes, 24 de julio", day: "vie", number: "24", month: "jul", time: "08:00 a.m.", place: "Parque La Mexicana", modality: "Presencial", capacity: 24, available: 8 },
    { id: "e4", group: "week", communityId: "mente", category: "Salud mental", title: "Cierre de semana consciente", date: "sabado, 25 de julio", day: "sab", number: "25", month: "jul", time: "10:00 a.m.", place: "Remoto", modality: "Remoto", capacity: 30, available: 11 },
    { id: "e5", group: "week", communityId: "nutricion", category: "Nutricion", title: "Cocina practica de domingo", date: "domingo, 26 de julio", day: "dom", number: "26", month: "jul", time: "11:30 a.m.", place: "Casa Klini Polanco", modality: "Presencial", capacity: 16, available: 5 },
    { id: "e6", group: "week", communityId: "sendero", category: "Senderismo", title: "Preparacion para sendero", date: "domingo, 26 de julio", day: "dom", number: "26", month: "jul", time: "05:00 p.m.", place: "Remoto", modality: "Remoto", capacity: 40, available: 17 },
    { id: "e7", group: "next", communityId: "nutricion", category: "Nutricion", title: "Menu semanal practico", date: "martes, 28 de julio", day: "mar", number: "28", month: "jul", time: "06:30 p.m.", place: "Remoto", modality: "Remoto", capacity: 40, available: 40 },
    { id: "e8", group: "next", communityId: "mente", category: "Salud mental", title: "Rutina de descanso", date: "miercoles, 29 de julio", day: "mie", number: "29", month: "jul", time: "08:00 p.m.", place: "Remoto", modality: "Remoto", capacity: 30, available: 30 },
    { id: "e9", group: "next", communityId: "ritmo", category: "Running", title: "Tecnica de caminata", date: "jueves, 30 de julio", day: "jue", number: "30", month: "jul", time: "07:00 a.m.", place: "Bosque de Chapultepec", modality: "Presencial", capacity: 22, available: 9 },
    { id: "e10", group: "next", communityId: "respira", category: "Yoga", title: "Yoga para espalda", date: "viernes, 31 de julio", day: "vie", number: "31", month: "jul", time: "06:00 p.m.", place: "Casa Klini Roma Norte", modality: "Presencial", capacity: 18, available: 7 },
    { id: "e11", group: "next", communityId: "fuerza", category: "Fuerza", title: "Movimiento funcional", date: "sabado, 1 de agosto", day: "sab", number: "01", month: "ago", time: "09:00 a.m.", place: "Casa Klini Sur", modality: "Presencial", capacity: 18, available: 12 },
    { id: "e12", group: "next", communityId: "mente", category: "Meditacion", title: "Pausa consciente", date: "domingo, 2 de agosto", day: "dom", number: "02", month: "ago", time: "08:00 p.m.", place: "Remoto", modality: "Remoto", capacity: 12, available: 12 },
    { id: "e13", group: "soon", communityId: "mente", category: "Meditacion", title: "Pausa consciente", date: "lunes, 3 de agosto", day: "lun", number: "03", month: "ago", time: "08:00 p.m.", place: "Remoto", modality: "Remoto", capacity: 12, available: 12 },
    { id: "e14", group: "soon", communityId: "respira", category: "Yoga", title: "Yoga restaurativo", date: "miercoles, 5 de agosto", day: "mie", number: "05", month: "ago", time: "07:00 p.m.", place: "Casa Klini Roma Norte", modality: "Presencial", capacity: 16, available: 16 },
    { id: "e15", group: "soon", communityId: "ritmo", category: "Running", title: "Caminata con inclinacion", date: "sabado, 8 de agosto", day: "sab", number: "08", month: "ago", time: "08:00 a.m.", place: "Parque La Mexicana", modality: "Presencial", capacity: 24, available: 19 },
    { id: "e16", group: "soon", communityId: "nutricion", category: "Nutricion", title: "Compras inteligentes", date: "martes, 11 de agosto", day: "mar", number: "11", month: "ago", time: "06:00 p.m.", place: "Remoto", modality: "Remoto", capacity: 30, available: 23 },
    { id: "e17", group: "soon", communityId: "fuerza", category: "Fuerza", title: "Fuerza sin dolor", date: "jueves, 13 de agosto", day: "jue", number: "13", month: "ago", time: "07:00 p.m.", place: "Casa Klini Sur", modality: "Presencial", capacity: 18, available: 10 },
    { id: "e18", group: "soon", communityId: "sendero", category: "Senderismo", title: "Salida al Ajusco", date: "sabado, 15 de agosto", day: "sab", number: "15", month: "ago", time: "06:30 a.m.", place: "Ajusco", modality: "Presencial", capacity: 20, available: 6 }
  ];

  var eventCountryOptions = [
    { value: "MX Mexico", name: "Mexico", code: "MX", tone: "mx" },
    { value: "US Estados Unidos", name: "Estados Unidos", code: "US", tone: "us" },
    { value: "CO Colombia", name: "Colombia", code: "CO", tone: "co" },
    { value: "ES Espana", name: "Espana", code: "ES", tone: "es" },
    { value: "AR Argentina", name: "Argentina", code: "AR", tone: "ar" },
    { value: "CL Chile", name: "Chile", code: "CL", tone: "cl" }
  ];

  var eventCityOptionsByCountry = {
    "MX Mexico": ["Ciudad de Mexico", "Monterrey", "Guadalajara", "Queretaro"],
    "US Estados Unidos": ["Miami", "Houston", "Los Angeles", "Nueva York"],
    "CO Colombia": ["Bogota", "Medellin", "Cali", "Barranquilla"],
    "ES Espana": ["Madrid", "Barcelona", "Valencia", "Sevilla"],
    "AR Argentina": ["Buenos Aires", "Cordoba", "Rosario"],
    "CL Chile": ["Santiago", "Valparaiso", "Concepcion"]
  };

  function merge(a, b) {
    var out = {}, key;
    for (key in a) out[key] = a[key];
    for (key in b || {}) out[key] = b[key];
    return out;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function initialsFromName(name) {
    return String(name || "Comunidad").split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (part) { return part.charAt(0); }).join("").toUpperCase() || "CC";
  }

  function slugify(value) {
    return String(value || "comunidad")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "comunidad";
  }

  function normalizeSearch(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  var EVENT_DAY_LABELS = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
  var EVENT_MONTH_INDEX = {
    ene: 0, enero: 0,
    feb: 1, febrero: 1,
    mar: 2, marzo: 2,
    abr: 3, abril: 3,
    may: 4, mayo: 4,
    jun: 5, junio: 5,
    jul: 6, julio: 6,
    ago: 7, agosto: 7,
    sep: 8, sept: 8, septiembre: 8,
    oct: 9, octubre: 9,
    nov: 10, noviembre: 10,
    dic: 11, diciembre: 11
  };

  function pad2(value) {
    value = String(value);
    return value.length < 2 ? "0" + value : value;
  }

  function dateKeyFromDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function normalizeCommunityRecord(community) {
    var source = community || {};
    var name = source.name || "Comunidad";
    var access = source.access || source.accessType || (source.type === "private" ? "closed" : "open");
    if (access === "private") access = "closed";
    var normalized = merge({
      id: source.id || source.catalogId || "community-" + Date.now(),
      catalogId: source.catalogId || source.id || "",
      slug: source.slug || slugify(name),
      repositorySource: source.repositorySource || "usuario",
      name: name,
      category: source.category || "Bienestar",
      access: access,
      visibility: source.visibility || (source.publicDirectory === false ? "hidden" : "public"),
      members: Number(source.members || source.memberCount || 1),
      city: source.city || "Ciudad de Mexico",
      region: source.region || "",
      language: source.language || "Espanol",
      description: source.description || source.shortDescription || "Comunidad de bienestar.",
      longDescription: source.longDescription || source.description || source.shortDescription || "Un espacio para compartir metas de bienestar y participar en actividades comunitarias.",
      rules: source.rules || "Mantener respeto, privacidad y participacion responsable dentro de la comunidad.",
      pinnedMessage: source.pinnedMessage || "Bienvenidos a la comunidad. Revisa las actividades disponibles y participa cuando quieras.",
      initials: source.initials || source.logoInitials || initialsFromName(name),
      logoInitials: source.logoInitials || source.initials || initialsFromName(name),
      tone: source.tone || source.coverTone || "mint",
      role: source.role || "admin",
      heroImage: source.heroImage || source.backgroundImage || source.coverImage || "",
      profileImage: source.profileImage || source.logoImage || "",
      features: source.features || ["Bienestar integral", "Eventos semanales", "Comunidad activa"],
      classes: source.classes || [],
      createdAt: source.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, source);
    normalized.access = access === "closed" ? "closed" : "open";
    normalized.accessType = normalized.access;
    normalized.memberCount = normalized.members;
    return normalized;
  }

  function sameCommunityRecord(a, b) {
    if (!a || !b) return false;
    return Boolean(
      (a.id && b.id && a.id === b.id) ||
      (a.catalogId && b.catalogId && a.catalogId === b.catalogId) ||
      (a.slug && b.slug && a.slug === b.slug)
    );
  }

  function upsertCommunityRecord(community, placement) {
    var normalized = normalizeCommunityRecord(community);
    var index = communities.findIndex(function (item) { return sameCommunityRecord(item, normalized); });
    if (index >= 0) {
      communities[index] = normalizeCommunityRecord(merge(communities[index], normalized));
      return communities[index];
    }
    if (placement === "append") communities.push(normalized);
    else communities.unshift(normalized);
    return normalized;
  }

  function icon(name) {
    var paths = {
      compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      minus: '<path d="M5 12h14"/>',
      video: '<path d="M15 10 21 6v12l-6-4v-4Z"/><rect x="3" y="6" width="12" height="12" rx="2"/>',
      ticket: '<path d="M2 9a3 3 0 0 0 0 6v4h20v-4a3 3 0 0 0 0-6V5H2v4Z"/><path d="M13 5v2M13 10v4M13 17v2"/>',
      shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3v8Z"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7M12 7h.01"/>',
      lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
      image: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m7 15 3-3 2 2 3-4 4 5"/>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      camera: '<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="3.5"/>',
      check: '<path d="m20 6-11 11-5-5"/>',
      eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
      leaf: '<path d="M20 4C12 4 6 8 5 16c7 1 13-2 15-12Z"/><path d="M5 20c3-5 7-8 12-10"/>',
      lotus: '<path d="M12 20C8 16 7 10 12 3c5 7 4 13 0 17Z"/><path d="M8 9 3 7c0 8 3 13 9 13M16 9l5-2c0 8-3 13-9 13M5 13l-4-1c1 6 5 9 11 8m7-7 4-1c-1 6-5 9-11 8"/>',
      person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2Z"/>',
      tag: '<path d="M20 13 11 4H4v7l9 9a2 2 0 0 0 3 0l4-4a2 2 0 0 0 0-3Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
      sparkles: '<path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>',
      search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
      filter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
      heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
      repost: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
      message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/>',
      send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      map: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
      globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
      analytics: '<path d="M4 19V5"/><path d="M4 19h17"/><rect x="7" y="11" width="3" height="5" rx="1"/><rect x="12" y="8" width="3" height="8" rx="1"/><rect x="17" y="4" width="3" height="12" rx="1"/>',
      arrow: '<path d="m9 18 6-6-6-6"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      home: '<path d="m3 11 9-8 9 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z"/><path d="M9 22V12h6v10"/>',
      plus: '<path d="M12 5v14M5 12h14"/>'
    };
    return '<svg aria-hidden="true" viewBox="0 0 24 24">' + (paths[name] || paths.users) + '</svg>';
  }

  var createSteps = [
    { id: "general", title: "Información general", subtitle: "Nombre y descripción básica", icon: "info" },
    { id: "privacy", title: "Tipo y privacidad", subtitle: "Visibilidad y acceso", icon: "globe" },
    { id: "content", title: "Portada y contenido", subtitle: "Imagen, descripción y reglas", icon: "image" },
    { id: "members", title: "Miembros y permisos", subtitle: "Configuración de participación", icon: "users" },
    { id: "review", title: "Revisión y crear", subtitle: "Resumen final", icon: "shield" }
  ];

  function defaultCreateDraft() {
    return {
      name: "",
      shortDescription: "",
      category: "",
      city: "",
      tags: "",
      type: "open",
      approveRequests: true,
      publicDirectory: true,
      longDescription: "",
      objective: "",
      rules: "",
      allowPosts: true,
      allowComments: true,
      allowEvents: true,
      allowClasses: false,
      adminSearch: "",
      adminUserNumber: "",
      adminAllowStories: true,
      adminAllowCommunityPosts: true,
      adminAllowEvents: true,
      adminAllowClasses: true,
      adminAllowEditPage: true,
      coverImage: "",
      profileImage: "",
      memberLimit: "Sin límite",
      confirmed: true
    };
  }

  function CommunityApp(root, options) {
    this.root = root;
    this.options = merge(DEFAULTS, options);
    this.state = {
      view: this.options.startView, detailId: null, filter: "explore", category: "all",
      calendarFilter: "reserved", calendarDetailId: null,
      demoReservationsSeeded: false,
      memberships: {}, reservations: { e1: true }, limits: { week: 5, next: 5, soon: 5 }, likes: {},
      commentsOpen: {},
      sharesOpen: {},
      activeReplyThreads: {},
      replyThreads: {},
      postComments: {},
      reposts: {},
      followRequests: {},
      replyDrafts: {},
      storyIndex: null,
      showAllStories: false,
      storyUploads: {},
      adminCommunityEdits: {},
      adminTextEdit: null,
      adminTextDrafts: {},
      adminCreatedEvents: [],
      adminEventDrafts: {},
      adminEventMode: "list",
      adminEventStep: 1,
      adminEventSuccess: null,
      adminCreatedClasses: [],
      adminClassDrafts: {},
      adminClassMode: "list",
      adminClassStep: 1,
      adminClassSuccess: null,
      memberRequestDecisions: {},
      approvedCommunityMembers: {},
      cancelConfirmId: null,
      reservationFlow: null,
      createdCommunities: [],
      createStep: 1, createDraft: defaultCreateDraft(), createCompleted: false, createdCommunityId: null,
      eventSearch: "",
      communitySearch: "",
      eventFilters: { country: "MX Mexico", city: "", community: "", location: "", date: "" },
      eventFilterQueries: {},
      activeEventFilter: "",
      eventCountryExpanded: false,
      selectedExploreCategory: "",
      adminTool: "stories",
      pendingDirectoryFocus: false
    };
    this.initialState = JSON.parse(JSON.stringify(this.state));
    this.storyTimer = null;
    this.storyTimerToken = 0;
    this.load();
    this.stories = this.options.stories && window.KliniPatientStories
      ? window.KliniPatientStories.create(this, merge(this.options.stories, {people: people})) : null;
    this.bind();
    this.render();
    this.handleHashRoute();
    if (this.options.startView !== "posts" && window.KliniCommunityActivities) {
      var app = this;
      window.addEventListener("klini:activities", function () { app.render(); });
      window.KliniCommunityActivities.load().then(function () { app.render(); }).catch(function () {
        var status = app.root.querySelector('[data-community-search-status]');
        if (status) { status.hidden = false; status.textContent = 'No se pudieron cargar las actividades. Reabre Comunidades para intentar de nuevo.'; }
      });
    }
    if (this.stories) this.stories.refresh();
  }

  CommunityApp.prototype.activePatientProfile = function () {
    var base = this.options.patient || {};
    var api = window.DrSamPatientProfilePanel;
    try {
      if (api && api.getActiveProfile) return merge(base, api.getActiveProfile());
    } catch (error) {}
    var storage = this.options.profileStorageKey;
    if (!storage) {
      var profilePanel = document.querySelector("[data-patient-profile-panel]");
      storage = profilePanel && profilePanel.dataset ? profilePanel.dataset.storageKey : "";
    }
    try {
      var saved = storage && window.localStorage ? JSON.parse(window.localStorage.getItem(storage) || "null") : null;
      var accounts = Array.isArray(saved && saved.alternateAccounts) ? saved.alternateAccounts : [];
      var activeAccount = accounts.find(function (account) { return account.id === (saved && saved.activeAlternateId); });
      if (activeAccount) return merge(base, activeAccount);
      if (saved && saved.profile) return merge(base, saved.profile);
    } catch (error) {}
    return base;
  };

  CommunityApp.prototype.patientProfilePhoto = function () {
    var activeProfile = this.activePatientProfile();
    var directPhoto = activeProfile && activeProfile.photo;
    if (directPhoto) return directPhoto;
    var storage = this.options.profileStorageKey;
    if (!storage) {
      var profilePanel = document.querySelector("[data-patient-profile-panel]");
      storage = profilePanel && profilePanel.dataset ? profilePanel.dataset.storageKey : "";
    }
    try {
      var saved = storage && window.localStorage ? JSON.parse(window.localStorage.getItem(storage) || "null") : null;
      return saved && saved.profile && saved.profile.photo ? saved.profile.photo : "";
    } catch (error) {
      return "";
    }
  };

  CommunityApp.prototype.patientSummary = function () {
    var patient = this.activePatientProfile();
    return {
      id: String(patient.userId || patient.id || "patient"),
      name: patient.name || "Tu historia",
      short: "Tu historia",
      avatar: this.patientProfilePhoto() || "/images/communities/category-mine.png"
    };
  };

  CommunityApp.prototype.storyImageFor = function (id, fallback) {
    var uploads = this.state.storyUploads || {};
    return uploads[id] || fallback || "/images/communities/category-mine.png";
  };

  CommunityApp.prototype.adminStoryCommunities = function () {
    var seen = {};
    return communities.filter(function (community) {
      var key = community.slug || community.id;
      var role = this.communityRole(community);
      var canPublishStories = !community.adminPermissions || community.adminPermissions.stories !== false;
      if (seen[key] || role !== "admin" || !canPublishStories) return false;
      seen[key] = true;
      return true;
    }, this).sort(function (a, b) {
      var aAsh = a.slug === "ash-and-olmo" ? 0 : 1;
      var bAsh = b.slug === "ash-and-olmo" ? 0 : 1;
      return aAsh - bAsh;
    });
  };

  CommunityApp.prototype.storyItems = function () {
    var patient = this.activePatientProfile();
    var patientPhoto = this.patientProfilePhoto() || "/images/communities/category-mine.png";
    var patientStoryPhoto = this.storyImageFor("patient", patientPhoto);
    var items = [{
      id: String(patient.userId || patient.id || "patient"),
      name: patient.name || "Tu historia",
      short: "Tu historia",
      avatar: patientStoryPhoto,
      storyPhoto: patientStoryPhoto,
      isPatient: true,
      canUploadStory: true
    }];
    if (this.options.startView !== "posts") {
      this.adminStoryCommunities().forEach(function (community) {
        var storyId = "community:" + (community.slug || community.id);
        var communityPhoto = community.profileImage || community.heroImage || "/images/communities/create-cover.png";
        items.push({
          id: storyId,
          communityId: community.id,
          name: community.name,
          short: community.name === "Ash and Olmo" ? "Ash Olmo" : community.name,
          avatar: this.storyImageFor(storyId, communityPhoto),
          storyPhoto: this.storyImageFor(storyId, community.heroImage || communityPhoto),
          isManagedCommunity: true,
          canUploadStory: true
        });
      }, this);
    }
    (this.options.startView === "posts" && !this.state.showAllStories ? people.slice(0, 4) : people)
      .forEach(function (person) { items.push(person); });
    if (this.options.startView !== "posts") {
      items.push({
        id: "more",
        name: "Más historias",
        short: "Más",
        avatar: "/images/communities/create-cover.png",
        isMore: true
      });
    }
    return items;
  };

  CommunityApp.prototype.switchPatientProfile = function (patient, storageKey) {
    this.options.patient = merge(this.options.patient || {}, patient || {});
    if (storageKey && storageKey !== this.options.storageKey) {
      this.options.storageKey = storageKey;
      this.state = JSON.parse(JSON.stringify(this.initialState));
      this.load();
      this.handleHashRoute();
    }
    if (this.stories) this.stories.reset();
    this.render();
  };

  CommunityApp.prototype.load = function () {
    this.restoreCommunityCatalog();
    try {
      var saved = JSON.parse(localStorage.getItem(this.options.storageKey) || "null");
      if (saved) {
        this.state.memberships = saved.memberships || {};
        this.state.reservations = saved.reservations || { e1: true };
        this.state.demoReservationsSeeded = saved.demoReservationsSeeded === true;
        this.state.likes = saved.likes || {};
        this.state.reposts = saved.reposts || {};
        this.state.followRequests = saved.followRequests || {};
        this.state.postComments = saved.postComments || {};
        this.state.replyThreads = saved.replyThreads || {};
        this.state.storyUploads = saved.storyUploads || {};
        this.state.adminCommunityEdits = saved.adminCommunityEdits || {};
        this.state.adminCreatedEvents = Array.isArray(saved.adminCreatedEvents) ? saved.adminCreatedEvents : [];
        this.state.adminEventDrafts = saved.adminEventDrafts || {};
        this.state.adminCreatedClasses = Array.isArray(saved.adminCreatedClasses) ? saved.adminCreatedClasses : [];
        this.state.adminClassDrafts = saved.adminClassDrafts || {};
        this.state.memberRequestDecisions = saved.memberRequestDecisions || {};
        this.state.approvedCommunityMembers = saved.approvedCommunityMembers || {};
        this.state.eventFilters = merge(this.defaultEventFilters(), saved.eventFilters || {});
        this.state.createdCommunities = saved.createdCommunities || this.state.createdCommunities || [];
      }
    } catch (error) {}
    this.restoreCreatedCommunities();
    this.applyAdminCommunityEdits();
  };

  CommunityApp.prototype.save = function () {
    this.state.createdCommunities = this.createdCommunityRecords();
    this.saveCommunityCatalog();
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify({
        memberships: this.state.memberships,
        reservations: this.state.reservations,
        demoReservationsSeeded: this.state.demoReservationsSeeded,
        likes: this.state.likes,
        reposts: this.state.reposts,
        followRequests: this.state.followRequests,
        postComments: this.state.postComments,
        replyThreads: this.state.replyThreads,
        storyUploads: this.state.storyUploads,
        adminCommunityEdits: this.state.adminCommunityEdits,
        adminCreatedEvents: this.state.adminCreatedEvents,
        adminEventDrafts: this.state.adminEventDrafts,
        adminCreatedClasses: this.state.adminCreatedClasses,
        adminClassDrafts: this.state.adminClassDrafts,
        memberRequestDecisions: this.state.memberRequestDecisions,
        approvedCommunityMembers: this.state.approvedCommunityMembers,
        eventFilters: this.currentEventFilters(),
        createdCommunities: this.state.createdCommunities
      }));
    } catch (error) {}
  };

  CommunityApp.prototype.emit = function (type, data) {
    var profile = this.activePatientProfile();
    this.options.onAction({ type: type, data: data || null, state: this.state, profileId: String(profile.userId || profile.id), source: this.options.startView === "posts" ? "home" : "communities" });
  };

  CommunityApp.prototype.navigateAdminPanel = function (id) {
    this.openAdminPanel(id);
    if (this.state.view !== "admin") return false;
    this.save();
    this.render();
    this.scrollToScreenTop("auto");
    return true;
  };

  CommunityApp.prototype.handleHashRoute = function () {
    if (this.options.startView === "posts") return;
    var match = window.location.hash.match(/^#community-admin-(.+)$/);
    if (!match) return;
    var id = decodeURIComponent(match[1]);
    if (this.navigateAdminPanel(id) && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  CommunityApp.prototype.bind = function () {
    var self = this;
    function closestFromEvent(event, selector) {
      var target = event.target;
      if (!target) return null;
      if (target.closest) return target.closest(selector);
      var parent = target.parentElement || target.parentNode;
      return parent && parent.closest ? parent.closest(selector) : null;
    }
    window.addEventListener("drsam:patient-profile", function (event) {
      var action = event.detail && event.detail.action;
      if (action === "profile:photo-updated" || action === "profile:photo-removed") self.render();
    });
    window.addEventListener("hashchange", function () {
      self.handleHashRoute();
    });
    this.root.addEventListener("keydown", function (event) {
      var tab = closestFromEvent(event, "[data-calendar-tabs] [role=tab]");
      if (!tab || ["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) return;
      event.preventDefault();
      var tabs = Array.from(tab.closest("[data-calendar-tabs]").querySelectorAll("[role=tab]"));
      var index = tabs.indexOf(tab);
      index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[index].click();
    });
    this.root.addEventListener("click", function (event) {
      var adminControl = closestFromEvent(event, "[data-admin-panel-link]");
      if (!adminControl || !self.root.contains(adminControl)) return;
      event.preventDefault();
      event.stopPropagation();
      self.navigateAdminPanel(adminControl.getAttribute("data-id"));
    }, true);
    this.root.addEventListener("click", function (event) {
      var control = closestFromEvent(event, "[data-action]");
      var panTrack = closestFromEvent(event, "[data-pan]");
      if (panTrack && panTrack.dataset.ignoreClick === "1") {
        var actionInPan = control ? control.getAttribute("data-action") : "";
        var wasDrag = panTrack.dataset.moved === "1";
        var allowedPanClick = actionInPan === "open-community-panel" || actionInPan === "open-admin-panel" || actionInPan === "confirm-cancel-reservation";
        panTrack.dataset.ignoreClick = "0";
        if (wasDrag || !allowedPanClick) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }
      if (!control) return;
      var action = control.getAttribute("data-action");
      var id = control.getAttribute("data-id");
      var previousView = self.state.view;
      if (["community-section", "calendar-filter", "calendar-detail", "calendar-back"].indexOf(action) !== -1) {
        var sectionScroll = action === "community-section" ? self.captureScrollPosition() : null;
        if (action === "community-section") {
          self.state.view = id === "calendar" ? "calendar" : "feed";
          self.state.calendarDetailId = null;
        }
        if (action === "calendar-filter") self.state.calendarFilter = id === "past" ? "past" : "reserved";
        if (action === "calendar-detail") self.state.calendarDetailId = id;
        if (action === "calendar-back") self.state.calendarDetailId = null;
        self.render();
        if (self.state.view !== previousView) self.options.onNavigate(self.state.view);
        var focusTarget = action === "calendar-detail" ? "[data-calendar-detail-heading]" : action === "calendar-back" ? "[data-calendar-list-heading]" : '[data-action="' + action + '"][data-id="' + id + '"]';
        var focusControl = self.root.querySelector(focusTarget);
        if (focusControl) focusControl.focus({ preventScroll: true });
        if (sectionScroll) self.restoreScrollPosition(sectionScroll);
        else if (action !== "calendar-filter") self.scrollToScreenTop("auto");
        return;
      }
      var preserveScroll = self.shouldPreserveFilterScroll(action);
      var scrollSnapshot = preserveScroll ? self.captureScrollPosition() : null;
      if (action === "open-admin-panel") {
        event.preventDefault();
        event.stopPropagation();
        self.navigateAdminPanel(id);
        return;
      }
      if (action === "create-open") { self.state.view = "create"; self.state.createStep = 1; self.state.createCompleted = false; self.state.createdCommunityId = null; }
      if (action === "create-cancel") { self.state.view = "feed"; self.state.createStep = 1; self.state.createCompleted = false; }
      if (action === "create-next") self.state.createStep = Math.min(5, self.state.createStep + 1);
      if (action === "create-prev") self.state.createStep = Math.max(1, self.state.createStep - 1);
      if (action === "create-step") self.state.createStep = Math.max(1, Math.min(5, Number(id) || 1));
      if (action === "create-submit") self.finishCreate();
      if (action === "create-upload-cover") { self.uploadCreateImage("coverImage"); return; }
      if (action === "create-upload-profile") { self.uploadCreateImage("profileImage"); return; }
      if (action === "upload-story") { self.uploadStoryImage(id || "patient"); return; }
      if (action === "retry-stories" && self.stories) { self.stories.refresh(); return; }
      if (action === "show-more-stories") {
        self.state.showAllStories = true;
        self.render();
        var stories = self.root.querySelector('[data-carousel="stories"]');
        if (stories) stories.scrollLeft = 320;
        return;
      }
      if (action === "create-add-admin") self.addCreateAdministrator();
      if (action === "clear-event-search") {
        self.state.eventSearch = "";
        self.state.eventFilters = self.defaultEventFilters();
        self.state.eventFilterQueries = {};
        self.state.activeEventFilter = "";
        self.state.eventCountryExpanded = false;
      }
      if (action === "select-event-date") {
        var dateFilters = self.currentEventFilters();
        dateFilters.date = dateFilters.date === id ? "" : id;
        self.state.activeEventFilter = "";
      }
      if (action === "scroll-event-dates") {
        var dateTrack = control.closest(".kc-event-date-row");
        dateTrack = dateTrack && dateTrack.querySelector("[data-event-date-scroller]");
        if (dateTrack && dateTrack.scrollBy) dateTrack.scrollBy({ left: (Number(control.getAttribute("data-dir")) || 1) * 180, behavior: "smooth" });
        return;
      }
      if (action === "toggle-event-country-more") self.state.eventCountryExpanded = !self.state.eventCountryExpanded;
      if (action === "toggle-event-filter") self.state.activeEventFilter = self.state.activeEventFilter === id ? "" : id;
      if (action === "select-event-filter") {
        var filterType = control.getAttribute("data-type");
        var filterValue = control.getAttribute("data-value") || "";
        var filters = self.currentEventFilters();
        filters[filterType] = filterValue;
        if (filterType === "country") filters.city = "";
        if (!self.state.eventFilterQueries) self.state.eventFilterQueries = {};
        self.state.eventFilterQueries[filterType] = "";
        self.state.activeEventFilter = filterType === "country" ? "city" : "";
      }
      if (action === "open-directory") self.state.view = "directory";
      if (action === "open-directory-filter") self.selectDirectoryFilter(id || "explore", false);
      if (action === "back-feed" || action === "home") self.state.view = "feed";
      if (action === "open-detail" || action === "open-community-panel") self.openCommunityPanel(id);
      if (action === "open-admin-tool") self.openAdminTool(id);
      if (action === "admin-member-request") self.respondToMemberRequest(control.getAttribute("data-community"), id, control.getAttribute("data-decision"));
      if (action === "admin-create-event") self.openAdminEventCreate();
      if (action === "admin-event-cancel") self.closeAdminEventCreate();
      if (action === "admin-event-prev") self.state.adminEventStep = Math.max(1, self.state.adminEventStep - 1);
      if (action === "admin-event-next") self.state.adminEventStep = Math.min(4, self.state.adminEventStep + 1);
      if (action === "admin-event-choice") self.updateAdminEventDraft(control.getAttribute("data-field"), control.getAttribute("data-value"));
      if (action === "admin-event-toggle") self.toggleAdminEventDraft(control.getAttribute("data-field"));
      if (action === "admin-event-submit") self.submitAdminEvent();
      if (action === "admin-event-dismiss-success") self.state.adminEventSuccess = null;
      if (action === "admin-create-class") self.openAdminClassCreate();
      if (action === "admin-class-cancel") self.closeAdminClassCreate();
      if (action === "admin-class-prev") self.state.adminClassStep = Math.max(1, self.state.adminClassStep - 1);
      if (action === "admin-class-next") self.state.adminClassStep = Math.min(4, self.state.adminClassStep + 1);
      if (action === "admin-class-step") self.state.adminClassStep = Math.max(1, Math.min(4, Number(control.getAttribute("data-step")) || 1));
      if (action === "admin-class-choice") self.updateAdminClassDraft(control.getAttribute("data-field"), control.getAttribute("data-value"));
      if (action === "admin-class-toggle") self.toggleAdminClassDraft(control.getAttribute("data-field"));
      if (action === "admin-class-submit") self.submitAdminClass();
      if (action === "admin-class-dismiss-success") self.state.adminClassSuccess = null;
      if (action === "admin-upload-image") { self.uploadAdminCommunityImage(id, control.getAttribute("data-field")); return; }
      if (action === "admin-edit-text") { self.editAdminCommunityText(id, control.getAttribute("data-field")); return; }
      if (action === "admin-save-text") { self.saveAdminCommunityTextEdit(id, control.getAttribute("data-field")); return; }
      if (action === "admin-cancel-text") { self.cancelAdminCommunityTextEdit(); return; }
      if (action === "back-directory") self.state.view = "directory";
      if (action === "filter") self.selectDirectoryFilter(id || "explore", false);
      if (action === "explore-category") self.state.selectedExploreCategory = id || "";
      if (action === "category") self.state.category = id;
      if (action === "join") self.join(id);
      if (action === "reserve") self.openReservationFlow(id);
      if (action === "reservation-attendees") self.updateReservationAttendees(Number(control.getAttribute("data-dir")) || 0);
      if (action === "reservation-modality") self.updateReservationModality(id);
      if (action === "reservation-toggle-confirm") self.toggleReservationConfirmation(id);
      if (action === "reservation-back" || action === "reservation-cancel") self.closeReservationFlow();
      if (action === "reservation-submit") self.confirmReservationFlow();
      if (action === "reservation-view-reservations") {
        self.state.reservationFlow = null;
        self.state.view = "calendar";
        self.state.calendarFilter = "reserved";
        self.state.calendarDetailId = null;
      }
      if (action === "reservation-open-community") {
        var flow = self.state.reservationFlow;
        var communityId = flow && flow.communityId;
        self.state.reservationFlow = null;
        if (communityId) self.openCommunityPanel(communityId);
      }
      if (action === "confirm-cancel-reservation") self.state.cancelConfirmId = id;
      if (action === "dismiss-cancel-reservation") self.state.cancelConfirmId = null;
      if (action === "confirm-cancel-reservation-submit") {
        self.cancel(id || self.state.cancelConfirmId);
        self.state.cancelConfirmId = null;
      }
      if (action === "cancel") self.cancel(id);
      if (action === "more") self.state.limits[id] += 5;
      if (action === "like") {
        self.state.likes[id] = !self.state.likes[id];
        self.emit("post.liked", {post: self.socialPosts[id], active: self.state.likes[id]});
      }
      if (action === "repost") {
        self.state.reposts[id] = !self.state.reposts[id];
        self.emit("post.reposted", {post: self.socialPosts[id], active: self.state.reposts[id]});
      }
      if (action === "follow-author") {
        var socialPost = self.socialPosts[id];
        var authorId = socialPost.author.id;
        self.state.followRequests[authorId] = !self.state.followRequests[authorId];
        self.emit("user.follow-requested", {post: socialPost, active: self.state.followRequests[authorId]});
      }
      if (action === "toggle-post-messages") self.state.commentsOpen[id] = !self.state.commentsOpen[id];
      if (action === "toggle-post-share") self.state.sharesOpen[id] = !self.state.sharesOpen[id];
      if (action === "toggle-message-thread") self.state.activeReplyThreads[id] = !self.state.activeReplyThreads[id];
      if (action === "send-message-reply") self.addMessageReply(id);
      if (action === "send-post-message") self.addPostMessage(id);
      if (action === "share-post") self.emit("post.shared", { postId: id, network: control.getAttribute("data-network"), mode: control.getAttribute("data-mode") });
      if (action === "open-story") self.openStory(id);
      if (action === "close-story") self.closeStory();
      if (action === "scroll") {
        self.scrollCarousel(control.getAttribute("data-target"), Number(control.getAttribute("data-dir")));
        return;
      }
      self.save(); self.render();
      if (self.state.view !== previousView) self.options.onNavigate(self.state.view);
      if (preserveScroll) self.restoreScrollPosition(scrollSnapshot);
      if (action === "admin-create-event" || action === "admin-event-next" || action === "admin-event-prev" || action === "admin-create-class" || action === "admin-class-next" || action === "admin-class-prev" || action === "admin-class-step") {
        self.scrollToAdminEventSection("smooth");
        return;
      }
      if (!preserveScroll && (action === "open-detail" || action === "open-community-panel" || action === "open-admin-panel" || action === "open-directory" || action === "open-directory-filter" || action === "filter" || action === "back-directory" || action === "back-feed" || action === "home" || action === "reserve" || action === "reservation-submit" || action === "reservation-view-reservations" || action === "reservation-open-community" || action === "admin-create-event" || action === "admin-event-next" || action === "admin-event-prev" || action === "admin-event-submit" || action === "admin-event-cancel" || action === "admin-create-class" || action === "admin-class-next" || action === "admin-class-prev" || action === "admin-class-submit" || action === "admin-class-cancel")) {
        self.scrollToScreenTop(action === "filter" ? "smooth" : "auto");
      }
    });
    this.root.addEventListener("change", function (event) {
      if (event.target.hasAttribute('data-community-search-scope')) {
        self.state.communitySearchScope = event.target.value;
        self.applyCommunitySearch();
      }
    });
    this.root.addEventListener("input", function (event) {
      if (event.target.hasAttribute("data-community-search")) {
        self.state.communitySearch = event.target.value;
        self.applyCommunitySearch();
        return;
      }
      if (event.target.hasAttribute("data-event-search")) {
        self.state.eventSearch = event.target.value;
        self.applyEventSearch(event.target.value);
        return;
      }
      if (event.target.hasAttribute("data-event-filter-query")) {
        var queryType = event.target.getAttribute("data-type") || "";
        self.state.eventFilterQueries = self.state.eventFilterQueries || {};
        self.state.eventFilterQueries[queryType] = event.target.value;
        self.updateEventFilterOptionVisibility(event.target);
        return;
      }
      var replyField = event.target.getAttribute("data-reply-field");
      if (replyField) {
        self.state.replyDrafts[replyField] = event.target.value;
        return;
      }
      var adminEventField = event.target.getAttribute("data-admin-event-field");
      if (adminEventField) {
        self.updateAdminEventDraft(adminEventField, event.target.type === "checkbox" ? event.target.checked : event.target.value);
        return;
      }
      var adminClassField = event.target.getAttribute("data-admin-class-field");
      if (adminClassField) {
        self.updateAdminClassDraft(adminClassField, event.target.type === "checkbox" ? event.target.checked : event.target.value);
        return;
      }
      var adminEditField = event.target.getAttribute("data-admin-edit-field");
      if (adminEditField) {
        self.updateAdminCommunityTextDraft(event.target.getAttribute("data-id"), adminEditField, event.target.value);
        return;
      }
      var field = event.target.getAttribute("data-create-field");
      if (!field) return;
      self.state.createDraft[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      if (event.target.type === "radio") self.syncCreateChoiceSelection(event.target);
      self.refreshCreatePreview();
    });
    this.root.addEventListener("change", function (event) {
      if (event.target.hasAttribute("data-admin-community-select")) {
        var adminScrollSnapshot = self.captureScrollPosition();
        self.openAdminPanel(event.target.value);
        self.save();
        self.render();
        self.restoreScrollPosition(adminScrollSnapshot);
        return;
      }
      if (event.target.hasAttribute("data-event-filter-query")) {
        var queryType = event.target.getAttribute("data-type") || "";
        var matchedValue = self.findTypedEventFilterValue(queryType, event.target.value);
        if (matchedValue !== null) {
          var scrollSnapshot = self.captureScrollPosition();
          var filters = self.currentEventFilters();
          filters[queryType] = matchedValue;
          if (queryType === "country") filters.city = "";
          self.state.eventFilterQueries = self.state.eventFilterQueries || {};
          self.state.eventFilterQueries[queryType] = "";
          self.state.activeEventFilter = queryType === "country" ? "city" : "";
          self.save();
          self.render();
          self.restoreScrollPosition(scrollSnapshot);
        }
        return;
      }
      if (event.target.hasAttribute("data-event-country-input")) {
        var country = self.findEventCountry(event.target.value);
        if (country) {
          var countryScrollSnapshot = self.captureScrollPosition();
          self.currentEventFilters().country = country.value;
          self.currentEventFilters().city = "";
          self.save();
          self.render();
          self.restoreScrollPosition(countryScrollSnapshot);
        }
        return;
      }
      if (event.target.hasAttribute("data-event-city-input")) {
        var city = self.findEventCity(event.target.value);
        if (city) {
          var cityScrollSnapshot = self.captureScrollPosition();
          self.currentEventFilters().city = city;
          self.save();
          self.render();
          self.restoreScrollPosition(cityScrollSnapshot);
        }
        return;
      }
      var replyField = event.target.getAttribute("data-reply-field");
      if (replyField) {
        self.state.replyDrafts[replyField] = event.target.value;
        return;
      }
      var adminEventField = event.target.getAttribute("data-admin-event-field");
      if (adminEventField) {
        self.updateAdminEventDraft(adminEventField, event.target.type === "checkbox" ? event.target.checked : event.target.value);
        return;
      }
      var adminClassField = event.target.getAttribute("data-admin-class-field");
      if (adminClassField) {
        self.updateAdminClassDraft(adminClassField, event.target.type === "checkbox" ? event.target.checked : event.target.value);
        return;
      }
      var field = event.target.getAttribute("data-create-field");
      if (!field) return;
      self.state.createDraft[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      if (event.target.type === "radio") self.syncCreateChoiceSelection(event.target);
      self.refreshCreatePreview();
    });
    this.root.addEventListener("keydown", function (event) {
      if (!event.target.hasAttribute("data-event-filter-query") || event.key !== "Enter") return;
      event.preventDefault();
      var queryType = event.target.getAttribute("data-type") || "";
      var matchedValue = self.findTypedEventFilterValue(queryType, event.target.value);
      var firstVisible = event.target.closest("[data-event-selector]")?.querySelector("[data-event-option-search]:not([hidden])");
      if (matchedValue === null && firstVisible) matchedValue = firstVisible.getAttribute("data-value") || "";
      if (matchedValue === null) return;
      var scrollSnapshot = self.captureScrollPosition();
      var filters = self.currentEventFilters();
      filters[queryType] = matchedValue;
      if (queryType === "country") filters.city = "";
      self.state.eventFilterQueries = self.state.eventFilterQueries || {};
      self.state.eventFilterQueries[queryType] = "";
      self.state.activeEventFilter = queryType === "country" ? "city" : "";
      self.save();
      self.render();
      self.restoreScrollPosition(scrollSnapshot);
    });
    this.root.addEventListener("pointerdown", function (event) {
      var track = event.target.closest("[data-pan]");
      if (!track) return;
      if (event.button != null && event.button !== 0) return;
      track.setPointerCapture(event.pointerId);
      track.dataset.dragging = "1";
      track.dataset.moved = "0";
      track.dataset.startX = String(event.clientX);
      track.dataset.startScroll = String(track.scrollLeft);
    });
    this.root.addEventListener("pointermove", function (event) {
      var track = event.target.closest("[data-pan]");
      if (!track || track.dataset.dragging !== "1") return;
      var deltaX = event.clientX - Number(track.dataset.startX);
      var dragSpeed = track.getAttribute("data-carousel") === "stories" ? 0.52 : 1;
      if (Math.abs(deltaX) > 8) {
        track.dataset.moved = "1";
        track.dataset.ignoreClick = "1";
        track.classList.add("is-panning");
        event.preventDefault();
      }
      track.scrollLeft = Number(track.dataset.startScroll) - (deltaX * dragSpeed);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (name) {
      self.root.addEventListener(name, function (event) {
        var track = event.target.closest("[data-pan]");
        if (!track) return;
        if (name === "pointerup" && track.dataset.moved !== "1") {
          if (event.target.closest('[data-action="upload-story"]')) return;
          var storyControl = event.target.closest('[data-action="open-story"]');
          if (storyControl && track.contains(storyControl)) {
            track.dataset.ignoreClick = "1";
            self.openStory(storyControl.getAttribute("data-id"));
            self.save();
            self.render();
            return;
          }
        }
        track.dataset.dragging = "0";
        track.classList.remove("is-panning");
        if (track.dataset.moved === "1") {
          window.setTimeout(function () { track.dataset.ignoreClick = "0"; }, 120);
        }
      });
    });
  };

  CommunityApp.prototype.scrollCarousel = function (id, direction) {
    var track = this.root.querySelector('[data-carousel="' + id + '"]');
    if (track) track.scrollBy({ left: direction * Math.max(280, track.clientWidth * 0.75), behavior: "smooth" });
  };

  CommunityApp.prototype.shouldPreserveFilterScroll = function (action) {
    return ["toggle-event-filter", "select-event-filter", "select-event-date", "toggle-event-country-more", "clear-event-search", "open-admin-tool", "explore-category", "admin-event-choice", "admin-event-toggle", "admin-event-dismiss-success", "admin-class-choice", "admin-class-toggle", "admin-class-dismiss-success", "admin-member-request"].indexOf(action) !== -1;
  };

  CommunityApp.prototype.captureScrollPosition = function () {
    var root = this.root;
    var scrollingElement = document.scrollingElement || document.documentElement;
    var portal = root.closest("[data-patient-portal], .patient-portal");
    var content = root.closest(".patient-portal-content");
    return {
      windowX: window.scrollX || window.pageXOffset || 0,
      windowY: window.scrollY || window.pageYOffset || 0,
      documentLeft: scrollingElement ? scrollingElement.scrollLeft : 0,
      documentTop: scrollingElement ? scrollingElement.scrollTop : 0,
      portalLeft: portal ? portal.scrollLeft : null,
      portalTop: portal ? portal.scrollTop : null,
      contentLeft: content ? content.scrollLeft : null,
      contentTop: content ? content.scrollTop : null
    };
  };

  CommunityApp.prototype.restoreScrollPosition = function (snapshot) {
    if (!snapshot) return;
    var root = this.root;
    var restore = function () {
      var scrollingElement = document.scrollingElement || document.documentElement;
      var portal = root.closest("[data-patient-portal], .patient-portal");
      var content = root.closest(".patient-portal-content");
      if (scrollingElement) {
        scrollingElement.scrollLeft = snapshot.documentLeft;
        scrollingElement.scrollTop = snapshot.documentTop;
      }
      window.scrollTo(snapshot.windowX, snapshot.windowY);
      if (portal && snapshot.portalTop != null) {
        portal.scrollLeft = snapshot.portalLeft || 0;
        portal.scrollTop = snapshot.portalTop;
      }
      if (content && snapshot.contentTop != null) {
        content.scrollLeft = snapshot.contentLeft || 0;
        content.scrollTop = snapshot.contentTop;
      }
    };
    restore();
    window.requestAnimationFrame(restore);
  };

  CommunityApp.prototype.scrollToScreenTop = function (behavior) {
    var root = this.root;
    var mode = behavior || "auto";
    window.requestAnimationFrame(function () {
      var scrollingElement = document.scrollingElement || document.documentElement;
      if (scrollingElement && scrollingElement.scrollTo) scrollingElement.scrollTo({ top: 0, behavior: mode });
      window.scrollTo({ top: 0, behavior: mode });
      var portal = root.closest("[data-patient-portal], .patient-portal");
      var content = root.closest(".patient-portal-content");
      [portal, content].forEach(function (target) {
        if (target && target.scrollTo) target.scrollTo({ top: 0, behavior: mode });
      });
    });
  };

  CommunityApp.prototype.scrollToAdminEventSection = function (behavior) {
    var root = this.root;
    var mode = behavior || "auto";
    window.requestAnimationFrame(function () {
      var target = root.querySelector(".kc-admin-event-wizard") || root.querySelector(".kc-admin-events-panel") || root.querySelector(".kc-admin-main");
      if (!target) return;
      var topBar = document.querySelector(".patient-topbar, .patient-header, .patient-portal-topbar, .app-topbar");
      var offset = topBar ? topBar.getBoundingClientRect().height + 14 : 14;
      var scrollingElement = document.scrollingElement || document.documentElement;
      var pageTop = target.getBoundingClientRect().top + (window.pageYOffset || 0) - offset;
      if (scrollingElement && scrollingElement.scrollTo) scrollingElement.scrollTo({ top: Math.max(0, pageTop), behavior: mode });
      window.scrollTo({ top: Math.max(0, pageTop), behavior: mode });
      [root.closest("[data-patient-portal], .patient-portal"), root.closest(".patient-portal-content")].forEach(function (container) {
        if (!container || !container.scrollTo) return;
        var localTop = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - offset;
        container.scrollTo({ top: Math.max(0, localTop), behavior: mode });
      });
    });
  };

  CommunityApp.prototype.defaultEventFilters = function () {
    return { country: "MX Mexico", city: "", community: "", location: "", date: "" };
  };

  CommunityApp.prototype.currentEventFilters = function () {
    this.state.eventFilters = merge(this.defaultEventFilters(), this.state.eventFilters || {});
    return this.state.eventFilters;
  };

  CommunityApp.prototype.todayDateStart = function () {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  CommunityApp.prototype.eventDateFromRecord = function (event) {
    if (!event) return null;
    if (event.dateKey || event.isoDate) {
      var rawDate = String(event.dateKey || event.isoDate);
      var isoParts = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoParts) return new Date(Number(isoParts[1]), Number(isoParts[2]) - 1, Number(isoParts[3]));
      var parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    var monthIndex = EVENT_MONTH_INDEX[normalizeSearch(event.month || "")];
    var dayNumber = Number(event.number);
    if (monthIndex == null || !dayNumber) return null;
    var today = this.todayDateStart();
    return new Date(today.getFullYear(), monthIndex, dayNumber);
  };

  CommunityApp.prototype.eventDateKey = function (event) {
    if (!event) return "";
    var date = this.eventDateFromRecord(event);
    if (date) return dateKeyFromDate(date);
    return normalizeSearch([event.number || "", event.month || "", event.day || ""].join("-"));
  };

  CommunityApp.prototype.renderEventDateButtons = function (count) {
    var filters = this.currentEventFilters();
    var today = this.todayDateStart();
    var total = count || 21;
    var buttons = [];
    for (var index = 0; index < total; index += 1) {
      var date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
      var dateKey = dateKeyFromDate(date);
      var active = filters.date === dateKey;
      buttons.push('<button type="button" class="' + (active ? "is-active" : "") + '" data-action="select-event-date" data-id="' + escapeHtml(dateKey) + '" aria-pressed="' + (active ? "true" : "false") + '"><strong>' + pad2(date.getDate()) + '</strong><span>' + EVENT_DAY_LABELS[date.getDay()] + '</span></button>');
    }
    return buttons.join("");
  };

  CommunityApp.prototype.findEventCountry = function (value) {
    var needle = normalizeSearch(value);
    return eventCountryOptions.find(function (country) {
      return normalizeSearch(country.value) === needle ||
        normalizeSearch(country.name) === needle ||
        normalizeSearch(country.code) === needle;
    }) || null;
  };

  CommunityApp.prototype.findEventCity = function (value) {
    var filters = this.currentEventFilters();
    var cities = eventCityOptionsByCountry[filters.country] || [];
    var needle = normalizeSearch(value);
    return cities.find(function (city) { return normalizeSearch(city) === needle; }) || "";
  };

  CommunityApp.prototype.eventFilterQuery = function (type) {
    this.state.eventFilterQueries = this.state.eventFilterQueries || {};
    return this.state.eventFilterQueries[type] || "";
  };

  CommunityApp.prototype.findTypedEventFilterValue = function (type, value) {
    var needle = normalizeSearch(value);
    if (!needle) return null;
    if (needle === "todas" || needle === "todos") return type === "country" ? null : "";
    if (type === "country") {
      var country = this.findEventCountry(value);
      return country ? country.value : null;
    }
    if (type === "city") {
      var city = this.findEventCity(value);
      return city || null;
    }
    var options = type === "community" ? this.eventCommunityOptions(events) : this.eventLocationOptions(events);
    var exact = options.find(function (option) { return normalizeSearch(option) === needle; });
    if (exact) return exact;
    var suggested = options.find(function (option) { return normalizeSearch(option).indexOf(needle) === 0; });
    return suggested || null;
  };

  CommunityApp.prototype.updateEventFilterOptionVisibility = function (input) {
    var selector = input.closest("[data-event-selector]");
    if (!selector) return;
    var query = normalizeSearch(input.value);
    var visible = 0;
    selector.querySelectorAll("[data-event-option-search]").forEach(function (option) {
      var haystack = option.getAttribute("data-search-text") || "";
      var show = !query || haystack.indexOf(query) !== -1;
      option.hidden = !show;
      if (show) visible += 1;
    });
    var empty = selector.querySelector("[data-event-selector-empty]");
    if (empty) empty.hidden = visible > 0;
  };

  CommunityApp.prototype.applyEventSearch = function (value) {
    var query = normalizeSearch(value);
    var filters = this.currentEventFilters();
    var cards = this.root.querySelectorAll("[data-event-search-card]");
    var empty = this.root.querySelector("[data-event-search-empty]");
    var groups = this.root.querySelectorAll("[data-event-search-group]");
    var visible = 0;
    Array.prototype.forEach.call(cards, function (card) {
      var haystack = card.getAttribute("data-event-search-text") || "";
      var show = !query || haystack.indexOf(query) >= 0;
      if (show && filters.country) show = card.getAttribute("data-event-country") === normalizeSearch(filters.country);
      if (show && filters.city) show = card.getAttribute("data-event-city") === normalizeSearch(filters.city);
      if (show && filters.community) show = card.getAttribute("data-event-community") === normalizeSearch(filters.community);
      if (show && filters.location) show = card.getAttribute("data-event-location") === normalizeSearch(filters.location);
      if (show && filters.date) show = card.getAttribute("data-event-date") === normalizeSearch(filters.date);
      card.hidden = !show;
      if (show) visible += 1;
    });
    Array.prototype.forEach.call(groups, function (group) {
      group.hidden = !group.querySelector("[data-event-search-card]:not([hidden])");
    });
    if (empty) empty.hidden = visible > 0;
  };

  CommunityApp.prototype.selectDirectoryFilter = function (id, focusContent) {
    var valid = ["events", "explore", "mine"];
    this.state.view = "directory";
    this.state.filter = valid.indexOf(id) >= 0 ? id : "explore";
    this.state.pendingDirectoryFocus = !!focusContent;
    this.emit("directory.filter.selected", { filter: this.state.filter });
  };

  CommunityApp.prototype.syncDirectoryFocus = function () {
    var activeFilter = this.root.querySelector(".kc-filter.active");
    if (activeFilter) activeFilter.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    if (!this.state.pendingDirectoryFocus) return;
    this.state.pendingDirectoryFocus = false;
    var target = this.root.querySelector("[data-directory-content]");
    if (!target) return;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    });
  };

  CommunityApp.prototype.syncCreateChoiceSelection = function (input) {
    var grid = input && input.closest(".kc-create-choice-grid");
    if (!grid) return;
    Array.prototype.forEach.call(grid.querySelectorAll(".kc-create-choice"), function (choice) {
      var radio = choice.querySelector('input[type="radio"]');
      choice.classList.toggle("is-selected", Boolean(radio && radio.checked));
    });
  };

  CommunityApp.prototype.openStory = function (id) {
    if (this.stories) { this.stories.open(id); return; }
    var items = this.storyItems();
    var index = items.findIndex(function (person) { return person.id === id; });
    this.state.storyIndex = index >= 0 ? index : 0;
  };

  CommunityApp.prototype.closeStory = function () {
    this.state.storyIndex = null;
    this.clearStoryTimer();
  };

  CommunityApp.prototype.clearStoryTimer = function () {
    this.storyTimerToken += 1;
    if (!this.storyTimer) return;
    clearTimeout(this.storyTimer);
    this.storyTimer = null;
  };

  CommunityApp.prototype.syncStoryTimer = function () {
    var self = this;
    this.clearStoryTimer();
    if (this.state.storyIndex == null) return;
    var token = this.storyTimerToken;
    this.storyTimer = setTimeout(function () {
      if (token !== self.storyTimerToken) return;
      if (self.state.storyIndex == null) return;
      self.state.storyIndex = (self.state.storyIndex + 1) % self.storyItems().length;
      self.render();
    }, 4000);
  };

  CommunityApp.prototype.communityRole = function (community) {
    return this.state.memberships[community.id] || community.role;
  };

  CommunityApp.prototype.catalogCommunities = function () {
    return communities.filter(function (community) { return community.visibility !== "hidden"; });
  };

  CommunityApp.prototype.adminCommunities = function () {
    var seen = {};
    return communities.filter(function (community) {
      if (!community || seen[community.id]) return false;
      seen[community.id] = true;
      return this.communityRole(community) === "admin";
    }, this);
  };

  CommunityApp.prototype.findCommunity = function (id) {
    return communities.find(function (community) {
      return community.id === id || community.catalogId === id || community.slug === id;
    }) || null;
  };

  CommunityApp.prototype.findCommunityByName = function (name) {
    var needle = String(name || "").trim().toLowerCase();
    return communities.find(function (community) { return community.name.toLowerCase() === needle; }) || null;
  };

  CommunityApp.prototype.createdCommunityRecords = function () {
    return communities.filter(function (community) { return community.repositorySource === "usuario"; });
  };

  CommunityApp.prototype.restoreCommunityCatalog = function () {
    try {
      var saved = JSON.parse(localStorage.getItem(this.options.catalogStorageKey) || "[]");
      if (Array.isArray(saved)) saved.forEach(function (community) {
        upsertCommunityRecord(merge(community, { repositorySource: "usuario" }));
      });
    } catch (error) {}
  };

  CommunityApp.prototype.saveCommunityCatalog = function () {
    try {
      localStorage.setItem(this.options.catalogStorageKey, JSON.stringify(this.createdCommunityRecords()));
    } catch (error) {}
  };

  CommunityApp.prototype.restoreCreatedCommunities = function () {
    var created = this.state.createdCommunities || [];
    for (var index = created.length - 1; index >= 0; index -= 1) upsertCommunityRecord(merge(created[index], { repositorySource: "usuario" }));
    this.state.createdCommunities = this.createdCommunityRecords();
  };

  CommunityApp.prototype.applyAdminCommunityEdits = function () {
    var edits = this.state.adminCommunityEdits || {};
    Object.keys(edits).forEach(function (id) {
      var community = this.findCommunity(id);
      if (!community) return;
      var patch = edits[id] || {};
      Object.keys(patch).forEach(function (field) {
        community[field] = patch[field];
      });
    }, this);
  };

  CommunityApp.prototype.saveAdminCommunityEdit = function (community, changes) {
    if (!community || !changes) return;
    var key = community.id;
    var edits = this.state.adminCommunityEdits || (this.state.adminCommunityEdits = {});
    edits[key] = merge(edits[key] || {}, changes);
    Object.keys(changes).forEach(function (field) {
      community[field] = changes[field];
    });
    if (changes.name && !changes.logoImage) {
      community.initials = community.initials || initialsFromName(changes.name);
      community.logoInitials = community.logoInitials || initialsFromName(changes.name);
    }
    this.state.createdCommunities = this.createdCommunityRecords();
  };

  CommunityApp.prototype.openCommunityPanel = function (id) {
    var community = this.findCommunity(id);
    if (!community) return;
    this.state.detailReturnView = this.state.view === "feed" ? "feed" : "directory";
    this.state.view = "detail";
    this.state.detailId = community.id;
    this.emit("community.opened", community);
  };

  CommunityApp.prototype.showFeed = function () {
    if (this.state.view === "feed" && this.state.storyIndex == null) return;
    this.state.view = "feed";
    this.state.storyIndex = null;
    this.save();
    this.render();
  };

  CommunityApp.prototype.showCalendar = function () {
    this.state.view = "calendar";
    this.state.storyIndex = null;
    this.state.calendarDetailId = null;
    this.render();
  };

  CommunityApp.prototype.showPosts = function () {
    if (this.state.view === "posts" && this.state.storyIndex == null) return;
    this.state.view = "posts";
    this.state.storyIndex = null;
    this.render();
  };

  CommunityApp.prototype.openSocialPost = function (postId, communityId, showMessages) {
    this.state.storyIndex = null;
    if (communityId && this.findCommunity(communityId)) this.openCommunityPanel(communityId);
    else this.state.view = "posts";
    if (showMessages) this.state.commentsOpen[postId] = true;
    this.render();
    var post = Array.from(this.root.querySelectorAll("[data-social-post]")).find(function (item) { return item.getAttribute("data-social-post") === postId; });
    if (post) {
      post.scrollIntoView({block: "start", behavior: "smooth"});
      post.focus({preventScroll: true});
    }
  };

  CommunityApp.prototype.openAdminPanel = function (id) {
    var community = this.findCommunity(id) || this.findCommunity(this.state.detailId);
    if (!community || this.communityRole(community) !== "admin") community = this.adminCommunities()[0];
    if (!community || this.communityRole(community) !== "admin") return;
    this.state.view = "admin";
    this.state.detailId = community.id;
    this.state.filter = "mine";
    this.state.selectedExploreCategory = "";
    this.state.activeEventFilter = "";
    this.state.adminTool = "stories";
    this.emit("community.admin.opened", community);
  };

  CommunityApp.prototype.openAdminTool = function (id) {
    if (["stories", "communityPosts", "events", "classes", "calendar", "members", "editPage", "analytics"].indexOf(id) === -1) return;
    this.state.adminTool = id;
  };

  CommunityApp.prototype.currentAdminCommunity = function () {
    return this.findCommunity(this.state.detailId) || this.adminCommunities()[0] || null;
  };

  CommunityApp.prototype.defaultAdminEventDraft = function (community) {
    community = community || {};
    return {
      title: "Respiracion y movilidad suave",
      category: community.category || "Bienestar",
      shortDescription: community.description || "Yoga suave, respiracion y constancia semanal.",
      description: "Un taller practico para mejorar movilidad, respirar mejor y conectar con la comunidad.",
      eventType: "Taller",
      communityId: community.id || "",
      modality: "Hibrido",
      date: "24/06/2025",
      day: "sab",
      number: "15",
      month: "jun",
      startTime: "10:00 AM",
      endTime: "12:00 PM",
      timezone: "(GMT-05:00) Bogota",
      location: "Carrera 13 # 93A-34, Bogota, Colombia",
      venue: "Sala principal - Piso 2",
      virtualLink: "https://meet.google.com/xyz-abcd-efg",
      host: "Maria Camila Perez",
      addCalendar: true,
      capacity: "20",
      waitlist: true,
      priceMode: "Gratis",
      price: "0.00",
      currency: "MXN - Peso mexicano",
      registrationDeadline: "24/06/2025",
      manualApproval: false,
      allowCancellations: true,
      reminder: "24 h antes",
      access: "Abierto a todos",
      coverImage: this.communityHeroImage ? this.communityHeroImage(community) : (community.heroImage || "/images/communities/create-cover.png")
    };
  };

  CommunityApp.prototype.adminEventDraftFor = function (community) {
    community = community || this.currentAdminCommunity();
    if (!community) return this.defaultAdminEventDraft({});
    var key = community.id || "default";
    this.state.adminEventDrafts = this.state.adminEventDrafts || {};
    this.state.adminEventDrafts[key] = merge(this.defaultAdminEventDraft(community), this.state.adminEventDrafts[key] || {});
    return this.state.adminEventDrafts[key];
  };

  CommunityApp.prototype.updateAdminEventDraft = function (field, value) {
    if (!field) return;
    var draft = this.adminEventDraftFor(this.currentAdminCommunity());
    draft[field] = value;
  };

  CommunityApp.prototype.toggleAdminEventDraft = function (field) {
    if (!field) return;
    var draft = this.adminEventDraftFor(this.currentAdminCommunity());
    draft[field] = !draft[field];
  };

  CommunityApp.prototype.openAdminEventCreate = function () {
    this.state.adminTool = "events";
    this.state.adminEventMode = "create";
    this.state.adminEventStep = 1;
    this.state.adminEventSuccess = null;
    this.adminEventDraftFor(this.currentAdminCommunity());
  };

  CommunityApp.prototype.closeAdminEventCreate = function () {
    this.state.adminEventMode = "list";
    this.state.adminEventStep = 1;
  };

  CommunityApp.prototype.adminEventsForCommunity = function (community) {
    if (!community) return [];
    var created = this.state.adminCreatedEvents || [];
    return events.filter(function (event) { return event.communityId === community.id; })
      .concat(created.filter(function (event) { return event.communityId === community.id; }));
  };

  CommunityApp.prototype.submitAdminEvent = function () {
    var community = this.currentAdminCommunity();
    if (!community) return;
    var draft = this.adminEventDraftFor(community);
    var capacity = Math.max(1, parseInt(draft.capacity, 10) || 20);
    var enrolled = Math.min(capacity, 7);
    var ticket = draft.priceMode === "Con costo" ? "$" + escapeHtml(draft.price || "0.00") + " " + String(draft.currency || "MXN").split(" ")[0] : "Gratis";
    var eventId = "admin-event-" + community.id + "-" + Date.now();
    var eventRecord = {
      id: eventId,
      repositoryId: "evt_20240615_abc123",
      group: "week",
      communityId: community.id,
      category: draft.category || community.category || "Bienestar",
      title: draft.title || "Respiracion y movilidad suave",
      description: draft.shortDescription || draft.description || community.description,
      date: "15 de junio, 2024",
      day: draft.day || "sab",
      number: draft.number || "15",
      month: draft.month || "jun",
      time: (draft.startTime || "10:00 AM") + " - " + (draft.endTime || "12:00 PM"),
      place: draft.modality === "Virtual" ? "Remoto" : (draft.venue || draft.location || community.city),
      modality: draft.modality || "Hibrido",
      capacity: capacity,
      enrolled: enrolled,
      available: Math.max(0, capacity - enrolled),
      price: ticket,
      status: "Publicado",
      host: draft.host || ((this.options.patient && this.options.patient.name) || "Administrador"),
      type: draft.eventType || "Taller",
      coverImage: draft.coverImage || this.communityHeroImage(community),
      updatedAt: "15 de mayo, 2024 a las 11:32 a.m."
    };
    this.state.adminCreatedEvents = (this.state.adminCreatedEvents || []).concat([eventRecord]);
    this.state.adminEventMode = "list";
    this.state.adminEventStep = 1;
    this.state.adminEventSuccess = eventRecord.id;
    this.emit("community.admin.event.created", eventRecord);
  };

  CommunityApp.prototype.renderAdminEventProgress = function (step) {
    var labels = ["Informacion general", "Fecha y modalidad", "Cupo y registro", "Revision"];
    return '<div class="kc-admin-event-progress">' + labels.map(function (label, index) {
      var number = index + 1;
      return '<span class="' + (number === step ? "is-active " : "") + (number < step ? "is-complete" : "") + '"><b>' + number + '</b><small>' + escapeHtml(label) + '</small></span>';
    }).join("") + '</div>';
  };

  CommunityApp.prototype.renderAdminEventField = function (field, label, value, placeholder, help, type) {
    var id = "admin-event-" + field;
    var input = type === "textarea"
      ? '<textarea id="' + id + '" data-admin-event-field="' + escapeHtml(field) + '" placeholder="' + escapeHtml(placeholder || "") + '">' + escapeHtml(value || "") + '</textarea>'
      : '<input id="' + id + '" data-admin-event-field="' + escapeHtml(field) + '" value="' + escapeHtml(value || "") + '" placeholder="' + escapeHtml(placeholder || "") + '">';
    return '<label class="kc-admin-event-field"><span>' + escapeHtml(label) + '</span>' + input + (help ? '<small>' + help + '</small>' : '') + '</label>';
  };

  CommunityApp.prototype.renderAdminEventSelect = function (field, label, value, options, help) {
    return '<label class="kc-admin-event-field"><span>' + escapeHtml(label) + '</span><select data-admin-event-field="' + escapeHtml(field) + '">' + options.map(function (option) {
      var optionValue = typeof option === "object" ? option.value : option;
      var optionLabel = typeof option === "object" ? option.label : option;
      return '<option value="' + escapeHtml(optionValue) + '"' + (optionValue === value ? " selected" : "") + '>' + escapeHtml(optionLabel) + '</option>';
    }).join("") + '</select>' + (help ? '<small>' + help + '</small>' : '') + '</label>';
  };

  CommunityApp.prototype.renderAdminEventChoice = function (field, value, current, label, iconName) {
    return '<button type="button" class="kc-admin-event-choice ' + (value === current ? "is-selected" : "") + '" data-action="admin-event-choice" data-field="' + escapeHtml(field) + '" data-value="' + escapeHtml(value) + '">' + icon(iconName) + '<span>' + escapeHtml(label) + '</span>' + (value === current ? '<b>' + icon("check") + '</b>' : '') + '</button>';
  };

  CommunityApp.prototype.renderAdminEventToggle = function (field, label, text, isOn) {
    return '<button type="button" class="kc-admin-event-toggle ' + (isOn ? "is-on" : "") + '" data-action="admin-event-toggle" data-field="' + escapeHtml(field) + '"><span><strong>' + escapeHtml(label) + '</strong><small>' + escapeHtml(text) + '</small></span><b></b></button>';
  };

  CommunityApp.prototype.renderAdminEventPreview = function (draft, compact) {
    return '<aside class="kc-admin-event-preview ' + (compact ? "is-compact" : "") + '"><h3>Vista previa del evento</h3><div class="kc-admin-event-preview-media">' +
      (draft.coverImage ? '<img src="' + escapeHtml(draft.coverImage) + '" alt="Imagen de portada del evento">' : icon("image") + '<span>Imagen de portada<br>1200 x 628 px recomendados</span>') +
      '</div><small>Borrador</small><h4>' + escapeHtml(draft.title || "Titulo del evento") + '</h4><p>' + escapeHtml(draft.category || "Categoria del evento") + '</p><ul><li>' + icon("calendar") + ' ' + escapeHtml(draft.date || "24/06/2025") + '</li><li>' + icon("clock") + ' ' + escapeHtml((draft.startTime || "10:00 AM") + " - " + (draft.endTime || "12:00 PM")) + '</li><li>' + icon("globe") + ' ' + escapeHtml(draft.timezone || "") + '</li><li>' + icon("map") + ' ' + escapeHtml(draft.location || "") + '</li><li>' + icon("users") + ' ' + escapeHtml(draft.host || "") + '</li><li>' + icon("calendar") + ' Modalidad: ' + escapeHtml(draft.modality || "") + '</li></ul></aside>';
  };

  CommunityApp.prototype.renderAdminEventStepOne = function (community, draft) {
    var typeChoices = '<div class="kc-admin-event-choice-grid">' +
      this.renderAdminEventChoice("eventType", "Clase", draft.eventType, "Clase", "users") +
      this.renderAdminEventChoice("eventType", "Taller", draft.eventType, "Taller", "sparkles") +
      this.renderAdminEventChoice("eventType", "Charla", draft.eventType, "Charla", "message") +
      this.renderAdminEventChoice("eventType", "Encuentro", draft.eventType, "Encuentro", "users") +
      '</div>';
    return '<div class="kc-admin-event-form-grid">' +
      '<div class="kc-admin-event-form">' +
      this.renderAdminEventField("title", "Titulo del evento *", draft.title, "Escribe un titulo claro y atractivo para tu evento", "Se especifico y claro para que tu comunidad entienda de que se trata.") +
      this.renderAdminEventField("shortDescription", "Descripcion breve *", draft.shortDescription, "Resumen corto que aparecera en listados y tarjetas", "Maximo 120 caracteres.") +
      this.renderAdminEventField("description", "Descripcion completa *", draft.description, "Describe los objetivos, contenidos, beneficios y lo que las personas pueden esperar del evento.", "Incluye todos los detalles importantes para inspirar a tu comunidad.", "textarea") +
      '</div><div class="kc-admin-event-form">' +
      this.renderAdminEventSelect("category", "Categoria *", draft.category, ["Bienestar", "Yoga", "Nutricion", "Running", "Salud mental", "Fuerza"], "Elige la categoria que mejor describa tu evento.") +
      '<div class="kc-admin-event-field"><span>Tipo de evento *</span>' + typeChoices + '<small>Selecciona el tipo que mejor se ajusta a tu evento.</small></div>' +
      '<div class="kc-admin-event-field"><span>Imagen de portada *</span><button type="button" class="kc-admin-event-upload">' + icon("image") + '<em>Arrastra una imagen aqui<br>o haz clic para seleccionar</em></button><small>Recomendado: 1200 x 628 px. Formato JPG o PNG.</small></div>' +
      '</div><div class="kc-admin-event-wide">' + this.renderAdminEventSelect("communityId", "Comunidad relacionada *", community.id, [community].concat(this.adminCommunities().filter(function (item) { return item.id !== community.id; })).map(function (item) { return { value: item.id, label: item.name }; }), "La comunidad a la que pertenecera este evento.") + '</div>' +
      '</div>';
  };

  CommunityApp.prototype.renderAdminEventStepTwo = function (community, draft) {
    return '<div class="kc-admin-event-step-split"><div class="kc-admin-event-form">' +
      '<div class="kc-admin-event-field"><span>Modalidad del evento *</span><div class="kc-admin-event-choice-grid is-three">' +
      this.renderAdminEventChoice("modality", "Presencial", draft.modality, "Presencial", "users") +
      this.renderAdminEventChoice("modality", "Virtual", draft.modality, "Virtual", "video") +
      this.renderAdminEventChoice("modality", "Hibrido", draft.modality, "Hibrido", "globe") +
      '</div></div>' +
      '<div class="kc-admin-event-grid-4">' +
      this.renderAdminEventField("date", "Fecha del evento *", draft.date, "24/06/2025") +
      this.renderAdminEventField("startTime", "Hora de inicio *", draft.startTime, "10:00 AM") +
      this.renderAdminEventField("endTime", "Hora de fin *", draft.endTime, "12:00 PM") +
      this.renderAdminEventSelect("timezone", "Zona horaria *", draft.timezone, ["(GMT-06:00) Mexico", "(GMT-05:00) Bogota", "(GMT-05:00) Lima", "(GMT-04:00) Miami"], "") +
      '</div>' +
      this.renderAdminEventField("location", "Ubicacion *", draft.location, "Direccion completa donde se realizara el evento presencial.", "Direccion completa donde se realizara el evento presencial.") +
      '<div class="kc-admin-event-grid-2">' +
      this.renderAdminEventField("venue", "Sala o sede *", draft.venue, "Sala principal - Piso 2", "Especifica la sala, sede o espacio fisico.") +
      this.renderAdminEventField("virtualLink", "Enlace virtual *", draft.virtualLink, "https://meet.google.com/xyz-abcd-efg", "Enlace de la reunion o transmision en vivo.") +
      '</div>' +
      this.renderAdminEventField("host", "Instructor o anfitrion *", draft.host, "Maria Camila Perez", "Persona encargada de liderar el evento.") +
      this.renderAdminEventToggle("addCalendar", "Agregar al calendario de la comunidad", "Activa esta opcion para que el evento se muestre en el calendario de la comunidad.", draft.addCalendar) +
      '</div>' + this.renderAdminEventPreview(draft, false) + '</div>';
  };

  CommunityApp.prototype.renderAdminEventStepThree = function (community, draft) {
    return '<div class="kc-admin-event-step-split"><div class="kc-admin-event-form">' +
      '<div class="kc-admin-event-grid-2">' +
      this.renderAdminEventField("capacity", "Cupo maximo *", draft.capacity, "20", "Numero maximo de asistentes permitidos.") +
      this.renderAdminEventToggle("waitlist", "Lista de espera", "Activa una lista de espera cuando el evento este lleno.", draft.waitlist) +
      '</div><div class="kc-admin-event-field"><span>Evento gratuito o con costo *</span><div class="kc-admin-event-choice-grid is-two">' +
      this.renderAdminEventChoice("priceMode", "Gratis", draft.priceMode, "Gratuito", "check") +
      this.renderAdminEventChoice("priceMode", "Con costo", draft.priceMode, "Con costo", "ticket") +
      '</div></div><div class="kc-admin-event-grid-2">' +
      this.renderAdminEventField("price", "Precio por persona *", draft.price, "350.00") +
      this.renderAdminEventSelect("currency", "Moneda *", draft.currency, ["MXN - Peso mexicano", "USD - Dolar", "COP - Peso colombiano"], "") +
      '</div><div class="kc-admin-event-grid-2">' +
      this.renderAdminEventField("registrationDeadline", "Fecha limite de registro *", draft.registrationDeadline, "24/06/2025", "Despues de esta fecha ya no se aceptaran nuevos registros.") +
      this.renderAdminEventToggle("manualApproval", "Aprobacion manual de asistentes", "Revisa y aprueba cada solicitud antes de confirmar.", draft.manualApproval) +
      '</div>' +
      this.renderAdminEventToggle("allowCancellations", "Permitir cancelaciones", "Los asistentes podran cancelar su registro.", draft.allowCancellations) +
      this.renderAdminEventSelect("reminder", "Enviar recordatorio automatico", draft.reminder, ["24 h antes", "12 h antes", "2 h antes", "Sin recordatorio"], "Se enviara un recordatorio automatico a los asistentes.") +
      '<div class="kc-admin-event-field"><span>Tipo de acceso *</span><div class="kc-admin-event-choice-grid is-three">' +
      this.renderAdminEventChoice("access", "Abierto a todos", draft.access, "Abierto a todos", "globe") +
      this.renderAdminEventChoice("access", "Solo miembros de la comunidad", draft.access, "Solo miembros", "users") +
      this.renderAdminEventChoice("access", "Invitacion", draft.access, "Invitacion", "message") +
      '</div><small>Define quien puede ver y registrarse a este evento.</small></div></div>' +
      '<aside class="kc-admin-event-summary-card"><h3>Resumen de registro</h3><p>Asi se configurara el registro para este evento.</p><article>' + icon("users") + '<div><strong>' + escapeHtml(draft.capacity || "20") + ' lugares</strong><span>Cupo maximo del evento.</span></div></article><article>' + icon("clock") + '<div><strong>Lista de espera ' + (draft.waitlist ? "activa" : "inactiva") + '</strong><span>Se habilitara cuando el cupo este lleno.</span></div></article><article>' + icon("ticket") + '<div><strong>' + (draft.priceMode === "Con costo" ? "Pago requerido" : "Evento gratuito") + '</strong><span>' + (draft.priceMode === "Con costo" ? "Con costo de $" + escapeHtml(draft.price || "0.00") + " MXN por persona." : "Sin costo para asistentes.") + '</span></div></article></aside></div>';
  };

  CommunityApp.prototype.renderAdminEventStepFour = function (community, draft) {
    return '<div class="kc-admin-event-review"><section><h3>Revision del evento</h3><p>Confirma que la informacion este lista para publicarse.</p><dl>' +
      '<div><dt>Evento</dt><dd>' + escapeHtml(draft.title) + '</dd></div>' +
      '<div><dt>Categoria</dt><dd>' + escapeHtml(draft.category) + '</dd></div>' +
      '<div><dt>Tipo</dt><dd>' + escapeHtml(draft.eventType) + '</dd></div>' +
      '<div><dt>Fecha</dt><dd>' + escapeHtml(draft.date) + '</dd></div>' +
      '<div><dt>Horario</dt><dd>' + escapeHtml(draft.startTime + " - " + draft.endTime) + '</dd></div>' +
      '<div><dt>Modalidad</dt><dd>' + escapeHtml(draft.modality) + '</dd></div>' +
      '<div><dt>Cupo</dt><dd>' + escapeHtml(draft.capacity) + ' personas</dd></div>' +
      '<div><dt>Acceso</dt><dd>' + escapeHtml(draft.access) + '</dd></div>' +
      '</dl></section>' + this.renderAdminEventPreview(draft, true) + '</div>';
  };

  CommunityApp.prototype.renderAdminEventWizard = function (community) {
    var step = Math.max(1, Math.min(4, Number(this.state.adminEventStep) || 1));
    var draft = this.adminEventDraftFor(community);
    var subtitles = ["Completa la informacion general de tu evento.", "Define la fecha, modalidad y ubicacion del evento.", "Configura el cupo, el registro y las reglas de asistencia.", "Revisa la informacion antes de crear el evento."];
    var content = step === 1 ? this.renderAdminEventStepOne(community, draft) : step === 2 ? this.renderAdminEventStepTwo(community, draft) : step === 3 ? this.renderAdminEventStepThree(community, draft) : this.renderAdminEventStepFour(community, draft);
    return '<section class="kc-admin-event-wizard"><div class="kc-admin-event-wizard-head"><div><h2>Crear evento - Paso ' + step + ' de 4</h2><p>' + escapeHtml(subtitles[step - 1]) + '</p></div><button type="button" data-action="' + (step === 4 ? "admin-event-submit" : "admin-event-next") + '">Crear evento</button></div>' + this.renderAdminEventProgress(step) + '<div class="kc-admin-event-wizard-body">' + content + '</div><div class="kc-admin-event-footer"><button type="button" class="kc-admin-event-secondary" data-action="' + (step === 1 ? "admin-event-cancel" : "admin-event-prev") + '">' + (step === 1 ? "Cancelar" : "Atras") + '</button><button type="button" class="kc-admin-event-primary" data-action="' + (step === 4 ? "admin-event-submit" : "admin-event-next") + '">' + (step === 4 ? "Crear evento" : "Continuar") + '</button></div></section>';
  };

  CommunityApp.prototype.renderAdminCreatedEventCard = function (event) {
    return '<article class="kc-admin-event-created-card"><div class="kc-admin-event-created-media"><img src="' + escapeHtml(event.coverImage || "/images/communities/create-cover.png") + '" alt="' + escapeHtml(event.title) + '"></div><div class="kc-admin-event-created-copy"><span>Destacado</span><h3>' + escapeHtml(event.title) + '</h3><div class="kc-admin-event-created-meta"><p>' + icon("calendar") + '<b>' + escapeHtml(event.date) + '</b><small>Sabado</small></p><p>' + icon("clock") + '<b>' + escapeHtml(event.time) + '</b><small>1 hora</small></p><p>' + icon("users") + '<b>' + escapeHtml(event.type) + '</b><small>Modalidad</small></p><p>' + icon("map") + '<b>' + escapeHtml(event.place) + '</b><small>' + escapeHtml(event.modality) + '</small></p></div><div class="kc-admin-event-created-footer"><p><small>Anfitrion</small><b>' + escapeHtml(event.host) + '</b></p><p><small>Precio</small><b>' + escapeHtml(event.price || "Gratis") + '</b></p><p><small>Estado</small><b class="is-published">Publicado</b></p><div><button type="button">' + icon("eye") + ' Ver evento</button><button type="button">' + icon("edit") + ' Editar</button><button type="button">' + icon("file") + ' Duplicar</button></div></div></div></article>';
  };

  CommunityApp.prototype.renderAdminEventsTool = function (community) {
    if (this.state.adminEventMode === "create") return this.renderAdminEventWizard(community);
    var self = this;
    var communityEvents = this.adminEventsForCommunity(community);
    var createdSuccess = this.state.adminEventSuccess ? communityEvents.find(function (item) { return item.id === self.state.adminEventSuccess; }) : null;
    var primaryEvent = communityEvents[communityEvents.length - 1];
    return '<section class="kc-admin-tool-view kc-admin-events-panel"><div class="kc-section-title"><div><h2>Eventos</h2><p>Calendario y eventos activos de la comunidad.</p></div><button type="button" data-action="admin-create-event">Crear evento</button></div>' +
      (createdSuccess ? '<div class="kc-admin-event-success"><span>' + icon("check") + '</span><div><strong>Evento creado con exito</strong><p>"' + escapeHtml(createdSuccess.title) + '" ya esta publicado y visible para los miembros de la comunidad.</p></div><button type="button" data-action="admin-event-dismiss-success">x</button></div>' : '') +
      (communityEvents.length ? '<section class="kc-admin-event-list"><div class="kc-section-title"><div><h2>Proximos eventos</h2><p>Gestiona y consulta los eventos programados de tu comunidad.</p></div></div>' + this.renderAdminCreatedEventCard(primaryEvent) + '<dl class="kc-admin-event-repository"><div><dt>ID del evento</dt><dd>' + escapeHtml(primaryEvent.repositoryId || primaryEvent.id) + '</dd></div><div><dt>Capacidad</dt><dd>' + escapeHtml(primaryEvent.capacity) + ' personas</dd></div><div><dt>Inscritos</dt><dd><span><i style="width:' + Math.min(100, Math.round(((primaryEvent.enrolled || 0) / Math.max(1, primaryEvent.capacity || 1)) * 100)) + '%"></i></span>' + escapeHtml(primaryEvent.enrolled || 0) + ' personas</dd></div><div><dt>Administrador</dt><dd>' + escapeHtml((this.options.patient && this.options.patient.name) || "Administrador") + '</dd></div><div><dt>Ultima actualizacion</dt><dd>' + escapeHtml(primaryEvent.updatedAt || "Hoy") + '</dd></div></dl></section>' : '<div class="kc-admin-mini-list"><article><strong>Sin eventos activos</strong><p>Crea el primer evento de esta comunidad.</p></article></div>') +
      '</section>';
  };

  CommunityApp.prototype.defaultAdminClassDraft = function (community) {
    community = community || {};
    return {
      title: "Yoga suave y respiracion",
      category: "Bienestar fisico",
      shortDescription: "Una practica suave de yoga enfocada en la respiracion consciente.",
      description: "Clase guiada para reducir el estres, mejorar la movilidad y reconectar con la respiracion.",
      classType: "Clase guiada",
      communityId: community.id || "",
      modality: "Presencial",
      startDate: "Lunes, 10 de junio de 2024",
      day: "mar",
      number: "27",
      month: "may",
      startTime: "08:00 a.m.",
      endTime: "09:00 a.m.",
      duration: "60 minutos",
      frequency: "Semanal",
      weekDays: "Todos los lunes",
      timezone: "(GMT-06:00) Ciudad de Mexico",
      location: "Klini Wellness - Sala de Movimiento",
      room: "Sala Wellness",
      virtualLink: "https://",
      instructor: "Mariana Lopez",
      addCalendar: true,
      capacity: "30",
      waitlist: true,
      priceMode: "Gratuita",
      price: "0.00",
      currency: "MXN - Peso mexicano",
      registrationDeadline: "20/06/2025",
      manualApproval: false,
      allowCancellations: true,
      reminder: "24 horas antes del inicio",
      access: "Abierto a todos",
      coverImage: "/images/patient-export/697acf432c30040e98d8.jpg"
    };
  };

  CommunityApp.prototype.adminClassDraftFor = function (community) {
    community = community || this.currentAdminCommunity();
    if (!community) return this.defaultAdminClassDraft({});
    var key = community.id || "default";
    this.state.adminClassDrafts = this.state.adminClassDrafts || {};
    this.state.adminClassDrafts[key] = merge(this.defaultAdminClassDraft(community), this.state.adminClassDrafts[key] || {});
    return this.state.adminClassDrafts[key];
  };

  CommunityApp.prototype.updateAdminClassDraft = function (field, value) {
    if (!field) return;
    var draft = this.adminClassDraftFor(this.currentAdminCommunity());
    draft[field] = value;
  };

  CommunityApp.prototype.toggleAdminClassDraft = function (field) {
    if (!field) return;
    var draft = this.adminClassDraftFor(this.currentAdminCommunity());
    draft[field] = !draft[field];
  };

  CommunityApp.prototype.openAdminClassCreate = function () {
    this.state.adminTool = "classes";
    this.state.adminClassMode = "create";
    this.state.adminClassStep = 1;
    this.state.adminClassSuccess = null;
    this.adminClassDraftFor(this.currentAdminCommunity());
  };

  CommunityApp.prototype.closeAdminClassCreate = function () {
    this.state.adminClassMode = "list";
    this.state.adminClassStep = 1;
  };

  CommunityApp.prototype.adminClassesForCommunity = function (community) {
    if (!community) return [];
    var created = this.state.adminCreatedClasses || [];
    return (community.classes || []).concat(created.filter(function (item) { return item.communityId === community.id; }));
  };

  CommunityApp.prototype.submitAdminClass = function () {
    var community = this.currentAdminCommunity();
    if (!community) return;
    var draft = this.adminClassDraftFor(community);
    var capacity = Math.max(1, parseInt(draft.capacity, 10) || 30);
    var enrolled = Math.min(capacity, 8);
    var classId = "admin-class-" + community.id + "-" + Date.now();
    var price = draft.priceMode === "Con costo" ? "$" + (draft.price || "0.00") + " " + String(draft.currency || "MXN").split(" ")[0] + " por sesion" : "Gratis";
    var classRecord = {
      id: classId,
      repositoryId: "CLS-2025-0057",
      communityId: community.id,
      category: draft.category || "Bienestar fisico",
      title: draft.title || "Yoga suave y respiracion",
      description: draft.shortDescription || draft.description || community.description,
      date: "Martes, 27 de mayo 2025",
      day: draft.day || "mar",
      number: draft.number || "27",
      month: draft.month || "may",
      time: (draft.startTime || "08:00 a.m.") + " - " + (draft.endTime || "09:00 a.m."),
      place: draft.location || draft.room || community.city,
      modality: draft.modality || "Presencial",
      capacity: capacity,
      enrolled: enrolled,
      available: Math.max(0, capacity - enrolled),
      price: price,
      status: "Publicada",
      instructor: draft.instructor || "Mariana Lopez",
      type: draft.classType || "Clase guiada",
      frequency: draft.frequency || "Semanal",
      coverImage: draft.coverImage || "/images/communities/create-cover.png",
      updatedAt: "Hoy, 22 de mayo de 2025 a las 10:24 a.m."
    };
    this.state.adminCreatedClasses = (this.state.adminCreatedClasses || []).concat([classRecord]);
    this.state.adminClassMode = "list";
    this.state.adminClassStep = 1;
    this.state.adminClassSuccess = classRecord.id;
    this.emit("community.admin.class.created", classRecord);
  };

  CommunityApp.prototype.renderAdminClassProgress = function (step) {
    var labels = ["Informacion general", "Horario y modalidad", "Cupo y registro", "Revision"];
    return '<div class="kc-admin-event-progress">' + labels.map(function (label, index) {
      var number = index + 1;
      return '<span class="' + (number === step ? "is-active " : "") + (number < step ? "is-complete" : "") + '"><b>' + number + '</b><small>' + escapeHtml(label) + '</small></span>';
    }).join("") + '</div>';
  };

  CommunityApp.prototype.renderAdminClassField = function (field, label, value, placeholder, help, type) {
    var id = "admin-class-" + field;
    var input = type === "textarea"
      ? '<textarea id="' + id + '" data-admin-class-field="' + escapeHtml(field) + '" placeholder="' + escapeHtml(placeholder || "") + '">' + escapeHtml(value || "") + '</textarea>'
      : '<input id="' + id + '" data-admin-class-field="' + escapeHtml(field) + '" value="' + escapeHtml(value || "") + '" placeholder="' + escapeHtml(placeholder || "") + '">';
    return '<label class="kc-admin-event-field"><span>' + escapeHtml(label) + '</span>' + input + (help ? '<small>' + help + '</small>' : '') + '</label>';
  };

  CommunityApp.prototype.renderAdminClassSelect = function (field, label, value, options, help) {
    return '<label class="kc-admin-event-field"><span>' + escapeHtml(label) + '</span><select data-admin-class-field="' + escapeHtml(field) + '">' + options.map(function (option) {
      var optionValue = typeof option === "object" ? option.value : option;
      var optionLabel = typeof option === "object" ? option.label : option;
      return '<option value="' + escapeHtml(optionValue) + '"' + (optionValue === value ? " selected" : "") + '>' + escapeHtml(optionLabel) + '</option>';
    }).join("") + '</select>' + (help ? '<small>' + help + '</small>' : '') + '</label>';
  };

  CommunityApp.prototype.renderAdminClassChoice = function (field, value, current, label, iconName) {
    return '<button type="button" class="kc-admin-event-choice ' + (value === current ? "is-selected" : "") + '" data-action="admin-class-choice" data-field="' + escapeHtml(field) + '" data-value="' + escapeHtml(value) + '">' + icon(iconName) + '<span>' + escapeHtml(label) + '</span>' + (value === current ? '<b>' + icon("check") + '</b>' : '') + '</button>';
  };

  CommunityApp.prototype.renderAdminClassToggle = function (field, label, text, isOn) {
    return '<button type="button" class="kc-admin-event-toggle ' + (isOn ? "is-on" : "") + '" data-action="admin-class-toggle" data-field="' + escapeHtml(field) + '"><span><strong>' + escapeHtml(label) + '</strong><small>' + escapeHtml(text) + '</small></span><b></b></button>';
  };

  CommunityApp.prototype.renderAdminClassPreview = function (draft, compact) {
    return '<aside class="kc-admin-event-preview ' + (compact ? "is-compact" : "") + '"><h3>Vista previa de la clase</h3><div class="kc-admin-event-preview-media">' +
      (draft.coverImage ? '<img src="' + escapeHtml(draft.coverImage) + '" alt="Imagen de portada de la clase">' : icon("image") + '<span>Imagen de portada<br>Se mostrara en tu clase</span>') +
      '</div><small>' + escapeHtml(draft.classType || "Clase guiada") + '</small><h4>' + escapeHtml(draft.title || "Titulo de la clase") + '</h4><p>' + escapeHtml(draft.shortDescription || draft.category || "Categoria de la clase") + '</p><ul><li>' + icon("calendar") + ' Fecha de inicio: ' + escapeHtml(draft.startDate || "--") + '</li><li>' + icon("clock") + ' Horario: ' + escapeHtml((draft.startTime || "--") + " - " + (draft.endTime || "--")) + '</li><li>' + icon("clock") + ' Frecuencia: ' + escapeHtml(draft.frequency || "--") + '</li><li>' + icon("map") + ' Ubicacion: ' + escapeHtml(draft.location || "--") + '</li><li>' + icon("users") + ' Instructor: ' + escapeHtml(draft.instructor || "--") + '</li><li>' + icon("ticket") + ' Precio: ' + escapeHtml(draft.priceMode === "Con costo" ? "$" + (draft.price || "0.00") + " MXN" : "Gratis") + '</li></ul></aside>';
  };

  CommunityApp.prototype.renderAdminClassStepOne = function (community, draft) {
    var typeChoices = '<div class="kc-admin-event-choice-grid">' +
      this.renderAdminClassChoice("classType", "Clase guiada", draft.classType, "Clase guiada", "users") +
      this.renderAdminClassChoice("classType", "Taller", draft.classType, "Taller", "sparkles") +
      this.renderAdminClassChoice("classType", "Meditacion", draft.classType, "Meditacion", "leaf") +
      this.renderAdminClassChoice("classType", "Entrenamiento", draft.classType, "Entrenamiento", "clock") +
      '</div>';
    return '<div class="kc-admin-event-form-grid">' +
      '<div class="kc-admin-event-form">' +
      this.renderAdminClassField("title", "Titulo de la clase *", draft.title, "Ej. Yoga restaurativo para el bienestar") +
      this.renderAdminClassField("shortDescription", "Descripcion breve *", draft.shortDescription, "Una breve descripcion que resuma el proposito de la clase.", "0/140") +
      this.renderAdminClassField("description", "Descripcion completa *", draft.description, "Describe en detalle el contenido, beneficios y lo que los participantes pueden esperar.", "0/1000", "textarea") +
      this.renderAdminClassSelect("communityId", "Comunidad relacionada *", draft.communityId || community.id, [community].concat(this.adminCommunities().filter(function (item) { return item.id !== community.id; })).map(function (item) { return { value: item.id, label: item.name }; }), "") +
      '</div><div class="kc-admin-event-form">' +
      this.renderAdminClassSelect("category", "Categoria *", draft.category, ["Bienestar fisico", "Yoga", "Nutricion", "Running", "Salud mental", "Fuerza"], "") +
      '<div class="kc-admin-event-field"><span>Tipo de clase *</span>' + typeChoices + '</div>' +
      '<div class="kc-admin-event-field"><span>Imagen de portada *</span><button type="button" class="kc-admin-event-upload">' + icon("image") + '<em>Arrastra y suelta una imagen aqui<br>o selecciona un archivo</em></button><small>JPG, PNG o WEBP. Max. 5MB.</small></div>' +
      '</div></div>';
  };

  CommunityApp.prototype.renderAdminClassStepTwo = function (community, draft) {
    return '<div class="kc-admin-event-step-split"><div class="kc-admin-event-form">' +
      '<div class="kc-admin-event-field"><span>Modalidad de la clase *</span><div class="kc-admin-event-choice-grid is-three">' +
      this.renderAdminClassChoice("modality", "Presencial", draft.modality, "Presencial", "users") +
      this.renderAdminClassChoice("modality", "Virtual", draft.modality, "Virtual", "video") +
      this.renderAdminClassChoice("modality", "Hibrida", draft.modality, "Hibrida", "globe") +
      '</div></div><div class="kc-admin-event-grid-3">' +
      this.renderAdminClassField("startDate", "Fecha de inicio *", draft.startDate, "Selecciona una fecha") +
      this.renderAdminClassField("startTime", "Hora de inicio *", draft.startTime, "Selecciona una hora") +
      this.renderAdminClassSelect("duration", "Duracion *", draft.duration, ["45 minutos", "60 minutos", "75 minutos", "90 minutos"], "") +
      '</div><div class="kc-admin-event-field"><span>Frecuencia *</span><div class="kc-admin-event-choice-grid is-three">' +
      this.renderAdminClassChoice("frequency", "Unica", draft.frequency, "Unica", "calendar") +
      this.renderAdminClassChoice("frequency", "Semanal", draft.frequency, "Semanal", "calendar") +
      this.renderAdminClassChoice("frequency", "Recurrente", draft.frequency, "Recurrente", "clock") +
      '</div></div><div class="kc-admin-event-field"><span>Dias de la semana</span><div class="kc-admin-class-day-row">' +
      ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map(function (day) { return '<button type="button">' + day + '</button>'; }).join("") +
      '</div></div><div class="kc-admin-event-grid-2">' +
      this.renderAdminClassSelect("timezone", "Zona horaria *", draft.timezone, ["(GMT-06:00) Ciudad de Mexico", "(GMT-05:00) Bogota", "(GMT-05:00) Lima", "(GMT-04:00) Miami"], "") +
      this.renderAdminClassSelect("location", "Ubicacion *", draft.location, ["Klini Wellness - Sala de Movimiento", "Sala Wellness, Ash and Olmo", "Casa Klini Condesa", "Remoto"], "") +
      '</div><div class="kc-admin-event-grid-2">' +
      this.renderAdminClassField("room", "Sala o estudio *", draft.room, "Escribe el nombre de la sala o estudio") +
      this.renderAdminClassField("virtualLink", "Enlace virtual *", draft.virtualLink, "https://") +
      '</div>' +
      this.renderAdminClassSelect("instructor", "Instructor *", draft.instructor, ["Mariana Lopez", "Maria Fernanda Lopez", "Diego Ramirez", "Camila Perez"], "") +
      this.renderAdminClassToggle("addCalendar", "Mostrar tambien en el calendario de la comunidad", "La clase sera visible para los miembros en el calendario general de la comunidad.", draft.addCalendar) +
      '</div>' + this.renderAdminClassPreview(draft, false) + '</div>';
  };

  CommunityApp.prototype.renderAdminClassStepThree = function (community, draft) {
    return '<div class="kc-admin-event-step-split"><div class="kc-admin-event-form">' +
      '<div class="kc-admin-event-grid-2">' +
      this.renderAdminClassField("capacity", "Cupo maximo *", draft.capacity, "30") +
      this.renderAdminClassToggle("waitlist", "Lista de espera", "Activa una lista de espera si se alcanza el cupo maximo.", draft.waitlist) +
      '</div><div class="kc-admin-event-field"><span>Clase gratuita o con costo *</span><div class="kc-admin-event-choice-grid is-two">' +
      this.renderAdminClassChoice("priceMode", "Gratuita", draft.priceMode, "Gratuita", "check") +
      this.renderAdminClassChoice("priceMode", "Con costo", draft.priceMode, "Con costo", "ticket") +
      '</div></div><div class="kc-admin-event-grid-2">' +
      this.renderAdminClassField("price", "Precio por clase *", draft.price, "$0.00") +
      this.renderAdminClassSelect("currency", "Moneda *", draft.currency, ["MXN - Peso mexicano", "USD - Dolar", "COP - Peso colombiano"], "") +
      '</div><div class="kc-admin-event-grid-2">' +
      this.renderAdminClassField("registrationDeadline", "Fecha limite de registro *", draft.registrationDeadline, "20/06/2025") +
      this.renderAdminClassToggle("manualApproval", "Aprobacion manual de asistentes", "Requiere que apruebes cada solicitud de registro.", draft.manualApproval) +
      '</div>' +
      this.renderAdminClassToggle("allowCancellations", "Permitir cancelaciones", "Los participantes podran cancelar su asistencia.", draft.allowCancellations) +
      this.renderAdminClassSelect("reminder", "Recordatorio automatico", draft.reminder, ["24 horas antes del inicio", "12 horas antes del inicio", "2 horas antes del inicio", "Sin recordatorio"], "") +
      '<div class="kc-admin-event-field"><span>Tipo de acceso *</span><div class="kc-admin-event-choice-grid is-three">' +
      this.renderAdminClassChoice("access", "Abierto a todos", draft.access, "Abierto a todos", "globe") +
      this.renderAdminClassChoice("access", "Solo miembros de la comunidad", draft.access, "Solo miembros", "users") +
      this.renderAdminClassChoice("access", "Invitacion", draft.access, "Invitacion", "message") +
      '</div><small>Cualquier persona podra ver y registrarse a esta clase.</small></div></div>' +
      '<aside class="kc-admin-event-summary-card"><h3>Resumen de registro</h3><article>' + icon("users") + '<div><strong>Cupo maximo</strong><span>' + escapeHtml(draft.capacity || "30") + ' asistentes</span></div></article><article>' + icon("clock") + '<div><strong>Lista de espera</strong><span>' + (draft.waitlist ? "Activada" : "Desactivada") + '</span></div></article><article>' + icon("ticket") + '<div><strong>Requiere pago</strong><span>' + (draft.priceMode === "Con costo" ? "Si, $" + escapeHtml(draft.price || "0.00") : "No, esta clase sera gratuita.") + '</span></div></article></aside></div>';
  };

  CommunityApp.prototype.renderAdminClassStepFour = function (community, draft) {
    return '<div class="kc-admin-event-review"><section><h3>Informacion general</h3><button type="button" class="kc-admin-review-edit" data-action="admin-class-step" data-step="1">Editar</button><dl>' +
      '<div><dt>Titulo de la clase</dt><dd>' + escapeHtml(draft.title) + '</dd></div>' +
      '<div><dt>Categoria</dt><dd>' + escapeHtml(draft.category) + '</dd></div>' +
      '<div><dt>Tipo de clase</dt><dd>' + escapeHtml(draft.classType) + '</dd></div>' +
      '<div><dt>Descripcion</dt><dd>' + escapeHtml(draft.shortDescription) + '</dd></div>' +
      '<div><dt>Comunidad relacionada</dt><dd>' + escapeHtml(community.name) + '</dd></div>' +
      '</dl></section><section><h3>Horario y modalidad</h3><button type="button" class="kc-admin-review-edit" data-action="admin-class-step" data-step="2">Editar</button><dl>' +
      '<div><dt>Fecha de inicio</dt><dd>' + escapeHtml(draft.startDate) + '</dd></div>' +
      '<div><dt>Horario</dt><dd>' + escapeHtml(draft.startTime + " - " + draft.endTime) + '</dd></div>' +
      '<div><dt>Frecuencia</dt><dd>' + escapeHtml(draft.frequency + " (" + draft.weekDays + ")") + '</dd></div>' +
      '<div><dt>Modalidad</dt><dd>' + escapeHtml(draft.modality) + '</dd></div>' +
      '<div><dt>Ubicacion</dt><dd>' + escapeHtml(draft.location) + '</dd></div>' +
      '</dl></section><section><h3>Cupo y registro</h3><button type="button" class="kc-admin-review-edit" data-action="admin-class-step" data-step="3">Editar</button><dl>' +
      '<div><dt>Cupo total</dt><dd>' + escapeHtml(draft.capacity) + ' participantes</dd></div>' +
      '<div><dt>Cupo disponible</dt><dd>8 participantes</dd></div>' +
      '<div><dt>Lista de espera</dt><dd>' + (draft.waitlist ? "Activada" : "Desactivada") + '</dd></div>' +
      '<div><dt>Precio</dt><dd>' + escapeHtml(draft.priceMode === "Con costo" ? "$" + draft.price + " MXN" : "Gratis") + '</dd></div>' +
      '<div><dt>Registro</dt><dd>Requiere inscripcion</dd></div>' +
      '</dl></section>' + this.renderAdminClassPreview(draft, true) + '</div>';
  };

  CommunityApp.prototype.renderAdminClassWizard = function (community) {
    var step = Math.max(1, Math.min(4, Number(this.state.adminClassStep) || 1));
    var draft = this.adminClassDraftFor(community);
    var subtitles = ["Completa la informacion general de tu clase.", "Define el horario, modalidad y ubicacion de tu clase.", "Configura el cupo, el registro y las condiciones de asistencia.", "Revisa la informacion antes de publicar la clase."];
    var content = step === 1 ? this.renderAdminClassStepOne(community, draft) : step === 2 ? this.renderAdminClassStepTwo(community, draft) : step === 3 ? this.renderAdminClassStepThree(community, draft) : this.renderAdminClassStepFour(community, draft);
    return '<section class="kc-admin-event-wizard kc-admin-class-wizard"><div class="kc-admin-event-wizard-head"><div><h2>Crear clase - Paso ' + step + ' de 4</h2><p>' + escapeHtml(subtitles[step - 1]) + '</p></div><button type="button" data-action="' + (step === 4 ? "admin-class-submit" : "admin-class-next") + '">Crear clase</button></div>' + this.renderAdminClassProgress(step) + '<div class="kc-admin-event-wizard-body">' + content + '</div><div class="kc-admin-event-footer"><button type="button" class="kc-admin-event-secondary" data-action="' + (step === 1 ? "admin-class-cancel" : "admin-class-prev") + '">' + (step === 1 ? "Cancelar" : "Atras") + '</button>' + (step === 4 ? '<button type="button" class="kc-admin-event-secondary">Guardar borrador</button>' : '') + '<button type="button" class="kc-admin-event-primary" data-action="' + (step === 4 ? "admin-class-submit" : "admin-class-next") + '">' + (step === 4 ? "Publicar clase" : "Continuar") + '</button></div></section>';
  };

  CommunityApp.prototype.renderAdminClassCard = function (item) {
    var cover = item.coverImage || item.image || "/images/patient-export/c5f724b7a75a6cd919b7.jpg";
    var enrolled = Number(item.enrolled || 8);
    var capacity = Math.max(1, Number(item.capacity || 20));
    return '<article class="kc-admin-event-created-card kc-admin-class-created-card"><div class="kc-admin-event-created-media"><img src="' + escapeHtml(cover) + '" alt="' + escapeHtml(item.title) + '"></div><div class="kc-admin-event-created-copy"><span>Destacada</span><h3>' + escapeHtml(item.title) + '</h3><div class="kc-admin-event-created-meta"><p>' + icon("calendar") + '<b>' + escapeHtml(item.date || "Martes, 27 de mayo 2025") + '</b><small>' + escapeHtml(item.day || "mar") + '</small></p><p>' + icon("clock") + '<b>' + escapeHtml(item.time || "8:00 a.m. - 9:00 a.m.") + '</b><small>Horario</small></p><p>' + icon("video") + '<b>' + escapeHtml(item.modality || "Presencial") + '</b><small>Modalidad</small></p><p>' + icon("map") + '<b>' + escapeHtml(item.place || "Sala Wellness") + '</b><small>Ubicacion</small></p></div><div class="kc-admin-event-created-footer"><p><small>Instructora</small><b>' + escapeHtml(item.instructor || "Mariana Lopez") + '</b></p><p><small>Precio</small><b>' + escapeHtml(item.price || "Gratis") + '</b></p><p><small>Estado</small><b class="is-published">' + escapeHtml(item.status || "Publicada") + '</b></p><div><button type="button">' + icon("eye") + ' Ver clase</button><button type="button">' + icon("edit") + ' Editar</button><button type="button">' + icon("file") + ' Duplicar</button></div></div></div></article><dl class="kc-admin-event-repository"><div><dt>ID de la clase</dt><dd>' + escapeHtml(item.repositoryId || item.id || "CLS-2025-0057") + '</dd></div><div><dt>Capacidad</dt><dd>' + escapeHtml(capacity) + ' personas</dd></div><div><dt>Inscritos</dt><dd><span><i style="width:' + Math.min(100, Math.round((enrolled / capacity) * 100)) + '%"></i></span>' + escapeHtml(enrolled) + ' / ' + escapeHtml(capacity) + '</dd></div><div><dt>Administrador</dt><dd>Klini Wellness (Tu)</dd></div><div><dt>Ultima actualizacion</dt><dd>' + escapeHtml(item.updatedAt || "Hoy") + '</dd></div></dl>';
  };

  CommunityApp.prototype.renderAdminClassesTool = function (community) {
    if (this.state.adminClassMode === "create") return this.renderAdminClassWizard(community);
    var self = this;
    var communityClasses = this.adminClassesForCommunity(community);
    var createdSuccess = this.state.adminClassSuccess ? communityClasses.find(function (item) { return item.id === self.state.adminClassSuccess; }) : null;
    var primaryClass = communityClasses[communityClasses.length - 1];
    return '<section class="kc-admin-tool-view kc-admin-events-panel kc-admin-classes-panel"><div class="kc-section-title"><div><h2>Clases y actividades</h2><p>Sesiones publicadas para miembros de la comunidad.</p></div><button type="button" data-action="admin-create-class">Crear clase</button></div>' +
      (createdSuccess ? '<div class="kc-admin-event-success"><span>' + icon("check") + '</span><div><strong>Clase creada con exito</strong><p>"' + escapeHtml(createdSuccess.title) + '" ya esta publicada y visible para los miembros de la comunidad.</p></div><button type="button" data-action="admin-class-dismiss-success">x</button></div>' : '') +
      (communityClasses.length ? '<section class="kc-admin-event-list"><div class="kc-section-title"><div><h2>Proximas clases</h2><p>Gestiona y consulta las clases programadas de tu comunidad.</p></div></div>' + this.renderAdminClassCard(primaryClass) + '</section>' : '<div class="kc-admin-mini-list"><article><strong>Sin clases activas</strong><p>Crea una clase o actividad para esta comunidad.</p></article></div>') +
      '</section>';
  };

  CommunityApp.prototype.memberRequestBasePeopleFor = function (community) {
    if (!community) return [];
    var explicit = Number(community.pendingMemberRequests || community.pendingRequests || 0);
    var count = explicit > 0 ? explicit : community.id === "ash-olmo" ? 3 : community.id === "respira" ? 2 : 0;
    return count ? people.slice(4, 4 + count) : [];
  };

  CommunityApp.prototype.memberRequestKey = function (communityId, personId) {
    return String(communityId || "") + ":" + String(personId || "");
  };

  CommunityApp.prototype.pendingMemberPeopleFor = function (community) {
    if (!community) return [];
    var self = this;
    var decisions = this.state.memberRequestDecisions || {};
    return this.memberRequestBasePeopleFor(community).filter(function (person) {
      return !decisions[self.memberRequestKey(community.id, person.id)];
    });
  };

  CommunityApp.prototype.approvedMemberPeopleFor = function (community) {
    if (!community) return [];
    var ids = (this.state.approvedCommunityMembers && this.state.approvedCommunityMembers[community.id]) || [];
    return ids.map(function (personId) {
      return people.find(function (person) { return person.id === personId; }) || null;
    }).filter(Boolean);
  };

  CommunityApp.prototype.pendingMemberRequestsFor = function (community) {
    return this.pendingMemberPeopleFor(community).length;
  };

  CommunityApp.prototype.memberCountFor = function (community) {
    return Number(community && community.members || 0) + this.approvedMemberPeopleFor(community).length;
  };

  CommunityApp.prototype.respondToMemberRequest = function (communityId, personId, decision) {
    var community = this.findCommunity(communityId) || this.currentAdminCommunity();
    var person = people.find(function (item) { return item.id === personId; });
    if (!community || !person) return;
    var decisions = this.state.memberRequestDecisions || (this.state.memberRequestDecisions = {});
    var approved = this.state.approvedCommunityMembers || (this.state.approvedCommunityMembers = {});
    decisions[this.memberRequestKey(community.id, person.id)] = decision === "approved" ? "approved" : "rejected";
    if (decision === "approved") {
      var current = approved[community.id] || [];
      if (current.indexOf(person.id) === -1) current.push(person.id);
      approved[community.id] = current;
      this.emit("community.member.approved", { community: community, person: person });
      return;
    }
    this.emit("community.member.rejected", { community: community, person: person });
  };

  CommunityApp.prototype.join = function (id) {
    var community = this.findCommunity(id);
    if (!community) return;
    this.state.memberships[community.id] = community.access === "open" ? "member" : "requested";
    this.emit(community.access === "open" ? "community.joined" : "community.requested", community);
  };

  CommunityApp.prototype.findReservableItem = function (id) {
    var event = events.concat(this.state.adminCreatedEvents || []).find(function (item) { return item.id === id; });
    if (event) return { type: "event", item: event, community: this.findCommunity(event.communityId) || communities[0] };
    var classItem = null;
    var classCommunity = null;
    communities.some(function (community) {
      classItem = this.adminClassesForCommunity(community).find(function (item) { return item.id === id; }) || null;
      if (classItem) classCommunity = community;
      return !!classItem;
    }, this);
    return classItem ? { type: "class", item: classItem, community: classCommunity } : { type: id.indexOf("class-") === 0 ? "class" : "event", item: { id: id }, community: communities[0] };
  };

  CommunityApp.prototype.reserve = function (id) {
    if (this.state.reservations[id]) return;
    var reservable = this.findReservableItem(id);
    this.state.reservations[id] = true;
    this.emit(reservable.type + ".reserved", reservable.item);
  };

  CommunityApp.prototype.cancel = function (id) {
    var reservable = this.findReservableItem(id);
    delete this.state.reservations[id];
    this.emit(reservable.type + ".cancelled", reservable.item);
  };

  CommunityApp.prototype.openReservationFlow = function (id) {
    if (this.state.reservations[id]) return;
    var reservable = this.findReservableItem(id);
    var item = reservable.item || {};
    var community = reservable.community || this.findCommunity(item.communityId) || communities[0];
    this.state.reservationFlow = {
      itemId: id,
      type: reservable.type,
      communityId: community && community.id,
      step: "confirm",
      attendees: 1,
      modality: item.modality || "Presencial",
      confirmAttend: true,
      confirmRules: true,
      returnView: this.state.view,
      returnDetailId: this.state.detailId,
      returnFilter: this.state.filter
    };
    this.state.view = "reservation";
  };

  CommunityApp.prototype.closeReservationFlow = function () {
    var flow = this.state.reservationFlow || {};
    this.state.reservationFlow = null;
    this.state.view = flow.returnView || "directory";
    this.state.detailId = flow.returnDetailId || this.state.detailId;
    this.state.filter = flow.returnFilter || this.state.filter || "events";
  };

  CommunityApp.prototype.updateReservationAttendees = function (delta) {
    var flow = this.state.reservationFlow;
    if (!flow) return;
    flow.attendees = Math.max(1, Math.min(8, (Number(flow.attendees) || 1) + delta));
  };

  CommunityApp.prototype.updateReservationModality = function (modality) {
    var flow = this.state.reservationFlow;
    if (!flow || !modality) return;
    flow.modality = modality;
  };

  CommunityApp.prototype.toggleReservationConfirmation = function (field) {
    var flow = this.state.reservationFlow;
    if (!flow) return;
    if (field === "attend") flow.confirmAttend = !flow.confirmAttend;
    if (field === "rules") flow.confirmRules = !flow.confirmRules;
  };

  CommunityApp.prototype.confirmReservationFlow = function () {
    var flow = this.state.reservationFlow;
    if (!flow || !flow.confirmAttend || !flow.confirmRules) return;
    this.reserve(flow.itemId);
    this.state.reservations[flow.itemId] = { attendees: flow.attendees, modality: flow.modality };
    flow.step = "success";
  };

  CommunityApp.prototype.currentReservation = function () {
    var flow = this.state.reservationFlow || {};
    var reservable = this.findReservableItem(flow.itemId || "");
    var item = reservable.item || {};
    var community = reservable.community || this.findCommunity(flow.communityId) || communities[0] || {};
    return { flow: flow, reservable: reservable, item: item, community: community };
  };

  CommunityApp.prototype.render = function () {
    var shellClass = this.state.view === "create" ? "kc-shell kc-shell-create" : "kc-shell";
    var hideBottomNav = this.options.hideBottomNav || this.state.view === "create" || this.state.view === "reservation";
    this.root.innerHTML = '<div class="klini-communities">' +
      '<section class="' + shellClass + '">' + this.renderView() + '</section>' + this.renderStoryViewer() + this.renderCancelConfirmModal() + (hideBottomNav ? "" : this.renderBottomNav()) + '</div>';
    this.root.querySelectorAll("[data-community-feed-image]").forEach(function (image) {
      image.addEventListener("error", function () {
        if (image.getAttribute("src") !== image.dataset.fallbackSrc) image.src = image.dataset.fallbackSrc;
      }, { once: true });
    });
    this.syncStoryTimer();
    this.syncDirectoryFocus();
    this.applyEventSearch(this.state.eventSearch || "");
    this.applyCommunitySearch();
  };

  CommunityApp.prototype.renderView = function () {
    if (this.state.view === "calendar") return this.renderCommunityCalendar();
    if (this.state.view === "posts") return this.renderPostsFeed();
    if (this.state.view === "directory") return this.renderDirectory();
    if (this.state.view === "detail") return this.renderDetail();
    if (this.state.view === "admin") return this.renderAdminPanel();
    if (this.state.view === "reservation") return this.renderReservationFlow();
    if (this.state.view === "create") return this.renderCreate();
    return this.renderFeed();
  };

  CommunityApp.prototype.renderFeed = function () {
    var allCommunities = this.catalogCommunities();
    var api = window.KliniCommunityActivities;
    var activities = api ? api.items.filter(function (item) { return item.published; }).sort(function (a, b) {
      var createdA = Date.parse(a.created_at) || 0;
      var createdB = Date.parse(b.created_at) || 0;
      return createdB - createdA || Number(b.id) - Number(a.id);
    }) : [];
    var activityCards = activities.map(function (activity) {
      var community = this.findCommunity(activity.community_key) || allCommunities.find(function (item) { return normalizeSearch(item.name) === normalizeSearch(activity.community_name); });
      return this.renderActivityCard(activity, community);
    }, this).join('');
    var searchExtras = '<div data-community-search-extra="posts">' + posts.map(function (post) { return '<div data-community-result="posts" data-search-text="' + escapeHtml(post.text + ' ' + post.author.name) + '">' + this.renderPost(post) + '</div>'; }, this).join('') + '</div>' +
      '<div data-community-search-extra="profiles">' + people.map(function (person) { return '<article class="kc-search-profile" data-community-result="profiles" data-search-text="' + escapeHtml(person.name) + '"><img src="' + escapeHtml(person.avatar) + '" alt=""><div><strong>' + escapeHtml(person.name) + '</strong><p>Perfil de la comunidad</p></div></article>'; }).join('') + '</div>';
    return '<div class="kc-feed-wrap kc-community-feed">' +
      '<section id="kc-community-feed-panel"' + (this.options.separateCalendar ? ' aria-label="Comunidades"' : ' role="tabpanel" aria-labelledby="kc-community-feed-tab"') + '>' +
      this.renderStories() + (this.options.separateCalendar ? '' : '<div class="kc-community-toolbar-slot">' + this.renderCommunityHeader("feed") + '</div>') +
      '<p class="kc-community-search-status" data-community-search-status role="status" hidden></p>' +
      '<div class="kc-community-feed-list" aria-label="Todas las comunidades">' +
      activityCards + searchExtras + (allCommunities.length ? allCommunities.map(this.renderFeedCommunity.bind(this)).join("") : '<p class="kc-empty">No hay comunidades disponibles.</p>') +
      '<p class="kc-empty" data-community-search-empty hidden>No encontramos comunidades con esa búsqueda. Prueba con otro nombre, tema o ciudad.</p>' +
      '</div></section></div>';
  };

  CommunityApp.prototype.renderCommunityHeader = function (section) {
    if (this.options.separateCalendar) {
      if (section === "calendar") return "";
      return '<header class="kc-community-workspace-heading"><label class="kc-community-search">' + icon("search") + '<input type="search" data-community-search value="' + escapeHtml(this.state.communitySearch) + '" placeholder="Buscar publicaciones, perfiles y comunidades" aria-label="Buscar publicaciones, perfiles y comunidades" autocomplete="off" enterkeyhint="search"></label><div class="kc-community-heading-actions"><button type="button" data-action="open-directory-filter" data-id="explore" aria-label="Explorar comunidades" title="Explorar comunidades">' + icon("compass") + '</button><button type="button" data-action="create-open" aria-label="Crear comunidad" title="Crear comunidad">' + icon("plus") + '</button></div></header>';
    }
    return '<header class="kc-community-workspace-heading"><div class="kc-community-switch" role="tablist" aria-label="Comunidades y calendario" data-calendar-tabs>' +
      [{ id: "feed", label: "Comunidades", icon: "users" }, { id: "calendar", label: "Calendario", icon: "calendar" }].map(function (tab) {
        var selected = section === tab.id;
        return '<button type="button" role="tab" id="kc-community-' + tab.id + '-tab" aria-controls="kc-community-' + tab.id + '-panel" aria-selected="' + selected + '" tabindex="' + (selected ? "0" : "-1") + '" data-action="community-section" data-id="' + tab.id + '">' + icon(tab.icon) + '<span>' + tab.label + '</span></button>';
      }).join("") + '</div><div class="kc-community-heading-actions"><button type="button" data-action="open-directory-filter" data-id="explore" aria-label="Explorar comunidades" title="Explorar comunidades">' + icon("compass") + '</button><button type="button" data-action="create-open" aria-label="Crear comunidad" title="Crear comunidad">' + icon("plus") + '</button></div></header>';
  };

  CommunityApp.prototype.calendarItemDate = function (item) {
    var raw = String(item.dateKey || item.isoDate || item.date || "");
    var iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    var numeric = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    var textDate = normalizeSearch(raw).match(/(\d{1,2})\s+de\s+([a-z]+)/);
    var yearMatch = raw.match(/\b(20\d{2})\b/);
    // The imported July/August demo records belong to 2026, not the current year.
    var year = iso ? Number(iso[1]) : numeric ? Number(numeric[3]) : Number(item.year || (yearMatch && yearMatch[1]) || 2026);
    var month = iso ? Number(iso[2]) - 1 : numeric ? Number(numeric[2]) - 1 : EVENT_MONTH_INDEX[normalizeSearch(textDate ? textDate[2] : item.month || "")];
    var day = iso ? Number(iso[3]) : numeric ? Number(numeric[1]) : Number(textDate ? textDate[1] : item.number);
    if (month == null || !day) return null;
    var date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return date;
  };

  CommunityApp.prototype.calendarItemTime = function (item, date) {
    if (!date) return null;
    var raw = String(item.endTime || item.time || item.startTime || "").toLowerCase().replace(/\./g, "");
    var matches = Array.from(raw.matchAll(/(\d{1,2}):(\d{2})\s*([ap]\s*m)?/g));
    // Use the end of a supplied range; undated times remain reserved through that day.
    var time = matches[matches.length - 1];
    var result = new Date(date.getTime());
    if (!time) { result.setHours(23, 59, 59, 999); return result; }
    var hour = Number(time[1]), minute = Number(time[2]);
    if (minute > 59 || hour > 23 || (time[3] && (hour < 1 || hour > 12))) { result.setHours(23, 59, 59, 999); return result; }
    if (time[3]) hour = hour % 12 + (time[3].charAt(0) === "p" ? 12 : 0);
    result.setHours(hour, minute, 0, 0);
    return result;
  };

  CommunityApp.prototype.calendarReservations = function (now) {
    now = now || new Date();
    var api = window.KliniCommunityActivities;
    var shared = api ? api.items.filter(function (item) { return item.reserved; }).map(function (item) {
      var start = new Date(item.starts_at_utc || item.starts_at);
      return { id: 'activity-' + item.id, item: { title: item.title, image: item.image, dateKey: item.starts_at.slice(0,10), time: item.starts_at.slice(11,16), description: item.description, price: api.cost(item.cost) }, community: { name: item.community_name }, date: new Date(item.starts_at), endsAt: start, past: start.getTime() < now.getTime(), activity: item };
    }) : [];
    return Object.keys(this.state.reservations).filter(function (id) { return !!this.state.reservations[id]; }, this).map(function (id) {
      var reservation = this.findReservableItem(id);
      if (!reservation.item.title) return null;
      reservation.id = id;
      reservation.date = this.calendarItemDate(reservation.item);
      reservation.endsAt = this.calendarItemTime(reservation.item, reservation.date);
      reservation.past = !!reservation.endsAt && reservation.endsAt.getTime() < now.getTime();
      return reservation;
    }, this).filter(Boolean).concat(shared).sort(function (a, b) {
      return (a.endsAt ? a.endsAt.getTime() : Infinity) - (b.endsAt ? b.endsAt.getTime() : Infinity) || a.id.localeCompare(b.id);
    });
  };

  // Explicit local-demo setup only; normal visits and profile changes do not seed data.
  CommunityApp.prototype.seedDemoReservations = function () {
    if (this.state.demoReservationsSeeded) return false;
    var today = this.todayDateStart();
    var activities = [
      { id: "yoga", title: "Yoga suave", communityId: "respira", days: 2, time: "08:00", endTime: "09:00", place: "Estudio Klini · Sala Wellness", image: "/brand/klini/wellness-yoga.webp", description: "Respiración, estiramientos y un momento para reconectar contigo." },
      { id: "walking", title: "Caminata en comunidad", communityId: "ritmo", days: 3, time: "09:00", endTime: "10:00", place: "Parque La Mexicana · Punto de encuentro", image: "/brand/klini/wellness-running.webp", description: "Movimiento a tu ritmo y una mañana para compartir al aire libre." },
      { id: "meditation", title: "Meditación guiada", communityId: "mente", days: 6, time: "17:00", endTime: "17:50", place: "En línea", modality: "Virtual", image: "/images/communities/create-cover.png", description: "Una pausa consciente para respirar, soltar tensión y encontrar calma." },
      { id: "past-yoga", title: "Yoga y equilibrio", communityId: "respira", days: -3, time: "08:00", endTime: "09:00", place: "Estudio Klini · Sala Wellness", image: "/brand/klini/wellness-yoga.webp", description: "Práctica suave de movilidad, equilibrio y respiración." },
      { id: "past-walking", title: "Movimiento al aire libre", communityId: "ritmo", days: -7, time: "09:00", endTime: "10:00", place: "Parque La Mexicana", image: "/brand/klini/wellness-running.webp", description: "Una caminata para compartir energía y bienestar en comunidad." }
    ];
    activities.forEach(function (activity) {
      var id = "demo-calendar-v1-" + activity.id;
      var date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + activity.days);
      if (!this.state.adminCreatedEvents.some(function (item) { return item.id === id; })) {
        this.state.adminCreatedEvents.push({
          id: id, communityId: activity.communityId, title: activity.title,
          dateKey: dateKeyFromDate(date), date: date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          day: EVENT_DAY_LABELS[date.getDay()], number: String(date.getDate()), month: date.toLocaleDateString("es-MX", { month: "short" }),
          time: activity.time, endTime: activity.endTime, place: activity.place,
          modality: activity.modality || "Presencial", coverImage: activity.image,
          description: activity.description + " Actividad de demostración de Klini.",
          category: "Bienestar", status: "Publicado", capacity: 20, available: 12, price: "Gratis", demo: true
        });
      }
      this.state.reservations[id] = true;
    }, this);
    this.state.demoReservationsSeeded = true;
    this.save();
    return true;
  };

  CommunityApp.prototype.calendarDateLabel = function (reservation) {
    var date = reservation.date;
    var label = date ? date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "Fecha por confirmar";
    var item = reservation.item;
    var time = item.time || item.startTime || "";
    if (item.endTime) time += (time ? " – " : "Hasta ") + item.endTime;
    return label + (time ? " · " + time : "");
  };

  CommunityApp.prototype.renderCalendarCard = function (reservation, detail) {
    var item = reservation.item, community = reservation.community || {};
    var cover = item.coverImage || item.image || this.communityHeroImage(community);
    var status = reservation.past ? "Anterior" : "Confirmada";
    var saved = this.state.reservations[reservation.id] || {};
    var attendees = Number(saved.attendees);
    var places = attendees > 0 ? attendees + (attendees === 1 ? " lugar reservado" : " lugares reservados") : "Asistencia reservada";
    return '<article class="kc-calendar-card' + (detail ? ' is-detail' : '') + '">' +
      '<header class="kc-calendar-card-top"><span class="kc-calendar-kind">' + icon("lotus") + ' Comunidad</span><span class="kc-calendar-status' + (reservation.past ? ' is-past' : '') + '">' + icon(reservation.past ? "clock" : "check") + status + '</span></header>' +
      '<div class="kc-calendar-card-heading"><img class="kc-calendar-cover" src="' + escapeHtml(cover) + '" alt="" data-community-feed-image data-fallback-src="/images/communities/category-wellness.png" loading="lazy"><div><h2>' + escapeHtml(item.title) + '</h2><p>Comunidad ' + escapeHtml(community.name || "por confirmar") + '</p></div></div>' +
      '<ul class="kc-calendar-meta"><li>' + icon("calendar") + '<span>' + escapeHtml(this.calendarDateLabel(reservation)) + '</span></li><li>' + icon("map") + '<span>' + escapeHtml(item.place || saved.modality || item.modality || "Ubicación por confirmar") + '</span></li>' +
      (item.instructor ? '<li>' + icon("person") + '<span>Instructor: ' + escapeHtml(item.instructor) + '</span></li>' : '') +
      '<li>' + icon("users") + '<span>' + escapeHtml(places) + '</span></li></ul>' +
      (detail ? '<p class="kc-calendar-description">' + escapeHtml(item.description || community.description || "") + '</p>' + (item.modality ? '<p class="kc-calendar-modality">Modalidad: ' + escapeHtml(item.modality) + '</p>' : '') : '<button type="button" class="kc-calendar-open" data-action="calendar-detail" data-id="' + escapeHtml(reservation.id) + '" aria-label="Ver reservación: ' + escapeHtml(item.title) + '">Ver reservación</button>') +
      (reservation.activity ? '<button type="button" class="kc-calendar-community-link" data-activity-reserve="' + reservation.activity.id + '">Cancelar reserva</button>' : '') +
      (community.id ? '<button type="button" class="kc-calendar-community-link" data-action="open-community-panel" data-id="' + escapeHtml(community.id) + '">Ver comunidad</button>' : '') + '</article>';
  };

  CommunityApp.prototype.renderCommunityCalendar = function () {
    var reservations = this.calendarReservations();
    var past = this.state.calendarFilter === "past";
    var detail = reservations.find(function (item) { return item.id === this.state.calendarDetailId; }, this);
    var content;
    if (detail) {
      content = '<button type="button" class="kc-calendar-back" data-action="calendar-back">' + icon("back") + ' Volver al calendario</button><h1 class="kc-calendar-detail-heading" tabindex="-1" data-calendar-detail-heading>Tu reservación</h1>' + this.renderCalendarCard(detail, true);
    } else {
      var visible = reservations.filter(function (item) { return item.past === past; });
      if (past) visible.reverse();
      content = '<div class="kc-calendar-filters" role="tablist" aria-label="Filtrar reservaciones" data-calendar-tabs>' + [{ id: "reserved", label: "Próximas" }, { id: "past", label: "Anteriores" }].map(function (filter) {
        var selected = (past ? "past" : "reserved") === filter.id;
        return '<button type="button" role="tab" id="kc-calendar-' + filter.id + '-tab" aria-controls="kc-calendar-' + filter.id + '-panel" aria-selected="' + selected + '" tabindex="' + (selected ? "0" : "-1") + '" data-action="calendar-filter" data-id="' + filter.id + '">' + filter.label + '</button>';
      }).join("") + '</div><section role="tabpanel" id="kc-calendar-' + (past ? "past" : "reserved") + '-panel" aria-labelledby="kc-calendar-' + (past ? "past" : "reserved") + '-tab"><header class="kc-calendar-list-heading"><h1 tabindex="-1" data-calendar-list-heading>Mis reservaciones</h1><p class="kc-calendar-count" role="status">' + visible.length + (visible.length === 1 ? ' reservación' : ' reservaciones') + (past ? ' anteriores' : ' próximas') + '</p></header><div class="kc-calendar-list">' +
        (visible.length ? visible.map(function (item) { return this.renderCalendarCard(item, false); }, this).join("") : '<div class="kc-calendar-empty"><span>' + icon("calendar") + '</span><h2>' + (past ? "Aquí empieza tu historia" : "Haz espacio para tu bienestar") + '</h2><p>' + (past ? "Tus actividades reservadas aparecerán aquí cuando hayan pasado." : "Aún no tienes próximas actividades reservadas. Explora tus comunidades y encuentra tu siguiente momento de bienestar.") + '</p><button type="button" class="kc-calendar-open" data-action="open-directory-filter" data-id="explore">Explorar comunidades ' + icon("arrow") + '</button></div>') + '</div></section>';
    }
    return '<div class="kc-feed-wrap kc-community-feed kc-community-calendar">' + this.renderCommunityHeader("calendar") + '<section id="kc-community-calendar-panel"' + (this.options.separateCalendar ? ' aria-label="Reservaciones de comunidades"' : ' role="tabpanel" aria-labelledby="kc-community-calendar-tab"') + '>' + content + '</section></div>';
  };

  CommunityApp.prototype.renderPostsFeed = function () {
    return '<div class="kc-feed-wrap kc-posts-home">' +
      this.renderStories() +
      '<div class="kc-post-list" aria-label="Publicaciones de usuarios">' + posts.map(this.renderPost.bind(this)).join("") + '</div></div>';
  };

  CommunityApp.prototype.renderActivityCard = function (activity, community) {
    return this.renderFeedCommunity(merge(community || { id: activity.community_key, name: activity.community_name, access: 'open', members: 0 }, { activity: activity, heroImage: activity.image || (community && this.communityHeroImage(community)) || '/images/communities/create-cover.png', description: activity.description || '' }));
  };

  CommunityApp.prototype.renderFeedCommunity = function (community) {
    var id = escapeHtml(community.id);
    var activity = community.activity;
    var api = window.KliniCommunityActivities;
    var post = { id: activity ? 'activity-' + activity.id : 'community-feed-' + community.id, communityId: community.id, author: {id: 'community-' + community.id, name: community.name, avatar: this.communityHeroImage(community)}, time: activity ? api.date(activity) : community.category || 'Comunidad', text: community.description || '', image: this.communityHeroImage(community), likes: 0, comments: 0, shares: 0 };
    var rendered = this.renderPost(post);
    var footer = rendered.slice(rendered.indexOf('<div class="kc-post-actions">'), rendered.lastIndexOf('</article>'));
    var activityDetails = activity ? '<section class="kc-activity-details"><div class="kc-activity-title"><h3>' + escapeHtml(activity.title) + '</h3><span>' + escapeHtml(api.kinds[activity.kind]) + '</span></div><div class="kc-activity-schedule"><div><p>' + icon('calendar') + escapeHtml(api.date(activity)) + '</p><p>' + icon('tag') + escapeHtml(api.cost(activity.cost)) + '</p></div><button type="button" data-activity-reserve="' + activity.id + '" aria-pressed="' + activity.reserved + '" aria-label="' + (activity.reserved ? 'Cancelar reserva de ' : 'Reservar ') + escapeHtml(activity.title) + '" title="' + (activity.reserved ? 'Cancelar reserva' : 'Reservar lugar') + '"' + (!activity.reserved && activity.capacity && activity.reservations >= activity.capacity ? ' disabled' : '') + '>' + icon('calendar') + '</button></div><small>' + (activity.reserved ? 'Tu lugar está reservado' : activity.capacity && activity.reservations >= activity.capacity ? 'Cupo completo' : 'Reserva de lugar · sin cobro en la app') + '</small></section>' : '';
    var name = escapeHtml(community.name);
    var image = escapeHtml(this.communityHeroImage(community));
    var fallback = "/images/communities/category-wellness.png";
    var initials = escapeHtml(community.logoInitials || community.initials || initialsFromName(community.name));
    return '<article class="kc-community-feed-card" data-community-feed-card data-community-result="' + (activity ? 'activities' : 'communities') + '" data-activity-kind="' + (activity ? activity.kind : '') + '" data-search-text="' + escapeHtml([community.name, community.category, community.city, community.description, activity && activity.title, activity && api.kinds[activity.kind]].join(' ')) + '" data-community-id="' + id + '">' +
      '<header><span class="kc-community-feed-avatar ' + escapeHtml(community.tone || "mint") + '">' + initials + '</span>' +
      '<div><strong>' + name + '</strong><small>' + escapeHtml(community.category || "Bienestar") + ' · ' + escapeHtml(community.city || "En linea") + '</small></div>' +
      '<span class="kc-community-feed-access">' + (community.access === "open" ? "Abierta" : "Con solicitud") + '</span></header>' +
      '<p class="kc-community-feed-description">' + escapeHtml(community.description || "") + '</p>' +
      '<button class="kc-community-feed-cover" type="button" data-action="open-community-panel" data-id="' + id + '" aria-label="Ver comunidad ' + name + '">' +
      '<img src="' + image + '" data-community-feed-image data-fallback-src="' + fallback + '" alt="Portada de ' + name + '" loading="lazy"></button>' +
      footer + activityDetails + '<div class="kc-community-feed-body"><span>' + icon("users") + ' ' + escapeHtml(community.members || 0) + (Number(community.members) === 1 ? ' miembro</span>' : ' miembros</span>') +
      '<button type="button" data-action="open-community-panel" data-id="' + id + '">Ver comunidad ' + icon("arrow") + '</button></div></article>';
  };

  CommunityApp.prototype.communityMatchesSearch = function (community, query) {
    var words = normalizeSearch(query || "").trim().split(/\s+/).filter(Boolean);
    var text = normalizeSearch([community.name, community.category, community.description, community.city].join(" "));
    return words.every(function (word) { return text.indexOf(word) !== -1; });
  };

  CommunityApp.prototype.applyCommunitySearch = function () {
    var query = this.state.communitySearch || '';
    var scope = this.state.communitySearchScope || 'all';
    var words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
    var count = 0;
    var selector = this.root.querySelector('[data-community-search-scope]');
    if (selector) selector.value = scope;
    this.root.querySelectorAll('[data-community-result]').forEach(function (card) {
      var type = card.dataset.communityResult;
      var matchesScope = scope === 'all' || scope === type || card.dataset.activityKind === scope;
      var showExtra = type !== 'posts' && type !== 'profiles' || scope === type || words.length > 0;
      var text = normalizeSearch(card.dataset.searchText || '');
      card.hidden = !matchesScope || !showExtra || !words.every(function (word) { return text.indexOf(word) !== -1; });
      if (!card.hidden) count++;
    });
    var status = this.root.querySelector('[data-community-search-status]');
    if (status) { status.hidden = !query.trim() && scope === 'all'; status.textContent = count + (count === 1 ? ' resultado encontrado' : ' resultados encontrados'); }
    var empty = this.root.querySelector('[data-community-search-empty]');
    if (empty) { empty.hidden = count > 0; empty.textContent = 'No hay resultados para esta búsqueda o filtro.'; }
  };

  CommunityApp.prototype.renderStories = function () {
    if (this.stories) return this.stories.render();
    var items = this.storyItems();
    var isHomePosts = this.options.startView === "posts";
    var hasPatientStory = !!(this.state.storyUploads || {}).patient;
    return '<div class="kc-stories" data-pan data-carousel="stories">' +
      items.map(function (person) {
        if (isHomePosts && person.isPatient) {
          return '<button type="button" class="kc-story kc-story-own" data-action="' + (hasPatientStory ? "open-story" : "upload-story") + '" data-id="' + (hasPatientStory ? escapeHtml(person.id) : "patient") + '" aria-label="' + (hasPatientStory ? "Ver tu historia" : "Agregar tu historia") + '"><span class="kc-story-home-add">' + (hasPatientStory ? '<img src="' + escapeHtml(person.avatar) + '" alt="">' : icon("plus")) + '</span><b>Tu historia</b></button>';
        }
        if (person.canUploadStory) {
          return '<button class="kc-story kc-story-own ' + (person.isManagedCommunity ? "kc-story-managed" : "") + '" data-action="open-story" data-id="' + person.id + '"><span class="kc-story-thumb"><img src="' + escapeHtml(person.avatar) + '" alt="' + escapeHtml(person.name) + '"><em class="kc-story-upload" data-action="upload-story" data-id="' + person.id + '" role="button" aria-label="Subir foto a historia" title="Subir foto">' + icon("plus") + '</em></span><b>' + escapeHtml(person.isPatient ? "Tu historia" : person.short) + '</b></button>';
        }
        if (person.isMore) {
          return '<button class="kc-story kc-story-more" data-action="upload-story" data-id="patient"><span class="kc-story-thumb"><img src="' + escapeHtml(person.avatar) + '" alt="' + escapeHtml(person.name) + '"><em class="kc-story-upload" aria-hidden="true">' + icon("plus") + '</em></span><b>Mas</b></button>';
        }
        return '<button class="kc-story" data-action="open-story" data-id="' + person.id + '"><img src="' + person.avatar + '" alt="' + escapeHtml(person.name) + '"><b>' + escapeHtml(person.short) + '</b></button>';
      }).join("") +
      (isHomePosts && !this.state.showAllStories ? '<button type="button" class="kc-story kc-story-more" data-action="show-more-stories" aria-label="Mostrar más historias"><span class="kc-story-more-mark" aria-hidden="true">•••</span><b>Más</b></button>' : "") + '</div>';
  };

  CommunityApp.prototype.renderStoryViewer = function () {
    if (this.state.storyIndex == null) return "";
    var items = this.storyItems();
    var index = Math.max(0, Math.min(items.length - 1, Number(this.state.storyIndex) || 0));
    var person = items[index];
    var storyPhoto = person.storyPhoto || person.avatar;
    return '<div class="kc-story-viewer" role="dialog" aria-modal="true" aria-label="Historia de ' + escapeHtml(person.name) + '">' +
      '<div class="kc-story-frame">' +
      '<div class="kc-story-progress">' + items.map(function (item, itemIndex) {
        return '<span class="' + (itemIndex < index ? "is-done" : itemIndex === index ? "is-current" : "") + '"><i></i></span>';
      }).join("") + '</div>' +
      '<header class="kc-story-viewer-head"><div><img src="' + escapeHtml(person.avatar) + '" alt=""><strong>' + escapeHtml(person.short.toLowerCase().replace(/\s+/g, "")) + '</strong><span>8 h</span></div><button type="button" aria-label="Opciones">•••</button><button type="button" aria-label="Cerrar historia" data-action="close-story">×</button></header>' +
      '<img class="kc-story-photo" src="' + escapeHtml(storyPhoto) + '" alt="Historia de ' + escapeHtml(person.name) + '">' +
      '<footer class="kc-story-reply"><label><input placeholder="Enviar mensaje..." aria-label="Enviar mensaje"></label><button type="button" aria-label="Me gusta">' + icon("heart") + '</button><button type="button" aria-label="Comentar">' + icon("message") + '</button><button type="button" aria-label="Enviar">' + icon("send") + '</button></footer>' +
      '</div></div>';
  };

  CommunityApp.prototype.renderCancelConfirmModal = function () {
    if (!this.state.cancelConfirmId) return "";
    return '<div class="kc-cancel-confirm-backdrop" role="presentation">' +
      '<section class="kc-cancel-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="kc-cancel-confirm-title">' +
      '<div class="kc-cancel-confirm-icon" aria-hidden="true"><span>!</span></div>' +
      '<h2 id="kc-cancel-confirm-title">&iquest;Estas seguro que quieres cancelar?</h2>' +
      '<p>Selecciona una opci&oacute;n para continuar.</p>' +
      '<div class="kc-cancel-confirm-actions">' +
      '<button type="button" class="kc-cancel-confirm-no" data-action="dismiss-cancel-reservation">No</button>' +
      '<button type="button" class="kc-cancel-confirm-yes" data-action="confirm-cancel-reservation-submit" data-id="' + escapeHtml(this.state.cancelConfirmId) + '">Si</button>' +
      '</div></section></div>';
  };

  CommunityApp.prototype.reservationDateLabel = function (item) {
    var date = item && item.date ? String(item.date) : "martes, 28 de julio";
    return date.charAt(0).toUpperCase() + date.slice(1);
  };

  CommunityApp.prototype.reservationTimeRange = function (item) {
    var start = item && item.time ? String(item.time) : "6:00 p.m.";
    if (item && item.endTime) return start + " - " + item.endTime;
    var match = start.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.m\.|p\.m\.)/i);
    if (!match) return start;
    var hour = Number(match[1]);
    var minutes = Number(match[2] || 0);
    var period = match[3].toLowerCase();
    if (period === "p.m." && hour < 12) hour += 12;
    if (period === "a.m." && hour === 12) hour = 0;
    minutes += 90;
    hour += Math.floor(minutes / 60);
    minutes = minutes % 60;
    var outPeriod = hour >= 12 && hour < 24 ? "p.m." : "a.m.";
    var outHour = hour % 12 || 12;
    var outMinutes = minutes < 10 ? "0" + minutes : String(minutes);
    return start + " - " + outHour + ":" + outMinutes + " " + outPeriod;
  };

  CommunityApp.prototype.renderReservationDetailCard = function (context, compact) {
    var item = context.item || {};
    var community = context.community || {};
    var image = item.image || this.communityHeroImage(community) || community.heroImage || "/images/communities/create-cover.png";
    var title = item.title || "Actividad principal";
    var category = item.category || community.category || "Bienestar";
    var city = community.city || item.city || "Ciudad de M&eacute;xico";
    var available = Number(item.available || 12);
    var capacity = Number(item.capacity || 24);
    return '<article class="kc-booking-detail-card' + (compact ? " is-compact" : "") + '">' +
      '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '">' +
      '<div class="kc-booking-detail-copy"><small>' + escapeHtml(category) + '</small><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(community.description || item.detail || "Yoga suave, respiracion y constancia semanal.") + '</p>' +
      '<ul><li>' + icon("calendar") + '<span>' + escapeHtml(this.reservationDateLabel(item)) + '</span></li>' +
      '<li>' + icon("clock") + '<span>' + escapeHtml(this.reservationTimeRange(item)) + '</span></li>' +
      '<li>' + icon("map") + '<span>' + escapeHtml(city) + '</span></li>' +
      '<li>' + icon("users") + '<span>' + available + ' lugares disponibles de ' + capacity + '</span></li>' +
      '<li>' + icon("users") + '<span>Organiza: ' + escapeHtml(community.name || "Ash and Olmo") + '</span></li></ul></div></article>';
  };

  CommunityApp.prototype.renderReservationFlow = function () {
    var context = this.currentReservation();
    if (!context.flow.itemId) return this.renderDirectory();
    if (context.flow.step === "success") return this.renderReservationSuccess(context);
    return this.renderReservationConfirm(context);
  };

  CommunityApp.prototype.renderReservationConfirm = function (context) {
    var flow = context.flow;
    var item = context.item || {};
    var available = Number(item.available || 12);
    var capacity = Number(item.capacity || 24);
    var pct = Math.max(5, Math.min(100, Math.round((available / Math.max(1, capacity)) * 100)));
    var canConfirm = flow.confirmAttend && flow.confirmRules;
    var presencial = flow.modality !== "Remoto";
    var attendancePhrase = context.reservable.type === "class" ? "a la clase" : "al evento";
    return '<div class="kc-booking-shell kc-booking-confirm">' +
      '<header class="kc-booking-head"><button type="button" data-action="reservation-back" aria-label="Volver">' + icon("back") + '</button><div><h1>Confirmar reservaci&oacute;n</h1><p>Revisa los detalles y confirma tu lugar.</p></div></header>' +
      this.renderReservationDetailCard(context, false) +
      '<section class="kc-booking-card kc-booking-reserve-box"><h2>Tu reservaci&oacute;n</h2><div class="kc-booking-row"><div><h3>Asistentes</h3><p>&iquest;Cu&aacute;ntas personas asistir&aacute;n?</p></div><div class="kc-booking-stepper"><button type="button" data-action="reservation-attendees" data-dir="-1" aria-label="Restar asistente">' + icon("minus") + '</button><strong>' + flow.attendees + '</strong><button type="button" data-action="reservation-attendees" data-dir="1" aria-label="Agregar asistente">' + icon("plus") + '</button></div></div>' +
      '<div class="kc-booking-row kc-booking-modality-row"><div><h3>Modalidad</h3><p>Elige c&oacute;mo deseas participar.</p></div><div class="kc-booking-modality"><button type="button" class="' + (presencial ? "is-selected" : "") + '" data-action="reservation-modality" data-id="Presencial">' + icon("users") + '<span>Presencial</span><b></b></button><button type="button" class="' + (!presencial ? "is-selected" : "") + '" data-action="reservation-modality" data-id="Remoto">' + icon("video") + '<span>Remota</span><b></b></button></div></div></section>' +
      '<section class="kc-booking-card"><h2>Informaci&oacute;n importante</h2><ul class="kc-booking-important"><li>' + icon("check") + 'Llega 15 minutos antes del inicio.</li><li>' + icon("check") + 'Usa ropa c&oacute;moda y lleva tu botella de agua.</li><li>' + icon("check") + 'Tu lugar se libera 10 minutos despu&eacute;s del inicio si no llegas.</li><li>' + icon("check") + 'Puedes cancelar tu reservaci&oacute;n hasta 2 horas antes desde Mis Reservas.</li></ul></section>' +
      '<section class="kc-booking-card kc-booking-availability"><div><h2>Disponibilidad</h2><span><b>' + available + '</b> / ' + capacity + ' lugares disponibles</span></div><em><i style="width:' + pct + '%"></i></em></section>' +
      '<section class="kc-booking-card kc-booking-confirmations"><h2>Confirmaci&oacute;n</h2><button type="button" class="' + (flow.confirmAttend ? "is-checked" : "") + '" data-action="reservation-toggle-confirm" data-id="attend"><span>' + icon("check") + '</span>Confirmo que asistir&eacute; ' + attendancePhrase + '.</button><button type="button" class="' + (flow.confirmRules ? "is-checked" : "") + '" data-action="reservation-toggle-confirm" data-id="rules"><span>' + icon("check") + '</span>Acepto las reglas de la comunidad.<b>Ver reglas ' + icon("arrow") + '</b></button></section>' +
      '<section class="kc-booking-card kc-booking-summary"><h2>Resumen</h2><p><span>Costo</span><b>Gratis</b></p><p><strong>Total</strong><strong>$0 MXN</strong></p></section>' +
      '<footer class="kc-booking-actions"><button type="button" data-action="reservation-cancel">Cancelar</button><button type="button" class="kc-booking-primary" data-action="reservation-submit"' + (canConfirm ? "" : " disabled") + '>' + icon("calendar") + ' Confirmar reservaci&oacute;n</button><p>' + icon("lock") + ' Tus datos est&aacute;n protegidos</p></footer></div>';
  };

  CommunityApp.prototype.renderReservationSuccess = function (context) {
    var activityLabel = context.reservable.type === "class" ? "clase" : "evento";
    var reminderPhrase = context.reservable.type === "class" ? "de la clase" : "del evento";
    return '<div class="kc-booking-shell kc-booking-success">' +
      '<button type="button" class="kc-booking-success-close" data-action="reservation-cancel" aria-label="Cerrar">&times;</button>' +
      '<section class="kc-booking-success-hero"><div class="kc-booking-confetti" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>' + icon("check") + '</span><h1>&iexcl;Confirmado,<br><b>te esperamos!</b></h1><p>Tu reservaci&oacute;n ha sido realizada con &eacute;xito.<br>Recibir&aacute;s un recordatorio antes ' + reminderPhrase + '.</p></section>' +
      '<section class="kc-booking-card kc-booking-success-details"><h2>' + icon("calendar") + ' Detalles de tu reserva</h2>' + this.renderReservationDetailCard(context, true) + '</section>' +
      '<section class="kc-booking-note">' + icon("info") + '<p>Recibir&aacute;s un recordatorio 24 horas antes ' + reminderPhrase + '.<br>Puedes cancelar tu reservaci&oacute;n desde Mis Reservas.</p></section>' +
      '<section class="kc-booking-calendar-card"><span>' + icon("calendar") + '</span><div><h2>Agregar al calendario</h2><p>No te pierdas esta ' + activityLabel + '</p></div><button type="button">Agregar</button></section>' +
      '<section class="kc-booking-thanks"><img src="/images/communities/create-cover.png" alt=""><div><h2>&iexcl;Gracias por ser parte!</h2><p>Tu bienestar inspira a nuestra comunidad.</p><b>&hearts;</b></div></section>' +
      '<footer class="kc-booking-success-actions"><button type="button" class="kc-booking-primary" data-action="reservation-view-reservations">Ver mis reservas</button><button type="button" data-action="reservation-open-community">Ir a la comunidad</button></footer></div>';
  };

  CommunityApp.prototype.renderPost = function (post) {
    this.socialPosts = this.socialPosts || {};
    this.socialPosts[post.id] = post;
    var id = escapeHtml(post.id);
    var liked = !!this.state.likes[post.id];
    var reposted = !!this.state.reposts[post.id];
    var requested = !!this.state.followRequests[post.author.id];
    var commentCount = post.comments + (this.state.postComments[post.id] || []).length;
    var messagesOpen = !!this.state.commentsOpen[post.id];
    var shareOpen = !!this.state.sharesOpen[post.id];
    return '<article class="kc-post" data-social-post="' + id + '" tabindex="-1">' +
      '<header><img src="' + escapeHtml(post.author.avatar) + '" alt=""><div><strong>' + escapeHtml(post.author.name) + '</strong><small>' + escapeHtml(post.time) + '</small></div><button type="button" class="kc-follow-button" data-action="follow-author" data-id="' + id + '" aria-pressed="' + requested + '">' + (requested ? "Solicitado" : "Seguir") + '</button></header>' +
      '<p>' + escapeHtml(post.text) + '</p><img class="kc-post-image" src="' + escapeHtml(post.image) + '" alt="Publicación de bienestar">' +
      '<div class="kc-post-actions"><button type="button" class="' + (liked ? "is-liked" : "") + '" data-action="like" data-id="' + id + '" aria-label="Me gusta" aria-pressed="' + liked + '">' + icon("heart") + ' ' + (post.likes + (liked ? 1 : 0)) + '</button>' +
      '<button type="button" class="' + (messagesOpen ? "is-open" : "") + '" data-action="toggle-post-messages" data-id="' + id + '" aria-label="Mensajes" aria-expanded="' + messagesOpen + '">' + icon("message") + ' ' + commentCount + '</button>' +
      '<button type="button" class="' + (reposted ? "is-reposted" : "") + '" data-action="repost" data-id="' + id + '" aria-label="Repost" aria-pressed="' + reposted + '">' + icon("repost") + ' ' + (post.shares + (reposted ? 1 : 0)) + '</button>' +
      '<button type="button" class="' + (shareOpen ? "is-open" : "") + '" data-action="toggle-post-share" data-id="' + id + '" aria-label="Compartir" aria-expanded="' + shareOpen + '">' + icon("send") + '</button></div>' +
      (reposted ? '<p class="kc-social-notice" role="status">Repost guardado en tu actividad.</p>' : "") +
      (messagesOpen ? this.renderPostMessages(post) : "") +
      (shareOpen ? this.renderPostShare(post) : "") +
      (post.likes >= 3 ? '<div class="kc-liked-by"><span class="kc-mini-avatars">' + people.slice(0, 3).map(function (p) { return '<img src="' + p.avatar + '" alt="">'; }).join("") + '</span>A ' + escapeHtml(people[1].short) + ', ' + escapeHtml(people[2].short) + ' y ' + (post.likes - 3) + ' personas más les gusta esto</div>' : '') + '</article>';
  };

  CommunityApp.prototype.renderPostMessages = function (post) {
    var messages = (postMessages[post.id] || []).concat(this.state.postComments[post.id] || []);
    var self = this;
    return '<section class="kc-post-messages" aria-label="Mensajes de la publicación">' +
      '<div class="kc-post-messages-head"><strong>Mensajes de la publicación</strong><span>' + (post.comments + (this.state.postComments[post.id] || []).length) + ' en total</span></div>' +
      messages.map(function (message, index) {
        return self.renderPostMessage(post, message, index);
      }).join("") +
      '<div class="kc-post-compose"><input data-reply-field="' + escapeHtml(post.id) + '-new" value="' + escapeHtml(this.state.replyDrafts[post.id + '-new'] || '') + '" aria-label="Escribe un mensaje" placeholder="Escribe un mensaje…" maxlength="2000"><button type="button" data-action="send-post-message" data-id="' + escapeHtml(post.id) + '">Publicar</button></div></section>';
  };

  CommunityApp.prototype.renderPostMessage = function (post, message, index) {
    var threadId = post.id + "-message-" + index;
    var replies = this.state.replyThreads[threadId] || [];
    var isOpen = !!this.state.activeReplyThreads[threadId] || replies.length > 0;
    var draft = this.state.replyDrafts[threadId] || "";
    return '<article class="kc-post-message" data-message-thread="' + threadId + '"><img src="' + message.author.avatar + '" alt=""><div class="kc-post-message-bubble"><strong>' + escapeHtml(message.author.name) + '</strong><small>' + escapeHtml(message.time) + '</small><p>' + escapeHtml(message.text) + '</p><button type="button" class="kc-message-reply-trigger" data-action="toggle-message-thread" data-id="' + threadId + '" aria-expanded="' + String(isOpen) + '">' + icon("message") + ' Responder</button>' +
      (isOpen ? '<section class="kc-message-thread" aria-label="Hilo de respuestas">' + (replies.length ? '<div class="kc-message-thread-list">' + replies.map(function (reply) {
        return '<article><img src="' + escapeHtml(reply.author.avatar) + '" alt=""><div><strong>' + escapeHtml(reply.author.name) + '</strong><small>' + escapeHtml(reply.time) + '</small><p>' + escapeHtml(reply.text) + '</p></div></article>';
      }).join("") + '</div>' : '<p class="kc-message-thread-empty">Inicia el hilo respondiendo a este mensaje.</p>') +
      '<div class="kc-message-reply-box"><input data-reply-field="' + threadId + '" value="' + escapeHtml(draft) + '" placeholder="Escribe una respuesta"><button type="button" data-action="send-message-reply" data-id="' + threadId + '">' + icon("send") + '</button></div></section>' : "") +
      '</div></article>';
  };

  CommunityApp.prototype.addMessageReply = function (threadId) {
    var text = ((this.state.replyDrafts || {})[threadId] || "").trim();
    if (!text) {
      this.state.activeReplyThreads[threadId] = true;
      return;
    }
    if (!this.state.replyThreads) this.state.replyThreads = {};
    if (!this.state.replyThreads[threadId]) this.state.replyThreads[threadId] = [];
    this.state.replyThreads[threadId].push({
      author: { name: "T\u00fa", avatar: this.patientProfilePhoto() || "/images/communities/category-mine.png" },
      time: "Ahora",
      text: text
    });
    this.state.replyDrafts[threadId] = "";
    this.state.activeReplyThreads[threadId] = true;
    var postId = threadId.split("-message-")[0];
    var messages = (postMessages[postId] || []).concat(this.state.postComments[postId] || []);
    var message = messages[Number(threadId.split("-message-")[1])];
    this.emit("message.replied", { threadId: threadId, text: text, messageId: "reply-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8), peer: message && message.author, post: this.socialPosts[postId] });
  };

  CommunityApp.prototype.addPostMessage = function (postId) {
    var text = (this.state.replyDrafts[postId + "-new"] || "").trim().slice(0, 2000);
    if (!text) return;
    var message = {id: "message-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8), author: {name: "Tú", avatar: this.patientProfilePhoto() || "/images/communities/category-mine.png"}, time: "Ahora", text: text};
    (this.state.postComments[postId] || (this.state.postComments[postId] = [])).push(message);
    this.state.replyDrafts[postId + "-new"] = "";
    this.state.commentsOpen[postId] = true;
    this.emit("message.sent", {post: this.socialPosts[postId], messageId: message.id, text: text});
  };

  CommunityApp.prototype.renderPostShare = function (post) {
    var publish = [
      ["Facebook", "f", "facebook"],
      ["Instagram", "IG", "instagram"],
      ["X", "X", "x"],
      ["LinkedIn", "in", "linkedin"]
    ];
    var dm = [
      ["WhatsApp", "WA", "whatsapp"],
      ["Messenger", "M", "messenger"],
      ["Telegram", "TG", "telegram"],
      ["Instagram DM", "DM", "instagram-dm"]
    ];
    var renderOption = function (item, mode) {
      return '<button class="kc-share-option kc-share-' + item[2] + '" type="button" data-action="share-post" data-id="' + post.id + '" data-network="' + item[2] + '" data-mode="' + mode + '"><span>' + escapeHtml(item[1]) + '</span><b>' + escapeHtml(item[0]) + '</b></button>';
    };
    return '<section class="kc-post-share-panel" aria-label="Opciones para compartir">' +
      '<div class="kc-post-share-head"><strong>Compartir publicación</strong><small>Publica o envía por mensaje directo.</small></div>' +
      '<div class="kc-share-group"><span>Publicar en redes</span><div>' + publish.map(function (item) { return renderOption(item, "publish"); }).join("") + '</div></div>' +
      '<div class="kc-share-group"><span>Mandar por DM</span><div>' + dm.map(function (item) { return renderOption(item, "dm"); }).join("") + '</div></div>' +
      '</section>';
  };

  CommunityApp.prototype.createValue = function (field, fallback) {
    var value = (this.state.createDraft || {})[field];
    return value == null || value === "" ? (fallback || "") : value;
  };

  CommunityApp.prototype.platformUsers = function () {
    var patient = this.patientSummary();
    var patientNumber = this.options.patient && this.options.patient.id ? String(this.options.patient.id) : "100000001";
    var users = [{
      id: "creator",
      name: patient.name || "Usuario actual",
      short: "Tu",
      userNumber: patientNumber,
      avatar: patient.avatar,
      isCurrentUser: true
    }];
    people.forEach(function (person, index) {
      users.push({
        id: person.id,
        name: person.name,
        short: person.short,
        userNumber: String(100000100 + index),
        avatar: person.avatar
      });
    });
    return users;
  };

  CommunityApp.prototype.findPlatformUser = function (value) {
    var needle = String(value || "").trim().toLowerCase();
    if (!needle) return null;
    return this.platformUsers().find(function (user) {
      return String(user.userNumber).toLowerCase() === needle ||
        String(user.name).toLowerCase() === needle ||
        String(user.name).toLowerCase().indexOf(needle) >= 0;
    }) || null;
  };

  CommunityApp.prototype.addCreateAdministrator = function () {
    var draft = this.state.createDraft || (this.state.createDraft = defaultCreateDraft());
    var user = this.findPlatformUser(draft.adminUserNumber) || this.findPlatformUser(draft.adminSearch);
    var typedNumber = String(draft.adminUserNumber || "").trim();
    if (user) {
      draft.adminSearch = user.name;
      draft.adminUserNumber = user.userNumber;
      return;
    }
    if (typedNumber) {
      draft.adminSearch = "Usuario " + typedNumber;
      draft.adminUserNumber = typedNumber;
    }
  };

  CommunityApp.prototype.resolveCreateAdministrator = function () {
    var draft = this.state.createDraft || {};
    var user = this.findPlatformUser(draft.adminUserNumber) || this.findPlatformUser(draft.adminSearch);
    var currentNumber = this.options.patient && this.options.patient.id ? String(this.options.patient.id) : "100000001";
    if (user && String(user.userNumber) !== currentNumber) return user;
    var name = String(draft.adminSearch || "").trim();
    var number = String(draft.adminUserNumber || "").trim();
    if (number && number === currentNumber) return null;
    if (!name && !number) return null;
    return {
      id: number ? "platform-" + number : "admin-custom",
      name: name || "Usuario " + number,
      short: name ? initialsFromName(name) : "US",
      userNumber: number || "Sin numero",
      avatar: ""
    };
  };

  CommunityApp.prototype.createAdminPermissions = function () {
    return {
      stories: this.createValue("adminAllowStories", true) !== false,
      communityPosts: this.createValue("adminAllowCommunityPosts", true) !== false,
      events: this.createValue("adminAllowEvents", true) !== false,
      classes: this.createValue("adminAllowClasses", true) !== false,
      editPage: this.createValue("adminAllowEditPage", true) !== false
    };
  };

  CommunityApp.prototype.uploadCreateImage = function (field) {
    var self = this;
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "0";
    input.setAttribute("aria-hidden", "true");
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) {
        if (input.parentNode) input.parentNode.removeChild(input);
        return;
      }
      if (file.type && !/^image\//.test(file.type)) {
        if (input.parentNode) input.parentNode.removeChild(input);
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        self.state.createDraft[field] = String(reader.result || "");
        if (input.parentNode) input.parentNode.removeChild(input);
        self.render();
      };
      reader.onerror = function () {
        if (input.parentNode) input.parentNode.removeChild(input);
      };
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
  };

  CommunityApp.prototype.uploadStoryImage = function (storyId) {
    if (this.stories) { this.stories.upload(); return; }
    var self = this;
    var targetId = storyId === "more" ? "patient" : (storyId || "patient");
    var input = document.createElement("input");
    input.type = "file";
    input.accept = ".jpg,.jpeg,image/jpeg";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "0";
    input.setAttribute("aria-hidden", "true");
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) {
        if (input.parentNode) input.parentNode.removeChild(input);
        return;
      }
      var isJpg = (file.type && file.type.toLowerCase() === "image/jpeg") || /\.jpe?g$/i.test(file.name || "");
      if (!isJpg) {
        if (input.parentNode) input.parentNode.removeChild(input);
        window.alert("Selecciona una imagen JPG o JPEG para subirla a tu historia.");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        (self.state.storyUploads || (self.state.storyUploads = {}))[targetId] = String(reader.result || "");
        self.state.storyIndex = null;
        if (input.parentNode) input.parentNode.removeChild(input);
        self.emit("story.uploaded", { id: targetId });
        self.save();
        self.render();
      };
      reader.onerror = function () {
        if (input.parentNode) input.parentNode.removeChild(input);
      };
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
  };

  CommunityApp.prototype.uploadAdminCommunityImage = function (id, field) {
    var self = this;
    var community = this.findCommunity(id) || this.findCommunity(this.state.detailId);
    var safeField = field === "logoImage" ? "logoImage" : "adminHeroImage";
    if (!community || this.communityRole(community) !== "admin") return;
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "0";
    input.setAttribute("aria-hidden", "true");
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) {
        if (input.parentNode) input.parentNode.removeChild(input);
        return;
      }
      if (file.type && !/^image\//.test(file.type)) {
        if (input.parentNode) input.parentNode.removeChild(input);
        window.alert("Selecciona una imagen para actualizar la comunidad.");
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var changes = {};
        changes[safeField] = String(reader.result || "");
        if (safeField === "logoImage") changes.profileImage = changes[safeField];
        self.saveAdminCommunityEdit(community, changes);
        if (input.parentNode) input.parentNode.removeChild(input);
        self.emit("community.admin.image.updated", { id: community.id, field: safeField });
        self.save();
        self.render();
      };
      reader.onerror = function () {
        if (input.parentNode) input.parentNode.removeChild(input);
      };
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
    input.click();
  };

  CommunityApp.prototype.adminTextDraftKey = function (id, field) {
    return String(id || "default") + ":" + String(field || "name");
  };

  CommunityApp.prototype.editAdminCommunityText = function (id, field) {
    var community = this.findCommunity(id) || this.findCommunity(this.state.detailId);
    var safeField = field === "description" ? "description" : "name";
    if (!community || this.communityRole(community) !== "admin") return;
    var key = this.adminTextDraftKey(community.id, safeField);
    this.state.adminTextEdit = { id: community.id, field: safeField };
    this.state.adminTextDrafts = this.state.adminTextDrafts || {};
    this.state.adminTextDrafts[key] = community[safeField] || "";
    this.render();
  };

  CommunityApp.prototype.updateAdminCommunityTextDraft = function (id, field, value) {
    var safeField = field === "description" ? "description" : "name";
    var key = this.adminTextDraftKey(id || this.state.detailId, safeField);
    this.state.adminTextDrafts = this.state.adminTextDrafts || {};
    this.state.adminTextDrafts[key] = value;
  };

  CommunityApp.prototype.cancelAdminCommunityTextEdit = function () {
    this.state.adminTextEdit = null;
    this.render();
  };

  CommunityApp.prototype.saveAdminCommunityTextEdit = function (id, field) {
    var community = this.findCommunity(id) || this.findCommunity(this.state.detailId);
    var safeField = field === "description" ? "description" : "name";
    if (!community || this.communityRole(community) !== "admin") return;
    var key = this.adminTextDraftKey(community.id, safeField);
    var drafts = this.state.adminTextDrafts || {};
    var value = String(drafts[key] != null ? drafts[key] : community[safeField] || "").trim();
    if (!value) return;
    var changes = {};
    changes[safeField] = value;
    if (safeField === "name" && !community.logoImage) {
      changes.initials = initialsFromName(value);
      changes.logoInitials = initialsFromName(value);
    }
    this.saveAdminCommunityEdit(community, changes);
    this.state.adminTextEdit = null;
    this.emit("community.admin.text.updated", { id: community.id, field: safeField });
    this.save();
    this.render();
  };

  CommunityApp.prototype.renderAdminEditableText = function (community, field) {
    var safeField = field === "description" ? "description" : "name";
    var editing = this.state.adminTextEdit && this.state.adminTextEdit.id === community.id && this.state.adminTextEdit.field === safeField;
    var key = this.adminTextDraftKey(community.id, safeField);
    var drafts = this.state.adminTextDrafts || {};
    var value = editing && drafts[key] != null ? drafts[key] : community[safeField] || "";
    if (editing) {
      var control = safeField === "description"
        ? '<textarea data-admin-edit-field="' + safeField + '" data-id="' + escapeHtml(community.id) + '">' + escapeHtml(value) + '</textarea>'
        : '<input data-admin-edit-field="' + safeField + '" data-id="' + escapeHtml(community.id) + '" value="' + escapeHtml(value) + '">';
      return '<div class="kc-admin-editable-line is-editing ' + (safeField === "name" ? "kc-admin-title-line" : "") + '"><label class="kc-admin-edit-inline"><span>' + (safeField === "name" ? "Nombre de la comunidad" : "Descripcion de la comunidad") + '</span>' + control + '</label><div class="kc-admin-edit-actions"><button type="button" class="is-primary" data-action="admin-save-text" data-id="' + escapeHtml(community.id) + '" data-field="' + safeField + '">' + icon("check") + ' Guardar</button><button type="button" data-action="admin-cancel-text">' + icon("minus") + ' Cancelar</button></div></div>';
    }
    return '<div class="kc-admin-editable-line ' + (safeField === "name" ? "kc-admin-title-line" : "") + '">' + (safeField === "name" ? '<h1>' + escapeHtml(value) + '</h1>' : '<p>' + escapeHtml(value) + '</p>') + '<button type="button" data-action="admin-edit-text" data-id="' + escapeHtml(community.id) + '" data-field="' + safeField + '">' + icon("edit") + ' Editar</button></div>';
  };

  CommunityApp.prototype.finishCreate = function () {
    var draft = this.state.createDraft || defaultCreateDraft();
    var name = (draft.name || "").trim() || "Respira y Avanza";
    var ownerAdmin = merge(this.patientSummary(), {
      role: "Administrador propietario",
      userNumber: this.options.patient && this.options.patient.id ? String(this.options.patient.id) : "100000001",
      permissions: { owner: true, fullAccess: true }
    });
    var selectedAdmin = this.resolveCreateAdministrator();
    var adminPermissions = this.createAdminPermissions();
    var additionalAdmin = selectedAdmin ? merge(selectedAdmin, {
      role: "Administrador",
      permissions: adminPermissions
    }) : null;
    var administrators = additionalAdmin ? [ownerAdmin, additionalAdmin] : [ownerAdmin];
    var community = this.findCommunityByName(name);
    if (!community) {
      community = upsertCommunityRecord({
        id: "created-" + Date.now(),
        catalogId: "user-" + slugify(name),
        slug: slugify(name),
        repositorySource: "usuario",
        name: name,
        category: draft.category || "Bienestar",
        access: draft.type === "private" ? "closed" : "open",
        visibility: draft.publicDirectory === false ? "hidden" : "public",
        members: 1,
        city: draft.city || "Ciudad de México",
        description: draft.shortDescription || "Yoga suave, respiración y constancia semanal.",
        longDescription: draft.longDescription || draft.shortDescription || "Un espacio para compartir metas de bienestar y participar en actividades comunitarias.",
        rules: draft.rules || "Mantener respeto, privacidad y participacion responsable dentro de la comunidad.",
        pinnedMessage: "Comunidad creada por usuario. Lista para invitar miembros y publicar actividades.",
        initials: initialsFromName(name),
        logoInitials: initialsFromName(name),
        tone: "mint",
        role: "admin",
        ownerAdministrator: ownerAdmin,
        additionalAdministrator: additionalAdmin,
        administrators: administrators,
        adminPermissions: adminPermissions,
        heroImage: draft.coverImage || "/images/communities/create-cover.png",
        profileImage: draft.profileImage || "",
        features: ["Comunidad nueva", "Bienestar integral", "Gestion propia"],
        classes: []
      });
    } else {
      community = upsertCommunityRecord(merge(community, {
        role: "admin",
        ownerAdministrator: ownerAdmin,
        additionalAdministrator: additionalAdmin,
        administrators: administrators,
        adminPermissions: adminPermissions
      }));
    }
    community.role = "admin";
    this.state.memberships[community.id] = "admin";
    this.state.createdCommunities = this.createdCommunityRecords();
    this.state.filter = "explore";
    this.state.view = "create";
    this.state.createCompleted = true;
    this.state.createdCommunityId = community.id;
    this.emit("community.created", community);
  };

  CommunityApp.prototype.refreshCreatePreview = function () {
    var draft = this.state.createDraft || {};
    var values = {
      "[data-create-preview-name]": draft.name || "Nombre de tu comunidad",
      "[data-create-preview-description]": draft.shortDescription || "Descripción corta aparecerá aquí.",
      "[data-create-preview-category]": draft.category || "Aún sin categoría",
      "[data-create-preview-city]": draft.city || "Ciudad"
    };
    Object.keys(values).forEach(function (selector) {
      var el = document.querySelector(selector);
      if (el) el.textContent = values[selector];
    });
  };

  CommunityApp.prototype.renderCreate = function () {
    var step = this.state.createStep || 1;
    return '<div class="kc-create-flow">' +
      '<header class="kc-create-titlebar"><h1>' + (step === 1 ? 'Información general' : 'Crear comunidad') + '</h1><p>' + (step === 1 ? 'Completa la información básica para tu comunidad.' : 'Configura tu comunidad paso a paso.') + '</p></header>' +
      this.renderCreateStepper(step) +
      '<div class="kc-create-layout"><main>' + this.renderCreateStep(step) + '</main>' + this.renderCreateAside(step) + '</div>' +
      this.renderCreateFooter(step) + '</div>';
  };

  CommunityApp.prototype.renderCreateStepper = function (step) {
    return '<ol class="kc-create-steps">' + createSteps.map(function (item, index) {
      var number = index + 1;
      var state = number < step ? "is-complete" : number === step ? "is-current" : "";
      return '<li class="' + state + '"><button type="button" data-action="create-step" data-id="' + number + '">' +
        '<span>' + (number < step ? icon("check") : number) + '</span><b>' + item.title + '</b></button></li>';
    }).join("") + '</ol>';
  };

  CommunityApp.prototype.renderCreateStep = function (step) {
    if (step === 2) return this.renderCreatePrivacy();
    if (step === 3) return this.renderCreateContent();
    if (step === 4) return this.renderCreateMembers();
    if (step === 5) return this.renderCreateReview();
    return this.renderCreateGeneral();
  };

  CommunityApp.prototype.renderCreateCardHead = function (step, title, description) {
    return '<div class="kc-create-card-head"><div><b>Paso ' + step + ' de 5</b><span>•</span><strong>' + title + '</strong></div><p>' + description + '</p></div>';
  };

  CommunityApp.prototype.renderCreateGeneral = function () {
    return '<section class="kc-create-card">' + this.renderCreateCardHead(1, "Información general", "Completa la información básica para tu comunidad.") +
      '<div class="kc-create-general-grid"><div class="kc-create-fields">' +
      '<label>Nombre de la comunidad *<input data-create-field="name" value="' + escapeHtml(this.createValue("name")) + '" placeholder="Ej. Respira y Avanza"></label>' +
      '<label>Descripción corta *<textarea data-create-field="shortDescription" maxlength="120" placeholder="Describe en una línea de qué trata tu comunidad.">' + escapeHtml(this.createValue("shortDescription")) + '</textarea><small>0/120</small></label>' +
      '<div class="kc-create-two"><label>Categoría *<select data-create-field="category"><option value="">Selecciona una categoría</option><option' + (this.createValue("category") === "Bienestar" ? " selected" : "") + '>Bienestar</option><option' + (this.createValue("category") === "Yoga" ? " selected" : "") + '>Yoga</option><option' + (this.createValue("category") === "Nutrición" ? " selected" : "") + '>Nutrición</option></select></label>' +
      '<label>Ciudad *<select data-create-field="city"><option value="">Selecciona tu ciudad</option><option' + (this.createValue("city") === "Ciudad de México" ? " selected" : "") + '>Ciudad de México</option><option>Guadalajara</option><option>Monterrey</option></select></label></div>' +
      '<label>Etiquetas <span>(máx. 5)</span><input data-create-field="tags" value="' + escapeHtml(this.createValue("tags")) + '" placeholder="Añade etiquetas y presiona Enter"><em>Ej. yoga, respiración, bienestar, meditación</em></label>' +
      '</div>' + this.renderCreateOwnerBox() + '</div></section>';
  };

  CommunityApp.prototype.renderCreatePrivacy = function () {
    var type = this.createValue("type", "open");
    return '<section class="kc-create-card">' + this.renderCreateCardHead(2, "Tipo y privacidad", "Elige quién puede ver, unirse y participar en tu comunidad.") +
      '<div class="kc-create-privacy-grid"><div>' +
      '<h3>Tipo de comunidad</h3><div class="kc-create-choice-grid">' +
      '<label class="kc-create-choice ' + (type !== "private" ? "is-selected" : "") + '">' + icon("globe") + '<input type="radio" name="community-type" data-create-field="type" value="open"' + (type !== "private" ? " checked" : "") + '><strong>Comunidad abierta</strong><p>Cualquiera puede ver el contenido y unirse sin aprobación.</p></label>' +
      '<label class="kc-create-choice ' + (type === "private" ? "is-selected" : "") + '">' + icon("lock") + '<input type="radio" name="community-type" data-create-field="type" value="private"' + (type === "private" ? " checked" : "") + '><strong>Comunidad privada</strong><p>Solo los miembros pueden ver el contenido. Requiere aprobación para unirse.</p></label>' +
      '</div><h3>Configuración adicional</h3><div class="kc-create-toggle-list">' +
      this.renderCreateToggle("approveRequests", "Aprobar solicitudes manualmente", "Revisa y aprueba cada solicitud de ingreso.", "users") +
      this.renderCreateToggle("publicDirectory", "Mostrar comunidad públicamente", "Aparece en búsquedas y en el directorio de comunidades.", "eye") +
      '</div></div>' + this.renderCreateOwnerBox() + '</div></section>' + this.renderCreateCollapsedSteps(3);
  };

  CommunityApp.prototype.renderCreateContent = function () {
    var coverImage = this.createValue("coverImage", "/images/communities/create-cover.png");
    var profileImage = this.createValue("profileImage");
    return '<section class="kc-create-card">' + this.renderCreateCardHead(3, "Portada y contenido", "Personaliza la identidad visual de tu comunidad y define su propósito y reglas.") +
      '<div class="kc-create-media-grid"><div><h3>Imagen de portada</h3><div class="kc-create-cover"><img src="' + escapeHtml(coverImage) + '" alt=""><button type="button" data-action="create-upload-cover" aria-label="Cargar imagen de portada">' + icon("edit") + '</button></div><small>Recomendado 1200 x 400 px. Formato JPG, PNG o WebP.</small></div>' +
      '<div><h3>Imagen de perfil</h3><div class="kc-create-profile-image">' + (profileImage ? '<img src="' + escapeHtml(profileImage) + '" alt="Imagen de perfil de la comunidad">' : icon("leaf")) + '<button type="button" data-action="create-upload-profile" aria-label="Cargar imagen de perfil">' + icon("edit") + '</button></div><small>Recomendado 512 x 512 px.</small></div></div>' +
      '<div class="kc-create-two"><label>Descripción larga<textarea data-create-field="longDescription" maxlength="500" placeholder="Cuéntales más sobre tu comunidad...">' + escapeHtml(this.createValue("longDescription")) + '</textarea><small>0/500</small></label>' +
      '<label>Objetivo de la comunidad<textarea data-create-field="objective" maxlength="300" placeholder="¿Qué quieres lograr con tu comunidad?">' + escapeHtml(this.createValue("objective")) + '</textarea><small>0/300</small></label></div>' +
      '<label>Normas básicas<textarea data-create-field="rules" maxlength="300" placeholder="Establece las reglas principales que todos los miembros deben seguir...">' + escapeHtml(this.createValue("rules")) + '</textarea><small>0/300</small></label>' +
      this.renderCreateOwnerStrip() + '</section>';
  };

  CommunityApp.prototype.renderCreateMembers = function () {
    return '<section class="kc-create-card">' + this.renderCreateCardHead(4, "Miembros y permisos", "Define quién puede participar y qué acciones están disponibles en tu comunidad.") +
      '<div class="kc-create-owner-auto"><img src="/images/communities/owner-mariana.png" alt=""><div><small>Propietario (automático)</small><strong>Mariana López</strong><span>Administrador</span></div><p>Eres el propietario de esta comunidad de forma automática. No puedes cambiar al propietario.</p></div>' +
      '<h3>Permisos y funcionalidades</h3><div class="kc-create-permission-grid">' +
      this.renderCreateToggle("allowPosts", "Permitir publicaciones", "Los miembros pueden crear y compartir publicaciones.", "image") +
      this.renderCreateToggle("allowComments", "Permitir comentarios", "Los miembros pueden comentar en publicaciones.", "message") +
      this.renderCreateToggle("allowEvents", "Crear eventos", "Los miembros pueden crear y organizar eventos.", "calendar") +
      this.renderCreateToggle("allowClasses", "Crear clases", "Los miembros pueden crear y publicar clases.", "globe") +
      '</div><div class="kc-create-two"><div class="kc-create-mini-panel"><h3>Moderadores adicionales <span>(opcional)</span></h3><div class="kc-create-search">Buscar miembros por nombre o correo ' + icon("search") + '</div><div class="kc-create-chips"><span>Ana Sofía Ruiz</span><span>Carlos Ruiz</span><span>Diego Ramírez</span></div><p>Los moderadores pueden gestionar miembros, contenido y reportes, pero no pueden eliminar la comunidad.</p></div>' +
      '<div class="kc-create-mini-panel"><h3>Límite de miembros</h3><label><select data-create-field="memberLimit"><option>Sin límite</option><option>100 miembros</option><option>500 miembros</option></select></label><p>Puedes cambiar este límite en cualquier momento desde la configuración de la comunidad.</p></div></div>' +
      '<div class="kc-create-role-grid"><article><b>Administrador</b><p>Control total de la comunidad y su configuración.</p></article><article><b>Moderador</b><p>Gestiona contenido, miembros y reportes.</p></article><article><b>Miembro</b><p>Participa, publica y comenta.</p></article><article><b>Invitado</b><p>Acceso limitado según la visibilidad configurada.</p></article></div></section>';
  };

  CommunityApp.prototype.renderCreateReview = function () {
    var name = this.createValue("name", "Respira y Avanza");
    var description = this.createValue("shortDescription", "Yoga suave, respiración y constancia semanal.");
    var category = this.createValue("category", "Bienestar");
    var city = this.createValue("city", "Ciudad de México");
    return '<section class="kc-create-card kc-create-review-card">' + this.renderCreateCardHead(5, "Revisión y crear", "Revisa los detalles de tu comunidad antes de crearla. Podrás editar todo después.") +
      this.renderReviewRow("info", "Información general", "Nombre y descripción básica", "Nombre:<br>Descripción:<br>Categoría:<br>Ciudad:", escapeHtml(name) + '<br>' + escapeHtml(description) + '<br>' + escapeHtml(category) + '<br>' + escapeHtml(city), 1) +
      this.renderReviewRow("globe", "Tipo y privacidad", "Visibilidad y acceso", "Tipo:<br>Acceso:", (this.createValue("type", "open") === "private" ? "Comunidad privada<br>Requiere aprobación para unirse." : "Comunidad abierta<br>Cualquiera puede ver el contenido y unirse sin aprobación."), 2) +
      this.renderReviewRow("image", "Portada y contenido", "Imagen, descripción y reglas", "Imagen de portada:<br>Imagen de perfil:<br>Descripción larga:<br>Objetivo:<br>Reglas básicas:", "Imagen personalizada<br>Imagen personalizada<br>" + escapeHtml(description) + "<br>Mejorar el bienestar físico y mental a través de la práctica constante.<br>3 reglas definidas", 3) +
      this.renderReviewRow("users", "Miembros y permisos", "Configuración de participación", "Permitir publicaciones:<br>Permitir comentarios:<br>Crear eventos:<br>Crear clases:<br>Moderadores adicionales:<br>Límite de miembros:", "Sí<br>Sí<br>Sí<br>Sí<br>0<br>" + escapeHtml(this.createValue("memberLimit", "Sin límite")), 4) +
      this.renderReviewRow("shield", "Administrador propietario", "Propietario y permisos", "Propietario:", '<span class="kc-create-owner-inline"><img src="/images/communities/owner-mariana.png" alt=""> Mariana López <b>Administrador</b></span><small>Se asigna automáticamente al usuario que crea la comunidad desde su sesión.</small>', 1) +
      '<label class="kc-create-confirm"><input type="checkbox" data-create-field="confirmed" checked><span>' + icon("check") + '</span><b>Confirmo que la información es correcta</b><small>Al crear la comunidad, acepto que podré editar todos los detalles después.</small></label></section>';
  };

  CommunityApp.prototype.renderReviewRow = function (iconName, title, subtitle, terms, values, step) {
    return '<article class="kc-create-review-row"><div class="kc-create-review-icon">' + icon(iconName) + '</div><div><h3>' + title + '</h3><p>' + subtitle + '</p></div><dl><dt>' + terms + '</dt><dd>' + values + '</dd></dl><button type="button" data-action="create-step" data-id="' + step + '">' + icon("edit") + ' Editar</button></article>';
  };

  CommunityApp.prototype.renderCreateAside = function (step) {
    var draft = this.state.createDraft || {};
    var name = draft.name || "Nombre de tu comunidad";
    var description = draft.shortDescription || "Descripción corta aparecerá aquí.";
    var category = draft.category || "Aún sin categoría";
    var city = draft.city || "Ciudad";
    var coverImage = draft.coverImage || "/images/communities/create-cover.png";
    var profileImage = draft.profileImage || "";
    var tip = [
      "Tómate tu tiempo para configurar tu comunidad. Podrás editar todos los detalles después.",
      "Puedes cambiar algunas configuraciones más adelante desde los ajustes de tu comunidad.",
      "Una portada atractiva y una descripción clara ayudan a que más personas se unan a tu comunidad.",
      "Los permisos adecuados fomentan una comunidad activa, segura y bien organizada.",
      "Una vez creada, podrás invitar miembros, configurar notificaciones y personalizar más opciones desde la administración."
    ][step - 1];
    return '<aside class="kc-create-sidebar"><section class="kc-create-preview"><h3>Vista previa de la comunidad</h3><div class="kc-create-preview-cover"><img src="' + escapeHtml(coverImage) + '" alt=""><span>' + (profileImage ? '<img src="' + escapeHtml(profileImage) + '" alt="Imagen de perfil de la comunidad">' : icon("leaf")) + '</span></div><h4 data-create-preview-name>' + escapeHtml(name) + '</h4><p data-create-preview-description>' + escapeHtml(description) + '</p><div><span>' + icon("tag") + ' <b data-create-preview-category>' + escapeHtml(category) + '</b></span><span>' + icon("map") + ' <b data-create-preview-city>' + escapeHtml(city) + '</b></span></div></section>' +
      '<section class="kc-create-side-card"><h3>Administrador propietario</h3><div class="kc-create-admin-row"><img src="/images/communities/owner-mariana.png" alt=""><div><strong>Mariana López</strong><span>Administrador</span></div>' + icon("shield") + '</div><p>Se asigna automáticamente al usuario que crea la comunidad desde su sesión.</p></section>' +
      '<section class="kc-create-side-card"><h3>Checklist de creación</h3><ol class="kc-create-checklist">' + createSteps.map(function (item, index) {
        var number = index + 1;
        var label = number < step ? "Completado" : number === step ? (step === 5 ? "Listo" : "En curso") : "Pendiente";
        return '<li class="' + (number < step ? "is-done" : number === step ? "is-now" : "") + '"><span>' + number + '</span><b>' + item.title + '</b><em>' + label + '</em></li>';
      }).join("") + '</ol></section>' +
      '<section class="kc-create-advice">' + icon("sparkles") + '<div><h3>Consejo</h3><p>' + tip + '</p></div></section></aside>';
  };

  CommunityApp.prototype.renderCreateOwnerBox = function () {
    return '<aside class="kc-create-owner-box"><h3>' + icon("lock") + ' Propietario de la comunidad</h3><div class="kc-create-admin-row"><img src="/images/communities/owner-mariana.png" alt=""><div><strong>Mariana López</strong><span>Administrador</span></div></div><p>Se asigna automáticamente al usuario que crea la comunidad desde su sesión.</p><div class="kc-create-note">' + icon("shield") + '<span>No puedes cambiar al propietario. Podrás añadir moderadores en el siguiente paso.</span></div></aside>';
  };

  CommunityApp.prototype.renderCreateOwnerStrip = function () {
    return '<div class="kc-create-owner-strip">' + icon("lock") + '<div><strong>Propietario de la comunidad</strong><small>No puedes cambiar al propietario. Podrás añadir moderadores en el siguiente paso.</small></div><img src="/images/communities/owner-mariana.png" alt=""><b>Mariana López</b><span>Administrador</span></div>';
  };

  CommunityApp.prototype.renderCreateToggle = function (field, title, description, iconName) {
    var checked = this.createValue(field, true) !== false;
    return '<label class="kc-create-toggle">' + icon(iconName) + '<div><strong>' + title + '</strong><p>' + description + '</p></div><input type="checkbox" data-create-field="' + field + '"' + (checked ? " checked" : "") + '><span></span></label>';
  };

  CommunityApp.prototype.renderCreateCollapsedSteps = function (from) {
    return '<div class="kc-create-collapsed">' + createSteps.slice(from - 1).map(function (item, index) {
      var number = from + index;
      return '<button type="button" data-action="create-step" data-id="' + number + '">' + icon(item.icon) + '<div><strong>Paso ' + number + '</strong><span>' + item.title + '</span></div><em>Pendiente</em>' + icon("arrow") + '</button>';
    }).join("") + '</div>';
  };

  CommunityApp.prototype.renderCreateFooter = function (step) {
    return '<footer class="kc-create-footer"><button type="button" data-action="create-cancel">Cancelar</button>' +
      (step === 5 ? '<button type="button" class="kc-create-draft">' + icon("file") + ' Guardar borrador</button>' : '<span></span>') +
      '<div><button type="button" data-action="create-prev"' + (step === 1 ? " disabled" : "") + '>Anterior</button>' +
      '<button type="button" class="kc-create-primary" data-action="' + (step === 5 ? "create-submit" : "create-next") + '">' + (step === 5 ? icon("sparkles") + ' Crear comunidad' : 'Siguiente ' + icon("arrow")) + '</button></div></footer>';
  };

  CommunityApp.prototype.renderCreate = function () {
    var step = this.state.createStep || 1;
    if (this.state.createCompleted) return this.renderCreateSuccess();
    return '<div class="kc-create-flow kc-create-mobile-wizard">' +
      '<header class="kc-create-mobile-head"><button type="button" data-action="create-cancel" aria-label="Volver">' + icon("back") + '</button><strong>Crear comunidad</strong><button type="button" data-action="create-cancel" aria-label="Cerrar">&times;</button></header>' +
      this.renderCreateStepper(step) +
      '<main class="kc-create-mobile-main">' + this.renderCreateStep(step) + '</main>' +
      this.renderCreateFooter(step) + '</div>';
  };

  CommunityApp.prototype.renderCreateStepper = function (step) {
    return '<div class="kc-create-mobile-progress"><ol class="kc-create-steps">' + createSteps.map(function (item, index) {
      var number = index + 1;
      var state = number < step ? "is-complete" : number === step ? "is-current" : "";
      return '<li class="' + state + '"><button type="button" data-action="create-step" data-id="' + number + '" aria-label="' + escapeHtml(item.title) + '"><span>' + (number < step ? icon("check") : number) + '</span></button></li>';
    }).join("") + '</ol><b>' + createSteps[step - 1].title + '</b></div>';
  };

  CommunityApp.prototype.renderCreateMobileHero = function (iconName, title, description, tone) {
    return '<div class="kc-create-mobile-hero ' + (tone || "") + '"><span>' + icon(iconName) + '</span><h2>' + title + '</h2><p>' + description + '</p></div>';
  };

  CommunityApp.prototype.renderCreateGeneral = function () {
    var category = this.createValue("category");
    var city = this.createValue("city");
    var description = this.createValue("shortDescription");
    return '<section class="kc-create-card">' +
      this.renderCreateMobileHero("users", "Informaci&oacute;n general", "Cu&eacute;ntanos lo b&aacute;sico para comenzar a crear tu comunidad.") +
      '<div class="kc-create-fields">' +
      '<label>Nombre de la comunidad *<input data-create-field="name" value="' + escapeHtml(this.createValue("name")) + '" placeholder="Ej. Respira y Avanza"></label>' +
      '<label>Descripci&oacute;n corta *<textarea data-create-field="shortDescription" maxlength="120" placeholder="Describe en una l&iacute;nea de qu&eacute; trata tu comunidad.">' + escapeHtml(description) + '</textarea><small>' + description.length + '/120</small></label>' +
      '<label class="kc-create-select-label">Categor&iacute;a *<span>' + icon("tag") + '<select data-create-field="category"><option value="">Selecciona una categor&iacute;a</option><option value="Bienestar"' + (category === "Bienestar" ? " selected" : "") + '>Bienestar</option><option value="Yoga"' + (category === "Yoga" ? " selected" : "") + '>Yoga</option><option value="Nutrici&oacute;n"' + (category === "Nutrición" ? " selected" : "") + '>Nutrici&oacute;n</option></select>' + icon("arrow") + '</span></label>' +
      '<label class="kc-create-select-label">Ciudad *<span>' + icon("map") + '<select data-create-field="city"><option value="">Selecciona tu ciudad</option><option value="Ciudad de M&eacute;xico"' + (city === "Ciudad de México" ? " selected" : "") + '>Ciudad de M&eacute;xico</option><option>Guadalajara</option><option>Monterrey</option></select>' + icon("arrow") + '</span></label>' +
      '</div></section>';
  };

  CommunityApp.prototype.renderCreatePrivacy = function () {
    var type = this.createValue("type", "open");
    return '<section class="kc-create-card">' +
      this.renderCreateMobileHero("lock", "Tipo y privacidad", "Elige qui&eacute;n puede ver, unirse y participar en tu comunidad.", "is-blue") +
      '<h3>Tipo de comunidad</h3><div class="kc-create-choice-grid">' +
      '<label class="kc-create-choice ' + (type !== "private" ? "is-selected" : "") + '">' + icon("globe") + '<strong>Comunidad abierta</strong><p>Cualquiera puede ver el contenido y unirse sin aprobaci&oacute;n.</p><input type="radio" name="community-type" data-create-field="type" value="open"' + (type !== "private" ? " checked" : "") + '></label>' +
      '<label class="kc-create-choice ' + (type === "private" ? "is-selected" : "") + '">' + icon("lock") + '<strong>Comunidad privada</strong><p>Solo los miembros pueden ver el contenido. Requiere aprobaci&oacute;n para unirse.</p><input type="radio" name="community-type" data-create-field="type" value="private"' + (type === "private" ? " checked" : "") + '></label>' +
      '</div><h3>Visibilidad en el directorio</h3><div class="kc-create-toggle-list">' +
      this.renderCreateToggle("publicDirectory", "Mostrar comunidad p&uacute;blicamente", "Aparecer&aacute; en b&uacute;squedas y en el directorio de comunidades.", "eye") +
      '</div></section>';
  };

  CommunityApp.prototype.renderCreateContent = function () {
    var coverImage = this.createValue("coverImage", "/images/communities/create-cover.png");
    var profileImage = this.createValue("profileImage");
    var longDescription = this.createValue("longDescription");
    return '<section class="kc-create-card">' +
      this.renderCreateMobileHero("image", "Portada y contenido", "Personaliza la imagen, descripci&oacute;n y prop&oacute;sito de tu comunidad.", "is-purple") +
      '<div class="kc-create-media-grid"><div><h3>Imagen de portada</h3><div class="kc-create-cover"><img src="' + escapeHtml(coverImage) + '" alt=""><button type="button" data-action="create-upload-cover" aria-label="Cargar imagen de portada">' + icon("camera") + '</button></div></div>' +
      '<div class="kc-create-profile-block"><h3>Imagen de perfil</h3><div class="kc-create-profile-image">' + (profileImage ? '<img src="' + escapeHtml(profileImage) + '" alt="Imagen de perfil de la comunidad">' : icon("leaf")) + '<button type="button" data-action="create-upload-profile" aria-label="Cargar imagen de perfil">' + icon("camera") + '</button></div></div></div>' +
      '<label>Descripci&oacute;n larga *<textarea data-create-field="longDescription" maxlength="500" placeholder="Cu&eacute;ntales m&aacute;s sobre tu comunidad...">' + escapeHtml(longDescription) + '</textarea><small>' + longDescription.length + '/500</small></label>' +
      '</section>';
  };

  CommunityApp.prototype.renderCreateMembers = function () {
    var limit = this.createValue("memberLimit", "Sin l&iacute;mite");
    var owner = this.patientSummary();
    var ownerNumber = this.options.patient && this.options.patient.id ? String(this.options.patient.id) : "100000001";
    var selectedAdmin = this.resolveCreateAdministrator();
    var userOptions = this.platformUsers().filter(function (user) { return !user.isCurrentUser; }).map(function (user) {
      return '<option value="' + escapeHtml(user.name) + '" label="#' + escapeHtml(user.userNumber) + '"></option>';
    }).join("");
    var selectedMarkup = selectedAdmin ? '<div class="kc-create-admin-selected">' +
      '<span>' + (selectedAdmin.avatar ? '<img src="' + escapeHtml(selectedAdmin.avatar) + '" alt="">' : escapeHtml(initialsFromName(selectedAdmin.name))) + '</span>' +
      '<div><strong>' + escapeHtml(selectedAdmin.name) + '</strong><small>ID de usuario - ' + escapeHtml(selectedAdmin.userNumber || "Sin numero") + '</small></div><b>Administrador</b></div>' : "";
    return '<section class="kc-create-card">' +
      this.renderCreateMobileHero("users", "Miembros y permisos", "Configura roles y permisos para mantener tu comunidad segura y organizada.") +
      '<div class="kc-create-owner-admin"><span>' + (owner.avatar ? '<img src="' + escapeHtml(owner.avatar) + '" alt="">' : escapeHtml(initialsFromName(owner.name))) + '</span><div><small>Administrador propietario</small><strong>' + escapeHtml(owner.name || "Usuario actual") + '</strong><p>ID de usuario - ' + escapeHtml(ownerNumber) + '</p></div><b>Control total</b></div>' +
      '<div class="kc-create-admin-manager"><h3>Administrador de la comunidad</h3><p>Selecciona a la persona que administrar&aacute; esta comunidad.</p>' +
      '<label>Buscar administrador<span class="kc-create-admin-search"><input data-create-field="adminSearch" list="kc-create-admin-users" value="' + escapeHtml(this.createValue("adminSearch")) + '" placeholder="Buscar por nombre o usuario">' + icon("search") + '</span></label><datalist id="kc-create-admin-users">' + userOptions + '</datalist>' +
      '<div class="kc-create-admin-number"><label>o agregar por n&uacute;mero de usuario<input data-create-field="adminUserNumber" value="' + escapeHtml(this.createValue("adminUserNumber")) + '" placeholder="# N&uacute;mero de usuario"></label><button type="button" data-action="create-add-admin">Agregar</button></div>' +
      selectedMarkup +
      '<h3>Autorizaciones del administrador</h3><p>Define qu&eacute; puede hacer esta persona en la comunidad.</p><div class="kc-create-toggle-list kc-create-admin-toggles">' +
      this.renderCreateToggle("adminAllowStories", "Posteo de stories en redes sociales", "Puede publicar historias conectadas a la comunidad.", "send") +
      this.renderCreateToggle("adminAllowCommunityPosts", "Publicaciones en la comunidad", "Puede crear publicaciones dentro de la comunidad.", "message") +
      this.renderCreateToggle("adminAllowEvents", "Crear eventos", "Puede organizar y publicar eventos.", "calendar") +
      this.renderCreateToggle("adminAllowClasses", "Crear clases", "Puede crear y publicar clases o actividades.", "file") +
      this.renderCreateToggle("adminAllowEditPage", "Editar informaci&oacute;n de la p&aacute;gina de la comunidad", "Puede actualizar portada, descripci&oacute;n y datos generales.", "edit") +
      '</div></div>' +
      '<h3>Permisos generales de miembros</h3><div class="kc-create-toggle-list kc-create-role-toggles">' +
      this.renderCreateToggle("allowPosts", "Publicaciones", "Los miembros pueden crear y compartir publicaciones.", "image") +
      this.renderCreateToggle("allowComments", "Comentarios", "Los miembros pueden comentar en publicaciones.", "message") +
      this.renderCreateToggle("allowEvents", "Eventos", "Los miembros pueden crear y organizar eventos.", "calendar") +
      this.renderCreateToggle("allowClasses", "Clases", "Los miembros pueden crear y publicar clases.", "file", false) +
      '</div><label class="kc-create-select-label">L&iacute;mite de miembros<span><select data-create-field="memberLimit"><option' + (limit === "Sin límite" || limit === "Sin l&iacute;mite" ? " selected" : "") + '>Sin l&iacute;mite</option><option' + (limit === "100 miembros" ? " selected" : "") + '>100 miembros</option><option' + (limit === "500 miembros" ? " selected" : "") + '>500 miembros</option></select>' + icon("arrow") + '</span></label></section>';
  };

  CommunityApp.prototype.renderCreateReview = function () {
    var name = this.createValue("name", "Respira y Avanza");
    var category = this.createValue("category", "Bienestar");
    var city = this.createValue("city", "Ciudad de México");
    var type = this.createValue("type", "open") === "private" ? "Comunidad privada" : "Comunidad abierta";
    var coverImage = this.createValue("coverImage", "/images/communities/create-cover.png");
    var permissions = ["Publicaciones", "Comentarios", "Eventos"];
    if (this.createValue("allowClasses", false) !== false) permissions.push("Clases");
    var owner = this.patientSummary();
    var selectedAdmin = this.resolveCreateAdministrator();
    var adminPermissions = this.createAdminPermissions();
    var adminPermissionLabels = [];
    if (adminPermissions.stories) adminPermissionLabels.push("Stories en redes");
    if (adminPermissions.communityPosts) adminPermissionLabels.push("Publicaciones");
    if (adminPermissions.events) adminPermissionLabels.push("Eventos");
    if (adminPermissions.classes) adminPermissionLabels.push("Clases");
    if (adminPermissions.editPage) adminPermissionLabels.push("Editar pagina");
    return '<section class="kc-create-card kc-create-review-card">' +
      this.renderCreateMobileHero("check", "Revisi&oacute;n y crear", "Revisa los detalles de tu comunidad antes de crearla. Podr&aacute;s editar todo despu&eacute;s.", "is-purple") +
      '<article class="kc-create-summary"><header><strong>Resumen de tu comunidad</strong><button type="button" data-action="create-step" data-id="1">' + icon("edit") + ' Editar</button></header>' +
      this.renderCreateSummaryRow("info", "Nombre", escapeHtml(name)) +
      this.renderCreateSummaryRow("tag", "Categor&iacute;a", escapeHtml(category)) +
      this.renderCreateSummaryRow("map", "Ciudad", escapeHtml(city)) +
      this.renderCreateSummaryRow("globe", "Tipo", type) +
      this.renderCreateSummaryRow("image", "Portada", '<img src="' + escapeHtml(coverImage) + '" alt="">') +
      this.renderCreateSummaryRow("users", "Miembros", escapeHtml(this.createValue("memberLimit", "Sin l&iacute;mite"))) +
      this.renderCreateSummaryRow("shield", "Permisos", permissions.join(", ")) +
      this.renderCreateSummaryRow("shield", "Propietario", escapeHtml(owner.name || "Usuario actual") + " - Administrador") +
      this.renderCreateSummaryRow("users", "Administrador", selectedAdmin ? escapeHtml(selectedAdmin.name) + " - ID " + escapeHtml(selectedAdmin.userNumber || "Sin numero") : "Sin administrador adicional") +
      this.renderCreateSummaryRow("check", "Autorizaciones", selectedAdmin ? escapeHtml(adminPermissionLabels.join(", ") || "Sin autorizaciones") : "Control total solo para el propietario") +
      '</article><div class="kc-create-safe-note">' + icon("shield") + '<p>Podr&aacute;s editar toda la informaci&oacute;n despu&eacute;s desde la administraci&oacute;n de tu comunidad.</p></div></section>';
  };

  CommunityApp.prototype.renderCreateSummaryRow = function (iconName, label, value) {
    return '<div class="kc-create-summary-row">' + icon(iconName) + '<span>' + label + '</span><b>' + value + '</b></div>';
  };

  CommunityApp.prototype.renderCreateToggle = function (field, title, description, iconName, fallbackChecked) {
    var fallback = arguments.length > 4 ? fallbackChecked : true;
    var checked = this.createValue(field, fallback) !== false;
    return '<label class="kc-create-toggle">' + icon(iconName) + '<div><strong>' + title + '</strong><p>' + description + '</p></div><input type="checkbox" data-create-field="' + field + '"' + (checked ? " checked" : "") + '><span></span></label>';
  };

  CommunityApp.prototype.renderCreateFooter = function (step) {
    return '<footer class="kc-create-footer ' + (step === 1 ? "is-single" : "") + '">' +
      (step > 1 ? '<button type="button" data-action="create-prev">Anterior</button>' : '') +
      '<button type="button" class="kc-create-primary" data-action="' + (step === 5 ? "create-submit" : "create-next") + '">' + (step === 5 ? icon("sparkles") + ' Crear comunidad' : 'Siguiente') + '</button></footer>';
  };

  CommunityApp.prototype.renderCreateSuccess = function () {
    var id = this.state.createdCommunityId || "";
    var name = this.createValue("name", "Respira y Avanza");
    return '<div class="kc-create-flow kc-create-success-flow">' +
      '<div class="kc-create-success">' +
      '<div class="kc-create-confetti"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="kc-create-success-check">' + icon("check") + '</div>' +
      '<h2>&iexcl;Comunidad creada!</h2><p><strong>' + escapeHtml(name) + '</strong> ya est&aacute; lista. Ahora puedes invitar a miembros, configurar m&aacute;s opciones y comenzar a construir tu comunidad.</p>' +
      '<section class="kc-create-next-card"><h3>&iquest;Qu&eacute; sigue?</h3>' +
      this.renderCreateSuccessOption("users", "Invitar miembros", "Comparte tu comunidad con m&aacute;s personas.") +
      this.renderCreateSuccessOption("sparkles", "Configurar notificaciones", "Elige c&oacute;mo y cu&aacute;ndo recibir notificaciones.") +
      this.renderCreateSuccessOption("users", "Personalizar m&aacute;s", "Ajusta la informaci&oacute;n, reglas y m&aacute;s opciones.") +
      '</section><button type="button" class="kc-create-primary kc-create-success-main" data-action="open-detail" data-id="' + escapeHtml(id) + '">Ir a mi comunidad</button>' +
      '<button type="button" class="kc-create-link-button" data-action="open-directory">Ir al panel de comunidades</button></div></div>';
  };

  CommunityApp.prototype.renderCreateSuccessOption = function (iconName, title, description) {
    return '<article>' + icon(iconName) + '<div><strong>' + title + '</strong><p>' + description + '</p></div>' + icon("arrow") + '</article>';
  };

  CommunityApp.prototype.renderDirectory = function () {
    var filters = [
      ["events", "Eventos y Clases", "calendar"], ["explore", "Explorar", "search"],
      ["mine", "Mis comunidades", "users"]
    ];
    var sectionLabels = { events: "Eventos y Clases", explore: "Explorar", mine: "Mis comunidades" };
    var validFilters = filters.map(function (item) { return item[0]; });
    if (validFilters.indexOf(this.state.filter) === -1) this.state.filter = "explore";
    var allCommunities = this.catalogCommunities();
    var reserved = events.filter(function (event) { return !!this.state.reservations[event.id]; }, this);
    var mine = allCommunities.filter(function (community) { var role = this.communityRole(community); return role === "member" || role === "admin"; }, this);
    return '<div class="kc-directory">' +
      '<button class="kc-back" data-action="back-feed">' + icon("back") + ' Volver a Comunidades</button>' +
      '<div class="kc-directory-heading"><small>Comunidades</small><h1>Comunidades</h1><p>Conecta, comparte y mejora tu bienestar con personas que tienen intereses similares.</p></div>' +
      '<div class="kc-filter-row" role="tablist" aria-label="Secciones de comunidades">' + filters.map(function (item) {
        var selected = this.state.filter === item[0];
        return '<button type="button" role="tab" class="kc-filter ' + (selected ? " active" : "") + '" data-action="filter" data-id="' + item[0] + '" aria-controls="kc-directory-panel-' + item[0] + '" aria-selected="' + (selected ? "true" : "false") + '" aria-current="' + (selected ? "page" : "false") + '" aria-pressed="' + (selected ? "true" : "false") + '">' + icon(item[2]) + item[1] + '</button>';
      }, this).join("") + '</div>' +
      '<div id="kc-directory-panel-' + escapeHtml(this.state.filter) + '" class="kc-directory-content" data-directory-content data-section="' + escapeHtml(this.state.filter) + '" aria-label="' + escapeHtml(sectionLabels[this.state.filter] || "Comunidades") + '">' + this.renderDirectoryContent(allCommunities, reserved, mine) + '</div></div>';
  };

  CommunityApp.prototype.renderDirectoryContent = function (allCommunities, reserved, mine) {
    var filter = this.state.filter || "explore";
    if (filter === "events") return this.renderDirectoryEvents(reserved);
    if (filter === "explore") return this.renderDirectoryExplore(allCommunities);
    if (filter === "mine") return this.renderDirectoryMine(mine);
    return this.renderDirectoryExplore(allCommunities);
  };

  CommunityApp.prototype.renderDirectoryAll = function (allCommunities) {
    var featured = allCommunities.slice(0, 3);
    var more = allCommunities.slice(3, 7);
    return '<section class="kc-section kc-directory-panel kc-directory-all-panel"><div class="kc-section-title"><div><h2>Comunidades destacadas</h2></div><button class="kc-title-link" data-action="filter" data-id="explore">Ver todas ' + icon("arrow") + '</button></div>' +
      '<div class="kc-pan-track kc-directory-featured" data-pan data-carousel="all-featured">' + featured.map(this.renderCommunity.bind(this)).join("") + '</div></section>' +
      '<section class="kc-section kc-directory-panel"><div class="kc-section-title"><div><h2>Más comunidades para ti</h2></div><button class="kc-title-link" data-action="filter" data-id="explore">Ver todas ' + icon("arrow") + '</button></div>' +
      '<div class="kc-compact-community-grid">' + (more.length ? more.map(this.renderCompactCommunity.bind(this)).join("") : allCommunities.map(this.renderCompactCommunity.bind(this)).join("")) + '</div></section>';
  };

  CommunityApp.prototype.renderDirectoryEvents = function (reserved) {
    var nextEvents = events.filter(function (event) { return !this.state.reservations[event.id]; }, this);
    return '<section class="kc-section kc-directory-panel kc-directory-event-reservations"><div class="kc-section-title"><div><h2>Mis reservas</h2><p>Eventos a los que confirmaste asistencia.</p></div><div class="kc-carousel-controls"><button data-action="scroll" data-target="event-reservations" data-dir="-1" aria-label="Anterior">' + icon("back") + '</button><button data-action="scroll" data-target="event-reservations" data-dir="1" aria-label="Siguiente">' + icon("arrow") + '</button></div></div>' +
      '<div class="kc-pan-track kc-reservation-strip" data-pan data-carousel="event-reservations">' + (reserved.length ? reserved.map(this.renderReservationPreview.bind(this)).join("") : '<div class="kc-empty">Aún no tienes reservas.</div>') + '</div></section>' +
      '<section class="kc-section kc-directory-panel kc-directory-next-events"><div class="kc-section-title"><div><h2>Próximos eventos</h2><p>Descubre más eventos en tus comunidades.</p></div></div>' + (nextEvents.length ? nextEvents.map(this.renderEvent.bind(this)).join("") : '<div class="kc-empty">No hay eventos próximos.</div>') + '</section>';
  };

  CommunityApp.prototype.renderDirectoryEvents = function (reserved) {
    var nextEvents = events.filter(function (event) { return !this.state.reservations[event.id]; }, this);
    return '<section class="kc-section kc-directory-panel kc-directory-event-reservations"><div class="kc-section-title"><div><h2>Mis reservas</h2><p>Eventos a los que confirmaste asistencia.</p></div><div class="kc-carousel-controls"><button data-action="scroll" data-target="event-reservations" data-dir="-1" aria-label="Anterior">' + icon("back") + '</button><button data-action="scroll" data-target="event-reservations" data-dir="1" aria-label="Siguiente">' + icon("arrow") + '</button></div></div>' +
      '<div class="kc-pan-track kc-reservation-strip" data-pan data-carousel="event-reservations">' + (reserved.length ? reserved.map(this.renderReservationPreview.bind(this)).join("") : '<div class="kc-empty">A&uacute;n no tienes reservas.</div>') + '</div></section>' +
      '<section class="kc-section kc-directory-panel kc-directory-next-events"><div class="kc-section-title"><div><h2>Pr&oacute;ximos eventos</h2><p>Actividades publicadas por el administrador.</p></div></div>' + this.renderEventSearchPanel(nextEvents) +
      '<div class="kc-event-search-results" data-event-search-results>' + (nextEvents.length ? this.renderEventSearchGroups(nextEvents) : '<div class="kc-empty">No hay eventos pr&oacute;ximos.</div>') + '<div class="kc-empty kc-event-search-empty" data-event-search-empty hidden>No encontramos eventos con esa b&uacute;squeda.</div></div></section>';
  };

  CommunityApp.prototype.renderEventSearchGroups = function (eventList) {
    var groups = [
      ["week", "This Week"],
      ["next", "Next Week"],
      ["soon", "Coming Soon"]
    ];
    return groups.map(function (group) {
      var items = eventList.filter(function (event) { return event.group === group[0]; });
      if (!items.length) return "";
      return '<section class="kc-event-week-group" data-event-search-group="' + group[0] + '"><h3>' + group[1] + '</h3>' + items.map(this.renderEvent.bind(this)).join("") + '</section>';
    }, this).join("");
  };

  CommunityApp.prototype.renderEventSearchPanel = function (eventList) {
    var query = this.state.eventSearch || "";
    var first = eventList[0] || {};
    var firstCommunity = communities.find(function (item) { return item.id === first.communityId; }) || communities[0] || {};
    var filters = this.currentEventFilters();
    var dates = this.renderEventDateButtons(21);
    return '<div class="kc-event-search-tools">' +
      '<label class="kc-event-search-box">' + icon("search") + '<input type="search" data-event-search value="' + escapeHtml(query) + '" placeholder="Buscar evento, clase o actividad" aria-label="Buscar evento, clase o actividad"></label>' +
      '<div class="kc-event-filter-grid">' +
      this.renderEventFilter("globe", "country", "Pa&iacute;s", filters.country || "Selecciona pa&iacute;s") +
      this.renderEventFilter("map", "city", "Ciudad", filters.city || "Selecciona ciudad") +
      this.renderEventFilter("users", "community", "Comunidad", filters.community || firstCommunity.name || "Todas") +
      this.renderEventFilter("map", "location", "Ubicaci&oacute;n", filters.location || first.place || "Todas") +
      '</div>' + this.renderEventFilterSelector(eventList) + '<div class="kc-event-date-row"><b>Fecha del evento</b><div data-event-date-scroller>' + dates + '<button type="button" class="kc-event-date-next" data-action="scroll-event-dates" data-dir="1" aria-label="Siguiente">' + icon("arrow") + '</button></div><button type="button" class="kc-event-clear" data-action="clear-event-search">' + icon("filter") + ' Borrar filtros</button></div></div>';
  };

  CommunityApp.prototype.renderEventFilter = function (iconName, type, label, value) {
    var active = this.state.activeEventFilter === type ? " is-active" : "";
    return '<button type="button" class="kc-event-filter' + active + '" data-action="toggle-event-filter" data-id="' + type + '">' + icon(iconName) + '<span><small>' + label + '</small><strong>' + escapeHtml(value) + '</strong></span>' + icon("arrow") + '</button>';
  };

  CommunityApp.prototype.renderEventFilterSelector = function (eventList) {
    var active = this.state.activeEventFilter;
    if (!active) return "";
    var filters = this.currentEventFilters();
    if (active === "country") return this.renderCountrySelector(filters);
    if (active === "city") return this.renderCitySelector(filters);
    if (active === "community") return this.renderEventOptionSelector("Comunidad", "community", this.eventCommunityOptions(eventList), filters.community);
    if (active === "location") return this.renderEventOptionSelector("Ubicaci&oacute;n", "location", this.eventLocationOptions(eventList), filters.location);
    return "";
  };

  CommunityApp.prototype.renderCountrySelector = function (filters) {
    var query = this.eventFilterQuery("country");
    var needle = normalizeSearch(query);
    var visibleCount = 0;
    var rows = eventCountryOptions.map(function (country) {
      var active = filters.country === country.value ? " is-active" : "";
      var searchText = normalizeSearch([country.value, country.name, country.code].join(" "));
      var hidden = needle && searchText.indexOf(needle) === -1 ? " hidden" : "";
      if (!hidden) visibleCount += 1;
      return '<button type="button" class="kc-event-dropdown-option kc-event-country-option' + active + '"' + hidden + ' data-event-option-search data-search-text="' + escapeHtml(searchText) + '" data-action="select-event-filter" data-type="country" data-value="' + escapeHtml(country.value) + '"><i class="is-' + country.tone + '">' + country.code + '</i><span><strong>' + escapeHtml(country.name) + '</strong><small>' + escapeHtml(country.value) + '</small></span>' + icon("arrow") + '</button>';
    }).join("");
    return '<section class="kc-event-selector" data-event-selector="country"><h4>Pa&iacute;s</h4><label class="kc-event-selector-search">' + icon("search") + '<input type="search" data-event-filter-query data-type="country" value="' + escapeHtml(query) + '" placeholder="Escribe o selecciona pa&iacute;s" aria-label="Escribe o selecciona pa&iacute;s" autocomplete="off">' + icon("check") + '</label><div class="kc-event-dropdown-list">' + rows + '</div><div class="kc-event-selector-empty" data-event-selector-empty' + (visibleCount ? " hidden" : "") + '>No encontramos pa&iacute;ses con ese texto.</div></section>';
  };

  CommunityApp.prototype.renderCitySelector = function (filters, embedded) {
    var cities = eventCityOptionsByCountry[filters.country] || [];
    var query = this.eventFilterQuery("city");
    var needle = normalizeSearch(query);
    var options = [{ label: "Todas las ciudades", value: "" }].concat(cities.map(function (city) { return { label: city, value: city }; }));
    var visibleCount = 0;
    var rows = options.map(function (option) {
      var active = filters.city === option.value ? " is-active" : "";
      var searchText = normalizeSearch(option.label);
      var hidden = needle && searchText.indexOf(needle) === -1 ? " hidden" : "";
      if (!hidden) visibleCount += 1;
      return '<button type="button" class="kc-event-dropdown-option' + active + '"' + hidden + ' data-event-option-search data-search-text="' + escapeHtml(searchText) + '" data-action="select-event-filter" data-type="city" data-value="' + escapeHtml(option.value) + '">' + icon("map") + '<span><strong>' + escapeHtml(option.label) + '</strong><small>' + (option.value ? "Ciudad disponible" : "Mostrar todas") + '</small></span>' + icon("arrow") + '</button>';
    }).join("");
    if (!filters.country) return '<section class="kc-event-selector"><div class="kc-event-city-disabled"><h4>Ciudad <span>Primero selecciona un pa&iacute;s para ver las ciudades disponibles.</span></h4><label>' + icon("search") + '<input disabled placeholder="Primero selecciona pa&iacute;s"></label></div></section>';
    return (embedded ? '<div class="kc-event-city-selector" data-event-selector="city">' : '<section class="kc-event-selector" data-event-selector="city"><div class="kc-event-city-selector">') +
      '<h4>Ciudad</h4><label class="kc-event-selector-search">' + icon("search") + '<input type="search" data-event-filter-query data-type="city" value="' + escapeHtml(query) + '" placeholder="Escribe o selecciona ciudad" aria-label="Escribe o selecciona ciudad" autocomplete="off">' + icon("check") + '</label><div class="kc-event-dropdown-list">' + rows + '</div><div class="kc-event-selector-empty" data-event-selector-empty' + (visibleCount ? " hidden" : "") + '>No encontramos ciudades con ese texto.</div>' +
      (embedded ? '</div>' : '</div></section>');
  };

  CommunityApp.prototype.renderEventOptionSelector = function (title, type, options, selected) {
    var query = this.eventFilterQuery(type);
    var needle = normalizeSearch(query);
    var choices = [{ label: type === "community" ? "Todas las comunidades" : "Todas las ubicaciones", value: "" }].concat(options.map(function (option) { return { label: option, value: option }; }));
    var visibleCount = 0;
    var rows = choices.map(function (option) {
      var active = selected === option.value ? " is-active" : "";
      var searchText = normalizeSearch(option.label);
      var hidden = needle && searchText.indexOf(needle) === -1 ? " hidden" : "";
      if (!hidden) visibleCount += 1;
      return '<button type="button" class="kc-event-dropdown-option' + active + '"' + hidden + ' data-event-option-search data-search-text="' + escapeHtml(searchText) + '" data-action="select-event-filter" data-type="' + type + '" data-value="' + escapeHtml(option.value) + '">' + icon(type === "community" ? "users" : "map") + '<span><strong>' + escapeHtml(option.label) + '</strong><small>' + (option.value ? "Seleccionar" : "Mostrar todas") + '</small></span>' + icon("arrow") + '</button>';
    }).join("");
    return '<section class="kc-event-selector" data-event-selector="' + escapeHtml(type) + '"><h4>' + title + '</h4><label class="kc-event-selector-search">' + icon("search") + '<input type="search" data-event-filter-query data-type="' + escapeHtml(type) + '" value="' + escapeHtml(query) + '" placeholder="Escribe o selecciona ' + (type === "community" ? "comunidad" : "ubicaci&oacute;n") + '" aria-label="Escribe o selecciona ' + (type === "community" ? "comunidad" : "ubicaci&oacute;n") + '" autocomplete="off">' + icon("check") + '</label><div class="kc-event-dropdown-list">' + rows + '</div><div class="kc-event-selector-empty" data-event-selector-empty' + (visibleCount ? " hidden" : "") + '>No encontramos opciones con ese texto.</div></section>';
  };

  CommunityApp.prototype.eventCommunityOptions = function (eventList) {
    var seen = {};
    return eventList.map(function (event) {
      var community = communities.find(function (item) { return item.id === event.communityId; }) || {};
      return community.name || "";
    }).filter(function (name) {
      if (!name || seen[name]) return false;
      seen[name] = true;
      return true;
    });
  };

  CommunityApp.prototype.eventLocationOptions = function (eventList) {
    var seen = {};
    return eventList.map(function (event) { return event.place || ""; }).filter(function (place) {
      if (!place || seen[place]) return false;
      seen[place] = true;
      return true;
    });
  };

  CommunityApp.prototype.renderDirectoryExplore = function (allCommunities) {
    var categories = [
      ["Yoga", "y meditación", "users", "violet"],
      ["Running", "y caminata", "sparkles", "blue"],
      ["Nutrición", "y cocina", "calendar", "green"],
      ["Fuerza", "y entrenamiento", "shield", "violet"],
      ["Salud mental", "y bienestar", "heart", "rose"],
      ["Bienestar", "integral", "heart", "green"]
    ];
    return '<section class="kc-section kc-directory-panel kc-explore-panel"><div class="kc-explore-search"><label>' + icon("search") + '<input type="search" placeholder="Buscar comunidades, temas o actividades" aria-label="Buscar comunidades"></label><button type="button">' + icon("filter") + ' Filtros</button></div>' +
      '<div class="kc-explore-block"><h3>Explorar por categorías</h3><div class="kc-category-explore-grid" data-pan>' + categories.map(function (item) {
        return '<button type="button" class="kc-explore-category is-' + item[3] + '">' + icon(item[2]) + '<strong>' + item[0] + '</strong><small>' + item[1] + '</small></button>';
      }).join("") + '</div></div>' +
      '<div class="kc-explore-block"><div class="kc-section-title"><div><h2>Comunidades recomendadas para ti</h2></div><button class="kc-title-link" data-action="filter" data-id="explore">Ver todas ' + icon("arrow") + '</button></div><div class="kc-recommended-grid">' + allCommunities.slice(1, 5).map(this.renderExploreCommunity.bind(this)).join("") + '</div></div></section>';
  };

  CommunityApp.prototype.exploreCategoryDefinitions = function () {
    return [
      { id: "yoga", title: "Yoga", subtitle: "y meditacion", icon: "users", tone: "violet", heading: "Comunidades de Yoga para ti", categories: ["yoga", "meditacion"] },
      { id: "running", title: "Running", subtitle: "y caminata", icon: "sparkles", tone: "blue", heading: "Comunidades de Running para ti", categories: ["running", "senderismo"] },
      { id: "nutricion", title: "Nutricion", subtitle: "y cocina", icon: "calendar", tone: "green", heading: "Comunidades de Nutricion para ti", categories: ["nutricion"] },
      { id: "fuerza", title: "Fuerza", subtitle: "y entrenamiento", icon: "shield", tone: "violet", heading: "Comunidades de Fuerza para ti", categories: ["fuerza"] },
      { id: "salud-mental", title: "Salud mental", subtitle: "y bienestar", icon: "heart", tone: "rose", heading: "Comunidades de Salud mental para ti", categories: ["salud mental", "meditacion"] },
      { id: "bienestar", title: "Bienestar", subtitle: "integral", icon: "heart", tone: "green", heading: "Comunidades de Bienestar para ti", categories: ["bienestar"] }
    ];
  };

  CommunityApp.prototype.exploreCategoryConfig = function (id) {
    return this.exploreCategoryDefinitions().find(function (item) { return item.id === id; }) || null;
  };

  CommunityApp.prototype.exploreCategoryCommunities = function (categoryId, allCommunities) {
    var config = this.exploreCategoryConfig(categoryId);
    if (!config) return [];
    var categoryNames = config.categories || [];
    return allCommunities.filter(function (community) {
      if (community.exploreCategory) return community.exploreCategory === categoryId;
      var category = normalizeSearch(community.category || "");
      return categoryNames.indexOf(category) !== -1;
    }).slice(0, 4);
  };

  CommunityApp.prototype.renderExploreCategoryRecommendations = function (categoryId, allCommunities) {
    var config = this.exploreCategoryConfig(categoryId);
    if (!config) return "";
    var recommendations = this.exploreCategoryCommunities(categoryId, allCommunities);
    return '<div class="kc-explore-category-results" aria-live="polite"><div class="kc-section-title"><div><h2>' + escapeHtml(config.heading) + '</h2></div></div>' +
      '<div class="kc-recommended-grid">' + (recommendations.length ? recommendations.map(this.renderExploreCommunity.bind(this)).join("") : '<div class="kc-empty">No hay recomendaciones para esta categoria.</div>') + '</div></div>';
  };

  CommunityApp.prototype.renderDirectoryExplore = function (allCommunities) {
    var featured = allCommunities.slice(0, 3);
    var recommended = allCommunities.slice(1, 13);
    var more = allCommunities.slice(4);
    var categories = this.exploreCategoryDefinitions();
    var selectedCategory = this.state.selectedExploreCategory || "";
    var selectedPanel = this.renderExploreCategoryRecommendations(selectedCategory, allCommunities);
    return '<section class="kc-section kc-directory-panel kc-explore-panel"><div class="kc-explore-search"><label>' + icon("search") + '<input type="search" placeholder="Buscar comunidades, temas o actividades" aria-label="Buscar comunidades"></label><button type="button">' + icon("filter") + ' Filtros</button></div>' +
      '<div class="kc-explore-block kc-explore-featured-block"><div class="kc-section-title"><div><h2>Comunidades destacadas</h2></div></div><div class="kc-pan-track kc-directory-featured" data-pan data-carousel="explore-featured">' + featured.map(this.renderCommunity.bind(this)).join("") + '</div></div>' +
      '<div class="kc-explore-block ' + (selectedPanel ? "has-active-category" : "") + '"><h3>Explorar por categorias</h3><div class="kc-category-explore-grid" data-pan>' + categories.map(function (item) {
        var active = selectedCategory === item.id;
        return '<button type="button" class="kc-explore-category is-' + item.tone + (active ? " is-active" : "") + '" data-action="explore-category" data-id="' + item.id + '" aria-expanded="' + (active ? "true" : "false") + '">' + icon(item.icon) + '<strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.subtitle) + '</small></button>';
      }).join("") + '</div></div>' +
      selectedPanel +
      '<div class="kc-explore-block"><div class="kc-section-title"><div><h2>Comunidades recomendadas para ti</h2></div></div><div class="kc-community-carousel" data-pan data-carousel="explore-recommended"><div class="kc-recommended-grid">' + (recommended.length ? recommended : allCommunities).map(this.renderExploreCommunity.bind(this)).join("") + '</div></div></div>' +
      '<div class="kc-explore-block"><div class="kc-section-title"><div><h2>Mas comunidades para ti</h2></div></div><div class="kc-community-carousel" data-pan data-carousel="explore-more"><div class="kc-compact-community-grid">' + (more.length ? more.map(this.renderCompactCommunity.bind(this)).join("") : allCommunities.map(this.renderCompactCommunity.bind(this)).join("")) + '</div></div></div></section>';
  };

  CommunityApp.prototype.renderDirectoryMine = function (mine) {
    return '<section class="kc-section kc-directory-panel kc-mine-panel"><div class="kc-section-title"><div><h2>Mis comunidades</h2><p>Comunidades a las que perteneces.</p></div></div>' +
      '<div class="kc-mine-list">' + (mine.length ? mine.map(this.renderMineCommunity.bind(this)).join("") : '<div class="kc-empty">Aún no perteneces a ninguna comunidad.</div>') + '</div>' +
      '<button class="kc-more-inline" data-action="filter" data-id="explore">Explorar comunidades</button></section>';
  };

  CommunityApp.prototype.renderCompactCommunity = function (community) {
    var id = escapeHtml(community.id);
    return '<article class="kc-compact-community"><span class="kc-compact-mark ' + community.tone + '">' + icon(community.tone === "gold" ? "calendar" : community.tone === "blue" ? "sparkles" : community.tone === "violet" ? "shield" : "users") + '</span>' +
      '<div><h3>' + escapeHtml(community.name) + '</h3><small>' + escapeHtml(community.category) + ' · ' + (community.access === "open" ? "Abierta" : "Cerrada") + '</small><b>' + community.members + ' miembros</b></div>' +
      '<button type="button" data-action="open-community-panel" data-id="' + id + '">Ver comunidad</button></article>';
  };

  CommunityApp.prototype.renderExploreCommunity = function (community) {
    var id = escapeHtml(community.id);
    return '<article class="kc-explore-community"><span class="kc-explore-mark ' + community.tone + '">' + escapeHtml(community.initials) + '</span><div><h3>' + escapeHtml(community.name) + '</h3><small>' + escapeHtml(community.category) + ' · ' + (community.access === "open" ? "Abierta" : "Cerrada") + '</small><b>' + community.members + ' miembros</b></div><button type="button" data-action="open-community-panel" data-id="' + id + '">Ver comunidad</button></article>';
  };

  CommunityApp.prototype.renderMineCommunity = function (community) {
    var isAdmin = this.communityRole(community) === "admin";
    var id = escapeHtml(community.id);
    var adminButton = isAdmin ? '<button type="button" class="kc-mine-admin-button" data-action="open-admin-panel" data-id="' + id + '" aria-label="Abrir panel de administrador de ' + escapeHtml(community.name) + '">Panel de administrador</button>' : "";
    return '<article class="kc-mine-community"><span class="kc-mine-mark ' + community.tone + '">' + escapeHtml(community.initials) + '</span><div><small>' + escapeHtml(community.category) + ' · ' + (community.access === "open" ? "Abierta" : "Cerrada") + '</small><h3>' + escapeHtml(community.name) + '</h3><p>' + escapeHtml(community.description) + '</p><b>' + icon("users") + ' ' + community.members + ' miembros&nbsp;&nbsp;' + escapeHtml(community.city) + '</b></div><div class="kc-mine-actions"><button type="button" data-action="open-community-panel" data-id="' + id + '">Ver comunidad</button>' + adminButton + '</div></article>';
  };

  CommunityApp.prototype.renderAdminPanel = function () {
    var self = this;
    var community = this.findCommunity(this.state.detailId) || this.adminCommunities()[0];
    if (!community || this.communityRole(community) !== "admin") {
      this.state.view = "directory";
      this.state.filter = "mine";
      return this.renderDirectory();
    }
    var permissions = community.adminPermissions || {
      stories: true,
      communityPosts: true,
      events: true,
      classes: true,
      editPage: true
    };
    var tools = [
      ["stories", "Historias", "camera"],
      ["communityPosts", "Publicaciones", "message"],
      ["events", "Eventos", "calendar"],
      ["classes", "Clases", "sparkles"],
      ["calendar", "Calendario", "clock"],
      ["members", "Miembros", "users"],
      ["editPage", "Informacion", "edit"],
      ["analytics", "Analytics", "analytics"]
    ];
    var activeTool = this.state.adminTool || "stories";
    if (!tools.some(function (tool) { return tool[0] === activeTool; })) activeTool = "stories";
    var communityEvents = this.adminEventsForCommunity(community);
    var adminCommunities = this.adminCommunities();
    var communityOptions = adminCommunities.map(function (item) {
      return '<option value="' + escapeHtml(item.id) + '"' + (item.id === community.id ? " selected" : "") + '>' + escapeHtml(item.name) + '</option>';
    }).join("");
    var pendingRequests = this.pendingMemberRequestsFor(community);
    var communityMemberCount = this.memberCountFor(community);
    var heroImage = community.adminHeroImage || "";
    var logoImage = community.logoImage || "";
    var logoContent = logoImage ? '<img src="' + escapeHtml(logoImage) + '" alt="' + escapeHtml(community.name) + '">' : escapeHtml(community.logoInitials || community.initials);
    var sidebar = '<aside class="kc-admin-sidebar" aria-label="Menu de administrador de comunidad">' +
      '<div class="kc-admin-sidebar-brand"><span class="kc-admin-sidebar-logo">' + icon("shield") + '</span><div><strong>Klini Wellness</strong><small>Admin de comunidad</small></div></div>' +
      '<label class="kc-admin-active-community"><span>Comunidad activa</span><select data-admin-community-select>' + communityOptions + '</select></label>' +
      '<nav class="kc-admin-side-menu">' + tools.map(function (tool) {
        var enabled = permissions[tool[0]] !== false;
        return '<button type="button" class="' + (activeTool === tool[0] ? "is-active " : "") + (enabled ? "" : "is-disabled") + '"' + (enabled ? ' data-action="open-admin-tool" data-id="' + escapeHtml(tool[0]) + '"' : " disabled") + '>' + icon(tool[2]) + '<span>' + escapeHtml(tool[1]) + '</span>' + (tool[0] === "members" && pendingRequests ? '<b>' + pendingRequests + '</b>' : '') + '</button>';
      }).join("") + '</nav>' +
      '<button class="kc-admin-public-button" type="button" data-action="open-community-panel" data-id="' + escapeHtml(community.id) + '">' + icon("globe") + ' Vista publica</button>' +
      '</aside>';
    var repository = '<section class="kc-admin-repository"><div class="kc-section-title"><div><h2>Catalogo y repositorio</h2><p>Registro base donde se almacena esta comunidad.</p></div></div><dl><div><dt>ID catalogo</dt><dd>' + escapeHtml(community.catalogId || community.slug || community.id) + '</dd></div><div><dt>Repositorio</dt><dd>' + escapeHtml(community.repositorySource || "catalogo-base") + '</dd></div><div><dt>Administrador</dt><dd>' + escapeHtml((self.options.patient && self.options.patient.name) || "Usuario administrador") + '</dd></div></dl></section>';
    return '<div class="kc-admin-panel kc-admin-modern"><button class="kc-back kc-admin-back" type="button" data-action="back-directory">' + icon("back") + ' Volver a mis comunidades</button>' +
      '<section class="kc-admin-hero ' + community.tone + '">' +
      (heroImage ? '<img class="kc-admin-hero-bg" src="' + escapeHtml(heroImage) + '" alt="Imagen de portada de ' + escapeHtml(community.name) + '">' : '') +
      '<button class="kc-admin-cover-edit" type="button" data-action="admin-upload-image" data-id="' + escapeHtml(community.id) + '" data-field="heroImage">' + icon("camera") + ' Subir imagen</button>' +
      '<span class="kc-admin-hero-mark">' + logoContent + '<button type="button" data-action="admin-upload-image" data-id="' + escapeHtml(community.id) + '" data-field="logoImage" aria-label="Subir imagen de perfil de la comunidad">' + icon("camera") + '</button></span>' +
      '<div class="kc-admin-hero-copy"><small>Panel de administrador</small>' + this.renderAdminEditableText(community, "name") + this.renderAdminEditableText(community, "description") + '</div></section>' +
      '<section class="kc-admin-summary" aria-label="Resumen de la comunidad"><article><b>' + communityMemberCount + '</b><span>Miembros</span></article><article><b>' + communityEvents.length + '</b><span>Eventos</span></article><article><b>' + this.adminClassesForCommunity(community).length + '</b><span>Clases</span></article></section>' +
      '<div class="kc-admin-workspace">' + sidebar + '<main class="kc-admin-main">' + this.renderAdminToolView(community) + repository + '</main></div></div>';
  };

  CommunityApp.prototype.renderAdminToolView = function (community) {
    var activeTool = this.state.adminTool || "stories";
    var storyId = "community:" + (community.slug || community.id);
    var communityEvents = this.adminEventsForCommunity(community);
    var communityClasses = this.adminClassesForCommunity(community);
    var pendingMembers = this.pendingMemberPeopleFor(community);
    var pendingRequests = pendingMembers.length;
    var communityMemberCount = this.memberCountFor(community);
    var activeMembers = this.detailMembersForCommunity ? this.detailMembersForCommunity(community).slice(0, 8) : [this.patientSummary()].concat(people).slice(0, 8);
    var approvedMembers = this.approvedMemberPeopleFor(community);
    if (approvedMembers.length) {
      var activeIds = {};
      activeMembers.forEach(function (person) { activeIds[person.id] = true; });
      approvedMembers.forEach(function (person) {
        if (!activeIds[person.id]) {
          activeMembers.push(person);
          activeIds[person.id] = true;
        }
      });
    }
    if (activeTool === "communityPosts") {
      return '<section class="kc-admin-tool-view"><div class="kc-section-title"><div><h2>Publicaciones</h2><p>Crea y administra publicaciones visibles en la comunidad.</p></div></div><div class="kc-admin-post-composer"><textarea placeholder="Escribe una publicacion para ' + escapeHtml(community.name) + '"></textarea><button type="button">Publicar</button></div><div class="kc-admin-mini-list"><article><strong>Publicacion fijada</strong><p>' + escapeHtml(community.pinnedMessage || "Mensaje principal de la comunidad.") + '</p></article></div></section>';
    }
    if (activeTool === "events") {
      return this.renderAdminEventsTool(community);
    }
    if (activeTool === "events-disabled") {
      return '<section class="kc-admin-tool-view"><div class="kc-section-title"><div><h2>Eventos</h2><p>Calendario y eventos activos de la comunidad.</p></div><button type="button">Crear evento</button></div><div class="kc-admin-mini-list">' + (communityEvents.length ? communityEvents.map(function (event) {
        return '<article><strong>' + escapeHtml(event.title) + '</strong><p>' + escapeHtml(event.date) + ' · ' + escapeHtml(event.time) + ' · ' + escapeHtml(event.place) + '</p></article>';
      }).join("") : '<article><strong>Sin eventos activos</strong><p>Crea el primer evento de esta comunidad.</p></article>') + '</div></section>';
    }
    if (activeTool === "classes") {
      return this.renderAdminClassesTool(community);
    }
    if (activeTool === "classes-disabled") {
      return '<section class="kc-admin-tool-view"><div class="kc-section-title"><div><h2>Clases y actividades</h2><p>Sesiones publicadas para miembros de la comunidad.</p></div><button type="button">Crear clase</button></div><div class="kc-admin-mini-list">' + (communityClasses.length ? communityClasses.map(function (item) {
        return '<article><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.date) + ' · ' + escapeHtml(item.time) + ' · ' + escapeHtml(item.place) + '</p></article>';
      }).join("") : '<article><strong>Sin clases activas</strong><p>Crea una clase o actividad para esta comunidad.</p></article>') + '</div></section>';
    }
    if (activeTool === "calendar") {
      var calendarItems = communityEvents.concat(communityClasses);
      return '<section class="kc-admin-tool-view"><div class="kc-section-title"><div><h2>Calendario</h2><p>Agenda de eventos, clases y actividades programadas.</p></div></div><div class="kc-admin-calendar-list">' + (calendarItems.length ? calendarItems.map(function (item) {
        return '<article class="kc-admin-calendar-row"><span><small>' + escapeHtml(item.day || "dia") + '</small><b>' + escapeHtml(item.number || "--") + '</b><small>' + escapeHtml(item.month || "") + '</small></span><div><strong>' + escapeHtml(item.title) + '</strong><p>' + escapeHtml(item.date || "") + ' &middot; ' + escapeHtml(item.time || "") + ' &middot; ' + escapeHtml(item.place || "") + '</p></div><button type="button">Editar</button></article>';
      }).join("") : '<article class="kc-admin-calendar-row"><span><small>sin</small><b>0</b><small>act</small></span><div><strong>Sin actividades programadas</strong><p>Agrega eventos o clases para llenar el calendario.</p></div></article>') + '</div></section>';
    }
    if (activeTool === "members") {
      return '<section class="kc-admin-tool-view"><div class="kc-section-title"><div><h2>Miembros</h2><p>Solicitudes pendientes y miembros activos de la comunidad.</p></div></div><div class="kc-admin-member-block"><h3>Solicitudes pendientes <span>' + pendingRequests + '</span></h3>' + (pendingMembers.length ? pendingMembers.map(function (person) {
        return '<article class="kc-admin-member-row"><span class="kc-admin-member-avatar"><img src="' + escapeHtml(person.avatar) + '" alt="' + escapeHtml(person.name) + '"></span><div><strong>' + escapeHtml(person.name) + '</strong><p>Solicitud para unirse a ' + escapeHtml(community.name) + '.</p></div><div class="kc-admin-member-actions"><button type="button" data-action="admin-member-request" data-community="' + escapeHtml(community.id) + '" data-id="' + escapeHtml(person.id) + '" data-decision="approved">Aprobar</button><button type="button" data-action="admin-member-request" data-community="' + escapeHtml(community.id) + '" data-id="' + escapeHtml(person.id) + '" data-decision="rejected">Rechazar</button></div></article>';
      }).join("") : '<article class="kc-admin-member-row"><span class="kc-admin-member-avatar">' + icon("check") + '</span><div><strong>Sin solicitudes pendientes</strong><p>Cuando lleguen solicitudes apareceran en esta seccion.</p></div></article>') + '</div><div class="kc-admin-member-block"><h3>Miembros activos</h3><div class="kc-admin-member-grid">' + activeMembers.map(function (person) {
        var avatar = person.avatar || person.profileImage || "";
        return '<article><span>' + (avatar ? '<img src="' + escapeHtml(avatar) + '" alt="' + escapeHtml(person.short || person.name) + '">' : escapeHtml((person.short || person.name || "DS").slice(0, 2).toUpperCase())) + '</span><strong>' + escapeHtml(person.short || person.name) + '</strong><small>Activo</small></article>';
      }).join("") + '</div></div></section>';
    }
    if (activeTool === "analytics") {
      var postCount = this.detailPostsForCommunity ? this.detailPostsForCommunity(community).length : posts.length;
      return '<section class="kc-admin-tool-view"><div class="kc-section-title"><div><h2>Analytics</h2><p>Resumen de actividad y crecimiento de la comunidad.</p></div></div><div class="kc-admin-analytics-grid"><article><small>Miembros</small><strong>' + communityMemberCount + '</strong><span>+12% este mes</span></article><article><small>Solicitudes pendientes</small><strong>' + pendingRequests + '</strong><span>Por revisar</span></article><article><small>Eventos y clases</small><strong>' + (communityEvents.length + communityClasses.length) + '</strong><span>Activos</span></article><article><small>Publicaciones</small><strong>' + postCount + '</strong><span>Recientes</span></article></div></section>';
    }
    if (activeTool === "editPage") {
      return '<section class="kc-admin-tool-view"><div class="kc-section-title"><div><h2>Informacion de la pagina</h2><p>Edita los datos publicos de la comunidad.</p></div></div><div class="kc-admin-edit-grid"><label>Nombre<input value="' + escapeHtml(community.name) + '"></label><label>Categoria<input value="' + escapeHtml(community.category) + '"></label><label>Ciudad<input value="' + escapeHtml(community.city) + '"></label><label>Descripcion<textarea>' + escapeHtml(community.description) + '</textarea></label><button type="button">Guardar cambios</button></div></section>';
    }
    return '<section class="kc-admin-tool-view"><div class="kc-section-title"><div><h2>Historias</h2><p>Sube una story como administrador de la comunidad.</p></div><button type="button" data-action="upload-story" data-id="' + escapeHtml(storyId) + '">' + icon("plus") + ' Subir historia</button></div><div class="kc-admin-story-preview"><img src="' + escapeHtml(this.storyImageFor(storyId, community.heroImage || community.profileImage || "/images/communities/create-cover.png")) + '" alt=""><div><strong>' + escapeHtml(community.name) + '</strong><p>La historia se mostrara en el carrusel superior de Comunidades.</p></div></div></section>';
  };

  CommunityApp.prototype.renderReservationPreview = function (event) {
    var community = communities.find(function (item) { return item.id === event.communityId; }) || communities[0];
    return '<article class="kc-reservation-preview"><div class="kc-date-tile"><small>' + event.day + '</small><strong>' + event.number + '</strong><small>' + event.month + '</small></div><div><small>' + escapeHtml(event.category) + '</small><h3>' + escapeHtml(event.title) + '</h3><p>' + event.time + ' · ' + escapeHtml(community.name) + '</p><b>' + (event.modality === "Remoto" ? icon("globe") : icon("map")) + ' ' + escapeHtml(event.place) + '</b></div><button class="kc-reservation-cancel-button" type="button" data-action="confirm-cancel-reservation" data-id="' + event.id + '">Cancelar</button></article>';
  };

  CommunityApp.prototype.renderCarouselSection = function (title, subtitle, content, id, more) {
    return '<section class="kc-section"><div class="kc-section-title"><div><h2>' + title + '</h2>' + (subtitle ? '<p>' + subtitle + '</p>' : '') + '</div>' +
      '<div class="kc-carousel-controls"><button data-action="scroll" data-target="' + id + '" data-dir="-1" aria-label="Anterior">' + icon("back") + '</button><button data-action="scroll" data-target="' + id + '" data-dir="1" aria-label="Siguiente">' + icon("arrow") + '</button></div></div>' +
      '<div class="kc-pan-track" data-pan data-carousel="' + id + '">' + (content || '<div class="kc-empty">Sin elementos por mostrar.</div>') + '</div>' +
      (more ? '<button class="kc-more-inline" data-action="filter" data-id="reservations">Ver mas</button>' : '<button class="kc-more-inline" data-action="filter" data-id="' + id + '">Ver todas</button>') + '</section>';
  };

  CommunityApp.prototype.renderCommunity = function (community) {
    var id = escapeHtml(community.id);
    return '<article class="kc-community-card"><div class="kc-community-image ' + community.tone + '"><span>' + community.initials + '</span></div>' +
      '<div class="kc-community-copy"><small>' + escapeHtml(community.category) + ' · ' + (community.access === "open" ? "Abierta" : "Cerrada") + '</small><h3>' + escapeHtml(community.name) + '</h3><p>' + escapeHtml(community.description) + '</p>' +
      '<b>' + icon("users") + ' ' + community.members + ' miembros&nbsp;&nbsp;' + escapeHtml(community.city) + '</b></div>' +
      '<div class="kc-card-actions"><button type="button" data-action="open-community-panel" data-id="' + id + '">Ver comunidad</button></div></article>';
  };

  CommunityApp.prototype.renderReservation = function (event) {
    var community = communities.find(function (item) { return item.id === event.communityId; });
    return '<article class="kc-reservation"><div class="kc-date-tile"><small>' + event.day + '</small><strong>' + event.number + '</strong><small>' + event.month + '</small></div>' +
      '<div><small>' + escapeHtml(event.category) + ' · Reservacion confirmada</small><h3>' + escapeHtml(event.title) + '</h3><b>' + event.time + ' · ' + escapeHtml(community.name) + '</b><p>' + escapeHtml(event.place) + '</p></div>' +
      '<button data-action="confirm-cancel-reservation" data-id="' + event.id + '">Cancelar</button></article>';
  };

  CommunityApp.prototype.renderEventSection = function (title, group) {
    var self = this;
    var groupEvents = events.filter(function (event) { return event.group === group; });
    var visible = groupEvents.slice(0, this.state.limits[group]);
    return '<section class="kc-event-section"><div class="kc-section-title"><h2>' + title + '</h2></div>' + visible.map(function (event) { return self.renderEvent(event); }).join("") +
      (visible.length < groupEvents.length ? '<button class="kc-more" data-action="more" data-id="' + group + '">Ver mas</button>' : '') + '</section>';
  };

  CommunityApp.prototype.renderEvent = function (event) {
    var community = communities.find(function (item) { return item.id === event.communityId; }) || {};
    var reserved = !!this.state.reservations[event.id];
    var country = community.country || "MX Mexico";
    var city = community.city || "Ciudad de Mexico";
    var location = event.place || "";
    var searchText = normalizeSearch([event.title, event.category, event.date, event.time, location, event.modality, community.name, country, city].join(" "));
    return '<article class="kc-event" data-event-search-card data-event-search-text="' + escapeHtml(searchText) + '" data-event-country="' + escapeHtml(normalizeSearch(country)) + '" data-event-city="' + escapeHtml(normalizeSearch(city)) + '" data-event-community="' + escapeHtml(normalizeSearch(community.name || "")) + '" data-event-location="' + escapeHtml(normalizeSearch(location)) + '" data-event-date="' + escapeHtml(this.eventDateKey(event)) + '"><div class="kc-date-tile ' + (community.tone || "mint") + '"><small>' + event.day + '</small><strong>' + event.number + '-' + event.month + '</strong></div>' +
      '<div class="kc-event-copy"><small>' + escapeHtml(event.category) + '</small><h3>' + escapeHtml(event.title) + '</h3><p>' + escapeHtml(event.date) + ', ' + event.time + '.</p><p>' + escapeHtml(community.name) + '</p>' +
      '<b>' + (event.modality === "Remoto" ? icon("globe") : icon("map")) + ' ' + escapeHtml(event.place) + ' <span>Booking open</span></b><small>' + event.available + ' lugares disponibles de ' + event.capacity + '</small></div>' +
      '<button class="kc-event-action" data-action="' + (reserved ? "cancel" : "reserve") + '" data-id="' + event.id + '">' + (reserved ? "Cancelar" : "Reservar") + '</button></article>';
  };

  CommunityApp.prototype.renderDetail = function () {
    var community = communities.find(function (item) { return item.id === this.state.detailId; }, this) || communities[0];
    var communityEvents = this.adminEventsForCommunity(community);
    return '<div class="kc-detail"><button class="kc-back" data-action="back-directory">' + icon("back") + ' Volver a comunidades</button>' +
      '<section class="kc-detail-hero ' + community.tone + '"><div><small>' + escapeHtml(community.category) + ' · ' + (community.access === "open" ? "Abierta" : "Cerrada") + '</small><h1>' + escapeHtml(community.name) + '</h1><p>' + escapeHtml(community.description) + '</p><b>' + community.members + ' miembros · ' + escapeHtml(community.city) + '</b></div>' +
      '<button data-action="join" data-id="' + community.id + '">Unirme</button></section>' +
      '<section class="kc-detail-grid"><div><h2>Sobre esta comunidad</h2><p>Un espacio para compartir metas de bienestar, aprender con especialistas y participar en actividades presenciales y remotas.</p><div class="kc-feature-list"><span>Bienestar integral</span><span>Eventos semanales</span><span>Comunidad activa</span></div></div>' +
      '<aside><h2>Informacion</h2><p><b>Categoria:</b> ' + escapeHtml(community.category) + '</p><p><b>Ubicacion:</b> ' + escapeHtml(community.city) + '</p><p><b>Acceso:</b> ' + (community.access === "open" ? "Abierto" : "Con aprobacion") + '</p></aside></section>' +
      '<section class="kc-detail-events"><h2>Eventos de la comunidad</h2>' + communityEvents.map(this.renderEvent.bind(this)).join("") + '</section></div>';
  };

  CommunityApp.prototype.renderDetail = function () {
    var community = communities.find(function (item) { return item.id === this.state.detailId; }, this) || communities[0];
    var communityEvents = this.adminEventsForCommunity(community);
    var role = this.communityRole(community);
    var joined = role === "member" || role === "admin";
    var requested = role === "requested";
    var actionLabel = joined ? (role === "admin" ? "Administrar comunidad" : "Miembro activo") : (requested ? "Solicitud enviada" : (community.access === "open" ? "Unirme a la comunidad" : "Solicitar acceso"));
    var actionDisabled = joined || requested ? " disabled" : "";
    var heroImage = this.communityHeroImage(community);
    var visiblePosts = posts.slice(0, 2);
    var members = [this.patientSummary()].concat(people).slice(0, 5);
    return '<div class="kc-detail kc-detail-mobile">' +
      '<button class="kc-back kc-detail-back" data-action="back-directory">' + icon("back") + ' Volver a comunidades</button>' +
      '<section class="kc-detail-public-hero ' + community.tone + '" style="--community-hero:url(' + "'" + escapeHtml(heroImage) + "'" + ')">' +
      '<div class="kc-detail-hero-media"><span>' + escapeHtml(community.initials) + '</span></div>' +
      '<div class="kc-detail-hero-copy"><small>' + escapeHtml(community.category) + ' · ' + (community.access === "open" ? "Comunidad abierta" : "Acceso con solicitud") + '</small><h1>' + escapeHtml(community.name) + '</h1><p>' + escapeHtml(community.description) + '</p></div>' +
      '<div class="kc-detail-stats"><span>' + icon("users") + '<b>' + community.members + '</b><small>Miembros</small></span><span>' + icon("calendar") + '<b>' + communityEvents.length + '</b><small>Eventos</small></span><span>' + icon("file") + '<b>' + posts.length + '</b><small>Posts</small></span></div>' +
      '<button class="kc-detail-primary" data-action="join" data-id="' + community.id + '"' + actionDisabled + '>' + icon(joined ? "check" : "users") + escapeHtml(actionLabel) + '</button>' +
      '</section>' +
      '<nav class="kc-detail-tabs" data-pan aria-label="Secciones de comunidad"><a href="#kc-community-about">' + icon("info") + 'Acerca</a><a href="#kc-community-events">' + icon("calendar") + 'Eventos</a><a href="#kc-community-members">' + icon("users") + 'Miembros</a><a href="#kc-community-posts">' + icon("message") + 'Posts</a></nav>' +
      '<section id="kc-community-about" class="kc-detail-panel kc-detail-about"><div class="kc-detail-panel-title"><small>Comunidad</small><h2>Sobre esta comunidad</h2></div><p>Un espacio para compartir metas de bienestar, aprender con especialistas y participar en actividades presenciales y remotas.</p><div class="kc-feature-list"><span>Bienestar integral</span><span>Eventos semanales</span><span>Comunidad activa</span></div><div class="kc-detail-info-list"><p><b>Categoria</b><span>' + escapeHtml(community.category) + '</span></p><p><b>Ubicacion</b><span>' + escapeHtml(community.city) + '</span></p><p><b>Acceso</b><span>' + (community.access === "open" ? "Abierto" : "Con aprobacion") + '</span></p></div></section>' +
      '<section id="kc-community-events" class="kc-detail-panel kc-detail-events"><div class="kc-detail-panel-title"><small>Agenda</small><h2>Eventos de la comunidad</h2></div>' + (communityEvents.length ? communityEvents.map(this.renderEvent.bind(this)).join("") : '<div class="kc-empty">No hay eventos publicados.</div>') + '</section>' +
      '<section id="kc-community-members" class="kc-detail-panel kc-detail-members"><div class="kc-detail-panel-title"><small>Participantes</small><h2>Miembros activos</h2></div><div class="kc-detail-member-strip" data-pan>' + members.map(this.renderDetailMember.bind(this)).join("") + '</div></section>' +
      '<section id="kc-community-posts" class="kc-detail-panel kc-detail-posts"><div class="kc-detail-panel-title"><small>Conversacion</small><h2>Publicaciones recientes</h2></div>' + visiblePosts.map(this.renderDetailMiniPost.bind(this)).join("") + '</section>' +
      '</div>';
  };

  CommunityApp.prototype.communityHeroImage = function (community) {
    var images = {
      respira: "/images/patient-export/bae5b7d5f17ea4346b8e.jpg",
      ritmo: "/images/patient-export/943f4dd5afbf6af7fc9e.jpg",
      nutricion: "/images/patient-export/afe20faba2275119b253.jpg",
      mente: "/images/patient-export/22ed010786489ca9fe1e.jpg",
      sendero: "/images/patient-export/12abb8f6d5927a3c831c.jpg",
      fuerza: "/images/patient-export/cd307ee6afc3f2957403.jpg"
    };
    return community.heroImage || community.backgroundImage || community.coverImage || images[community.id] || posts[0].image;
  };

  CommunityApp.prototype.renderDetailMember = function (person) {
    var avatar = person.avatar || person.profileImage || "";
    return '<article class="kc-detail-member"><span>' + (avatar ? '<img src="' + escapeHtml(avatar) + '" alt="' + escapeHtml(person.short || person.name) + '">' : escapeHtml((person.short || person.name || "DS").slice(0, 2).toUpperCase())) + '</span><b>' + escapeHtml(person.short || person.name) + '</b><small>Activo</small></article>';
  };

  CommunityApp.prototype.renderDetailMiniPost = function (post) {
    return this.renderPost(post);
  };

  CommunityApp.prototype.detailPostsForCommunity = function (community) {
    var specific = {
      respira: [
        { author: people[0], time: "Hoy · 8:30 a.m.", text: "Iniciando el dia con gratitud y respiracion consciente. Pequenos pasos, grandes cambios.", image: this.communityHeroImage(community), likes: 128, comments: 24, shares: 15 },
        { author: people[3], time: "Ayer · 6:10 p.m.", text: "La practica de movilidad suave me ayudo a cerrar el dia con menos tension.", image: "/images/patient-export/a659aa3215522fb9f590.jpg", likes: 82, comments: 11, shares: 6 }
      ],
      nutricion: [
        { author: people[2], time: "Hoy · 1:20 p.m.", text: "Lista base para la semana: proteina simple, vegetales listos y colaciones faciles de preparar.", image: this.communityHeroImage(community), likes: 64, comments: 18, shares: 9 },
        { author: people[1], time: "Ayer · 7:45 p.m.", text: "Guardar porciones listas me ayudo a seguir el plan sin improvisar tanto.", image: "/images/patient-export/88790920a1b06a6b679a.jpg", likes: 51, comments: 8, shares: 4 }
      ]
    };
    return (specific[community.id] || posts.slice(0, 2)).map(function (post, index) {
      return merge(post, {id: "community-" + community.id + "-post-" + index, communityId: community.id});
    });
  };

  CommunityApp.prototype.detailMembersForCommunity = function (community) {
    var members = [this.patientSummary()].concat(people);
    if (community.id === "nutricion") members = [this.patientSummary(), people[2], people[0], people[1], people[3]];
    return members.slice(0, 5);
  };

  CommunityApp.prototype.renderDetailClassCard = function (item) {
    var community = this.findCommunity(item.communityId || this.state.detailId) || this.findCommunity(this.state.detailId) || this.catalogCommunities()[0];
    var classItem = merge({
      id: "class-" + slugify(item.title || "actividad"),
      communityId: community.id,
      category: community.category || "Actividad",
      title: item.title || "Actividad de comunidad",
      date: "martes, 28 de julio",
      day: "mar",
      number: "28",
      month: "jul",
      time: "06:00 p.m.",
      place: community.city || "Remoto",
      modality: "Remoto",
      capacity: 24,
      available: 12
    }, item || {});
    var reserved = !!this.state.reservations[classItem.id];
    return '<article class="kc-event kc-class-event"><div class="kc-date-tile ' + community.tone + '"><small>' + escapeHtml(classItem.day) + '</small><strong>' + escapeHtml(classItem.number) + '-' + escapeHtml(classItem.month) + '</strong></div>' +
      '<div class="kc-event-copy"><small>' + escapeHtml(classItem.category) + '</small><h3>' + escapeHtml(classItem.title) + '</h3><p>' + escapeHtml(classItem.date) + ', ' + escapeHtml(classItem.time) + '.</p><p>' + escapeHtml(community.name) + '</p>' +
      '<b>' + (classItem.modality === "Remoto" ? icon("globe") : icon("map")) + ' ' + escapeHtml(classItem.place) + ' <span>Booking open</span></b><small>' + classItem.available + ' lugares disponibles de ' + classItem.capacity + '</small></div>' +
      '<button class="kc-event-action" data-action="' + (reserved ? "cancel" : "reserve") + '" data-id="' + escapeHtml(classItem.id) + '">' + (reserved ? "Cancelar" : "Reservar") + '</button></article>';
  };

  CommunityApp.prototype.detailReviewsForCommunity = function (community) {
    var hero = this.communityHeroImage(community);
    return [
      {
        initials: "AL",
        name: "Ana Lopez",
        time: "Hace 2 semanas",
        rating: 5,
        text: "Las sesiones de respiracion me ayudaron a crear una rutina real. Me gusta que las actividades sean claras y faciles de seguir.",
        images: [
          "/images/patient-export/025137a57f3ca9681a57.jpg",
          "/images/patient-export/fef141294fffa9354688.jpg"
        ]
      },
      {
        initials: "DR",
        name: "Diego Ramirez",
        time: "Hace 1 mes",
        rating: 4,
        text: "La comunidad se siente cercana. Reserve un evento desde aqui y el recordatorio del administrador fue muy util.",
        images: [
          "/images/patient-export/0eed2f25295ada06cb90.jpg",
          "/images/patient-export/025137a57f3ca9681a57.jpg"
        ]
      },
      {
        initials: "ML",
        name: "Mariana Lopez",
        time: "Hace 3 meses",
        rating: 5,
        text: "Me gusto encontrar publicaciones de otros miembros sin sentir presion. Es un espacio tranquilo para retomar habitos.",
        images: [
          "/images/patient-export/fef141294fffa9354688.jpg",
          hero
        ]
      },
      {
        initials: "CR",
        name: "Carlos Ruiz",
        time: "Hace 4 meses",
        rating: 5,
        text: "Los eventos tienen buena informacion y el panel de la comunidad facilita seguir el calendario.",
        images: [
          "/images/patient-export/f122e1d2a549e41a1c36.jpg"
        ]
      }
    ];
  };

  CommunityApp.prototype.renderDetailReviews = function (community) {
    var reviews = this.detailReviewsForCommunity(community);
    return '<section id="kc-community-reviews" class="kc-detail-panel kc-detail-reviews"><div class="kc-detail-review-head"><div><small>Opiniones</small><h2>Opiniones</h2><p><b>4.8 <span>&#9733;</span> (4499)</b> ' + icon("info") + '</p></div><div class="kc-carousel-controls"><button data-action="scroll" data-target="community-reviews" data-dir="-1" aria-label="Anterior">' + icon("back") + '</button><button data-action="scroll" data-target="community-reviews" data-dir="1" aria-label="Siguiente">' + icon("arrow") + '</button></div></div>' +
      '<div class="kc-detail-review-track" data-pan data-carousel="community-reviews">' + reviews.map(this.renderDetailReviewCard.bind(this)).join("") + '</div><button type="button" class="kc-detail-review-more">Ver mas ' + icon("arrow") + '</button></section>';
  };

  CommunityApp.prototype.renderDetailReviewCard = function (review) {
    var stars = Array.apply(null, { length: 5 }).map(function (_, index) {
      return '<span class="' + (index < review.rating ? "is-filled" : "") + '">&#9733;</span>';
    }).join("");
    var images = (review.images || []).slice(0, 2).map(function (image) {
      return '<img src="' + escapeHtml(image) + '" alt="Foto de opinion">';
    }).join("");
    return '<article class="kc-detail-review-card"><header><span>' + escapeHtml(review.initials) + '</span><div><strong>' + escapeHtml(review.name) + '</strong><p>' + stars + '</p></div><time>' + escapeHtml(review.time) + '</time></header><p>' + escapeHtml(review.text) + ' <button type="button">mas</button></p>' + (images ? '<div class="kc-detail-review-images">' + images + '</div>' : '') + '</article>';
  };

  CommunityApp.prototype.renderDetailInfoPanel = function (community) {
    return '<details id="kc-community-info" class="kc-detail-panel kc-detail-collapsible-info"><summary><div class="kc-detail-panel-title"><small>Informacion</small><h2>Detalles de la comunidad</h2></div><span class="kc-detail-toggle-mark"><b class="is-plus">+</b><b class="is-minus">-</b></span></summary>' +
      '<div class="kc-detail-collapsible-body"><section><div class="kc-detail-panel-title"><small>Comunidad especifica</small><h3>Sobre esta comunidad</h3></div><p>' + escapeHtml(community.longDescription || community.description) + '</p><div class="kc-feature-list">' + (community.features || []).map(function (feature) { return '<span>' + escapeHtml(feature) + '</span>'; }).join("") + '</div><div class="kc-detail-info-list"><p><b>Categoria</b><span>' + escapeHtml(community.category) + '</span></p><p><b>Ubicacion</b><span>' + escapeHtml(community.city) + '</span></p><p><b>Acceso</b><span>' + (community.access === "open" ? "Abierto" : "Con aprobacion") + '</span></p><p><b>Reglas</b><span>' + escapeHtml(community.rules) + '</span></p></div></section>' +
      '<section><div class="kc-detail-panel-title"><small>Catalogo</small><h3>Repositorio de comunidad</h3></div><div class="kc-detail-info-list"><p><b>ID catalogo</b><span>' + escapeHtml(community.catalogId || community.id) + '</span></p><p><b>Repositorio</b><span>' + (community.repositorySource === "usuario" ? "Creada por usuario" : "Catalogo base") + '</span></p><p><b>Slug</b><span>' + escapeHtml(community.slug || slugify(community.name)) + '</span></p><p><b>Visibilidad</b><span>' + (community.visibility === "hidden" ? "Oculta" : "Publica") + '</span></p></div></section></div></details>';
  };

  CommunityApp.prototype.renderDetail = function () {
    var community = this.findCommunity(this.state.detailId) || this.catalogCommunities()[0];
    var communityEvents = this.adminEventsForCommunity(community);
    var role = this.communityRole(community);
    var joined = role === "member" || role === "admin";
    var requested = role === "requested";
    var actionLabel = joined ? (role === "admin" ? "Administrar comunidad" : "Miembro activo") : (requested ? "Solicitud enviada" : (community.access === "open" ? "Unirme a la comunidad" : "Solicitar acceso"));
    var actionDisabled = joined || requested ? " disabled" : "";
    var heroImage = this.communityHeroImage(community);
    var members = this.detailMembersForCommunity(community);
    var visiblePosts = this.detailPostsForCommunity(community);
    var classes = community.classes && community.classes.length ? community.classes : [
      { title: "Actividad principal", detail: community.pinnedMessage || "Participa en las actividades de la comunidad.", icon: "calendar" },
      { title: "Publicaciones", detail: "Comparte avances, dudas y aprendizajes.", icon: "message" }
    ];
    return '<div class="kc-detail kc-detail-mobile">' +
      '<button class="kc-back kc-detail-back" data-action="' + (this.state.detailReturnView === "feed" ? "back-feed" : "back-directory") + '">' + icon("back") + ' Volver a comunidades</button>' +
      '<section class="kc-detail-public-hero ' + community.tone + '" style="--community-hero:url(' + "'" + escapeHtml(heroImage) + "'" + ')">' +
      '<div class="kc-detail-hero-media"><span>' + escapeHtml(community.logoInitials || community.initials) + '</span></div>' +
      '<div class="kc-detail-hero-copy"><small>' + escapeHtml(community.category) + ' · ' + (community.access === "open" ? "Comunidad abierta" : "Acceso con solicitud") + '</small><h1>' + escapeHtml(community.name) + '</h1><p>' + escapeHtml(community.description) + '</p></div>' +
      '<div class="kc-detail-stats"><span>' + icon("users") + '<b>' + community.members + '</b><small>Miembros</small></span><span>' + icon("calendar") + '<b>' + communityEvents.length + '</b><small>Eventos</small></span><span>' + icon("file") + '<b>' + visiblePosts.length + '</b><small>Posts</small></span></div>' +
      '<button class="kc-detail-primary" data-action="join" data-id="' + community.id + '"' + actionDisabled + '>' + icon(joined ? "check" : "users") + escapeHtml(actionLabel) + '</button>' +
      '</section>' +
      '<nav class="kc-detail-tabs" data-pan aria-label="Secciones de comunidad"><a href="#kc-community-classes">' + icon("sparkles") + 'Clases</a><a href="#kc-community-events">' + icon("calendar") + 'Eventos</a><a href="#kc-community-members">' + icon("users") + 'Miembros</a><a href="#kc-community-posts">' + icon("message") + 'Posts</a><a href="#kc-community-reviews">' + icon("heart") + 'Opiniones</a><a href="#kc-community-info">' + icon("info") + 'Info</a></nav>' +
      '<section id="kc-community-members" class="kc-detail-panel kc-detail-members"><div class="kc-detail-panel-title"><small>Participantes</small><h2>Miembros activos</h2></div><div class="kc-detail-member-strip" data-pan>' + members.map(this.renderDetailMember.bind(this)).join("") + '</div></section>' +
      '<section id="kc-community-classes" class="kc-detail-panel kc-detail-classes"><div class="kc-detail-panel-title"><small>Contenido</small><h2>Clases y actividades</h2></div><div class="kc-detail-class-grid">' + classes.map(this.renderDetailClassCard.bind(this)).join("") + '</div></section>' +
      '<section id="kc-community-events" class="kc-detail-panel kc-detail-events"><div class="kc-detail-panel-title"><small>Agenda</small><h2>Eventos de la comunidad</h2></div>' + (communityEvents.length ? communityEvents.map(this.renderEvent.bind(this)).join("") : '<div class="kc-empty">No hay eventos publicados.</div>') + '</section>' +
      '<section id="kc-community-posts" class="kc-detail-panel kc-detail-posts"><div class="kc-detail-panel-title"><small>Conversacion</small><h2>Publicaciones recientes</h2></div>' + visiblePosts.map(this.renderDetailMiniPost.bind(this)).join("") + '</section>' +
      this.renderDetailReviews(community) +
      this.renderDetailInfoPanel(community) +
      '</div>';
  };

  CommunityApp.prototype.renderBottomNav = function () {
    return '<nav class="kc-bottom-nav" aria-label="Navegacion principal"><button data-action="home">' + icon("home") + '<span>Inicio</span></button>' +
      '<button class="active" data-action="back-feed">' + icon("users") + '<span>Comunidades</span></button><button class="register">' + icon("plus") + '<span>Registro</span></button>' +
      '<button>' + icon("heart") + '<span>Mi Salud</span></button><button>' + icon("calendar") + '<span>Dispositivos</span></button></nav>';
  };

  window.KliniCommunityCatalog = {
    all: function () { return communities.slice(); },
    find: function (id) {
      return communities.find(function (community) {
        return community.id === id || community.catalogId === id || community.slug === id;
      }) || null;
    },
    upsert: function (community) { return upsertCommunityRecord(community); }
  };

  window.KliniCommunities = {
    // Share the same demonstration profiles with the community administrator.
    profiles: function () { return people.map(function (person) { return Object.assign({}, person); }); },
    // Reuse the public renderer without mounting an app, loading data or binding actions.
    renderEventPreview: function (activity) {
      var preview = Object.create(CommunityApp.prototype);
      preview.options = { startView: 'feed' };
      preview.state = { likes: {}, reposts: {}, followRequests: {}, postComments: {}, commentsOpen: {}, sharesOpen: {}, storyUploads: {} };
      preview.storyItems = function () { return [{id:'preview-own', name:'Tu historia', short:'Tu historia', avatar:'/brand/klini/favicon.svg', canUploadStory:true, isPatient:true}].concat(people.slice(0, 5)); };
      var community = communities.find(function (item) {
        return item.id === activity.community_key || normalizeSearch(item.name) === normalizeSearch(activity.community_name);
      });
      return { stories: preview.renderStories(), card: preview.renderActivityCard(activity, community) };
    },
    mount: function (root, options) {
      if (!root) throw new Error("KliniCommunities.mount requiere un elemento raiz.");
      return new CommunityApp(root, options || {});
    }
  };
})();
