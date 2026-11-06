# Actualización 0.17 · Publicación propia en Render

Consulta PUBLICAR_EN_RENDER.md. Incluye configuración Free, Node 22.22.0, health check, servidor accesible desde Render y descarga del detector desde tu servicio. La publicación la realiza el propietario desde sus cuentas.

# Actualización 0.16 · Cámara del teléfono

En Escanear compra puedes elegir Tomar foto para solicitar la cámara trasera del teléfono, o Elegir de la galería. Combina hasta tres fotos, elimina y vuelve a tomar las que necesites. Cancelar no borra las fotos anteriores. En escritorio o navegadores sin captura nativa puede abrirse el selector de archivos. El análisis sigue siendo local.

# Actualización 0.15

Recarga Keepr para usar el modelo ampliado de ingredientes. La primera descarga es de unos 60 MB; espera a que finalice y revisa las sugerencias. Tus alimentos guardados se conservan. Consulta DETECTOR.md para sus límites reales.

# Actualización 0.14

Recarga Keepr para usar el detector local de alimentos. Ya no se envían fotos a Gemini ni se requiere una clave para analizarlas. Si una pestaña antigua intenta usar el servicio anterior, se le solicita recargar. Tus alimentos guardados se conservan en el mismo navegador y dominio.

# Actualizar Keepr

Conserva tu carpeta anterior y su `.env`. Descomprime esta versión en una carpeta nueva, copia allí `.env`, ejecuta `npm install` y `npm start`, y abre http://localhost:3000 en el mismo navegador y perfil.

El inventario anterior se conserva en el mismo origen bajo `keepr-v1`. No borres los datos del navegador. Una versión publicada en otro dominio tendrá un inventario independiente.

Cambios de esta entrega: diseño natural, botones adaptados de AstroWind, recetario local, personalización con IA bajo demanda y consumo parcial con cantidades restantes. Los registros sin fecha ya se guardan correctamente y las revisiones sugeridas no se interpretan como caducidad.

La conexión real de Gemini devolvió indisponibilidad temporal durante la prueba. La app muestra el error y mantiene el inventario y el recetario disponibles. La configuración original se conserva aparte de los archivos distribuibles.

Consulta README.md para comandos, créditos y límites del MVP.

Actualización 0.7: recetas sin ilustraciones, botón Crear receta mediante API, respuesta individual, aviso de destino de datos y recetas guardadas para el inventario actual. La generación real queda pendiente de autorización específica para enviar el inventario al proveedor; las pruebas de generación usan respuestas simuladas.

Actualización 0.8: nuevo logo vectorial y sistema de respaldo de recetas. Para activar OpenRouter es necesario añadir OPENROUTER_API_KEY como secreto del servidor; consulta OPENROUTER.md. Sin esa clave, se conserva el proveedor actual.

Actualización 0.9: sistema visual unificado con Manrope local, iconos vectoriales y ajustes de lectura y espaciado. Se conserva la configuración de proveedores. No hace falta una nueva clave para los cambios de diseño.

Actualización 0.10: acabado editorial más elegante con navegación verde profundo, variantes claras de marca, marfil y detalles dorados. Se mantiene Manrope en toda la app.

Actualización 0.11: Newsreader para títulos y Manrope para interfaz, siguiendo las mismas reglas en todas las pantallas. Ambas fuentes se incluyen localmente. Se mantiene el símbolo de la marca y se refina su palabra en vector.
