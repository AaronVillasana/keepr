# Detección de ingredientes · Keepr 0.15

Se sustituyó el modelo ligero de 30 categorías por un detector entrenado para ingredientes de refrigeradores. Se eligió tras comparar cinco candidatos en las mismas fotos, no por el número de categorías anunciado. El análisis sigue en un Web Worker del navegador: las fotos no se envían a Gemini ni al servidor del modelo.

## Modelo seleccionado

- Proyecto original: Rouriqwq / Fridge Ingredient Detector → Recipe Recommender.
- Código y descripción: https://github.com/Rouriqwq123/fridge-ingredient-detector
- Archivo usado: https://huggingface.co/spaces/Rouriqwq/fridge-ingredient-detector/blob/da72f6212dd3a22ae8097c04267dae044d3a9884/best.pt
- SHA-256 del checkpoint original: `31156f67b006c1052f01fecb0f1e252116ad064741210cd8d8955f23ad0f350c`.
- El archivo real contiene un detector YOLOv8 de **68,240,241 parámetros y 91 etiquetas**, no el nano de 88 categorías descrito en parte del README. Keepr usa los índices reales del checkpoint, agrupados en **82 nombres en español**, eliminando duplicados como onion/Cebolla y tomato/Tomate.
- Exportación ONNX: RGB letterbox 640×640, gris 114, normalización /255, entrada [1,3,640,640], salida [1,95,8400].
- Pesos int8 por canal mediante DequantizeLinear; activaciones float32. Se comparó con la exportación float32 antes de integrar.
- ONNX adaptado: 68,716,526 bytes; SHA-256 `5afd1664ad002e6340f034e2729eebd671cbb94e4983ad9cc5809059ab0b5418`.
- Comprimido: 59,784,293 bytes; SHA-256 `20cdaa297c18b7c60dd6e9ef7d50c27c296fe7df6282ffacdd46d067701b64b1`.
- Runtime: ONNX Runtime Web 1.20.1, WASM, un hilo; no requiere claves ni cuota de inferencia.

## Cobertura y límites

Incluye ingredientes como huevo, jitomate, cebolla, papa, pepino, zanahoria, lechuga, coliflor, pimiento, aguacate, espinaca, arroz, pollo, pescado y lácteos. La lista exacta se genera desde `detector-core.js` y se muestra en «Qué puede reconocer».

No reconoce todos los alimentos. Puede omitir productos y asignar etiquetas equivocadas, incluso con puntuaciones altas. No puede determinar qué hay dentro de envases opacos ni distinguir con seguridad leche/yogur por el aspecto de un envase. No lee etiquetas, cantidad, fecha, frescura o caducidad. Todas las propuestas empiezan sin seleccionar, y cantidades/fechas quedan vacías.

Umbral de propuestas 0.60; NMS entre clases 0.45; máximo 100 cajas por foto. Los nombres repetidos se agrupan dentro y entre fotos. No se suman cantidades ni se inventa un inventario completo. Las puntuaciones del detector no son probabilidades calibradas.

## Comparación práctica

Se comprobaron cinco fotos públicas: una canasta de frutas, una ensalada, un refrigerador surtido, ingredientes separados y una cocina vacía. Es una comprobación pequeña de funcionamiento, no un benchmark ni una garantía de precisión. No se verificó si alguna imagen estuvo en los datos de entrenamiento.

| Caso | Modelo anterior / otros candidatos | Modelo elegido |
| --- | --- | --- |
| Ingredientes separados | El detector anterior propuso principalmente huevo y jitomate | En el navegador propuso los seis tipos visibles: cebolla, huevo, jitomate, papa, pepino y zanahoria |
| Refrigerador | El detector anterior dio pocas categorías y varias omisiones | En el navegador propuso nueve nombres, incluyendo ocho alimentos claramente visibles; «yogur» requiere verificar el envase |
| Ensalada | El anterior confundió parte de la comida con huevo | El elegido detectó jitomate y omitió otros ingredientes; no volvió a proponer huevo |
| Canasta de frutas | Varios modelos especializados fallaron o confundieron los objetos | Encontró naranja, pero omitió manzana y plátano; persiste esta limitación |
| Cocina vacía | Sin alimentos | Sin propuestas |

También se probaron FoodSeg103 (104 salidas incluyendo fondo), FoodVision (55 clases), YOLOv8n Open Images V7 y la versión float32 del modelo elegido. Los modelos pequeños no mejoraron de forma consistente las muestras de refrigerador. Se descartaron. Las métricas publicadas por los autores no se presentan como métricas de Keepr.

Referencias de las fotos de comprobación, sin redistribuirlas en la entrega:
- Frutas: https://unsplash.com/photos/2ZgflmYgK_E
- Refrigerador: https://hips.hearstapps.com/hmg-prod/images/refrigerator-full-of-food-royalty-free-image-1596641208.jpg
- Ingredientes: https://obltv.ru/news/yajca-pomidory-i-ovoshchi-podorozhali-v-sverdlovskoj-oblasti-31468
- Ensalada: imagen de portada existente en Keepr.
- Cocina: https://www.chowhound.com/1971920/how-prepare-kitchen-storm-info/

## Primera carga y dispositivos móviles

La descarga inicial es de unos **60 MB**, bastante mayor que la versión ligera. El progreso se muestra en pantalla. Cuando Cache Storage está disponible y tiene espacio, los pesos se guardan para no repetir la descarga. Se verificó esta reutilización tras recargar la app. No se garantiza funcionamiento sin conexión ni la permanencia del caché.

La preparación y el análisis pueden tardar, especialmente en celulares. La UI permanece disponible y se puede cancelar. Al cerrar el flujo se libera la memoria del modelo. Si el dispositivo no puede ejecutarlo, se informa el fallo y sigue disponible el registro manual; no se cambia silenciosamente al detector anterior ni se suben fotos a una API.

## Archivos y publicación

- `models/ingredients-yolov8x-v2.onnx.gz.part01` a `.part03`: pesos modificados divididos para el transporte. `npm start` los une automáticamente antes de iniciar, sin descargar otros archivos.
- `scripts/export-fridge-model.py`: exportación con deserialización segura y clases permitidas explícitamente.
- `scripts/prepare-yolo.py`: cuantización por canal reproducible de los pesos ONNX.
- `detector-core.js`: nombres exactos, NMS y agrupación.
- `local-detector.worker.js`: descarga, caché e inferencia; `local-detector.js`: coordinación y cancelación.
- En el sitio publicado, los pesos se sirven desde su almacenamiento privado mediante un stream. La instalación verifica tamaño y SHA-256 y no permite otros archivos ni sobrescritura arbitraria. Las imágenes del usuario nunca pasan por esa ruta.
- `/api/analyze` sigue retirado (410). Las recetas conservan su configuración independiente.

Licencias: YOLO/Ultralytics AGPL-3.0; runtime ONNX MIT. Se conservan avisos y procedencia junto al código y los pesos modificados. Para reproducir desde cero: exportar el checkpoint con `scripts/export-fridge-model.py`, cuantizar el ONNX con `scripts/prepare-yolo.py` y comprimir con gzip determinista (`mtime=0`).
