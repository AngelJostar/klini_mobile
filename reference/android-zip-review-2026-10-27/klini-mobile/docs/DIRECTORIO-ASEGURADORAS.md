# Aseguradoras del directorio médico

El selector incluye doce marcas de seguros de salud/gastos médicos en México: Allianz, AXA Seguros, Bupa, GNP Seguros, MAPFRE, MetLife México, Plan Seguro, Seguros Atlas, Seguros Banorte, Seguros Inbursa, Seguros Monterrey New York Life y Zurich. El catálogo se presenta alfabéticamente; no es una clasificación de calidad o cobertura. Las aseguradoras adicionales declaradas en los médicos, incluidas las dos de demostración, se conservan al final y se eliminan duplicados por nombre normalizado.

Buscar aseguradora utiliza una cápsula con esquinas de24px. Cualquier aseguradora es un botón compacto de220px de ancho limitado por el espacio disponible, altura mínima44px y esquinas de22px; conserva la acción para quitar el filtro. Estos tamaños se aplican exclusivamente al selector de aseguradoras.

La consulta del sector se apoyó en la [información de Accidentes y Enfermedades de la CNSF](https://www.cnsf.gob.mx/EntidadesSupervisadas/InstitucionesSociedadesMutualistas/Paginas/AccidentesEnfermedades.aspx) y en las páginas oficiales de las compañías. Los archivos originales, URL de origen, páginas de producto, dimensiones y hashes se documentan en [fuentes A](../assets/insurers/sources-a.json) y [fuentes B](../assets/insurers/sources-b.json).

Los logotipos se incluyen como PNG locales dentro de `assets/insurers`, manteniendo su proporción y colores. Los SVG originales conservados se convierten de forma determinista a PNG para el componente Image de Android/iOS. No se generan ni redibujan marcas. La variante oficial blanca de Banorte se presenta sobre fondo azul oscuro para mantener contraste. Los nombres de demostración usan un icono genérico en lugar de atribuirles una marca real.

La referencia visual se creó con Runway, tarea `040c0832-b057-4d46-b7c9-a69f973a11c7`: listado con logotipo a la izquierda, nombre a la derecha, buscador y selección menta. Se implementa con componentes interactivos, sin usar la imagen generada como pantalla ni recortar sus marcas ilustrativas.

El catálogo y los logotipos son de presentación. No agregan aseguradoras aceptadas a los médicos, pólizas, convenios, autorización de cobertura o pagos. La búsqueda sigue comparando con la lista declarada por cada médico; el seed actual solo tiene las dos aseguradoras de ejemplo, por lo que una marca real puede devolver cero coincidencias. El flujo posterior conserva la validación existente de póliza vigente y aseguradora admitida. No se usan coincidencias aproximadas entre marcas.

En Ciudad se muestra el mismo emoji de bandera que en País, derivado del país seleccionado. El prefijo es visual: no cambia el valor de ciudad, sus identificadores ni la búsqueda. Todas las ciudades conserva su etiqueta sin bandera.
