# WaveOps - Resumen Maestro de Progreso

> Última actualización: 2026-08-14
> Branch activo: `fix-horarios-provider`
> Proyecto Firebase: `wve-b3db5`
> Repo: `github.com:cabg9/WaveOps-APP.git`

---

## FASE 7: Sincronizar timeOffRequests con HorariosModule

**Estado:** COMPLETADA

### Funcionalidades entregadas
- Lectura en tiempo real de la colección `timeOffRequests` desde Firestore usando `onSnapshot`.
- Nueva sub-pestaña **Solicitudes → Mis solicitudes**:
  - Vista "Mis solicitudes" para el usuario logueado.
  - Vista "Equipo" para supervisores, RRHH, gerentes y directores.
  - Filtros por estado: Todas, Pendientes, Aprobadas, Rechazadas, Canceladas.
- Acciones disponibles:
  - **Aprobar / Rechazar**: visibles para usuarios con permisos de aprobador, incluyendo auto-aprobar para pruebas (Director General).
  - **Editar**: solo aprobadores; permite modificar tipo, fecha de inicio y fecha de fin.
  - **Cancelar**: visible para el solicitante en sus propias solicitudes pendientes; marca el estado como `cancelada`.
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

### Archivos modificados
- `src/components/modules/HorariosModule.tsx`
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
