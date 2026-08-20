# WaveOps - Resumen Maestro de Progreso

> Última actualización: 2026-08-19 (FASE 7.4 en progreso: fixes de atrasados, alcance por rol y crear tarea específica desde Turnos)
> Branch activo: `fix-horarios-provider`
> Proyecto Firebase: `wve-b3db5`
> Repo: `github.com:cabg9/WaveOps-APP.git`

---

## FASE 7: Sincronizar timeOffRequests con HorariosModule

**Estado:** COMPLETADA

### Funcionalidades entregadas
- Lectura en tiempo real de la colección `timeOffRequests` desde Firestore usando `onSnapshot`.
- Pestaña **Solicitudes** con dos pestañas principales:
  - **Mis cambios**: solicitudes de cambio de turno entre usuarios, con sub-filtros Recibidas, Enviadas, Historial y Equipo.
  - **Mis solicitudes**: solicitudes de tiempo libre (`timeOffRequests`).
- **Mis solicitudes → Mis solicitudes / Equipo**:
  - Vista "Mis solicitudes" para el usuario logueado.
  - Vista "Equipo" para supervisores, RRHH, gerentes y directores; incluye las solicitudes propias del usuario.
  - Filtros por estado: Todas, Pendientes, Aprobadas, Rechazadas, Canceladas.
  - Filtro por departamento en vista Equipo.
- Acciones disponibles:
  - **Aprobar / Rechazar**: visibles para usuarios con permisos de aprobador, incluyendo auto-aprobar para pruebas (Director General).
  - **Editar**: solo aprobadores; visible en solicitudes pendientes, aprobadas y rechazadas (no en canceladas); permite modificar tipo, fecha de inicio y fecha de fin.
  - **Cancelar**: visible para el solicitante en sus propias solicitudes no canceladas; activo solo en estado pendiente; marca el estado como `cancelada` y conserva el historial.
- **Historial de auditoría** visible solo para aprobadores dentro de cada tarjeta: registra aprobaciones, rechazos, ediciones (con cambios realizados) y cancelaciones, incluyendo quién y cuándo.
- Notificaciones al usuario solicitante cuando su solicitud es aprobada o rechazada.
- Visualización de días aprobados en **Mi Horario**:
  - Tarjeta de HOY.
  - Calendario mensual.
  - Vista expandida del día.
- Visualización de días aprobados en **Horarios → Equipo**:
  - Tabla semanal del equipo.
  - Calendario del modal de colaborador.
  - Modal de día.
- Bloqueo de asignación en **Horarios → Asignar** cuando un usuario tiene tiempo libre aprobado; se muestra badge informativo y se rechaza el drop con mensaje.
- **Eliminación de asignaciones en borrador en Horarios → Asignar**:
  - Doble click sobre una asignación ya publicada o en borrador la marca como `ELIMINADO` (soft-delete).
  - La asignación eliminada sigue visible en la celda con fondo gris, texto tachado, icono de basura y badge rojo, actuando como borrador de eliminación.
  - Doble click sobre una asignación marcada como `ELIMINADO` la restaura a su estado previo.
  - El botón **Publicar** muestra contadores de borradores y eliminaciones pendientes.
  - Al publicar: las asignaciones en `BORRADOR` pasan a `PUBLICADO` y las marcadas como `ELIMINADO` se eliminan definitivamente de Firestore.
- **Prioridad de incapacidad sobre tiempo libre**:
  - En `Mi Horario`, `Horarios → Equipo` (calendario, tabla semanal, popup de día y vista expandida), cuando un día tiene una incapacidad registrada, ya no se muestra el badge ni la información de tiempo libre aprobado.
  - En el **modal de día del header de Horarios → Equipo**, un usuario con incapacidad ahora aparece **únicamente** en la sección de **Incapacidades**; se elimina de **Usuarios libres**, **Múltiples turnos** y **Responsables en turno**.
- **Flujo de incapacidades y permisos**:
  - Las tarjetas de **Incapacidades → Equipo** muestran los botones **Verificar**, **Registrar** (con reemplazo) y **Rechazar** para usuarios con permiso.
  - El Director General tiene acceso total a estas acciones.
  - Se agregó la categoría **Incapacidades** en **Develops → Roles y Permisos** con toggles para ver propias/equipo, verificar, registrar, rechazar y gestionar documentos.
  - Se agregó helper `hasPermission` en `useAppConfig` que consulta los permisos del `roleTemplate` del usuario actual (con fallback a roles tradicionales).
- **Avatares con foto de usuario**:
  - Nuevo componente reutilizable `UserAvatar` que muestra la foto del usuario (`avatar` / `photoURL`) y usa iniciales como fallback.
  - Reemplazo de avatares basados solo en iniciales en `HorariosModule`, `Layout`, `TasksModule`, `DevelopsModule` y limpieza de imports en `ProfilePage`.
  - Todos los `<UserAvatar>` dentro de `HorariosModule.tsx` ahora prefieren `photoURL` sobre `avatar`, incluyendo el modal de día del header, responsables, turnos, reemplazos, incapacidades y tarjetas de solicitudes.
  - Tarjetas de solicitudes de tiempo libre y cambios de turno en `HorariosModule.tsx` ahora muestran la foto real del usuario en lugar de un círculo con iniciales.
  - `TasksModule.tsx` y `DevelopsModule.tsx` actualizados para preferir `photoURL` sobre `avatar` en los avatares de usuarios asignados y en la tabla de usuarios.
  - `UserAvatar` usa `AvatarImage` de Radix UI con `onLoadingStatusChange` para mostrar la foto tan pronto como esté lista; las iniciales solo aparecen como fallback cuando no hay foto o ésta falla al cargar, eliminando el flash visual de iniciales.
  - Búsqueda de usuario robusta en tarjetas de incapacidades y reemplazos: se busca por `id`, `email` o `name` para encontrar la foto correcta aunque el `userId` guardado venga de distintas fuentes.
- **Dashboard: tarjeta del módulo Horarios**:
  - Muestra el turno asignado para hoy (nombre del turno en `stat1`).
  - Si no tiene turno asignado, muestra **Stand By** en amarillo.
  - Si tiene turno asignado y está dentro del horario, muestra el horario + ubicación/departamento y el indicador en verde.
  - Si tiene turno asignado pero fuera del horario, muestra el horario + ubicación y el indicador en gris.
  - Contador de solicitudes de cambio de turno recibidas (`solicitudes` colección, estado `pendiente`) en `stat2`.
  - Los datos se leen en tiempo real desde Firestore y `useShifts`.
- **Persistencia en Firebase de solicitudes de cambio de turno**:
  - Las acciones **Aceptar**, **Rechazar** y **Deshacer** de solicitudes de cambio de turno ahora actualizan el documento correspondiente en la colección `solicitudes` de Firestore, no solo el estado local ni `localStorage`.
  - El listener en tiempo real de `solicitudes` refleja los cambios en todos los clientes conectados.

## FASE 7.1: Refactor a 100% online (sin datos de negocio en localStorage)

**Estado:** COMPLETADA

### Funcionalidades entregadas
- **Configuración/Settings en Firestore**:
  - `src/components/SettingsPage.tsx` ahora lee y escribe las preferencias del usuario en el campo `settings` del documento del usuario en Firestore (`users/{uid}`).
  - Sincronización en tiempo real con `onSnapshot`; los cambios se reflejan en todos los dispositivos conectados.
  - Se eliminó por completo el uso de `localStorage` para guardar settings (`waveops-settings`).
  - Escrituras protegidas contra loops: el listener ignora los snapshots generados por sus propias actualizaciones.
- **Autenticación y avatar 100% online**:
  - Eliminado `cachedPhotoURL` de `useFirestoreAuth.tsx`.
  - `Layout.tsx` ya no lee foto de `localStorage`; muestra el avatar desde el usuario autenticado/Firestore.
  - `PersistentAvatar.tsx` reescrito para usar `useAuth()` de `useFirestoreAuth` en lugar de claves `wo_*` de `localStorage`.
  - Eliminado el hook legacy `src/hooks/useAuth.tsx` que persistía `galapagos_user` en `localStorage`; ningún componente lo usaba ya que todos apuntan a `useFirestoreAuth`.
- **HorariosModule sin estado local de negocio**:
  - Eliminado `localStorage` de incapacidades (`waveops_incapacity_dates`), solicitudes enviadas (`waveops_mis_solicitudes_enviadas`) y respaldo de solicitudes (`waveops_todas_solicitudes`).
  - La creación de solicitudes de cambio de turno genera el ID con `doc()` de Firestore desde el inicio y guarda con `setDoc()`, evitando duplicados.
- **Decisión de arquitectura**: la app es 100% online. Datos de negocio, preferencias, autenticación y avatares se leen/escriben siempre en Firebase. `localStorage` solo se reserva para tokens técnicos del navegador si fueran estrictamente necesarios (no para datos de usuario).

### Archivos modificados
- `src/components/SettingsPage.tsx`
- `src/hooks/useFirestoreAuth.tsx`
- `src/components/Layout.tsx`
- `src/components/PersistentAvatar.tsx`
- `src/components/modules/HorariosModule.tsx`

### Restricciones respetadas
- No se borraron datos de Firebase.
- No se tocó el modal de "Solicitar Días Libres".
- Sin emojis; solo íconos de `lucide-react`.

---

### Archivos modificados (FASE 7 completa)
- `src/components/modules/HorariosModule.tsx`
- `src/components/modules/DevelopsModule.tsx`
- `src/components/modules/TasksModule.tsx`
- `src/components/Dashboard.tsx`
- `src/components/Layout.tsx`
- `src/components/ProfilePage.tsx`
- `src/components/PersistentAvatar.tsx`
- `src/components/SettingsPage.tsx`
- `src/components/UserAvatar.tsx`
- `src/hooks/useAppConfig.ts`
- `src/hooks/useFirestoreAuth.tsx`
- `src/hooks/useShifts.tsx`
- `src/hooks/firestore/useFirestoreShifts.ts`
- `src/hooks/firestore/ShiftsProvider.tsx`
- `src/components/NotificationsDrawer.tsx`
- `src/types/index.ts`

### Restricciones respetadas
- No se tocó el modal de "Solicitar Días Libres".
- No se borraron datos de Firebase.
- Solo íconos de `lucide-react`, sin emojis.
- Todo desde Firebase; nada hardcodeado.

---

## FASE 7.2: Responsive para iPhone y iPad

**Estado:** COMPLETADA

### Funcionalidades entregadas
- **Layout global**: header trunca título/fecha, menú móvil usa `max-w-[85vw]`, contenedor principal evita scroll horizontal no deseado.
- **HorariosModule**:
  - Grid de incapacidades apilado en móvil, stats cards a ancho completo.
  - Calendario mensual con alturas responsive.
  - Stats del modal colaborador en 2 columnas en móvil.
  - Modales principales usan `max-w-[95vw]` en pantallas pequeñas.
  - Tarjetas de solicitudes pasan a 1 columna en móvil.
  - Tablas de Equipo y Asignar con primera columna sticky al hacer scroll horizontal.
  - **Dropdowns en móvil**: pestañas principales (Mi Horario, Equipo, Asignar, Solicitudes, Incapacidades), sub-pestañas de Incapacidades, filtros de Mis Cambios (Recibidas, Enviadas, Historial, Equipo) y controles de Solicitudes (Mis solicitudes / Equipo, filtro de estado) se muestran como selects en pantallas pequeñas (`md:hidden`), manteniendo los botones en desktop.
  - **Ajustes finales de filtros**:
    - Todos los selects ahora se ajustan al contenido (`w-fit`), usan estilo de botón con `rounded-xl`, borde suave y hover, y su texto/iconos son grises (`#86868B`) para mantener la línea gráfica.
    - En **Solicitudes**, las pestañas Mis Cambios / Mis solicitudes son botones unitarios; los filtros Recibidas / Enviadas / Historial / Equipo son botones más compactos; en Mis solicitudes el filtro de estado (Todas, Pendientes, Aprobadas, Rechazadas, Canceladas) es un dropdown en móvil y botones en desktop.
    - En **Incapacidades**, las pestañas Mis Incapacidades / Equipo son botones unitarios; los filtros de estado pasan a ser un dropdown con iconos en móvil y botones en desktop.
    - En **Equipo** y **Asignar**, el selector de departamento se movió junto al dropdown principal de pestañas en móvil; las tablas usan columnas de usuario más angostas (`w-20` en móvil), días abreviados `L / Ma / Mi / J / V / S / D`, celdas de día de `min-w-[52px]` y scroll horizontal interno para los 7 días sin salirse del grid.
    - En **Asignar**, el sidebar de turnos disponibles es `sticky` también en móvil para que los turnos queden fijos mientras se hace scroll en el calendario.
  - **Modal Solicitar Días Libres**: en móvil usa `max-w-[calc(100%-2rem)]` para tener margen izquierdo/derecho y no quedar pegado a los bordes.
  - **Solicitudes**:
    - Pestañas principales renombradas a **Cambios** y **Solicitudes**.
    - El bloque gris de pestañas principales ahora es `w-fit`.
    - En **Cambios**, los sub-filtros (Recibidas, Enviadas, Historial, Equipo) y el selector de departamento (solo en Equipo) se muestran junto a las pestañas principales.
    - En **Solicitudes**, los sub-filtros (Mis solicitudes / Equipo), el selector de departamento (solo en Equipo) y el filtro de estado se muestran junto a las pestañas principales. Los filtros de estado de tiempo libre ahora se controlan desde el header.
  - **Incapacidades**:
    - Las sub-pestañas **Mis Incapacidades / Equipo** se muestran junto al selector principal en móvil y junto a las pestañas desktop.
    - El filtro de estado de **Mis Incapacidades** se muestra junto a sus sub-pestañas.
    - En **Equipo**, el filtro de estado y el selector de departamento se muestran junto al selector principal de pestañas (en móvil y desktop); la opción "Todos los departamentos" se acortó a **"Todos"**.
    - Indicadores celeste/verde de estadísticas: en móvil ocupan la mitad del ancho cada uno (`flex-1`); en desktop son tarjetas fijas compactas (`w-40 h-24`). Ahora muestran también el dato del periodo anterior (`Ant.: X`) para dar más contexto.
  - **Mi Horario (móvil)**: los íconos de incapacidad/tiempo libre en el calendario mensual se reducen aún más (`w-2.5 h-2.5` con icono `w-1.5 h-1.5`) y todos se ubican en la esquina superior derecha para no tapar el número del día.
  - **Ajustes finales en Equipo y Asignar (post-deploy)**:
    - Las tablas de Equipo y Asignar se reconstruyeron con `grid` en lugar de `<table>`.
    - **Móvil**: columna de usuario fija de `96px` (más ancha para no cortar nombres) + **3 días visibles**; el resto con scroll horizontal interno, igualando el ancho al calendario de Mi Horario.
    - **Desktop**: columna de usuario con tamaño normal (`12rem` / `192px`); las 7 columnas de días se muestran completas (`minmax(100px,1fr)`).
    - Se agregó `min-w-0` al grid, celdas y contenedores flex para evitar que el contenido interno fuerce el ancho y desplace toda la pantalla.
    - Los textos de turnos/asignaciones ahora usan `flex-wrap`, `break-words` y tamaño reducido en móvil (`text-[10px] sm:text-xs`).
    - La columna de usuario permanece `sticky left-0` con sombra de separación.
    - Abreviaturas de días en móvil: `L / Ma / Mi / J / V / S / D`.
    - Se agregó `users` a las dependencias de los `useMemo` de `deptUsers` (Equipo/Asignar) y `crossDeptUsers` (Asignar), corrigiendo que el filtro **Todos** los departamentos no mostraba usuarios reales hasta que llegaban asíncronamente de Firestore.
  - **Ajustes finales de filtros y layout (post-deploy)**:
    - **Equipo (desktop)**: el selector de departamento y el navegador de semana (`<` / `Hoy` / `>`) subieron al header principal, a la derecha de las pestañas. En móvil los controles siguen dentro de la pestaña.
    - **Incapacidades (desktop)**: el filtro de estado volvió a ser botones horizontales (`Todas | Pendientes | Verificadas | Registradas | Rechazadas`); solo en móvil se muestra como dropdown.
    - **Incapacidades (móvil)**: dropdown principal de pestañas, sub-pestañas, filtro de estado y selector de departamento ahora están en una sola fila scrollable horizontal.
    - **Mi Horario (móvil)**: íconos de incapacidad/tiempo libre en el calendario mensual tienen más padding (`top-1 right-1`) y tamaño reducido para no tapar el número del día.
    - **Equipo / Asignar (móvil)**: la columna de usuario se reconstruyó sin `display: contents` para que `position: sticky left-0` funcione correctamente al hacer scroll horizontal. Ancho móvil aumentado a `110px` para evitar cortar nombres; desktop sigue en `12rem`.
    - **Solicitudes (móvil)**: los sub-filtros de Cambios (`Recibidas | Enviadas | Historial | Equipo`), el selector de departamento de Equipo y el filtro de estado ahora van junto a las pestañas `Cambios | Solicitudes` en una fila scrollable. Se eliminó el selector de departamento duplicado en el contenido de Equipo.
    - **Indicadores de incapacidades**: tarjetas celeste/verde ahora incluyen `% vs ant.` (Mis Incapacidades) y `Prom.: X días/pers.` (Equipo) para dar más contexto.
  - **Correcciones puntuales solicitadas**:
    - **Equipo / Asignar (móvil)**: el calendario se reescribió con `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>` y `<td>`. La columna de usuario usa `position: sticky left-0` sobre celdas de tabla con ancho fijo (`110px` móvil / `12rem` desktop), lo que la mantiene realmente fija al desplazarse horizontalmente hasta jueves/viernes/sábado.
    - **Solicitudes (móvil)**: los sub-filtros de Cambios (`Recibidas | Enviadas | Historial | Equipo`) y el selector `Mis solicitudes | Equipo` se convirtieron en dropdowns; en desktop siguen siendo botones. El filtro de estado ya era dropdown en móvil y botones en desktop.
    - **Incapacidades (móvil)**: el dropdown principal de pestañas y los dropdowns de estado/departamento van en la primera fila; las sub-pestañas `Mis Incapacidades | Equipo` bajan a una segunda fila. En desktop el filtro de estado sigue siendo botones.
    - **Mi Horario (móvil)**: número del día ajustado a `mt-2`, ícono de esquina reducido a `w-3.5 h-3.5` y badge de incapacidad con fuente `text-[9px]`. El badge usa `break-all` cuando es una sola palabra larga ("enfermedad", "inasistencia") y `break-words` cuando tiene espacio ("Cita médica"), para que se lea completo respetando las palabras. Los badges de turno con texto largo también se muestran en varias líneas (`break-words whitespace-normal`).
    - **Equipo (móvil/tablet) - refactor final del calendario**:
      - Se reemplazó la estructura de `<table>` por un layout de `grid` de dos columnas: columna fija de colaboradores y área scrollable de días.
      - El header cambió de **Usuario** a **Colaborador**.
      - La columna de colaborador queda completamente fija fuera del scroll; los 7 días se muestran en un área interna con `overflow-x-auto`.
      - El ancho del calendario se iguala al de **Mi Horario** (`grid-cols-[110px_1fr]` en móvil, `sm:grid-cols-[12rem_1fr]` en desktop).
      - El header de días y todas las filas de días se desplazan juntos horizontalmente, manteniendo la alineación con la columna fija.
    - **Asignar (móvil/tablet) - mismo refactor del calendario**:
      - Se replicó la estructura de `grid` de dos columnas de **Equipo**.
      - Se mantuvo el drag-and-drop (`DroppableCell`), el doble click para borrador/eliminado, los badges de turno, el bloqueo por tiempo libre aprobado y el resaltado de colaboradores de otros departamentos.
      - `DroppableCell` ahora acepta `className` para ocupar toda la altura de la celda y mejorar el área de drop.
    - **Solicitudes (móvil)**:
      - El header pasó de `flex-nowrap` con scroll horizontal a `flex-wrap`.
      - El dropdown de **Recibidas/Enviadas/Historial** (pestaña **Cambios**) se separó del filtro **Equipo**.
      - El filtro **Equipo** ahora es un botón visible e independiente en móvil.
      - Se reparó el dropdown de **Cambios** agregando `position="popper"`, `z-50` y `min-w-0` al trigger para que se despliegue correctamente.
      - Los dropdowns de **Recibidas/Enviadas/Historial**, selector de departamento de **Equipo** y filtro de estado de **Equipo** ahora usan `w-fit min-w-0` para ajustar su ancho al texto interior.
      - Se reparó el dropdown de **Mis solicitudes | Equipo** y los dropdowns de estado/departamento de **Solicitudes → Solicitudes** agregando `position="popper"` y `z-50` para que se desplieguen correctamente en móvil.
      - En **Incapacidades**, el header se reorganizó en 3 filas tanto en desktop como en móvil: (1) pestañas principales, (2) sub-pestañas **Mis Incapacidades | Equipo**, (3) filtros de estado (y departamento en **Equipo**).
      - En **desktop**, la fila 2 y 3 de **Incapacidades** se unificaron: sub-pestañas + botones de estado para **Mis Incapacidades**; dropdown de departamento + botones de estado para **Equipo**.
      - Se corrigió la duplicación de sub-pestañas **Mis Incapacidades | Equipo** en móvil; la fila unificada ahora es exclusivamente desktop y el móvil conserva solo su bloque de sub-pestañas y filtros.
      - En móvil, los dropdowns de filtros de **Incapacidades** ocupan el ancho completo (`w-full`) y se muestran en fila (`flex-row`): dropdown de estado a la izquierda y dropdown de departamento a la derecha, ambos debajo de las sub-pestañas.
    - **Popup de día en Equipo (móvil)**: el `DialogContent` ahora usa `w-[calc(100%-2rem)] max-w-md mx-auto` para dejar margen izquierdo/derecho y no tocar los bordes de la pantalla.
    - **Expansión de día en Mi Horario**: el calendario ahora agrupa los días por semanas. Al presionar un día, la fila de números de la semana permanece fija y el panel de detalle se muestra debajo de toda la fila, sin recorrer ningún número.
    - **Tarjetas de estadísticas en Incapacidades**: rediseño completo de las tarjetas celeste/verde para aprovechar el espacio, evitar texto aplastado y mostrar la información de forma clara:
      - Icono más grande en la esquina superior, título legible, valor destacado en tamaño grande y unidad explicitada.
      - Datos secundarios (periodo anterior y variación/promedio) en una sección inferior separada por borde.
      - Misma estructura para **Mis Incapacidades** (días mes/año vs anterior) y **Equipo** (personas mes / días año con promedio días/persona).
- **TasksModule**:
  - Inputs de fecha/hora a ancho completo con texto legible.
  - Header de crear tareas con wrap.
  - Pestañas y filtros de tiempo con scroll horizontal controlado.
  - Grid de tareas 1 columna en móvil.
  - Detalle de tarea, departamentos y apoyo en 1 columna en móvil.
  - Foto maximizada de incidencia ajustada al viewport.
  - **Reorganización de filtros**:
    - **Móvil**: los tres dropdowns (pestañas principales, filtro de tiempo, filtro de estado) se muestran en una sola fila.
    - **Desktop**: tres filas separadas — primera fila pestañas principales + filtro de tiempo a la derecha; segunda fila filtros de estado; tercera fila buscador + toggle de vista.
  - **Botones de creación reemplazados por FAB global**: se eliminaron los botones "Tarea Extra", "Tarea Específica" e "Incidencia" del header de Tasks.
  - **Fixes posteriores**:
    - Se eliminó el buscador duplicado que quedó tras el refactor.
    - "Mi Departamento" se abrevió a "Mi Depto" en el dropdown de pestañas de móvil.
    - Los dropdowns de móvil ahora usan `w-fit` para ajustar su ancho al texto de la opción seleccionada y ganar espacio en palabras cortas.
    - **Popup de crear incidencia** rediseñado con secciones visuales: información, departamentos reportados, prioridad y evidencia fotográfica.
    - **Selector de departamento en incidencias** ahora visible también en pantallas pequeñas para usuarios autorizados (Director General, Gerente de Operaciones, RRHH).
- **FAB global (`GlobalFAB`)**:
  - Botón flotante fijo en la esquina inferior derecha, visible en toda la app.
  - Al presionar se despliega con animación mostrando cuatro acciones:
    - **Tarea extra** → navega a `/tasks?create=extra` y abre el modal de creación.
    - **Tarea específica** → navega a `/tasks?create=specific` y abre el modal de creación (solo visible para `DIRECTOR_GENERAL`).
    - **Incidencia** → navega a `/tasks?create=incidencia` y abre el modal de creación.
    - **Feedback** → abre un modal global para enviar sugerencias o reportar problemas.
  - `TasksModule` lee el query param `create` y abre el modal correspondiente automáticamente, luego lo limpia de la URL.
- **Sistema de Feedback**:
  - Modal global con selección de tipo: "Sugerencia" o "Problema".
  - Detecta automáticamente la ubicación del usuario (ruta actual como Dashboard, Tasks, Horarios, Develops, Configuración, etc.).
  - Guarda en la colección `feedback` de Firestore: `userId`, `userName`, `userEmail`, `userRole`, `location`, `fullPath`, `type`, `message`, `status` (`nuevo`) y `createdAt`.
  - Permite complementar la ubicación automática con el mensaje del usuario para dar contexto completo a los desarrolladores.
  - Nuevo panel **Develops → Feedback** para leer, filtrar y gestionar sugerencias/problemas: muestra totales, tipo, estado, ubicación, mensaje y botones para cambiar estado a "En revisión", "Resuelto", "Descartado" o "Reabrir".
- **DevelopsModule**:
  - Tarjetas de módulos, roles, papelera y usuarios con layout apilado en móvil.
  - Modal de usuario usa `max-w-[95vw] sm:max-w-lg`.
  - Stats con tipografía reducida en móvil.
- **TurnosTab**: header y modal responsive; botones del modal apilados en móvil.
- **DepartamentosTab**: formulario y modal de equipo con `max-w-[95vw]`; grids de 2 columnas pasan a 1 en móvil.
- **ProfilePage**: título con `break-words`, badges con `flex-wrap`, tipografía responsive.
- **OnboardingPage**: padding reducido en móvil, select de país más angosto, grids y botones apilados en móvil.
- **Sistema de Tareas Específicas vinculadas a turnos**:
  - Nuevo tipo `SpecificTaskTemplate` y campos `templateId`, `source`, `notifyOnDelay` y `vigenciaDays` en `Task`.
  - Hook `useSpecificTaskTemplates` con CRUD de plantillas y actualización/eliminación de tareas futuras vinculadas.
  - Al publicar asignaciones en **Horarios → Asignar**, `publishAssignments` lee las plantillas activas del turno y genera automáticamente tareas en **Tasks**.
  - Si varios usuarios comparten el mismo turno el mismo día, comparten la misma tarea (`assignedTo` múltiple).
  - Al eliminar una asignación publicada (doble click en **Asignar**), se limpian las tareas específicas pendientes asociadas; si la tarea ya está en progreso/completada/bloqueada, el supervisor debe reasignarla manualmente.
  - Formulario de **Tarea Específica** rediseñado y organizado en secciones visuales:
    - **¿Qué hay que hacer?**: título, descripción y prioridad con botones.
    - **¿Dónde y cuándo se cumple?**: departamento con botones, turno sincronizado con Horarios, hora de inicio con selects de **24 horas** (hora 00-23 + minutos 00/15/30/45), tiempo estimado con **botones rápidos** (15, 30, 45, 60, 90, 120 min) y opción "Otro", y hora límite calculada.
    - **¿Quién controla?**: supervisor automático (supervisor del departamento o gerente) y observadores de control (RRHH y Gerente de Operaciones).
    - **Configuración adicional**: vigencia (30 días, 8/12 semanas, 6 meses, 1 año, 1.5 años, 2 años, indefinido) y opción de requerir foto.
  - **Formulario de Tarea Extra (crear y editar) unificado y rediseñado** con el mismo estilo de secciones:
    - **Información de la tarea**: título, prioridad, descripción, subtareas.
    - **Responsable y Supervisor**: departamento, asignación a usuarios, supervisor.
    - **Programación**: fecha de inicio, hora de inicio con selects de **24 horas**, tiempo estimado con **botones rápidos** y fecha límite calculada.
    - **Requisitos**: foto requerida.
    - **Solicitar Apoyo**: departamento y usuarios de apoyo (solo para roles autorizados).
    - El modal de edición (`EditTaskModal.tsx`) y el modal de creación (`TaskFormModal` en `TasksModule.tsx`) ahora comparten look, colores y patrones de interacción.
  - Sin periodicidad: la tarea se repite automáticamente cada vez que el turno vuelve a ser asignado y publicado.

### Archivos modificados
- `src/components/Layout.tsx`
- `src/components/GlobalFAB.tsx` (nuevo)
- `src/components/SpecificTaskForm.tsx` (nuevo)
- `src/components/modules/HorariosModule.tsx`
- `src/components/modules/TasksModule.tsx`
- `src/components/modules/DevelopsModule.tsx`
- `src/components/modules/TurnosTab.tsx`
- `src/components/modules/DepartamentosTab.tsx`
- `src/components/ProfilePage.tsx`
- `src/components/OnboardingPage.tsx`
- `src/components/Dashboard.tsx`
- `src/hooks/useTasks.tsx`
- `src/hooks/firestore/useSpecificTaskTemplates.ts` (nuevo)
- `src/hooks/firestore/useFirestoreTasks.ts`
- `src/components/EditTaskModal.tsx`
- `src/hooks/firestore/useFirestoreShifts.ts`
- `src/hooks/firestore/ShiftsProvider.tsx`
- `src/hooks/useShifts.tsx`
- `src/types/index.ts`
- `src/components/modules/TurnosTab.tsx`
- `src/hooks/firestore/useSpecificTaskTemplates.ts`
- `src/components/modules/HorariosModule.tsx`
- `src/components/Dashboard.tsx`

### Restricciones respetadas
- No se tocó lógica de negocio, solo clases de Tailwind y estructura de layout.
- No se hizo push a GitHub; solo deploy en Firebase Hosting y commit local.

---

## FASE 7.3: Eliminar datos hardcodeados y fallback a datos estáticos

**Estado:** COMPLETADA

### Objetivo
Dejar la app 100% dependiente de Firebase. Eliminar el uso de datos estáticos de `src/data/` como fuente de verdad o fallback, y migrar todo a lectura/escritura desde Firestore en tiempo real.

### Progreso
- **TasksModule**: se eliminó por completo `staticUsers` de `@/data/users`. Todos los lookups de usuarios en `TaskCard` e `IncidenciaCard` (historial, notas, reporteros, verificadores, visualizadores, fotos) ahora usan `useFirestoreUsers`.
- **HorariosModule**: se eliminó la dependencia de `@/data/shifts`. Los mapeos estáticos `DEPT_SHORT_NAMES` y `DEPT_ICON_KEYS` se reemplazaron por `useDynamicDepartments` (lee `shortName` e `icon` de la colección `departments` en Firestore). `sortShiftsByTime` se movió a `src/lib/utils.ts`.
- **Eliminación de archivos de datos estáticos**: se borraron `src/data/users.ts`, `src/data/tasks.ts`, `src/data/incidencias.ts`, `src/data/shiftAssignments.ts` y `src/data/shifts.ts`; la carpeta `src/data` ya no existe.
- **Auditoría de persistencia local**: no queda ningún uso de `localStorage` ni `sessionStorage` para datos de negocio en `src/`.
- **Build**: `npm run build` pasa limpio sin errores de TypeScript.

### Restricciones respetadas
- No se borraron datos de Firebase.
- No se tocó el modal de "Solicitar Días Libres".
- Sin emojis; solo íconos de `lucide-react`.

### Archivos modificados
- `src/components/modules/TasksModule.tsx`
- `src/components/modules/HorariosModule.tsx`
- `src/hooks/firestore/useDynamicDepartments.ts`
- `src/lib/utils.ts`

### Archivos eliminados
- `src/data/users.ts`
- `src/data/tasks.ts`
- `src/data/incidencias.ts`
- `src/data/shiftAssignments.ts`
- `src/data/shifts.ts`

---

## FASE 7.4: Pulido residual en Tasks, Horarios y UI general

**Estado:** EN PROGRESO

### Objetivo
Corregir los detalles menores que vayan saliendo en Tasks y Horarios después de los rediseños, y ajustes generales de usabilidad que no correspondan a una fase posterior.

### Progreso
- **Selector de minutos en Tarea Específica y Tarea Extra**: ahora permite seleccionar minutos de **00 a 59 de uno en uno**.
- **Generación de tareas específicas al publicar asignaciones**:
  - Se detectó que `useFirestoreShifts.ts` usaba consultas compuestas que fallaban silenciosamente por falta de índices en Firestore.
  - Se simplificaron las consultas a **una sola condición** y se filtra el resto en memoria.
  - Se usa `existingDoc` filtrado en lugar de `existingSnapshot.docs[0]`.
- **Plantillas de tareas específicas**:
  - Nuevo campo `shiftIds` (array) para soportar **múltiples turnos** por plantilla, manteniendo `shiftId` legacy por compatibilidad.
  - UI del formulario con selección múltiple de turnos.
  - Nuevo componente reutilizable `SpecificTaskForm` extraído a `src/components/SpecificTaskForm.tsx`.
  - **Las plantillas se gestionan desde Develops → Departamentos**: al abrir el detalle de un departamento aparece la sección "Plantillas de tareas específicas" con contador de personas asignadas y botones **Editar** / **Eliminar**.
  - El botón flotante de **Tarea específica** en Tasks solo crea plantillas; ya no lista plantillas existentes.
- **Supervisor automático para tareas específicas**:
  - Prioridad 1: supervisor del departamento que tenga alguno de los turnos seleccionados asignado (publicado).
  - Prioridad 2: cualquier supervisor del departamento.
  - Prioridad 3: gerente del departamento.
  - Prioridad 4: Gerente de Operaciones (si el departamento es operativo), RRHH, Director o Director General.
- **Tareas e incidencias visibles para Gerente de Operaciones**:
  - Se agregó `isOperational` a `DynamicDepartment` y helpers `operationalDepartmentCodes` / `isOperationalDepartment`.
  - En Tasks → **Mi Depto**, el Gerente de Operaciones ve tareas de todos los departamentos marcados como operativos.
  - En Tasks → **Incidencias**, el Gerente de Operaciones ve incidencias de departamentos operativos por defecto (`all`).
- **Fix crítico en lookup de tareas por usuario**:
  - `getTasksByUser` en `useTasks.tsx` ahora filtra con `assignedTo?.includes(userId)` porque `assignedTo` es un array. Esto arregla los resúmenes de tasks que aparecían en 0 en Dashboard, Mi Horario y los popups de Equipo.
- **Cálculo de atrasados por fecha local**:
  - `getTaskCounts` (useFirestoreTasks) y `getOverdueTasks` (useTasks) ahora comparan `dueDate` (YYYY-MM-DD) contra la fecha local de hoy, evitando que tareas de hoy se marquen atrasadas por la hora UTC.
- **Dashboard**:
  - Tarjeta **Tasks** sigue mostrando pendientes y atrasados personales con cálculo local.
  - **Resumen del Equipo** ahora usa el departamento del usuario: Total = tasks para hoy + atrasados de otras fechas; Completados = completados hoy; Atrasados = atrasados del departamento.
- **Horarios → Equipo**:
  - Nueva tarjeta "Tasks del equipo" con resumen del departamento del usuario para el día de hoy: total, completados, pendientes, atrasados y barra de progreso calculada entre los integrantes del departamento.
  - Los popups de día y de colaborador ahora cargan correctamente las tareas asignadas gracias al fix de `getTasksByUser`.
- **Incidencias**:
  - Botón **Resolver** ahora requiere que **supervisor Y gerente del departamento reportado** hayan verificado. Si el departamento no tiene uno de esos roles, un superior (Gerente de Operaciones si es operativo, RRHH, Director, Director General) puede cubrirlo.
  - Notas: botón **Guardar** ahora usa `form onSubmit` para funcionar tanto con click como con Enter.
  - Fotos: muestran avatar y nombre del que subió, tanto en la tarjeta como en el historial.
  - Avatares reales en reportero, verificadores y visualizadores.
  - Se eliminó la visualización duplicada de fotos en el formulario de creación (`hidePreview` en `CameraCapture`).
  - Deduplicación defensiva de incidencias y tareas por si hay documentos repetidos en Firestore.
  - Mayor espaciado inferior en botones del modal de crear incidencia.
- **Tareas Extra**:
  - Botón **Guardar** de notas usa `form onSubmit`.
  - Calificación negativa y su historial ahora solo son visibles para usuarios autorizados (nivel ≤ 6, creador o quien calificó), no para staff.
- **Build + Deploy**: `npm run build` limpio y deploy a Firebase Hosting realizado.
- **Commit local**: se hizo commit en `fix-horarios-provider`.

### Fixes de esta ronda (post-deploy anterior)
- **Dashboard: pantalla en blanco para staff/supervisores/gerentes**:
  - Se corrigió el orden de declaración de `todayStr` en `Dashboard.tsx`; la variable se usaba antes de ser definida, causando un crash en blanco para roles que no eran Director General.
- **Dashboard: Resumen del Equipo para Director General**:
  - Cuando el usuario tiene rol `DIRECTOR_GENERAL`, el resumen de equipo muestra **todos los departamentos**; para otros roles sigue filtrando por `user.department`.
- **Subtareas en Tareas Específicas**:
  - Campo `subtasks` agregado a `SpecificTaskTemplate` y a los datos de creación/actualización.
  - UI de subtareas en `SpecificTaskForm` (agregar/eliminar) y en `DepartamentosTab`.
  - `useFirestoreShifts.ts` copia las subtareas al generar la tarea desde una asignación publicada.
  - `updateTemplate` en `useSpecificTaskTemplates.ts` ahora propaga `subtasks` a las tareas futuras pendientes generadas desde la plantilla.
  - `TaskCard` ya bloquea el botón **Completar** mientras haya subtareas sin marcar.
- **Horarios → Equipo: resumen de tasks por departamento seleccionado**:
  - El resumen ya no usa fijo `user.department`; respeta el departamento seleccionado en el dropdown (incluyendo **Todos**).
  - El cálculo ahora es: tareas para **hoy** + **atrasadas de otras fechas** del departamento objetivo.
  - Los contadores muestran Total, Completados (hoy), Pendientes (hoy) y Atrasados.
- **Develops → Turnos: detalle de turno enriquecido**:
  - Cada tarjeta de turno muestra contadores de tareas específicas vinculadas y personas asignadas.
  - Al hacer click en una tarjeta se abre un modal con dos secciones:
    - **Tareas específicas vinculadas**: tabla con título, inicio, duración, supervisor, cantidad de asignados y botones **Editar** / **Eliminar**.
    - **Personas asignadas recientemente**: lista de usuarios con avatar, nombre y fechas de asignación publicadas.
  - Botón **Agregar** en el detalle del turno para crear una nueva tarea específica vinculada directamente a ese turno y departamento.
  - El modal de edición/creación reutiliza `SpecificTaskForm` con supervisor y observadores calculados automáticamente.
- **Cálculo de atrasados corregido**:
  - En **Dashboard → Resumen del Equipo** y **Horarios → Equipo**, el contador **Atrasados** ahora usa la **misma lógica que Tasks**: una tarea es atrasada si `new Date(dueDate + 'T' + (dueTime || '23:59')) < ahora` y su estado no es COMPLETED/VERIFIED.
  - Esto captura tareas de fechas anteriores y tareas de hoy cuya hora límite ya venció (independientemente de si su estado es PENDING, IN_PROGRESS u OVERDUE), alineando el resumen con el contador real de Tasks.
  - Se evita el doble conteo en **Total**: `Total = tareas de hoy + atrasadas de fechas anteriores`; **Atrasados** muestra el total incluyendo las de hoy.
- **Alcance del Resumen del Equipo por rol**:
  - Director General y Director: ven todos los departamentos.
  - RRHH: ve todos los departamentos.
  - Gerente de Operaciones: ve solo los departamentos marcados como operativos en Develops.
  - Resto de roles: sigue viendo solo su departamento.
- **Build + Deploy**: `npm run build` limpio y deploy a Firebase Hosting realizado.
- **Commit local**: se hizo commit en `fix-horarios-provider`.

### Pendiente en esta fase
- Verificar que las tareas específicas se generan correctamente al publicar asignaciones, incluyendo tareas compartidas para múltiples usuarios en el mismo turno/día.
- Validar creación/edición/eliminación de plantillas de tareas específicas desde Develops → Departamentos y desde Develops → Turnos.
- Validar que el botón flotante de Tarea Específica ya no liste plantillas y solo cree.
- Validar supervisor automático y fallback en distintos escenarios.
- Validar requisitos para completar tarea específica (subtareas/foto).
- Validar resúmenes de tasks en Dashboard, Mi Horario y Equipo con el departamento seleccionado.
- Validar que Resolver en incidencias exija verificación de supervisor Y gerente.

### Contenido tentativo adicional
- Ajustes de espaciado, alineación y comportamiento de dropdowns en móvil.
- Correcciones de labels, tooltips o textos confusos.
- Optimizaciones de carga de fotos/avatares.
- Cualquier fix pequeño que surja durante las pruebas.

---

## FASE 7.5: Nuevos módulos operativos

**Estado:** PENDIENTE

### Estructura
Cada módulo nuevo que se defina para WaveOps ocupará su propia sub-fase numerada dentro de la 7.5. Se irán nombrando conforme se vayan definiendo.

- **7.5.1** — Por definir
- **7.5.2** — Por definir
- **7.5.3** — Por definir

### Principios
- Cada sub-fase incluye: diseño de datos en Firestore, UI/UX, reglas de seguridad si aplica, build + deploy + commit.
- Los módulos deben reutilizar los patrones establecidos (usuarios, departamentos, permisos) y no depender de datos estáticos.

---

## FASE 7.6: Cierre y validación de la FASE 7

**Estado:** PENDIENTE

### Objetivo
Validar que toda la FASE 7 esté estable, 100% online y sin datos hardcodeados antes de pasar a la FASE 8.

### Checklist
- Build limpio sin errores de TypeScript.
- Deploy a Firebase Hosting funcionando.
- `MASTER_RESUME.md` actualizado con todas las sub-fases.
- Push a GitHub en `fix-horarios-provider`.

---

## Roadmap de fases pendientes

### FASE 8: Clean login + forgot password
- Quitar texto demo del login.
- Implementar recuperación de contraseña funcional.

### FASE 9: Recordar usuario
- Hacer funcional el checkbox "Recordar usuario".

### FASE 10: 2 módulos reales para Dive X Surf
- Inventario de equipos.
- Certificaciones/buceo.

### FASE 11: Toggle idioma (ES/EN)

### FASE 12: Dark mode

### FASE 13: Landing page waveops.app

### FASE 14: Dominio wveops.app

### FASE 15: Integración IA (futuro)

---

## Comandos útiles

```bash
# Build y deploy
cd ~/waveops && npm run build && npx firebase deploy --only hosting
```
