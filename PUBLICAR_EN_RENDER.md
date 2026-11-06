# Publicar Keepr desde tus cuentas

Esta carpeta está preparada para un servicio web Node en Render. Tú haces la publicación; no necesita el enlace ni el almacenamiento de ChatGPT. No incluye claves de API.

## 1. Sube el proyecto a tu GitHub

1. Descomprime `keepr-mvp-profesional.zip` y conserva la carpeta `keepr-mvp` completa.
2. Instala GitHub Desktop desde https://desktop.github.com/ e inicia sesión con tu cuenta.
3. En **File → Add Local Repository**, selecciona la carpeta `keepr-mvp`. Si indica que no es un repositorio, elige **create a repository here** y créalo en esa misma carpeta.
4. Si hay cambios pendientes, escribe `Preparar Keepr para Render` y pulsa **Commit to main**.
5. Pulsa **Publish repository**, deja marcada **Keep this code private** y confirma. No uses GitHub Pages.

En la raíz del repositorio deben verse `package.json`, `server.mjs`, `render.yaml`, `public/` y `models/`. No subas el ZIP como único archivo. `.gitignore` excluye `.env`, dependencias y archivos generados. Conserva las tres partes del modelo en `models/`; el build las une automáticamente. GitHub Desktop evita el límite de tamaño de la subida de archivos por el navegador.

## 2. Crea el servicio en Render

1. Entra en https://dashboard.render.com/ y crea/inicia sesión en tu propia cuenta.
2. Selecciona **New → Web Service**.
3. Conecta GitHub y autoriza el repositorio de Keepr. Selecciona ese repositorio.
4. Usa estos valores:

| Campo | Valor |
| --- | --- |
| Name | El nombre disponible que prefieras, por ejemplo `keepr-aaron` |
| Language / Runtime | Node |
| Branch | `main` (o la rama que publicaste) |
| Root Directory | Vacío si `package.json` está en la raíz |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start:render` |
| Instance Type | **Free** |
| Health Check Path, en Advanced | `/healthz` |

5. En Environment agrega `HOST` con valor `0.0.0.0`. El archivo `.node-version` fija Node 22.22.0; no necesitas agregar `NODE_VERSION`.
6. No agregues claves de API para la primera prueba. Render proporciona `PORT` y `RENDER_EXTERNAL_URL` automáticamente.
7. Pulsa **Create Web Service**. Espera a que aparezca **Live** y abre el enlace que te asigne Render. No hace falta comprar dominio.

También se incluye `render.yaml` para quien prefiera **New → Blueprint**: define el mismo servicio gratuito, build, arranque y health check. Usa un solo método para no crear dos servicios.

## 3. Comprueba la publicación

- Abre la página y agrega un alimento manualmente. Recarga y comprueba que sigue allí.
- En tu celular, abre el enlace HTTPS de Render. Ve a **Mi inventario → Agregar alimentos → Analizar fotos → Tomar foto**. Comprueba la cámara en tu dispositivo y revisa la vista previa.
- La primera detección descarga aproximadamente 60 MB. Procura usar Wi-Fi y espera el progreso. Las fotos se analizan en el dispositivo.
- Revisa los alimentos propuestos antes de guardarlos. El modelo cubre 82 nombres en español; no reconoce todos los alimentos ni determina cantidades, fechas o frescura.
- En **Mis recetas**, las ideas incluidas dependen del inventario y funcionan sin clave de API.
- La dirección de tu app seguida de `/healthz` debe mostrar `ok`. `/api/status` debe indicar `provider: local-yolo` y `coverage: 82`.

El inventario se guarda en el navegador de cada dispositivo, sin sincronización. Cambiar del enlace anterior a Render no transfiere automáticamente los alimentos guardados.

## Costos y límites

El servicio está configurado en **Free**. Render pone los servicios gratuitos en reposo tras 15 minutos sin tráfico; la siguiente visita puede tardar alrededor de un minuto en arrancar. Hay límites de cómputo y transferencia; la descarga inicial del modelo cuenta como transferencia. No se promete disponibilidad permanente.

El detector y el recetario incluido no requieren una API de pago. **Crear recetas nuevas con un proveedor externo es opcional** y puede generar cargos según su cuenta. Esta entrega no activa proveedores ni incluye credenciales. Si después habilitas uno, configura sus secretos en Environment de Render y limita el uso antes de compartir la app ampliamente; nunca subas `.env` a GitHub.

## Si aparece un error

- **Host no permitido:** usa el enlace exacto de Render. Para un dominio propio, agrega `PUBLIC_ORIGIN=https://tu-dominio` en Environment, sin ruta ni barra final; redeploy.
- **Build fallido:** revisa Logs y que estén las tres partes `models/ingredients-yolov8x-v2.onnx.gz.part01`, `part02` y `part03`.
- **No detecta puerto:** confirma `HOST=0.0.0.0` y el Start Command anterior. No uses `npm run dev` como arranque.
- **No abre la cámara:** abre el enlace HTTPS directamente en Safari/Chrome, fuera del navegador interno de otra app. Puedes usar la galería si tu navegador no ofrece captura.
- **Crear receta no está activado:** es lo esperado sin claves. Usa el recetario incluido.

## Actualizar

Edita los archivos del proyecto, haz Commit y Push desde GitHub Desktop. Render despliega la rama conectada automáticamente según su configuración. Para probar localmente: `npm ci --include=dev`, `npm test`, `npm start`.

Referencias oficiales, consultadas el 6 de noviembre de 2026:

- https://render.com/docs/web-services
- https://render.com/docs/free
- https://render.com/docs/node-version
- https://render.com/docs/blueprint-spec
