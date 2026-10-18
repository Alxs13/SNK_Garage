# SNK Garage v4.0 — documentos visibles y lectura vehicular

Aplicación web móvil para uso personal, compatible con GitHub Pages. Mantiene la base de datos local de SNK Garage v2/v3 (IndexedDB `SNK_GARAGE_DB`, versión 2); no es una fuente oficial de antecedentes vehiculares.

## Lo nuevo

1. **Visor de documentos original:** fotografías JPG, PNG, WebP visibles en la sección Documentos como miniatura y en un visor a pantalla completa; PDF abierto en visor interno con botón para descargar el original. Algunos navegadores Android no tienen visor PDF integrado: en ese caso usa Descargar original.
2. **Escaneo real por tipo:** PDF digital → texto de sus páginas; PDF escaneado → cada página se convierte en imagen y pasa por OCR; JPG/PNG/WebP → ajuste de resolución y contraste y OCR. Hasta ocho páginas analizadas por PDF; el archivo adjunto se guarda completo.
3. **Revisión de resultados:** ficha de hasta 16 datos, con campos que se pueden corregir o completar manualmente, panel desplegable para ver el texto OCR y mensajes por archivo en caso de error.
4. **Consulta por patente experimental:** botón dentro de Agregar/Editar vehículo que intenta obtener **marca y modelo** desde antecedentes de revisión técnica disponibles en `https://api.restart.cl/v1/vehiculos-revisiones/{PATENTE}`. Depende de cobertura, disponibilidad y CORS del proveedor; **no está garantizado** en todos los navegadores. La consulta es voluntaria y envía la patente al proveedor externo. No devuelve necesariamente año, VIN o motor.
5. **Control de lectura:** indicador de avance, botón Detener lectura y posibilidad de guardar adjuntos aunque el OCR haya fallado.
6. **Conservación de funciones:** vehículos, patente, bencina y octanaje manual, litros, costo por litro, finanzas, recibos, kilometraje, vencimientos, respaldo completo en JSON.

## Cómo actualizar GitHub desde el celular

1. Si tienes vehículos, documentos o gastos guardados en la v3, en **Más → Respaldo** descarga primero un JSON. No publiques ese JSON, ni tus documentos, en GitHub.
2. Descomprime el ZIP de la v4 desde Mis archivos del celular.
3. Abre Chrome en modo *Sitio para computadoras*: `https://github.com/Alxs13/SNK_Garage`.
4. En el repositorio pulsa **Add file → Upload files**, selecciona TODOS los archivos extraídos (12 en total, especialmente `index.html`, `app.js`, `scanner.js`, `parser.js`, `styles.css`, `ui.css`, `sw.js`).
5. Pulsa **Commit changes**. GitHub reemplazará los archivos que tienen el mismo nombre; **no** subas solo el ZIP.
6. Pages ya está configurado en `main` + `/ (root)`, así que el enlace seguirá siendo `https://alxs13.github.io/SNK_Garage/`.
7. Espera a que GitHub Actions indique *Pages build and deployment → success*. Recarga la página en Chrome. Si sigue apareciendo v3, cierra la pestaña y entra de nuevo para renovar el service worker. No borres datos de Chrome si aún no has respaldado.

## Cómo escanear correctamente

- En SNK Garage, selecciona o crea tu vehículo → **Docs → Subir documentos**.
- Elige un padrón, permiso, SOAP o revisión en PDF, JPG o PNG. En teléfono puedes usar la cámara y guardar la foto como JPG.
- Mientras procesa necesita **Internet** para descargar PDF.js/Tesseract.js y el modelo español de OCR. El reconocimiento se ejecuta localmente en el dispositivo, pero la consulta de patentes sí accede a un servicio externo solo cuando pulsas Consultar.
- Pulsa **Ver** en el archivo seleccionado para comprobar la foto/PDF original.
- En **Ficha extraída** valida patente, marca, modelo, año, color, VIN, motor, etc. Corrige errores antes de guardar.
- En **Ver el texto original detectado y errores** puedes ver exactamente lo que reconoció el OCR o el motivo de fallo.
- Si el escaneo no avanza, pulsa **Detener lectura** y guarda el archivo sin reconocimiento para completar la ficha después.
- Ya guardado, en **Documentos** puedes ver miniaturas, pulsar **Ver archivo** y descargar el original.

## Limitaciones importantes

- La lectura OCR de texto impreso depende de nitidez, iluminación, resolución, sellos, reflejos y disposición del documento. No puede garantizar todos los campos de todas las plantillas de documentos chilenos.
- La consulta por patente no equivale a Registro Civil ni a Patentes Chile. Solo intenta recuperar datos de un proveedor público no oficial, y puede fallar por CORS en GitHub Pages. No pretende verificar dueño, multas, legalidad, SOAP ni permiso.
- No puede determinar con certeza si requiere gasolina 93, 95, 97 o diésel solo a partir de la patente. Consulta la tapa del depósito o el manual del auto.
- No existe cuenta, nube ni sincronización. Todos los datos y archivos guardados están en **el navegador de este dispositivo y en esta dirección web**. En otro celular no aparecerán hasta importar tu respaldo JSON.
- No hay cifrado de respaldos; protégelos. No subas padrón, boletas, documentos personales ni JSON a tu repositorio público.
- Los PDF se procesan hasta la página 8 para controlar memoria, pero el original completo se conserva.
- En algunos móviles el lector nativo no incrusta el PDF dentro de un iframe; usa **Descargar original** como alternativa.

## Verificaciones realizadas

Se ejecutaron pruebas automatizadas en navegadores Chromium de 360, 390 y 1440 px: alta de vehículo, consulta por patente *simulada*, escaneo JPG/PNG con OCR *simulado*, PDF con extracción de texto *simulada*, adjuntos, visor interno, guardar registros y comprobación de desbordamiento horizontal. **No se ha verificado el OCR con documentos reales del usuario ni el acceso efectivo a la API desde su Samsung.**
