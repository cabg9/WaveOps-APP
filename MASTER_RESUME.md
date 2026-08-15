# WaveOps - Resumen Maestro de Progreso

> Última actualización: 2026-08-15 (Popup Equipo con margen en móvil + rediseño tarjetas stats Incapacidades; deployado)
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
  - **Dropdowns en móvil**: pestañas principales (Mis Tareas, Mi Departamento, Todas, Incidencias), filtro de tiempo y filtro de estado se muestran como selects en pantallas pequeñas (`md:hidden`), manteniendo los botones en desktop.
  - **Ajustes finales de selects**: los dropdowns de pestaña, periodo y estado ahora se ajustan al contenido y usan el mismo estilo de botón redondeado que Horarios.
- **DevelopsModule**:
  - Tarjetas de módulos, roles, papelera y usuarios con layout apilado en móvil.
  - Modal de usuario usa `max-w-[95vw] sm:max-w-lg`.
  - Stats con tipografía reducida en móvil.
- **TurnosTab**: header y modal responsive; botones del modal apilados en móvil.
- **DepartamentosTab**: formulario y modal de equipo con `max-w-[95vw]`; grids de 2 columnas pasan a 1 en móvil.
- **ProfilePage**: título con `break-words`, badges con `flex-wrap`, tipografía responsive.
- **OnboardingPage**: padding reducido en móvil, select de país más angosto, grids y botones apilados en móvil.

### Archivos modificados
- `src/components/Layout.tsx`
- `src/components/modules/HorariosModule.tsx`
- `src/components/modules/TasksModule.tsx`
- `src/components/modules/DevelopsModule.tsx`
- `src/components/modules/TurnosTab.tsx`
- `src/components/modules/DepartamentosTab.tsx`
- `src/components/ProfilePage.tsx`
- `src/components/OnboardingPage.tsx`

### Restricciones respetadas
- No se tocó lógica de negocio, solo clases de Tailwind y estructura de layout.
- No se hizo push a GitHub; solo deploy en Firebase Hosting y commit local.

---

## FASE 7.3: Eliminar datos hardcodeados y fallback a datos estáticos

**Estado:** EN PROGRESO (HorariosModule limpio; TasksModule pendiente)

### Objetivo
Dejar la app 100% dependiente de Firebase. Eliminar el uso de datos estáticos de `src/data/` como fuente de verdad o fallback, y migrar todo a lectura/escritura desde Firestore en tiempo real.

### Progreso
- **HorariosModule**: se eliminó completamente la importación de `staticUsers` y todos los fallback (`firestoreUsers.length > 0 ? firestoreUsers : staticUsers`). Ahora Equipo, Asignar, Incapacidades y Solicitudes usan exclusivamente los usuarios reales de Firestore.
- **MiHorarioTab**: se agregó lectura de `useFirestoreUsers` para resolver el usuario actual sin depender de `staticUsers`.
- **addIncapacity**: ahora busca el usuario en `firestoreUsers` en lugar de `staticUsers`.
- **Filtro "Todos" los departamentos**: se corrigió la recalculación de listas de usuarios en Equipo/Asignar agregando `users` a las dependencias de `useMemo`, evitando que se mostraran usuarios hardcodeados/fantasma cuando `useFirestoreUsers` aún no había devuelto datos.

### Pendiente
- **TasksModule**: aún usa `staticUsers` en múltiples lugares (creación de tareas, asignación de apoyo, historial, notas, incidencias). Debe migrarse a `firestoreUsers`.
- Auditar `src/data/tasks.ts` e `src/data/incidencias.ts`; eliminar si no se usan o si solo son datos de demo.
- Mantener `src/data/shifts.ts` solo si contiene puras constantes/mapeos (iconos, nombres cortos) y no datos de negocio.
- Verificar que no quede ningún `localStorage`/`sessionStorage` de datos de negocio.
- Hacer build, deploy, commit y push cuando TasksModule también esté limpio.

### Archivos a revisar
- `src/data/users.ts`
- `src/data/tasks.ts`
- `src/data/incidencias.ts`
- `src/data/shiftAssignments.ts`
- `src/components/modules/TasksModule.tsx`
- `src/components/modules/HorariosModule.tsx`

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
