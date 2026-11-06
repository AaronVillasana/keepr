# Keepr · sistema visual 0.13

## Dirección

Una aplicación de cocina serena, cálida y precisa. La paleta combina verde bosque profundo en la navegación, marfil cálido en las superficies y un acento dorado discreto. La sensación premium se trabaja mediante jerarquía, espacio, alineación y legibilidad. Las pantallas comparten un mismo sistema; no hay una tipografía de portada separada de la interfaz.

## Tipografía

La edición 0.11 utiliza dos familias con funciones fijas. Newsreader se aplica a **todos** los títulos de página, sección, tarjeta y diálogo, además de las cifras de resumen y la firma de marca. Manrope se mantiene en navegación, botones, campos, etiquetas y texto de apoyo. La consistencia depende del rol, no de cambiar fuentes arbitrariamente entre pantallas.

Ambas fuentes variables están alojadas localmente en `public/assets/fonts/`, con sus licencias OFL. No se consulta Google Fonts al usar la app. Escala de referencia: títulos de página 52 px, título principal de portada 43 px, títulos de sección 32–38 px, títulos de tarjeta 29–32 px y controles 10–12 px según contexto. En móvil los tamaños se adaptan conservando las mismas funciones.

La palabra Keepr se dibuja como contornos vectoriales a partir de Newsreader. Se conserva el frasco con la k como símbolo, con variantes verde y marfil.

## Componentes

Espaciado basado en 4, 8, 12, 16, 24, 32 y 48 px. Controles de 42–47 px y radios de 5 px; paneles de 6–7 px. Bordes discretos, contraste estable, foco visible y respeto por la preferencia de movimiento reducido. Los iconos de alimento son vectores de línea con un mismo grosor y tamaño; no dependen de cómo cada sistema dibuje los emojis.

La fotografía de portada queda enmarcada y separada del texto, sin un degradado que la mezcle con las letras. En celular aparece debajo del texto. Las tarjetas de inventario usan una sola columna para mantener el contenido legible. Las recetas conservan una lista sin ilustraciones decorativas.

## Referencias de Astro revisadas

| Referencia | Criterio tomado para la revisión |
| --- | --- |
| [Atelier Kō](https://astro.build/themes/details/atelier-k/) | Sistema de componentes y presentación pausada de contenido y fotografía. |
| [Kavelle](https://astro.build/themes/details/kavelle/) | Presentación de imágenes y jerarquía de información. |
| [Quell](https://astro.build/themes/details/quell/) | Uso del espacio, alineación y orden editorial. |
| [ScrewFast](https://astro.build/themes/details/screwfast/) | Componentes adaptables y controles consistentes. |
| [AstroWind](https://github.com/onwidget/astrowind) | Se mantiene el componente de botón ya adaptado bajo licencia MIT. |

Se revisaron el catálogo gratuito y estas referencias relevantes. No se afirma haber inspeccionado todos los temas del catálogo. No se instalaron plantillas comerciales ni se sustituyeron los flujos de Keepr por los de una tienda o un portfolio.

## Recursos

Manrope: https://github.com/google/fonts/tree/main/ofl/manrope — licencia OFL en la carpeta de la fuente.

Fotografía de portada: https://images.unsplash.com/photo-1512621776951-a57141f2eefd. Es una fotografía decorativa de una ensalada; no representa una receta generada ni el inventario del usuario.

## Verificación

Revisión visual de portada, inventario, recetas y formulario. Comprobación en navegador de familia tipográfica en títulos, navegación, botones y tarjetas. Vistas de 360, 390 y 430 px sin desbordamiento horizontal. Las pruebas funcionales existentes se ejecutan aparte con proveedores simulados; esta revisión no activa claves adicionales.

La revisión 0.10 reduce los contenedores de dashboard: el resumen se presenta entre líneas finas, las recetas usan vínculos de preparación subrayados y la navegación tiene una variante de marca en marfil para el fondo verde. En la edición 0.11 se usa la pareja Newsreader–Manrope con roles constantes.

Newsreader: https://github.com/google/fonts/tree/main/ofl/newsreader — licencia OFL incluida como Newsreader-OFL.txt. La edición reduce contornos y usa composiciones editoriales sin añadir funciones o promesas de disponibilidad.

## Edición móvil 0.12

Cabecera fija y navegación inferior con margen para el indicador de inicio. Controles táctiles de al menos 44 px y campos de 16 px para evitar el zoom involuntario de iOS. Inventario compacto, formularios en panel inferior, márgenes adaptables y movimiento reducido según las preferencias del dispositivo. La portada usa WebP y conserva las mismas fuentes, colores y jerarquías.

## Elegancia cotidiana 0.13

Acciones de agregar y escanear visibles desde el inicio. Portada más contenida y tarjetas marfil con radios discretos. Texto operativo más legible, mayor contraste y menos espacio entre tareas. Newsreader conserva todos los títulos; Manrope, los controles y el texto. Los controles móviles mantienen su tamaño táctil y sus áreas seguras.
