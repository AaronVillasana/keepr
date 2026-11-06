# Abrir Keepr

1. Descomprime la carpeta y ábrela completa en VS Code.
2. El análisis de fotos y el recetario local no requieren claves. Copia tu `.env` anterior únicamente si quieres conservar la generación de recetas con un proveedor externo.
3. En la terminal de esa carpeta ejecuta:

```sh
npm install
npm start
```

4. Abre http://localhost:3000 en tu navegador habitual.

El inventario y las recetas del recetario funcionan sin configurar IA. El análisis de fotos usa YOLO local: necesita la descarga inicial del detector desde Keepr y un navegador moderno compatible. Consulta DETECTOR.md para sus 82 nombres de ingredientes y limitaciones. Solo la generación de recetas personalizadas necesita una clave y cuota disponible. Abre siempre la app desde su servidor, no el HTML directamente.

Si antes usabas localhost:3000, abre el mismo navegador y perfil: Keepr conserva la clave local `keepr-v1`. Los datos no se trasladan automáticamente a otro dominio.

Requiere Node 22.22 o superior. Detén el servidor con Control+C.
