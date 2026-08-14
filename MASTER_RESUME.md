# WaveOps - Resumen Maestro de Progreso

> Última actualización: 2026-08-14 (refactor 100% online completado)
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
