# Actualizar Keepr a 0.24.4

La versión 0.24.4 incorpora el icono aprobado con gorro de chef y hoja integrada en la palomita.
La versión 0.24.3 añade el icono grafito y permite abrir el inventario desde la confirmación de alta manual.
La versión 0.24.2 añade un icono de inicio con el logotipo blanco keepr. sobre verde oliva oscuro. Si el teléfono conserva el icono anterior, vuelve a añadir el acceso desde el navegador.
La versión 0.24.1 prepara las fotos de portada en segundo plano y las reutiliza al navegar entre Inicio, Inventario y Recetas.
Este ZIP actualiza tu repositorio existente de Keepr. Incluye Keepr Cookbook con 45 recetas en español e inglés. En conjunto, las recetas usan los 82 alimentos que reconoce el escáner. Puedes explorarlas con el inventario vacío, ver los ingredientes que te faltan y filtrar los platos que puedes preparar con lo que tienes.

Buscar ideas sigue usando tu inventario para sugerir hasta tres platos por búsqueda. El idioma elegido se aplica a las sugerencias nuevas, sus ingredientes y sus pasos. Si ya tenías sugerencias guardadas en español, puedes seguir viéndolas en ese idioma. Los nombres personalizados se conservan tal como se registraron.

1. Descomprime el ZIP.
2. En la raíz del repositorio de Keepr, abre **Add file → Upload files**.
3. Arrastra el contenido descomprimido, incluidas las carpetas. Conserva las rutas de `public`, `scripts`, `src`, `tests` y `worker`.
4. Guarda con **Commit changes** en la rama que usa Render.
5. Si Render tiene activado **Auto-Deploy → On Commit**, espera a que la nueva versión aparezca como **Live**.

El modelo del detector y la configuración de Render se toman del repositorio existente. Conserva los archivos que ya están en el repositorio y no aparecen en el ZIP. El inventario sigue guardado en el navegador.
