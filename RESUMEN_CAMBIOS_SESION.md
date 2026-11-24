# Resumen de Cambios y Refactorizaciones del Sistema (SAIA 2)

## 1. Infraestructura, Migración y Backend
- Resolucion de Conflictos en Git: Se resolvio el conflicto de integracion en backend/src/main.py.
- Migracion Automatica de Esquema SQLite: Se implemento la verificacion e insercion automatica de columnas mediante ALTER TABLE en la funcion db_creation_lifespan de FastAPI en backend/src/main.py, permitiendo que las bases de datos SQLite existentes incorporen nuevos campos (mostrar_desglose_sectores, mostrar_desglose_incidentes) sin perdida de datos ni excepciones de columna inexistente.
- Correccion en Servicio de Incidentes: Se corrigio la consulta SQL en backend/src/vista_publica/services.py cambiando EstadoIncidente.RESUELTO por EstadoIncidente.CERRADO, resolviendo excepciones internas 500/404 al consultar tokens activos de la vista publica.

## 2. Vistas Publicas y Codigos QR
- Modal de QR y Enlace Publico: Se agrego un modal con la vista del codigo QR y un boton de Copiar Enlace Publico con soporte de contingencia para entornos HTTP / direcciones IP de red local (192.168.1.x).
- Previsualizacion en Tiempo Real: Se ejecuto la sincronizacion del estado local en frontend/src/features/vistaPublica/ConfiguracionVistaPublica.tsx para que cualquier modificacion en las casillas de configuracion o textos actualice de forma inmediata los graficos y tarjetas de la vista previa dentro del modal.
- Disposicion Adaptativa en Escritorio: Se reorganizo la disposicion visual a un ancho de 1100px. La grafica de Cumplimiento de Higiene por Sector se ubica en su propia fila a ancho completo (grid-column: 1 / -1) directamente debajo de la tarjeta principal de limpieza.
- Nuevos Indicadores y Graficos: Se integraron anillos porcentuales Doughnut, Poligono de Radar de Calidad e Inocuidad, Grafico de Higiene por Sector de Planta, Grafico de Desvios e Incidentes de Calidad y Grafico de Barras de Documentacion del Personal.

## 3. Logo Institucional Predefinido
- Configuracion de Logo Base: Se configuro la imagen de la espiga de trigo como el logo predefinido de la empresa en backend/src/configuracion_empresa/default_logo.py y frontend/src/assets/logo_empresa.png.
- Integracion en Documentos y Reportes: Se vinculo para que aparezca en la cabecera de la pantalla de Datos de la PYME y en las exportaciones PDF de Fichas Tecnicas, Rotulos y Tablas Nutricionales.

## 4. Ficha Tecnica PDF y Previsualizador de Receta
- Rediseño Ficha Tecnica Cocina: Se reestructuro la exportacion en frontend/src/utils/exportarRecetaPdf.ts para seguir el formato de cocina: encabezado enmarcado, tabla de metadatos en cuadricula, tabla de formula de ingredientes simplificada en 3 columnas (# | CANTIDAD | INGREDIENTE / INSUMO), metodo de elaboracion numerado con parametros tecnicos (tiempo, temperatura, PCC) y observaciones.
- Visor Previo de PDF: Al presionar Descargar PDF en el detalle de la receta (frontend/src/features/recetas/RecetaDetail.tsx), se abre un modal con un visor nativo de PDF (iframe) para revisar el documento antes de confirmar la descarga.

## 5. Exportacion de Listados a CSV con Vista Previa
- Remocion de Opcion PDF en Tablas: Se elimino la opcion de exportar listados de tablas a PDF en frontend/src/components/TablaPaginada.tsx.
- Vista Previa CSV (Excel): Al presionar Exportar en cualquier tabla paginada, se despliega un modal con la vista previa de las columnas y los primeros registros que se incluiran en el archivo .csv antes de descargar.

## 6. Exportacion de Graficos del Sistema
- Integracion de BotonExportar: Se añadio la descarga en formatos PNG y PDF a todas las graficas del sistema que no contaban con esta funcion:
  - Estadisticas de Produccion y Lotes (frontend/src/features/tablero/GraficoProduccion.tsx).
  - Distribucion Porcentual de Ingredientes en Receta (frontend/src/features/recetas/RecetaDetail.tsx).
  - Cumplimiento de POES por Sector y Tareas por Persona (frontend/src/features/checklists/HistorialChecklistList.tsx).
- Captura Asincrona: Se actualizo frontend/src/utils/exportar.ts y frontend/src/components/GraficoBarrasHorizontales.tsx con soporte de renderizado asincrono en lienzo canvas de Chart.js para evitar imagenes en blanco o sin contenido.

## 7. Audit de Tests en Backend
- Analisis de Cobertura: Se revisaron las 30 entidades y modulos ubicados en backend/src/.
- Resultado de Pruebas: 28 de las 30 entidades (93.3%) poseen suites de pruebas dedicadas en backend/test/ acumulando mas de 900 casos de prueba ejecutados por pytest.

## 8. Componente Reutilizable SearchableSelect.tsx (Combobox Estricto)
- Componente Creado: frontend/src/components/SearchableSelect.tsx con despliegue al foco/clic, filtrado dinamico insensible a acentos y tildes, navegacion por teclado (ArrowUp, ArrowDown, Enter, Escape), validacion estricta al perder el foco y compatibilidad con React Hook Form (Controller).
- Estetica Oscura Integrada: Menu desplegable en fondo oscuro continuo (#0d1117), texto claro y resaltado azul brillante (#2563eb).
- Formularios Refactorizados:
  1. Insumos (frontend/src/features/insumos/InsumoForm.tsx): Unidades de medida y Aditivos INS.
  2. Productos (frontend/src/features/productos/FormularioProducto.tsx): Tipos de producto y Unidades.
  3. Lotes de Produccion (frontend/src/features/lotesProduccion/LoteForm.tsx y AgregarInsumoLote.tsx): Producto e Insumos.
  4. Recetas (frontend/src/features/recetas/RecetaForm.tsx): Producto, Insumos, Aditivos, Unidades y Equipos.
  5. Equipos de Planta (frontend/src/features/equipos/EquipoForm.tsx): Categorias y Sectores.
  6. Tareas y Consumos (frontend/src/features/tareas/TareaForm.tsx): Productos de limpieza.
  7. Documentacion del Personal (frontend/src/features/documentacion/DocumentacionForm.tsx): Tipos de documento.
  8. Documentos Versionados (frontend/src/features/documentosVersionados/DocumentoVersionadoForm.tsx): Tipos de documento versionado.
  9. Planes de Sanitizacion (frontend/src/features/planes/PlanForm.tsx): Sectores.
  10. Productos de Limpieza (frontend/src/features/productosLimpieza/ProductoForm.tsx): Tipos y Unidades.
  11. Rotulado Frontal (frontend/src/features/rotuladoFrontal/EvaluacionRotuladoFrontal.tsx): Excepciones normativas.

## 9. Verificacion de Compilacion
- Frontend TypeScript (npx tsc --noEmit): Compilacion exitosa con 0 errores.
- Backend Python (py_compile): Compilacion exitosa con 0 errores.
