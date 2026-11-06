# Cambios actuales · 0.18

Todos los resultados de detección vienen seleccionados, incluidos los nombres por confirmar. Cada uno de los 82 alimentos tiene su propio icono. Los formularios de fecha se ajustan al móvil y la interfaz muestra únicamente información útil para el cliente. Crear receta funciona sin claves con un planificador de reglas culinarias (`recipe-planner.mjs`).

Las secciones de versiones anteriores que siguen son un historial del proyecto. Para publicar la versión actual, consulta PUBLICAR_EN_RENDER.md.

# Keepr · Mi cocina

MVP de inventario de alimentos, fotografía asistida y recetas. Astro 7.4.1, JavaScript y servidor Node; lista para publicar desde tus propias cuentas de GitHub y Render.

## Publicar en Render · actualización 0.18

Sigue `PUBLICAR_EN_RENDER.md`. Incluye `render.yaml`, Node fijado, arranque sin recompilar y `/healthz`. El servidor acepta la URL HTTPS que Render asigna y escucha en `0.0.0.0` al ejecutarse allí. El detector se sirve desde tu propio servicio; no depende del alojamiento anterior. No incluye claves ni activa proveedores de pago.

## Iniciar en tu Mac

Necesitas Node 22.22.x. Abre esta carpeta completa en VS Code y ejecuta:

```sh
npm install
npm start
```

Abre http://localhost:3000. Las fotos funcionan con el detector local sin `.env`. Crear receta también funciona sin claves mediante reglas culinarias. Los proveedores externos son opcionales; la entrega no incluye credenciales.

## Cámara móvil: actualización 0.16

Acceso nativo Tomar foto (preferencia por cámara trasera) y galería independiente. Cola compartida de hasta tres fotos con eliminación, captura repetida y conservación al cancelar. Las capturas HEIC se convierten a JPEG cuando el navegador puede decodificarlas. No se mantiene una cámara abierta ni se suben imágenes al servidor. La apertura de la cámara depende del soporte del navegador móvil.

## Detector ampliado: actualización 0.15

Nuevo modelo entrenado para ingredientes de refrigerador: 91 etiquetas, agrupadas en 82 nombres en español. Comparado con otros candidatos y probado de extremo a extremo con fotos de varios ingredientes. Primera descarga aproximada de 60 MB, con caché local cuando sea posible y progreso visible. Se mantiene la revisión obligatoria, sin inventar cantidades o fechas. Consulta DETECTOR.md para resultados concretos y limitaciones.

## Historial · Detector local: actualización 0.14

Gemini queda sustituido en el análisis de fotos por YOLO11n especializado en 30 categorías de alimentos. Se ejecuta en el dispositivo, sin subir imágenes ni necesitar claves. Revisa y selecciona las sugerencias antes de guardarlas. Cantidades y fechas quedan pendientes. Consulta DETECTOR.md para cobertura, fuentes, licencias y límites. El recetario local sigue disponible; la generación de recetas mantiene su proveedor independiente.

## Historial visual · Keepr Édition: actualización 0.11

Jerarquía editorial consistente: Newsreader en todos los títulos y Manrope en controles y texto de apoyo. Ambas fuentes se sirven desde el proyecto con licencia OFL. Marca tipográfica refinada conservando el símbolo del frasco, líneas más ligeras y menor presencia de contenedores de dashboard. La funcionalidad y la configuración de proveedores se conservan.

## Acabado editorial: actualización 0.10

Navegación en verde profundo, marca en marfil, fondos cálidos, fotografía enmarcada y acentos dorados discretos. Títulos más ligeros, mayor espacio entre elementos y menos contenedores de dashboard. Se mantiene la misma familia Manrope y la funcionalidad existente.

## Sistema visual: actualización 0.9

Toda la app usa Manrope variable alojada localmente: portada, navegación, inventario, recetas, formularios y diálogos. Se unifican espaciados, radios, pesos tipográficos e iconos de línea. La paleta se conserva. En móvil la foto no se superpone al texto. Consulta DESIGN.md para escala, componentes y referencias Astro revisadas.

## Respaldo y marca: actualización 0.8

Nuevo logo vectorial original: frasco con una k en negativo, detalle color grano y letras dibujadas como trazos. Se usa en navegación, favicon y encabezado móvil. Los archivos están en `public/assets/keepr-logo.svg` y `public/assets/keepr-mark.svg`; no dependen de una fuente o de una imagen generada.

Las recetas admiten OpenRouter con modelos alternativos y respaldo directo en el proveedor existente. Consulta OPENROUTER.md para activarlo. **El respaldo de OpenRouter no está activo sin OPENROUTER_API_KEY.** En esta versión histórica las fotos mantenían el proveedor anterior; desde 0.14 usan el detector local.

## Recetas: actualización 0.7

La pantalla de recetas usa una lista sin ilustraciones decorativas. Crear receta propone una preparación mediante reglas culinarias compatibles con el inventario, sin configurar proveedores. No añade ingredientes ausentes; si no existe una combinación adecuada, solicita una base. Los proveedores externos siguen siendo opcionales para el propietario.

Las recetas creadas se guardan localmente en `keepr-recipes-v1` y se recuperan solo si el inventario y la fecha siguen coincidiendo. Al cambiar ingredientes o cantidades, dejan de mostrarse las preparaciones generadas con el inventario anterior. La generación no se ejecuta automáticamente. Se evitan solicitudes simultáneas y respuestas tardías para un inventario obsoleto.

Validación de esta actualización: 37 pruebas automatizadas con proveedores simulados. La revisión automática bloqueó la prueba real por requerir autorización específica para enviar el inventario a Google Gemini; no se afirma una generación real exitosa.

## Qué cambió

- Interfaz en verde bosque, salvia y blanco; fotografía real, navegación discreta, tarjetas legibles y barra inferior en celular.
- Componente de botones adaptado de AstroWind (MIT, onWidget), utilizado en la navegación lateral. Se conserva el layout de aplicación de Keepr: se adaptaron componentes, no se instaló toda la plantilla de marketing.
- Recetario local con ocho combinaciones que se muestran únicamente cuando tienes sus ingredientes. No requiere llamadas a la API una vez cargada la app.
- La personalización con IA se solicita expresamente. No se hacen llamadas de pago automáticamente al editar el inventario.
- Al cocinar, puedes indicar cuánto queda de cada ingrediente. Solo se retiran los que marcas como terminados.
- Corregido el registro manual sin fecha, que podía fallar al consultar propiedades de un alimento inexistente.
- Una fecha sugerida pasada se trata como recordatorio de revisión. Las fechas registradas superadas se distinguen y se excluyen de recetas.
- Se conserva `keepr-v1` para recuperar el inventario anterior en el mismo navegador y origen. Los cambios de otra pestaña se reflejan al recargar automáticamente.
- Fechas reales, identificadores únicos y datos locales se validan antes de recuperar el inventario.

## Qué sigue dependiendo de servicios externos

Las fotos se analizan en el dispositivo con YOLO y no se envían a Gemini. El detector se descarga desde tu propio servicio. Crear receta y el recetario incluido funcionan sin claves. El propietario puede configurar un proveedor externo opcional.

El inventario vive en este navegador. No hay cuentas propias, sincronización entre dispositivos, notificaciones automáticas ni aplicación móvil nativa. Las fechas no certifican frescura. Las recetas del recetario son orientativas: ajusta porciones y revisa cantidades y estado de los alimentos. No es una PWA instalable ni garantiza recarga de la página sin internet.

## Comandos

- `npm start`: compila y arranca el servidor local completo.
- `npm run dev`: vista de desarrollo Astro; no envía el inventario a proveedores externos. La API completa se usa con `npm start`.
- `npm test`: pruebas de validación, proveedores, recetario y consumo parcial.
- `npm run build`: compilación estática para el servidor Node.
- `npm run test:render`: compila y comprueba el servidor con la URL pública, orígenes y descarga íntegra del modelo.
- `npm run start:render`: inicia el servidor ya compilado en Render.
- `npm run build:hosted`: construye el Worker con los recursos integrados. Esta salida reemplaza `dist`; ejecuta `npm run build` para volver a la salida local.
- `node scripts/check-provider.mjs`: comprobación opcional real de Gemini. Envía la foto pública de vegetales incluida y puede consumir cuota.

## Archivos principales

`src/` estructura Astro; `app.js` interfaz; `kitchen.js` reglas y recetario local; `food-catalog.js` sinónimos; `styles.css` diseño; `server.mjs`, `vision.mjs`, `recipes.mjs`, `recipe-service.mjs` API local; `worker/` API alojada; `tests/` pruebas.

No edites los duplicados de `public/`: `scripts/prepare-public.mjs` los actualiza antes de compilar. La clave va en `.env` local y en variables secretas del servidor al publicar, nunca en el navegador.

## Créditos

AstroWind: https://github.com/onwidget/astrowind — licencia MIT incluida en `src/vendor/astrowind/LICENSE.md`. El botón ha sido adaptado para no añadir dependencias de Tailwind ni de iconos.

Fotografía de vegetales: https://unsplash.com/photos/1542838132-92c53300491e — recurso obtenido desde https://images.unsplash.com/photo-1542838132-92c53300491e. Foto decorativa, no representa el inventario del usuario.
