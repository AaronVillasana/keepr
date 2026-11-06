# Activar el respaldo de recetas

La integración está preparada. La versión publicada conserva Gemini hasta que se añada una clave válida de OpenRouter. No se ha creado ninguna cuenta, comprado saldo ni activado facturación.

1. Entra a tu cuenta de OpenRouter: https://openrouter.ai/settings/keys
2. Crea una clave para Keepr y define un límite de gasto en esa cuenta. Los modelos predeterminados son de pago por uso; requieren saldo disponible.
3. Para la versión local, añade a tu `.env`:

```dotenv
RECIPE_PROVIDER=auto
OPENROUTER_API_KEY=tu_clave_privada
OPENROUTER_RECIPE_MODELS=google/gemini-2.5-flash-lite,mistralai/mistral-small-3.2-24b-instruct
```

4. Reinicia `npm start`. En la versión alojada, la clave debe añadirse como secreto del servidor y aplicarse en un despliegue; editar el `.env` de tu Mac no modifica la versión publicada.

## Cómo responde la app

Con `RECIPE_PROVIDER=auto`, OpenRouter se usa primero si tiene una clave configurada. Le enviamos una lista de modelos compatibles con JSON estructurado. Si el primero está ocupado o falla, OpenRouter intenta el siguiente. Si el servicio falla, Keepr puede usar Gemini (o el proveedor que ya tengas configurado en `AI_PROVIDER`) como respaldo directo.

Cada intento de servicio tiene un límite de 30 segundos. No hay reintentos ilimitados. Una cancelación del usuario detiene el flujo y no envía el inventario a otro proveedor. Una solicitud inválida tampoco activa llamadas alternas. Las respuestas se validan antes de mostrarse: los ids deben pertenecer al inventario.

Las fotos conservan el proveedor anterior; este cambio aplica únicamente a las recetas. La generación se solicita al pulsar Crear receta. El inventario y las recetas guardadas no dependen de que OpenRouter esté disponible.

## Datos y límites

Se envían nombres de ingredientes, cantidades, fechas e ids internos del inventario, además de nombres de recetas previas, a los proveedores configurados. El aviso de la pantalla se ajusta a la configuración del servidor. Ninguna clave se envía al navegador.

Tener respaldo mejora la tolerancia a fallos, pero no garantiza disponibilidad permanente ni evita límites de saldo, cuota o caídas simultáneas. Puedes sustituir los modelos en OPENROUTER_RECIPE_MODELS; deben admitir JSON Schema.

Esta integración se probó con respuestas simuladas. No hay una clave de OpenRouter conectada en la entrega y no se afirma una llamada real exitosa.
