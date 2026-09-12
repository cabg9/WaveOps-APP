# Manual de Usuario — WaveOps

> Versión del documento: 1.0 — 12 de septiembre de 2026
> Estado de la app: Fases 1 a 8 completadas + subfases 7.1 a 7.7 en consolidación
> Acceso: https://wve-b3db5.web.app (próximamente waveops.app)

---

## 1. ¿Qué es WaveOps?

WaveOps es una aplicación web de gestión de personal y operaciones, diseñada para empresas de turismo y operaciones como Dive X Surf. Funciona desde cualquier navegador (celular, tablet o computadora) y se instala como app en el dispositivo.

La app centraliza en un solo lugar:

- La asignación y visualización de turnos de trabajo.
- Las tareas del equipo, con evidencia fotográfica y verificación.
- Las solicitudes de días libres, vacaciones e incapacidades, con aprobaciones jerárquicas.
- Las incidencias operativas reportadas por cualquier colaborador.
- Recordatorios personales que se pueden convertir en tareas delegables.
- La administración de usuarios, roles, permisos, departamentos, turnos y posiciones.

**Todo es en tiempo real:** si un gerente publica un turno, el colaborador lo ve de inmediato; si alguien aprueba una solicitud, el solicitante recibe la notificación al momento. La app trabaja 100% en línea conectada a Firebase (base de datos en la nube de Google).

---

## 2. Cómo acceder a la app

### 2.1 Inicio de sesión

1. Entra a la dirección de la app desde tu navegador.
2. Escribe tu correo corporativo y tu contraseña.
3. Si es tu primer ingreso con una invitación, la app te pedirá completar tus datos personales (onboarding) antes de entrar.

### 2.2 ¿Olvidaste tu contraseña?

En la pantalla de inicio de sesión hay un enlace **"¿Olvidaste tu contraseña?"**. Al presionarlo se abre un formulario: escribes tu correo y Firebase te envía un correo con un enlace seguro para restablecerla.

### 2.3 Invitación de nuevos usuarios

Los administradores invitan a nuevos colaboradores desde **Develops → Usuarios → Invitar**. El sistema genera un correo con un enlace de invitación. Si el correo no llega, el enlace se puede copiar y enviar manualmente. Reenviar una invitación invalida automáticamente la anterior.

> **Nota pendiente:** el checkbox "Recordar usuario" existe en la pantalla de login pero aún no guarda el correo (Fase 9 del plan).

---

## 3. Estructura general de la app

### 3.1 Navegación

- **Computadora:** barra lateral izquierda con los íconos de cada módulo. Presionar el logo de WaveOps siempre regresa al Dashboard.
- **Celular/tablet:** menú hamburguesa arriba a la derecha con la lista de módulos.

Los módulos que ves dependen de tu rol y de los permisos que tu empresa haya configurado.

### 3.2 Campana de notificaciones

Arriba a la derecha hay una campana con un globo rojo que muestra cuántas notificaciones no leídas tienes. Al presionarla se abre un panel con el historial de avisos: solicitudes aprobadas o rechazadas, cambios de turno, incapacidades registradas, entre otros. Puedes marcar como leídas una por una o todas.

### 3.3 Botón flotante (FAB)

Es el botón con el signo **+** que aparece en la esquina inferior derecha:

- En **computadora** aparece cuando acercas el mouse a esa esquina y se oculta solo cuando no lo usas.
- En **celular** aparece al deslizar el dedo hacia arriba desde la esquina inferior derecha.

Al presionarlo se abren acciones rápidas:

- **Tarea extra** — crear una tarea delegable al equipo.
- **Tarea específica** — crear una tarea ligada a un turno (solo Director General por ahora).
- **Incidencia** — reportar un problema operativo.
- **Recordatorios** — panel de recordatorios personales.
- **Feedback** — enviar una sugerencia o reportar un problema de la app directamente al equipo de desarrollo.

Si tienes recordatorios vencidos, el FAB muestra un puntito indicador y al abrir Recordatorios verás un globo con la cantidad.

### 3.4 Perfil y configuración

Presionando tu nombre/foto arriba a la derecha accedes a:

- **Perfil:** tu información personal, de contacto, laboral (solo visible y editable por el Director General), salud, contacto de emergencia, certificaciones y datos bancarios.
- **Configuración:** preferencias de la app. Se guardan en la nube y se sincronizan entre todos tus dispositivos.
- **Cerrar sesión.**

---

## 4. Dashboard (Inicio)

Es la pantalla principal tras iniciar sesión. Muestra tarjetas de los módulos con información en vivo:

- **Tarjeta Horarios:** tu turno de hoy (nombre, horario y ubicación). Si no tienes turno asignado muestra "Stand By". Un indicador verde te dice si estás dentro de tu horario laboral. También muestra un contador de solicitudes pendientes que te corresponde aprobar.
- **Tarjeta Tasks:** cuántas tareas tienes pendientes y atrasadas.
- **Resumen del Equipo:** métricas del día del equipo según tu alcance (total de tareas, completadas, pendientes y atrasadas). El alcance depende de tu rol: el Director General, Directores y RRHH ven toda la empresa; el Gerente de Operaciones ve los departamentos operativos; los demás ven su propio departamento.

---

## 5. Tasks (Tareas e Incidencias)

Es el módulo de trabajo diario del equipo. Tiene 4 pestañas principales: **Mis Tareas**, **Mi Depto**, **Todas** e **Incidencias**.

### 5.1 Navegación y filtros

- **Pestañas:** Mis Tareas (lo tuyo), Mi Depto (tu departamento), Todas (según tu jerarquía), Incidencias.
- **Periodo:** Anteriores, Ayer, Hoy, Mañana, Próximas.
- **Estado:** Todas, Pendientes, En Progreso, Completadas, Verificadas, Bloqueadas, Atrasadas.
- **Buscador:** filtra por texto.
- **Vista:** tarjetas o lista (ambas expandibles para ver el detalle completo).
- **Selector de departamento:** para quienes tienen alcance sobre varios departamentos.

En celular, los filtros de pestaña/periodo/estado se muestran como tres listas desplegables en una sola fila.

### 5.2 Tareas

Cada tarjeta de tarea muestra: estado, tipo (extra o específica), título, descripción, prioridad, asignados (fotos), fecha y hora límite (con badge rojo "ATRASADA" si ya venció), subtareas, fotos requeridas y quién supervisa.

**Acciones sobre una tarea:**

- **Completar:** marca la tarea como hecha. Si tiene subtareas pendientes, el botón se bloquea hasta completarlas. Puedes adjuntar fotos como evidencia.
- **Notas:** comentarios de seguimiento. Se guardan con Enter y se cancelan con Escape.
- **Reabrir / Desbloquear:** según permisos.
- **Calificar:** el supervisor puede calificar el trabajo bien o mal; la calificación negativa lleva nota y solo la ven los niveles autorizados.
- **Editar / Eliminar:** según permisos.
- **Verificar:** una tarea completada queda "por verificar" por el supervisor; al verificarla queda cerrada con sello de quién la verificó.

**Historial:** cada tarea guarda quién hizo qué y cuándo (creación, cambios de estado, calificación, notas).

### 5.3 Tareas Extra

Se crean desde el FAB o el módulo. El formulario incluye:

- Título, prioridad, descripción y subtareas (lista de pasos).
- Departamento, asignados y supervisor.
- Fecha y hora de inicio, tiempo estimado (con botones rápidos de 15 a 120 minutos).
- Fecha límite calculada automáticamente.
- Requisito de foto como evidencia.
- Solicitud de apoyo a otro departamento (opcional).

Si no asignas responsables, la tarea queda asignada a ti.

### 5.4 Tareas Específicas

Son tareas ligadas a turnos. Se definen como **plantillas** con: a qué turno(s) aplica, qué hay que hacer, hora de inicio, duración estimada, vigencia (30 días a 2 años o indefinido), subtareas, foto requerida y quién supervisa.

El supervisor se asigna automáticamente siguiendo la jerarquía: primero el supervisor del departamento que tenga el turno publicado; si no, cualquier supervisor del departamento; si no, el gerente del departamento; y como último recurso, Gerencia de Operaciones, RRHH, Dirección o Dirección General.

**Cómo se generan:** al **publicar asignaciones** en Horarios, el sistema crea las tareas específicas para las personas que tienen ese turno ese día. Las personas con el mismo turno comparten la misma tarea. Las plantillas se administran desde **Develops → Departamentos** (sección Plantillas).

### 5.5 Incidencias

Cualquier colaborador puede reportar una incidencia con: departamento(s) afectado(s), prioridad, descripción y fotos.

**Flujo de atención:**

1. Se crea como **Nueva**.
2. El gerente y el supervisor de cada departamento reportado deben **verificarla** (los superiores pueden cubrir un rol faltante).
3. Con ambas verificaciones, se puede **Resolver**.
4. Luego se **Cierra** o se **Reabre** si el problema persiste.

Todo el flujo queda en el historial, con fotos que muestran quién las subió.

---

## 6. Horarios

Es el módulo de planificación de turnos. Tiene 5 pestañas: **Mi Horario**, **Equipo**, **Asignar**, **Solicitudes** e **Incapacidades**.

### 6.1 Mi Horario

- **Tarjeta de hoy:** tu turno, horario, ubicación, e indicador si estás dentro del horario. También aparecen tus tareas del día.
- **Calendario mensual:** inicia en lunes. Los días con incapacidad o tiempo libre aprobado llevan un ícono distintivo.
- **Vista de día expandida:** al tocar un día se expande la semana con el detalle: turno, horario, tareas, tiempo libre o incapacidad.
- **Botón "Solicitar libre":** abre el formulario de días libres (ver 6.4).

### 6.2 Equipo

- Tabla/calendario semanal del equipo: columna de colaboradores y los días de la semana con sus turnos.
- Selector de departamento (según tu jerarquía) y navegación entre semanas.
- Tarjeta **Tasks del equipo:** progreso de tareas del departamento seleccionado (total, completados, pendientes, atrasados y barra de progreso).
- Al presionar un día del encabezado se abre un resumen del día: usuarios libres, múltiples turnos, responsables en turno e incapacidades (una persona incapacitada aparece únicamente en la sección de incapacidades).
- Al presionar un colaborador se abre su vista de calendario y detalle.

### 6.3 Asignar

Solo para roles autorizados. Es el tablero donde se arman los horarios:

- Arrastra turnos desde la barra lateral hacia las celdas de cada colaborador y día.
- Los cambios quedan como **borrador** hasta que se publican.
- **Doble clic** sobre una asignación existente la marca como eliminada: se muestra tachada en gris con un badge rojo (borrador reversible). Segundo doble clic la restaura.
- **Publicar:** aplica todos los borradores (pasan a PUBLICADO) y borra definitivamente las marcadas como eliminadas. Al publicar, se generan automáticamente las tareas específicas vinculadas a los turnos.
- **Bloqueos:** no se puede asignar un turno a alguien con tiempo libre aprobado o incapacidad en ese día.
- Los colaboradores de otros departamentos se resaltan para distinguirlos.

### 6.4 Solicitudes

Tiene dos sub-pestañas: **Cambios** y **Solicitudes** (días libres).

#### Cambios de turno

Los colaboradores pueden solicitar cambios o intercambios de turno entre sí. La tarjeta muestra quién pide, quién recibe, el turno antes y después, y el historial.

- **Recibidas / Enviadas / Historial / Equipo** según qué quieras ver.
- **Aceptar:** ejecuta el intercambio real de turnos en el calendario (queda marcado con el badge "Cambiado").
- **Rechazar** o **Deshacer** (revierte un intercambio ya hecho).
- Todo se guarda en Firestore y genera notificaciones a las partes.

#### Días libres (vacaciones, días libres, etc.)

- **Mis solicitudes:** tu historial completo: pendientes, aprobadas, rechazadas, canceladas y eliminadas. Puedes **cancelar** una solicitud pendiente (queda registrada como cancelada, no se borra).
- **Equipo** (solo aprobadores): solicitudes del equipo con filtro por departamento y por estado.
- **Quién aprueba:** primero el Gerente de tu departamento; si no hay, el Supervisor; si tampoco, el Gerente de Operaciones. RRHH, Dirección y Dirección General siempre pueden aprobar cualquier solicitud.
- Acciones de aprobador: **Aprobar**, **Rechazar** (con motivo), **Editar** (tipo y fechas; tras editar aparece de nuevo el botón Aprobar) y **Eliminar** (borrado lógico que conserva el historial).
- **Historial:** cada tarjeta muestra quién creó, aprobó, rechazó, editó o eliminó, con fecha, hora y motivo (visible solo para aprobadores).
- **Efectos de la aprobación:** los días aparecen como libres/vacaciones en Mi Horario y Equipo, y bloquean la asignación de turnos en Asignar.

### 6.5 Incapacidades

- **Registro:** cualquier colaborador puede registrar una incapacidad con tipo, fechas, duración, descripción, documento adjunto y reemplazo (con distintivo "Apoyo externo").
- **Prioridad:** una incapacidad tiene prioridad sobre cualquier otro estado del día (si estás incapacitado, no apareces como "libre" ni con turno).
- **Equipo:** los aprobadores ven las incapacidades del equipo con acciones **Verificar**, **Registrar** (con reemplazo) y **Rechazar** (con motivo), según los permisos configurados en Develops → Roles.
- **Notificaciones:** al registrar una incapacidad se notifica a los responsables jerárquicos (supervisores/gerentes del departamento; Gerente de Operaciones si es operativo; RRHH, Dirección o Dirección General).

---

## 7. Recordatorios

Es una agenda personal estilo la app Recordatorios de Apple. **Solo tú ves tus recordatorios**, nadie más.

### 7.1 Organización

- **Categorías:** Hoy, Programados, Todos, Indicador, Urgente y Terminados (con contadores).
- **Listas:** General, Proyectos y Seguimiento vienen por defecto; puedes crear, renombrar y eliminar listas. Al eliminar una lista, sus recordatorios pasan a General.
- **Etiquetas (#):** el panel muestra automáticamente tus etiquetas más usadas; presionar una filtra por ella. Categorías, listas y etiquetas son excluyentes entre sí (usas una a la vez).
- **Buscador** por texto.

### 7.2 Crear y editar

Desde **+ Nuevo** se abre un formulario: título, notas, pasos (checklist), fecha y hora, urgente, indicador, prioridad, lista, etiquetas (con sugerencias de las más usadas) y foto. El foco inicia en el título.

### 7.3 Completar

- Presiona el círculo del check: si no hay pasos o todos están completos, el recordatorio pasa a Terminados. Si faltan pasos, la app te avisa.
- **Terminados se limpian automáticamente a los 7 días.**

### 7.4 Convertir en tarea

Un recordatorio puede convertirse en **tarea extra** o **tarea específica** según tus permisos. Al convertir:

- Se pregunta el tipo de tarea.
- Se abre el formulario de tareas con los datos precargados: título, descripción, prioridad, pasos (los completados pasan completados) y foto.
- Al guardar, la tarea aparece en Tasks de las personas asignadas y el recordatorio desaparece de la lista (queda marcado como convertido).

### 7.5 Notificaciones

- Al conceder permiso, el navegador te avisa cuando vence un recordatorio (con sonido).
- El FAB muestra un indicador rojo con la cantidad de vencidos.

---

## 8. Develops (panel de administración)

Es el centro de control de la plataforma. **Acceso exclusivo del Director General** (irrenunciable) y de quienes se autorice explícitamente. En pantallas pequeñas solo se ven las pestañas: Usuarios, Departamentos, Roles, Turnos y Feedback.

### 8.1 General

- Nombre de la empresa, color de marca y logo (se carga por archivo con vista previa).
- **Feature flags:** interruptores para activar o desactivar funcionalidades futuras (Reportes, Órdenes de Pago, Dive Ops, Requisiciones, Movilidad, Vessels, Develops). Cada uno tiene una descripción clara de qué hace encendido y apagado. Hoy los módulos correspondientes aún no están construidos.

### 8.2 Usuarios

- Tarjetas con los totales: Director General, RRHH, Gerente de Operaciones, activos, inactivos e invitaciones pendientes.
- Cada fila se **expande** para ver el perfil completo del usuario (las 7 secciones: personal, contacto, laboral, salud, emergencia, certificaciones y bancarios).
- **Lápiz:** editar (solo Director General puede cambiar datos laborales: rol, departamento, posición, fecha de ingreso, nivel y estado activo).
- **Invitar, reenviar invitación, reactivar, desactivar y eliminar** usuarios.
- **Departamentos visibles adicionales:** se puede dar a un usuario visibilidad sobre departamentos fuera de su jerarquía.

### 8.3 Módulos

Lista de los módulos de la app con su estado (en vivo / en desarrollo), visibilidad y activación. Se puede editar: nombre visible, descripción, color e ícono. El identificador interno y la ruta no se pueden cambiar para proteger la estabilidad de la app.

> No existe opción de crear ni eliminar módulos desde la interfaz: eso se hace directamente con el equipo de desarrollo para evitar daños.

### 8.4 Departamentos

- Vista de **árbol jerárquico** con líneas de conexión: se ve qué departamento es padre de cuál, varios niveles (por ejemplo: Administrativo → Operaciones → Dive Shop).
- Crear y editar departamentos: nombre, descripción, padre (con protección contra ciclos), color, ícono (galería de ~50 íconos corporativos) y estado.
- **Protegidos:** ADMINISTRATIVO y OPERACIONES no se pueden eliminar ni renombrar (son la base de la estructura); solo se les cambia color e ícono.
- No se puede eliminar un departamento que tenga hijos o usuarios activos.
- Popup de equipo, gestión de plantillas de tareas específicas y badges (Padre / Operacional / Inactivo).

### 8.5 Posiciones

Administración de los cargos de la empresa (nombre, nivel, departamento, estado). No se puede eliminar una posición con usuarios asignados. Vista en lista o tarjetas.

### 8.6 Roles

Plantillas de permisos por rol. Cada permiso es un **toggle** con explicación clara de qué permite encendido y apagado. Los cambios **aplican de inmediato** a todos los usuarios del rol y quedan en la auditoría. Grupos incluidos: Tasks, Horarios, Días libres, Incapacidades, Incidencias, entre otros.

### 8.7 Turnos

Administración de los turnos de la empresa, agrupados por departamento. Cada tarjeta muestra horario, color y contadores: tareas específicas vinculadas y personas asignadas recientemente. Desde el detalle se pueden editar turnos, ver las tareas vinculadas y agregar nuevos.

### 8.8 Auditoría

Registro de todo lo que pasa en la plataforma: acciones con su nivel de impacto (críticas, mayores, sensibles, menores), departamentos y usuarios eliminados, y las acciones más frecuentes. Sirve para saber quién hizo qué y cuándo.

### 8.9 Seguridad

Pantalla de políticas de seguridad (longitud de contraseña, requisitos de complejidad, reautenticación). **Importante:** estas políticas aún no están conectadas al funcionamiento real de la app; se programará en una fase futura.

### 8.10 Papelera

Usuarios, turnos y departamentos eliminados se guardan aquí. Se pueden **restaurar** o **eliminar permanentemente**.

### 8.11 Feedback

Panel de gestión de los mensajes enviados desde el FAB: sugerencias y problemas, con su estado (nuevo, en revisión, resuelto, descartado, reabierto), ubicación en la app y datos de quien los envió.

---

## 9. Cómo se conecta todo

La app es un ecosistema integrado. Estas son las conexiones principales:

1. **Turnos → Tareas:** al publicar asignaciones en Horarios, se generan automáticamente las tareas específicas de los turnos publicados.
2. **Tareas → Dashboard y Equipo:** el progreso de tareas se refleja en tu Dashboard y en la tarjeta "Tasks del equipo" de Horarios.
3. **Días libres → Calendarios y Asignación:** una solicitud aprobada bloquea los días en Asignar y los muestra como libres en Mi Horario y Equipo.
4. **Cambios de turno → Calendario:** aceptar un cambio mueve los turnos reales en el calendario de ambos colaboradores.
5. **Incapacidades → Todo el calendario:** una incapacidad tiene prioridad sobre turnos y días libres en todas las vistas.
6. **Recordatorios → Tareas:** un recordatorio personal puede convertirse en tarea delegable con un clic.
7. **Roles y permisos → Toda la app:** los toggles de Develops controlan qué puede hacer cada rol en tiempo real.
8. **Departamentos → Jerarquía:** la estructura de árbol de departamentos define qué ve cada gerente, supervisor o jefe (su departamento y sus sub-departamentos).
9. **Notificaciones → Todas las acciones:** aprobar, rechazar, editar, publicar turnos, registrar incapacidades, vencer recordatorios… todo genera avisos a las personas correctas.
10. **Feedback → Mejora continua:** lo que reportas desde el FAB llega al panel de Develops para darle seguimiento.

---

## 10. Roles y jerarquía

| Nivel | Rol | Alcance típico |
|-------|-----|----------------|
| 1 | Director General | Toda la empresa, acceso total incluido Develops |
| 2 | Director | Toda la empresa |
| 3 | RRHH | Toda la empresa |
| 4 | Gerente de Operaciones | Departamentos operativos |
| 5 | Gerente de Departamento | Su departamento y sub-departamentos |
| 6 | Supervisor | Su departamento y sub-departamentos |
| 7 | Staff | Su propio trabajo |

Los permisos exactos de cada rol se ajustan desde Develops → Roles y aplican en vivo.

---

## 11. Qué está hecho hasta hoy

- **Fases 1–6:** base de la app (login, estructura, módulos iniciales, Firebase).
- **Fase 7 — Solicitudes de días libres sincronizadas con Horarios:** lectura en tiempo real, aprobaciones jerárquicas, historial de acciones, edición, cancelación, bloqueo en Asignar, visibilidad en calendarios, notificaciones.
- **Subfase 7.1 — 100% online:** toda la información vive en Firestore; nada queda guardado solo en el celular.
- **Subfase 7.2 — Responsive:** la app funciona bien en celulares, tablets y computadoras.
- **Subfase 7.3 — Sin datos hardcodeados:** todo (usuarios, tareas, turnos, departamentos) sale de Firebase.
- **Subfase 7.4 — Pulido residual:** supervisor automático, tareas específicas por turno, incidencias con doble verificación, jerarquía de departamentos, intercambio real de turnos. (Validaciones finales en curso.)
- **Subfase 7.5 — Develops estable:** permisos unificados, edición de módulos, posiciones, paleta e íconos corporativos, protección de departamentos base, rediseño completo del panel.
- **Subfase 7.6 — Cierre Fase 7:** build limpio, deploy y validación.
- **Subfase 7.7 — Jerarquía y filtros:** visibilidad de departamentos 100% jerárquica.
- **Fase 8 — Login limpio y recuperación de contraseña:** sin textos de demostración y recuperación funcional por correo.
- **Recordatorios:** completo (listas, etiquetas, conversión a tareas, notificaciones, limpieza automática).
- **Mejoras de agosto–septiembre:** tarjetas de tareas optimizadas para móvil, scroll horizontal eliminado, avatar con foto en toda la app, unificación de perfiles en Develops, entre otras.

---

## 12. Qué falta por hacer (plan)

1. **Cierre de validaciones 7.4 / 7.7** — pruebas finales de tareas específicas y jerarquía con usuarios reales.
2. **Fase 9 — Recordar usuario:** hacer funcional el checkbox del login.
3. **Fase 10 — Módulos reales para Dive X Surf:**
   - Inventario de equipos.
   - Certificaciones de buceo.
4. **Fase 11 — Idioma:** alternar entre español e inglés.
5. **Fase 12 — Modo oscuro.**
6. **Fase 13 — Landing page:** página pública en waveops.app para presentar el producto.
7. **Fase 14 — Dominio propio:** configurar waveops.app como dirección principal.
8. **Fase 15 — Inteligencia artificial** (futuro).
9. **Fase 16 — Revisión profunda de notificaciones:** auditar cada aviso (destinatarios, textos, acciones, push/correo).
10. **Pendientes técnicos registrados:**
    - Conectar las políticas de seguridad de Develops al funcionamiento real (contraseñas, sesiones).
    - Subir el logo de la empresa a Storage.
    - Módulos placeholder por construir: Reportes, Órdenes de Pago, Dive Ops, Requisiciones, Movilidad, Vessels (según feature flags).

---

## 13. Problemas conocidos

- El checkbox "Recordar usuario" del login no guarda el correo todavía.
- Las políticas de seguridad de Develops → Seguridad son visibles pero aún no se aplican al inicio de sesión ni a las sesiones.
- En dispositivos muy pequeños, los textos largos de algunos badges se reducen automáticamente; si algo se ve cortado, reportarlo por Feedback.
- Los recordatorios solo avisan mientras la app o el navegador estén activos (notificaciones web); la integración con las apps nativas de calendario de los dispositivos se evaluará en el futuro.

---

*Documento generado para el equipo de Dive X Surf. Para dudas o reportes, usar el botón Feedback de la app.*
