# WAVE OPS — DOCUMENTO MAESTRO

> Este documento es la **fuente única de verdad** del proyecto Wave Ops.
> Se actualiza en cada sesión. Al finalizar la definición de todos los módulos,
> este documento se convertirá en el **prompt estricto de ejecución para Kimi Code**.
> Usuario sin conocimientos de código: todas las decisiones deben priorizar simplicidad, cero código o low-code.

- Última actualización: 2026-09-16 v32 (validación post-ronda 3: 4 bugs + rediseño módulos-como-tarjetas en Warehouse e Inventario + escáner-centro-de-operaciones → RONDA 4 en 4.23) (validación ronda 2: 6 bugs/ajustes de transferencias y estados de orden detectados → 4.22 ronda 3 · correcciones 1-2 de UX de tarjetas) (RONDA 2 DESPLEGADA en gemela commit 091d1996: 16 correcciones aplicadas — despacho/retorno con QR obligatorio, separación envía/recibe, staff sin montos, precios por rol + escalones + descuentos, módulos por departamento (manual, desde Develops), escáner en conteos arreglado, botones rápidos, formulario adaptado por tipo · pendiente re-prueba del usuario)
- NOTA para Fase 2: la orden de renta cobra por 1 día porque aún no tiene fecha de devolución; al agregarla se multiplica por días (respuestas Guías/Movilidad/Cocina/Activity Ops/Dive Shop, propuesta completa FINANZAS 4.12, Vessels 4.15, Warehouse/Renta 4.16) (causales de cancelación dinámicas, Ventas/CRM ampliado con ventas fuera de Bokun, Mantenimiento = módulo transversal propio, Inventario & Compras confirmados dinámicos) (renombres de módulos + infraestructura de Ubicaciones + QR + conexión RRHH↔Compras & Pagos)
- Estado: RRHH CERRADO ✅ · Ubicaciones (infra transversal) DEFINIDA ✅
- Módulos definidos: RRHH ✅ · Ubicaciones ✅ · 2.6 ✅ · cero-hardcode ✅ · Activity Ops ✅ · Guías 🔄 · Movilidad 🔄 · Cocina 🔄 · Finanzas ✅ · Dive Shop 🔄 · Vessels 🔄 · Warehouse ✅ (cara operativa de Inventario) · Mantenimiento ✅ · Inventario y Compras & Pagos ✅ · Ventas/CRM ✅ concepto (detalle pendiente) · Reportes (detalle pendiente). Renombres aprobados: Requisiciones→Inventario/Requisiciones, Órdenes de Pago→Compras & Pagos
- Módulos pendientes: los que el usuario vaya dando (el manual revela feature flags futuros: Reportes, Órdenes de Pago, Dive Ops, Requisiciones, Movilidad, Vessels)

---

## 1. Visión general del producto

- Nombre: **Wave Ops**
- Empresa operadora de buceo con 35+ personas, 8 departamentos (Dive Shop, Warehouse, Embarcaciones, Ventas, Finanzas, Marketing, Guías, Cocina, Movilidad)
- Jerarquía de la app: Directorio/Gerente Admin-Ops (crean/editan todo) → Gerentes de Depto (asignan personas) → Supervisores (verifican) → Staff (solo sus tareas)
- Principio rector: simple, amigable, económico. Diseño tipo Apple Reminders + Monday.com
- **Nada de Excel como fuente de datos** (decisión del usuario): todo se gestiona dentro de la app; Excel/PDF solo como exportación
- **Multi-tenancy futuro:** la app será multi-tenant (varias empresas/usuarios). Preparación desde ya:
  - Cada entidad nueva llevará `tenant_id` (aislamiento de datos por empresa)
  - Toda configuración de negocio (ratios, reglas de tanques, combustible, ubicaciones, catálogos) es por-tenant
  - Integraciones externas (Bokun, firma, contabilidad) con claves por-tenant
  - Nada de marca o reglas de Dive X Surf hardcodeadas

---

## 2. MÓDULO: RRHH (HHRR)

### 2.0 Conexiones con otros módulos

| Módulo externo | Qué le da a RRHH | Qué recibe de RRHH |
|---|---|---|
| **Tasks** | Datos de tareas completadas/rendimiento del staff | Aviso de ausencias (quién no estará disponible) |
| **Horarios** | Turnos asignados por persona | Asistencia real (clock in/out), vacaciones, libres, ausencias |

### 2.1 Sub-módulos

#### a) Clock in / clock out ✅
- Registro de entrada y salida de colaboradores **y voluntarios** (los voluntarios marcan igual: se contabilizan sus horas de voluntariado)
- **Dos modos de marcación:** (1) kiosco con iPad en cada ubicación (dive shop, warehouse y demás departamentos), (2) celular propio del empleado
- Botón + foto. **La foto se activa solo cuando hay inconsistencias/sospecha** — por ahora se confía en todos
- Contabiliza horas; cruza con Horarios para detectar tardanzas/faltas
- **Offline: fase futura** (los clock in en embarcaciones sin señal son caso real, pero se depara)
- Alimenta: Nóminas, Voluntarios, People Analytics

#### b) Vacaciones, libres y ausencias ✅ (YA EXISTE EN LA APP — verificado en código)
- Flujo actual: cualquier colaborador solicita (Mi Horario → "Solicitar libre" → tipo, fecha inicio/fin) → estado pendiente en Firestore
- Aprobación jerárquica automática: 1) Gerente del departamento del solicitante → 2) si no hay, Supervisor → 3) si no hay, Gerente de Operaciones
- Respaldo total: RRHH, Director y Director General siempre pueden aprobar/rechazar/editar/eliminar cualquier solicitud
- Reglas: Director General puede auto-aprobarse (para pruebas); el solicitante puede cancelar mientras esté pendiente (queda en historial como cancelada); al aprobar, los días se vuelven turnos libres en el calendario y bloquean días en Asignar; cada tarjeta lleva historial de quién creó/aprobó/rechazó con fecha, hora y motivo; notificaciones a aprobadores y RRHH
- **Saldos de vacaciones: empiezan de cero** (la app nace sin datos históricos)

#### c) Onboarding / Offboarding ✅
- Incorporación digital: firma de documentos, asignación de formación, configuración de cuentas
- Salida digital: revocación de accesos, documentación
- **Documentos dinámicos (Q6):** desde RRHH, el gerente o supervisor puede CREAR nuevos tipos de documento y elegir quién debe firmarlos, con tres alcances: **individual / por departamento / toda la empresa**
  - Decisión de arquitectura (recomendada): modelo de "campañas de firma" — RRHH crea el documento (con plantilla), define alcance y vigencia, y el sistema asigna las firmas pendientes automáticamente y persigue con recordatorios hasta que todos firmuen. Nada queda hardcodeado: cualquier documento nuevo se crea desde la app
- **Configuración de cuentas (Q7):** pendiente definir alcance — se explicó con ejemplos en chat; usuario confirma si basta con acceso a Wave Ops o también otros sistemas
- Usa: Firma avanzada, Notificaciones

#### d) Voluntarios ✅
- Acuerdos firmados (usa Firma avanzada), cumplimiento, estadísticas, control de beneficios
- **Reglas del programa:** máximo 6 horas/día y 5 días/semana; duraciones de 3 a 18 meses
- **1 día de buceo = 2 inmersiones** (ej. 16 inmersiones = 8 días de buceo)
- Las horas de voluntariado salen del Clock in/out (mismas reglas que staff)

**Plan de beneficios — Voluntarios LOCales (según meses de permanencia):**
| Permanencia | Beneficio |
|---|---|
| 2 meses | 10 inmersiones (5 días de buceo) |
| 3 meses | 16 inmersiones (8 días de buceo) |
| 4 meses | Curso + licencia PADI Open Water (e-learning, instructor, equipo, piscina/aguas confinadas, 4 inmersiones en mar, certificación digital, transporte, snacks) |
| ~6 meses | Open Water Advanced (5 Adventure Dives: Deep obligatoria 30m + Navigation obligatoria, e-learning, instructor, equipo, certificación digital, transporte, snacks) |
| ~7–8 meses | Emergency First Response (EFR: primeros auxilios, manual, videos, maniquí CPR, simulaciones, certificación) + Rescue Diver (rescates, simulaciones, manejo de estrés, mar abierto x2 días) |
| previo a DM | Buceos previos Dive Master (mínimo 60 inmersiones acumuladas) |
| 15–18 meses | Curso Dive Master |
⚠️ Mapeo exacto mes-a-mes por confirmar contra el Excel original (hay celdas combinadas).
⚠️ Pendiente: ¿existe plan para voluntarios INTERNACIONales? (la app será bilingüe)

**Inversión de la empresa por voluntario (para People Analytics / ROI):**
| Concepto | Costo unitario | Cantidad | Total | Tiempo |
|---|---|---|---|---|
| Buceo | $190 | 8 días | $1,520 | 8 días |
| Licencia Open Water | $1,500 | 1 | $1,500 | 4 días |
| Licencia OW Advanced | $1,400 | 1 | $1,400 | 2 días |
| EFR | $500 | 1 | $500 | 1 día |
| Rescue Diver | $1,000 | 1 | $1,000 | 4 días |
| Buceos previos DM (60 inmersiones) | $190 | 30 días | $5,700 | 30 días |
| Dive Master | $4,500 | 1 | $4,500 | 60 días |
| **Total** | | | **$14,600** | **109 días** |

- El beneficio se otorga como saldo y se descuenta al canjear; quien registra el canje: pendiente confirmar (propuesta: el departamento que entrega el beneficio marca el canje y RRHH verifica)

#### e) Reclutamiento ✅
- Hoy llegan por recomendación; **se creará un formulario público para la página web**: el candidato carga sus datos y aparece directamente en el pipeline del módulo
- Vacantes, selección y seguimiento de candidatos por etapas
- Al contratar → pasa automáticamente a Onboarding

#### f) Nóminas ✅ (parcial — se completa con módulos de finanzas)
- **Requiere integración con sistema contable** (cuál: pendiente, se definirá con el módulo de Finanzas)
- Moneda: USD (Ecuador)
- **Modelos de pago mixtos:**
  - Por salida: guías/internos de buceo se pagan según cantidad de salidas (cada salida tiene un valor fijo); instructores de surf igual
  - Mensual fijo: gerentes y la mayoría del equipo
  - Pago inmediato a externos (guía/instructor/taxi externo): se paga en el momento pero requiere **solicitud de pago** generada desde el módulo correspondiente (pendiente de definir con los otros módulos)
- Horas desde Clock in/out; ajustes por ausencias; adelantos salariales

#### g) Licencias y permisos ✅
- **El usuario sube sus propios documentos** (foto + campos digitalizados); **RRHH verifica**
- No solo certificaciones de buceo: licencias, matrículas, identificaciones, licencias de conducir — para guías, instructores, conductores y cualquier rol
- **Tipos de licencia creados dinámicamente desde la app:** RRHH crea "PADI Open Water" → define a qué roles aplica (ej. guías) → define campos y vencimiento → queda disponible para asignar a usuarios. Botón "agregar documento" para crear cualquier tipo nuevo sin depender del sistema
- Vigila vencimientos y dispara alertas antes de la caducidad (usa Motor de notificaciones)
- Todo queda unificado en el perfil del usuario

#### h) Evaluación de desempeño ⚠️ (definición en curso)
- Objetivos, feedback continuo, evaluación 360°, seguimiento
- Se nutre del desempeño real en Tasks (tareas completadas a tiempo, verificaciones con novedad, etc.)
- Usuario pidió ejemplos para decidir alcance — ver ejemplos en chat / sección de preguntas abiertas

### 2.2 Servicios transversales (los usa RRHH entero; posiblemente otros módulos futuros)

#### s1) Firma avanzada ✅
- Tres modos de firma: **(1) dibujada con el dedo/lápiz**, **(2) firma simple registrada** (nombre + fecha/hora + IP/registro), **(3) firma electrónica certificada** con proveedor externo
- Contratos y documentos corporativos con validez legal, envío por mail + recordatorios automáticos
- La usan: Onboarding, Voluntarios, Reclutamiento, Nóminas
- Proveedor de firma certificada en Ecuador: decidir en fase de ejecución

#### s2) Motor de notificaciones
- Recordatorios de vencimientos de licencias, firmas pendientes, ausencias próximas, caducidades
- Un solo sistema de avisos para toda la app

### 2.3 Capa de análisis

#### People Analytics
- Gráficos para el gerente: asistencia, horas, desempeño, rotación, tendencias, retención, prevención de burnout
- Datos extra nuevos: ROI de voluntarios (inversión $14,600/voluntario vs horas aportadas), horas de voluntariado, costo por beneficios canjeados
- Se alimenta de: Clock in/out, Tasks, Evaluación, Ausencias, Voluntarios

### 2.3.1 Recomendaciones del experto — ✅ TODAS ACEPTADAS (2026-09-12)

**Todas entran al módulo RRHH:**
1. **Legajo digital + historial laboral** — timeline por empleado: contratos, cambios de rol/departamento, documentos firmados, altas y bajas. Los datos ya existen; solo se ordenan en una vista. (RECOMENDACIÓN ALTA)
2. **Alertas de vencimiento de contratos laborales y fin de período de prueba** — igual que las licencias pero para el contrato: nadie se entera de que un contrato venció hasta que pasa. (RECOMENDACIÓN ALTA)
3. **Tipos de permiso adicionales** — hoy existen días libres/vacaciones/incapacidades; faltarían permisos con/sin goce (maternidad, paternidad, estudios, emergencia, duelo) con su propio flujo de aprobación. (MEDIA)
4. **Bandeja única de pendientes RRHH** — una sola pantalla con todo lo que espera acción de RRHH: solicitudes, licencias por verificar, firmas pendientes, contratos por vencer. (MEDIA)
5. **Directorio de personal** — buscador de empleados con foto, rol, departamento, contacto y estado (activo/vacaciones). (BAJA, casi gratis con los datos existentes)
6. **Exportar reportes** — asistencia, horas y nómina a Excel/PDF con un clic. (MEDIA)

### 2.4 Decisionses de arquitectura tomadas
1. Firma avanzada y Notificaciones NO son módulos sueltos: son servicios transversales compartidos
2. People Analytics es capa superior, no módulo de datos propios
3. Clock in/out es el motor central del tiempo (una sola fuente de horas para nóminas, voluntarios y analytics)
4. Perfil de empleado único y unificado (licencias, documentos, beneficios viven ahí)
5. **⚡ PRINCIPIO RECTOR ABSOLUTO — "TODO ES DATO, NADA HARDCODEADO" (clarificado por el usuario):** ningún control, prueba, licencia, tipo o categoría queda programado en código. Todo tipo de control imaginable se crea como REGISTRO dentro de la app por usuarios autorizados. Ejemplo aplicado: la prueba hidrostática de tanques NO es una función fija — es un registro creado por el usuario (nombre, a qué aplica, vigencia, campos, alertas, quién debe tenerlo). Mañana se puede crear "extintores", "manipulación de alimentos", "mantenimiento de lancha", etc. sin tocar código.
6. **Patrón "Bandeja transversal":** cuando un concepto vive en varios módulos (mantenimiento, pagos, pendientes RRHH), se crea UN módulo visual que lo une sin duplicar datos. Aplicado a: Mantenimiento (correctivo+preventivo de todos los activos), Rol de Pagos, bandeja RRHH.
7. **Patrón "Catálogo dinámico de controles":** un único motor configurable que cubre controles de PERSONAS (licencias, cursos, certificados), EQUIPOS (tanques: hidrostática/VIP, reguladores, computadoras), VEHÍCULOS/EMBARCACIONES (mantenimientos, matrículas) y UBICACIONES (extintores, permisos). Cada tipo de control = registro con: nombre · aplica a (roles/personas/equipos/ubicaciones) · vigencia/frecuencia · campos personalizados + foto · regla de alerta (días antes) · obligatorio u opcional · responsable de verificar. Se reutiliza el mismo diseño ya aprobado para Licencias.

---

## 3. RESPUESTAS REGISTRADAS (sesión 2026-09-12)

**A. Clock in/out** — Q1: ambos, iPad por ubicación + celular. Q2: botón + foto (foto solo ante inconsistencias). Q3: voluntarios igual que staff.
**B. Ausencias** — Q4: flujo jerárquico YA implementado (ver 2.1b). Q5: saldos desde cero.
**C. Onboarding** — Q6: ✅ APROBADO — documentos dinámicos con alcance individual/depto/empresa (ver 2.1c). Q7: sigue abierta — se explicó con ejemplo detallado en chat (caso "María"); usuario confirma alcance.
**D. Voluntarios** — Q8: plan de beneficios por meses (tabla en 2.1d), 1 día buceo = 2 inmersiones. Q9: máx 6h/día, 5 días/semana, 3–18 meses.
**E. Reclutamiento** — Q10: hoy recomendación; formulario público web que alimenta el pipeline.
**F. Nóminas** — Q11: integración con sistema contable (pendiente cuál); pagos por salida (guías buceo/surf), mensual fijo (gerentes/mayoría), pago inmediato a externos vía solicitud desde módulo correspondiente (pendiente).
**G. Licencias** — Q12: usuario sube docs+foto, RRHH verifica; tipos creados dinámicamente por rol; alertas de vencimiento.
**H. Evaluación** — Q13: ✅ OPCIÓN C COMPLETA — objetivos + feedback continuo + 360° + métricas automáticas desde Tasks (tareas a tiempo, calificaciones, verificaciones con novedad, horas).
**I. Firma** — Q14: ambas + campo de dibujar firma.
**J. General** — Q15: offline sí, fase futura. Q16: español + inglés, al final del proyecto.

## 3.1 PREGUNTAS ABIERTAS (nueva ronda)

- N1 (Q7): ¿Configurar cuentas = solo acceso a Wave Ops, o también otros sistemas? Se dieron ejemplos en chat; usuario confirma.
- N2 (Q13): ¿Qué modelo de evaluación prefieres? Ejemplos dados en chat (opciones A/B/C).
- N3: ¿Existe plan de beneficios para voluntarios INTERNACIONALES o aplica solo el de locales?
- N4: ¿Quién registra el canje de un beneficio (ej. día de buceo usado)? Propuesta: quien entrega el beneficio marca el canje; RRHH verifica.
- N5: ¿Qué sistema contable usan (o usarán)? Se define con el módulo de Finanzas.
- N6: Mapeo exacto mes-a-mes de la tabla de beneficios (celdas combinadas en el Excel) — confirmar contra el archivo original.

**Respuestas del usuario:**
- N1 (Q7): ✅ CONFIRMADO — Nivel 1 (alta automática en WaveOps) + Nivel 2 (checklist de entregas). Arquitectura preparada para evolucionar a Nivel 3 (conexiones automáticas con otros sistemas) en el futuro.
- N2 (Q13): ✅ Opción C completa.
- N3: ✅ Por el momento el plan de beneficios aplica a AMBOS: voluntarios locales e internacionales.
- N4: ✅ El SISTEMA marca automáticamente el canje del beneficio; RRHH lo verifica.


---

## 3.2 ESTADO ACTUAL DE WAVEOPS (según manual oficial — esto YA EXISTE)

**Arquitectura:** app web (navegador, instalable como PWA) + Firebase/Firestore 100% online, tiempo real. Hosting: waveops.app (dominio propio pendiente, Fase 14).

**Módulos existentes hoy:**
| Módulo | Estado | Notas clave para RRHH |
|---|---|---|
| Dashboard | ✅ En vivo | Tarjetas Horarios/Tasks, resumen del equipo según jerarquía |
| Tasks | ✅ En vivo | 4 pestañas, estados, calificación por supervisor, historial, tareas extra/específicas, incidencias con doble verificación |
| Horarios | ✅ En vivo | 5 pestañas (Mi Horario, Equipo, Asignar, Solicitudes, Incapacidades). Publicar turnos genera tareas específicas automáticamente |
| Recordatorios | ✅ En vivo | Agenda personal estilo Apple, conversión a tareas |
| Develops | ✅ En vivo | Panel admin: usuarios, departamentos (árbol), roles (toggles en vivo), turnos, auditoría, papelera, feedback, feature flags |

**Roles existentes (niveles 1–7):** Director General > Director > RRHH > Gerente de Operaciones > Gerente de Depto > Supervisor > Staff. El rol RRHH YA EXISTE como nivel 3 (visión de toda la empresa).

**Datos del perfil de usuario (7 secciones, ya existen):** personal, contacto, laboral (solo editable por Director General), salud, contacto de emergencia, **certificaciones**, **datos bancarios**. → La sección "certificaciones" existente será EXTENDIDA por el módulo de Licencias (no duplicar: el perfil actual es la base).

**Onboarding parcial ya existente:** al aceptar una invitación, el usuario completa sus datos personales antes de entrar. El módulo RRHH de onboarding lo extiende (documentos, formación, cuentas, offboarding).

**Feature flags ya creados en Develops (roadmap revelado):** Reportes, Órdenes de Pago, Dive Ops, Requisiciones, Movilidad, Vessels. → Órdenes de Pago conectará con Nóminas (pagos a externos). Los demás serán los próximos módulos que el usuario definirá.

**Solicitudes de días libres:** ya implementadas (flujo descrito en 2.1b) — RRHH las REUTILIZA, no las reconstruye.

**Plan de fases conocido:** Fase 9 recordar usuario, Fase 10 módulos Dive X Surf (inventario, certificaciones), Fase 11 idioma ES/EN, Fase 12 modo oscuro, Fase 13 landing, Fase 15 IA, Fase 16 revisión de notificaciones.

**Problemas conocidos relevantes:** notificaciones solo con app/navegador activos; políticas de seguridad aún no aplicadas; "recordar usuario" no funcional.


---

## 2.5 INFRAESTRUCTURA TRANSVERSAL: UBICACIONES (Locations)

> **Regla crítica del usuario:** las ubicaciones NUNCA van hardcodeadas. Develops es la fuente única de verdad. Los módulos solo consultan.

### 2.5.1 Renombres de módulos (decisión segura)
| Flag actual (identificador interno) | Nombre visible nuevo |
|---|---|
| `requisiciones` (interno, NO cambiar) | **Inventario / Requisiciones** |
| `ordenes_pago` (interno, NO cambiar) | **Compras & Pagos** |

**¿Daña el código? NO.** Develops ya separa nombre visible (editable) de identificador interno y ruta (protegidos). El rename es solo de presentación. Regla para Kimi Code: cambiar `displayName`/`description`/`icon`, jamás el `id` ni la ruta.

### 2.5.2 Nueva pestaña en Develops: Ubicaciones
Desde ahí se crean/editan/activan/desactivan/eliminan ubicaciones. Campos:
`location_id, location_name, location_type, location_group, country, city, province_or_state, address, responsible_user_id, related_department_id, related_module, flags (is_storage/is_administrative/is_operational/is_external), status (active/inactive), created_at, updated_at, created_by, notes`

**Entidad 2 — Location Groups:** `location_group_id, group_name, description, status, timestamps`. Grupos iniciales: Compras & Pagos · Almacenaje · Operación · Externos.
**Entidad 3 — Location Types:** `location_type_id, type_name, description, allowed_modules, status`. Tipos iniciales: Administrativa · Almacenaje · Operativa · Externa.

### 2.5.3 Ubicaciones semilla (configurables, NO hardcodeadas)
| Ubicación | Tipo | Grupo |
|---|---|---|
| Quito | Administrativa | Compras & Pagos |
| Guayaquil | Administrativa | Compras & Pagos |
| The Warehouse | Almacenaje | Almacenaje |
| Dive Shop | Operativa | Operación |
| Embarcaciones / Movilidad (ubicaciones operativas) | Operativa | Operación |
| Proveedores (Quito/Gye/taller/muelle/aeropuerto/transportista) | Externa | Externos |

Futuras: Panamá, Manta, Cuenca, Miami, bodegas por embarcación/auto/depto, The Body, The Main House, The Pub, The TRVL Agency, Lumen Hub.

### 2.5.4 Reglas de comportamiento
1. Al desactivar una ubicación: desaparece de selectores nuevos, se mantiene en historial/reportes
2. Grupos y tipos también son editables (agregar/quitar ubicaciones sin rehacer nada)
3. Cada ubicación puede tener responsable (usuario + departamento)
4. Impacto por módulo:
   - **Inventario / Requisiciones:** stock por ubicación (ej. Cloro 20 galones en The Warehouse; papel higiénico 6 u en Dive Shop), transferencias entre ubicaciones, requisiciones entre ubicaciones
   - **Compras & Pagos:** compra asociada a ubicación administrativa (Quito/Gye), proveedor, centro de costo, depto solicitante, ubicación de envío y recepción; compras nacionales, coordinación de envíos, autorizaciones
5. Preparado para asociar futuras ubicaciones a Vessels, Movilidad, Dive Shop, etc.

### 2.5.5 Impacto en fases (para el plan de desarrollo)
- Fase 2 (base de datos): tablas locations, location_groups, location_types + relaciones + activo/inactivo + historial
- Fase 3 (roles): quién crea/edita/desactiva/asinga ubicaciones (propuesta: Director General + Gerente Admin/Ops crean/editan; desactivar solo DG/Admin)
- Compras & Pagos: selectores de ubicación administrativa, origen, destino de envío
- Inventario / Requisiciones: stock por ubicación, transferencias, requisiciones
- Fase 12 (preparación futura): nuevas ubicaciones sin perder historial, asociación con Vessels/Mobility/etc.

### 2.5.6 QR en inventario — ✅ RECOMENDACIÓN ACEPTADA (propuesta del usuario)
- Cada **producto** lleva un QR impreso (etiqueta adhesiva) que al escanearlo con cualquier celular abre su ficha: stock actual por ubicación, registrar entrada/salida/conteo, ver historial
- Cada **ubicación/bodega/estante** lleva su propio QR: escanearlo abre el inventario de esa ubicación para conteos rápidos
- Ventaja: cero hardware especial, cualquier teléfono escanea, las etiquetas se reimprimen gratis. En Kimi Code pedir generación de QR por ítem/ubicación + flujo móvil de escaneo.

### 2.5.7 Conexión Compras & Pagos ↔ RRHH (rol de pagos automático)
- **Rol de pagos:** lista consolidada de todo lo que se debe pagar en un período
- **Sí entran al rol:** pagos a personal/externos generados por RRHH — guías externos (por salida de buceo), instructores externos, taxis/servicios externos aprobados en su módulo origen
- **NO entran:** pagos de materia prima, productos para bodega ni compras de inventario (eso vive solo en Compras & Pagos como órdenes de compra/pago a proveedores)
- Flujo: RRHH Nóminas calcula → genera ítems de pago → llegan al Rol de Pagos en Compras & Pagos → se ejecutan/marcan pagados → se devuelve el estado a RRHH
- Concepto clave: **dos canales separados** (compras de inventario vs pagos de personal) que comparten el "rol de pagos" como bandeja de ejecución

---

## 2.6 REVISIÓN PROFUNDA — RECOMENDACIONES DEL EXPERTO (2026-09-12) — ✅ TODAS ACEPTADAS

Prioridad: **P1** = definir antes de construir (barato ahora, caro después) · **P2** = construir pronto · **P3** = fase futura
*(2026-09-12: el usuario aceptó todas las recomendaciones de esta sección)*

### A. Inventario / Requisiciones
1. **Direccionamiento interno de bodega** (P1): ubicaciones hijas tipo pasillo/estante/nivel (ej. WH-01-A-03). Sin esto, el QR no sabe dónde está el producto dentro de The Warehouse.
2. **Unidad de medida por producto + conversión** (P1): cloro en galones/litros, cada producto define su UoM.
3. **Kardex (bitácora de movimientos)** (P1): cada entrada/salida/ajuste queda registrado con usuario, fecha y motivo. Base de toda auditoría de inventario.
4. **Stock en tránsito** (P1): las transferencias entre ubicaciones tienen estados (pendiente → en tránsito → recibido). Sin esto, el stock "desaparece" mientras viaja en barco entre islas.
5. **Mínimos/máximos + punto de reorden** (P2): cuando el stock baja del mínimo, el sistema sugiere la requisición automáticamente.
6. **Lotes y vencimientos (FEFO)** (P2): químicos, snacks, primeros auxilios — sale primero lo que vence primero, con alertas de caducidad.
7. **Números de serie para equipo de valor** (P2): reguladores, computadoras de buceo. **Tanques: registro de pruebas hidrostáticas/VIP con fechas** (obligatorio en buceo) — vive aquí o en mantenimiento.
8. **Conteos cíclicos con QR** (P2): conteos programados por ubicación, ciegos (sin mostrar stock esperado) y ajustes con aprobación.

### B. Compras & Pagos
1. **Flujo de aprobación por montos** (P1): cadena de autorización según valor (ej. <$200 gerente depto, <$1000 gerente ops, >$1000 directorio). Sin esto, cualquiera aprueba cualquier gasto.
2. **Proveedores como catálogo maestro** (P1): entidad con RUC, datos bancarios, condiciones, estado. Vive en Develops (patrón Departamentos/Turnos), no hardcodeada.
3. **Tres coincidencias** (P2): pagar solo cuando coinciden orden de compra + recepción + factura.
4. **Presupuestos por departamento/centro de costo** (P2): la compra se valida contra presupuesto disponible y avisa si lo supera.
5. **Datos fiscales Ecuador** (P2): n° de factura, retención fuente/IVA, comprobantes. Regla: WaveOps guarda los datos y exporta; el cálculo tributario final lo hace el sistema contable (N5).
6. **Rol de pagos con estados** (P1): programar fecha de pago, pendiente → aprobado → pagado, comprobante adjunto, correlativo de numeración.
7. **Anticipos a proveedores** (P3).
8. **Nómina ecuatoriana** (P1, con RRHH): IESS (9.45% personal / 11.15% patronal), décimo tercero, décimo cuarto, fondos de reserva, vacaciones — como parámetros editables (porcentajes no hardcodeados), exportando al contable.

### C. RRHH (profundización)
1. **Privacidad y ley de datos Ecuador** (P1): consentimiento de tratamiento de datos firmado (Ley Orgánica de Protección de Datos 2021); reglas de acceso a datos sensibles (salud, bancarios, salarios) a nivel de base de datos, no solo de pantalla.
2. **Contratos laborales** (P1): tipo (indefinido/temporal), salario, vigencia y renovación — ya alertas de vencimiento (recomendación 2 aceptada).
3. **Horas extra automáticas** (P2): el clock cruza con el horario; si marca más allá de tolerancia, genera hora extra para aprobación.
4. **Registro de asistencia = obligación legal** (P1): exportable para IESS/Ministerio de Trabajo (pueden pedirlo en inspección).
5. **Plantillas de onboarding por rol/depto** (P2): la checklist de María se pre-configura por posición, no se arma de cero.
6. **Offboarding Ecuador** (P2): checklist de salida + **finiquito firmado digitalmente** + entrevista de salida.
7. **Anonimato del 360°** (P1): mínimo 3 evaluadores para proteger identidad; sin esto la gente no responde con honestidad.
8. **Métricas concretas de People Analytics** (P1 definir): rotación, ausentismo %, horas extra, tiempo de contratación, costo por contratación, eNPS pulso; alerta automática si alguien supera X horas extra/semana (burnout).
9. **Voluntarios → empleados** (P2): pipeline directo voluntario evaluado → reclutamiento → onboarding.
10. **Constancia/certificado de voluntariado** auto-generada con firma digital al finalizar (P2).
11. **Saldo de beneficios con vencimiento** (P2): los días de buceo no usados caducan al terminar el voluntariado.
12. **WhatsApp como canal** (P3): en Ecuador es el canal real; mail + push primero.

### D. Arquitectura transversal
1. **Orden de construcción** (P1): Ubicaciones y catálogos maestros (Proveedores, Productos, Centros de Costo en Develops) ANTES de Inventario/Compras — son el piso de la casa.
2. **Centros de costo como entidad** (P1): el usuario ya los mencionó; deben ser catálogo en Develops, relacionados con departamentos.
3. **Correlativos/numeración** (P1): órdenes de compra, roles de pago y comprobantes llevan numeración secuencial (requerido en Ecuador).
4. **i18n desde ahora** (P1 barato, P3 caro): las pantallas nuevas deben usar claves de traducción ES/EN desde el día 1 (Fase 11 será gratis en vez de rehacer todo).
5. **Reglas de Storage** (P2): adjuntos (fotos, documentos) con límites, carpetas por entidad y permisos.
6. **Catálogo maestro de productos** (P1): productos creados en Develops o en Inventario-admin con categorías, UoM, mínimos — nunca texto libre en las requisiciones.
7. **Dependencia de módulos** (P1): mapa de qué módulo necesita cuál antes de arrancar (Ubicaciones → Inventario → Compras; RRHH Nóminas → Compras Rol de Pagos).

---

## 4. MÓDULO: DIVE OPS (borrador enriquecido — el usuario irá completando)

> Módulo central de la operación de buceo. Conectado a Bokun (sistema de reservas). El usuario advirtió: "faltan más ideas, poco a poco las completamos".

### 4.1 Pizarra de salidas (Trip board)
- Cada salida sincronizada desde **Bokun**: destino, cantidad de pasajeros, tipos (buzo certificado con su nivel de certificación, DSD, snorkeler), n° de buceos y fecha del último buceo
- **Solicitar cambio de destino/itinerario** (flujo con aprobación — ¿quién aprueba? pendiente)
- Estado general de la salida: barra de preparación (tipo Monday.com) con checklist en vivo
- Fallback: si Bokun falla o no hay señal, carga manual de la salida (mismo formulario) — nada queda bloqueado

### 4.2 Grupos y ratios (todo configurable, regla #5)
- Armado de grupos de buceo: máx. **12 pax por embarcación** entre los 3 tipos de grupo
- **Ratios guía:pax modificables** (default 1:4), difieren por grupo según: conocimiento, cantidad de buceos, licencias y tipo de pax
- Reglas de agrupamiento como REGISTROS configurables (ej. "DSD siempre con instructor, máx 2:1", "buzo sin buceo en 12+ meses → refresher obligatorio")

### 4.3 Tripulación
- Cálculo automático de guías necesarios según ratios + selección desde la **base de datos de guías** (RRHH)
- Asignación y estados: ¿ya tenemos **guías**? ¿**capitán**? ¿**marinero**? ¿**extra crew / voluntarios** (cantidad)?
- Al asignar, la app valida: disponibilidad en Horarios (no vacaciones/incapacidad) + **licencias vigentes** (vía Catálogo Dinámico de Controles — guía sin licencia válida no asignable)

### 4.4 Logística de la salida
- **Tanques:** cálculo por reglas configurables (ej. DSD = 1 tanque; si compró 2do tanque → 2; siempre + tanques de emergencia). Cantidad final se envía a warehouse
- **Equipos:** vista de estado de requisiciones de equipo (¿empacado? — control informativo desde Inventario/Requisiciones)
- **Waivers:** indicador informativo de qué pasajeros han llenado waiver (desde Bokun/formulario)
- **Combustible:** la app calcula consumo por salida con fórmula configurable por embarcación (millas náuticas del itinerario × consumo + reserva) → genera **orden de compra de combustible** hacia Compras & Pagos
- **Comida:** orden de comida para pasajeros + tripulación (hacia Compras & Pagos / Cocina)
- **Transporte:** coordinación de taxis/transporte (compartido con módulo **Movilidad**)

### 4.5 Formulario maestro de salida
- Un solo formulario que concentra: licencias del equipo, comida, tallas de equipo, fecha de salida, fecha de empacado
- Al guardar, **distribuye automáticamente**: warehouse recibe equipos + cantidad de tanques; cocina recibe comida; Movilidad recibe transporte; RRHH recibe asignaciones
- Desde aquí se solicitan taxis, comida y equipos en un solo lugar

### 4.6 Conexiones de Dive Ops
| Conecta con | Qué intercambia |
|---|---|
| **Bokun** | Reservas → salidas (sync); waivers; cambios de itinerario |
| **RRHH** | Guías (base de datos), voluntarios como extra crew, licencias vigentes, horarios |
| **Inventario / Requisiciones** | Estado de equipos empacados, tanques, stock de consumibles de salida |
| **Compras & Pagos** | Orden de combustible, orden de comida, pagos a guías externos (vía Rol de Pagos) |
| **Movilidad** | Solicitudes de transporte/taxis |
| **Horarios** | Disponibilidad real de tripulación |
| **Tasks** | Tareas de empacado/preparación generadas por la salida |

### 4.7 Respuestas del usuario (2026-09-12)
- **D1 Bokun:** sincronización **EN VIVO** (siempre actualizado). Si Bokun falla → carga manual, la opción manual SIEMPRE existe
- **D2 Cambio de destino:** lo aprueba el **Gerente de Operaciones y superiores**, mediante solicitud con comunicación entre ellos
- **D3 Pagos por salida:** ✅ SÍ — se calcula desde las salidas realizadas y se **suma al Rol de Pagos** de cada persona. Aplica también a **tripulación y taxis**: cada uno puede ver cuánto va ganando en el mes y reportar errores
- **D4 Condiciones de mar:** no por ahora (decisión del usuario; fundamento del experto registrado en 4.8)
- **D5 Embarcaciones:** pendiente datos de consumo (con módulo Vessels)
- **D6 No-show/cambios:** pendiente definir flujo
- **D7 Formulario de tallas:** **ambas** — principalmente lo llena el personal en el Dive Shop; pero existe versión para enviar por link al pasajero (ej. cruceristas que no pueden acercarse)

### Reglas nuevas del usuario
- **La pizarra es del Gerente de Operaciones** ("el encargado de que la sinfonía suene"): cada salida muestra logística **Completa / En proceso / No iniciada**
- **Las solicitudes de trabajo son notificaciones aceptables:** guías, taxistas, tripulación reciben la solicitud con detalles del trabajo en **su propio módulo** y deben poder aceptarla. Dive Ops es informativo/solo lectura para los demás según permisos
- **Flujo de venta → operación:** venta (Bokun o manual) → pasajero llega al Dive Shop → personal llena tallas, restricciones alimenticias, menú, confirma datos de buceo previos, puede agregar servicios → el formulario **dispara enseguida**: pedido a Cocina, pedido de equipos con tallas a Warehouse (renta interna), avisos de necesidad de guías/taxis hasta completar cupos → el encargado/gerente ops selecciona tripulación específica desde la pizarra
- **El formulario maestro lo FIRMA el pasajero** — ahí mismo lee y firma disclaimers/waivers
- **Conexión con PADI (y otras agencias):** cargar datos del buzo automáticamente cuando la API lo permita

### 4.8 Recomendaciones profundas del experto — DIVE OPS
1. **La solicitud de trabajo debe ser aceptable/rechazable** (P1): guía/taxista/tripulación recibe la oferta con detalles y toca Aceptar o Rechazar (con motivo). La pizarra muestra: confirmado / pendiente / rechazado. Sin esto, "saber si tenemos tripulación" no funciona — solo sabes que invitaste.
2. **Control de cupo 12 pax = límite duro** (P1): la pizarra bloquea/alerta si Bokun vende más de 12 o si los grupos no cierran con los ratios. Lista de espera automática. (La patente manda.)
3. **Visibilidad de ganancias por persona** (P1): cada guía/taxista ve SOLO lo suyo: "este mes llevo $X por N salidas", con botón "reportar discrepancia" que llega a RRHH. Conecta Dive Ops → Rol de Pagos → RRHH Nóminas.
4. **Estados de salida completos** (P1): No iniciada → En proceso → Lista → Completada / **Cancelada**. Cancelar dispara: liberar tripulación, anular pedidos de comida/taxis/equipos, marcar reembolso pendiente.
5. **Waivers con versionado legal** (P1): el disclaimer tiene versión y fecha; si cambia el texto, exige re-firmar. Se guarda el documento firmado (PDF + registro de firma). Protección legal ante incidentes en Galápagos.
6. **Perfil de agencias genérico** (P1, regla cero-hardcode): cada buzo tiene campo "agencia + n° de certificado" (PADI, SSI, NAUI…) configurable; la app carga automático donde haya API y permite manual donde no. No prometer auto-carga para todas.
7. **Manifiesto de pasajeros** (P2): Galápagos exige lista de pasajeros para autoridad portuaria/parque — generarlo con un clic desde la salida.
8. **Consumo real de combustible** (P2): al completar la salida, el capitán registra litros reales → la app aprende y ajusta la fórmula por embarcación.
9. **Consumibles auto-descontados** (P2): completar la salida descuenta de Inventario lo consumible (snacks, agua, oxígeno) — conecta con kardex.
10. **Asignaciones reflejadas en Horarios** (P2): aceptar trabajo en una salida crea/bloquea el turno — nadie queda asignado a dos barcos el mismo día.
11. **Historial del pasajero (CRM-lite)** (P3): buceos acumulados, tallas, restricciones, última visita → base para fidelización y marketing futuro.
12. **Causales de cancelación (ampliado por el usuario)** (P2): no es solo "condiciones de mar" — es un **catálogo dinámico de causales**: ordenanzas gubernamentales, ordenanzas departamentales, fenómenos naturales, cierre de sitios (parque), mantenimiento de embarcación, decisión propia, etc. Al cancelar una salida se elige la causal (muchas son externas, "no necesariamente nosotros"). Sirve para: responsabilidad legal (por qué se canceló lo cobrado), estadística de cancelaciones y re-programación automática de pasajeros afectados.

---

## 4.9 MÓDULO: GUÍAS / INSTRUCTORES (borrador — respuestas incorporadas 2026-09-12)
- **Calendario de aceptación:** el guía ve sus buceos programados con tiempo y acepta; al aceptar → **carga automática en Horarios**. Mirroring de Horarios aquí también (los guías ven sus turnos)
- **Contador personal:** cuántos buceos/guianzas lleva asignados en el mes (y cuánto lleva ganando — conecta con Rol de Pagos)
- **Lista de guías:** con datos y disponibilidad (disponible/no)
- **Perfil de guía:** datos, certificaciones, **seguros**, licencias y permisos → **COMPARTIDO con RRHH** (perfil único, decisión #4). Los seguros son un control del Catálogo Dinámico (vencimientos + alertas)
- **Extensible a otros tipos de instrucción** (vela, surf, etc.) — tipos de actividad como catálogo dinámico, nada hardcodeado
- **Recomendaciones del experto:**
  - Disponibilidad anticipada: el guía puede marcar días/horas en que PUEDE trabajar → alimenta Asignar en Horarios (el gerente planea sobre disponibilidad real)
  - Niveles de guía y ratios privilegio como catálogo dinámico (nivel → ratio máximo permitido)
  - Certificación por agencia (PADI/SSI/NAUI) con n° de certificado → base para la auto-carga de agencias
- **Respuestas del usuario:**
  - SÍ hay guías freelance y externos. **Externos NO llevan seguro; internos SÍ (lo contrata la empresa)** → el seguro como control del Catálogo Dinámico aplica solo a internos
  - Ratio base siempre 4:1, pero **se modifica en casos**: guía privado contratado (baja ratio) y **a discreción del Gerente de Operaciones**. Caso real del usuario: 6 DSD + 5 certificados + 1 snorkel → DSD necesita 2 guías, certificados pueden ir con 1 (ratio extendido a criterio), snorkel necesita guía propio → 4 guías
  - **Regla de diseño:** el sistema SUGIERE tripulación según las reglas configurables, pero el Gerente de Operaciones puede **siempre ajustar manualmente**; cuando un ajuste rompe una regla, la app lo muestra como advertencia (no como bloqueo). El criterio humano manda sobre el ratio.

## 4.10 MÓDULO: MOVILIDAD (borrador con recomendación del experto)
- **Flota:** vehículos como entidad dinámica (placa, modelo, capacidad, estado, ubicación base) — tipos de vehículo configurables (camioneta, auto, taxi propio, furgoneta)
- **Choferes:** personas con rol de conductor desde RRHH; validación automática de **licencia de conducir vigente** (Catálogo Dinámico) y disponibilidad en Horarios
- **Rutas:** catálogo configurable (aeropuerto↔dive shop, hoteles↔muelle) con tarifa por ruta → alimenta el Rol de Pagos (el conductor/taxista acumula ganancias por viaje, igual que guías)
- **Solicitudes:** llegan desde Dive Ops o cualquier módulo; el conductor las recibe y **acepta/rechaza** (mismo patrón de oferta de trabajo); una vez aceptada → turno automático en Horarios
- **Mantenimiento:** los vehículos alimentan el módulo transversal Mantenimiento (matriculación/revisión técnica anual de Ecuador = control del Catálogo Dinámico con alertas)
- **Respuestas del usuario:**
  - **No hay vehículos propios; todos los taxis y taxistas son EXTERNOS**, pero entran a la app con **rol limitado tipo Staff que solo ve Movilidad** (el alcance se controla desde Develops, como todo)
  - Se les **paga por viaje a fin de mes** (acumulan en su Rol de Pagos, igual que guías)
  - El personal coordina rutas desde la propia app; **tarifas configurables en la app** (cambian con combustible y tiempo)
  - **Rutas manuales/seleccionables** con Google Maps: fase 1 = catálogo de rutas + botón "abrir en Google Maps" (gratis); fase futura = API de mapas integrada (con costo)
  - Matriculación/revisión técnica vehicular: aplica a los autos de los taxistas externos que operan con nosotros (control vía Catálogo Dinámico, verificado por RRHH)

## 4.11 MÓDULO: COCINA / FOOD OPS (borrador)
- **Órdenes con estados:** recibido → preparando → lista → entregada (tablero tipo kanban)
- **Cálculo de bebidas** a despachar por salida (reglas configurables por tipo de pax y duración)
- **Carta de platos:** los restaurantes ASOCIADES (no internos) cargan su menú con foto, descripción, ingredientes y **alérgenos**
- **Motor de alérgenos (catálogo dinámico):** el pasajero declara restricciones en el formulario del Dive Shop → la carta solo muestra platos seguros o los etiqueta ("contiene mariscos")
- **Recomendaciones del experto:**
  - Rol limitado "Restaurante": cada restaurante asociado entra solo a SU menú y a las órdenes de SUS platos (no ve nada más de la empresa)
  - Órdenes agrupadas por salida con hora límite de entrega (SLA) — la cocina ve "Salida 8:00 — 12 pax: 4 ceviches, 3 vegetarianos…"
  - Pagos a restaurantes por órdenes entregadas → conectan con Compras & Pagos
  - Valoración del plato por el pasajero (P3, para fidelización)
- **Respuestas del usuario:**
  - **2 restaurantes asociados hoy; pueden sumarse más** (el diseño ya prevé multi-restaurante)
  - Se les paga **por orden entregada**; **el restaurante sube su factura a la app** → aparece en **Compras & Pagos** y en **Finanzas** para su pago
  - Pagos **a fin de mes** según lo pedido y consumido

## 4.12 MÓDULO: FINANZAS (propuesta completa del experto — usuario quiere el módulo extenso; profundizará después)
- **Respuesta del usuario:** varios puntos de caja operados por Dive Shop/puntos de venta; hoy el cuadre se hace en Excel (quiere algo más fácil, en la app); existe caja chica para gastos puntuales

### Estructura propuesta (4 sub-módulos)
1. **Caja (sesiones de efectivo) + "GRAN CAJA"** (nombre del usuario, aceptado): apertura → ventas del período (desde Ventas) → efectivo esperado → conteo real → **diferencia (sobrante/faltante) que EXIGE motivo** → doble confirmación (quien atiende cuenta, supervisor verifica) → cierre. Puntos de venta = ubicaciones operativas. La **Gran Caja** = vista consolidada del día: ingresos totales filtrables por vendedor, punto de venta o método de pago (efectivo/transferencia/tarjeta)
2. **Caja chica:** fondos asignados a responsables por motivo puntual; cada gasto con foto de comprobante y categoría; saldo visible; reposición con aprobación
3. **Por Pagar (bandeja unificada):** el Rol de Pagos completo de la empresa — personal (RRHH: guías, tripulación, taxistas), restaurantes (facturas subidas por ellos), proveedores (Compras & Pagos), servicios externos. Estados: programado → aprobado → pagado (con comprobante). Pagos a fin de mes por acumulado
4. **Por Cobrar:** ventas a crédito — rentas externas a empresas/agencias que pagan a fin de mes; estados y recordatorios
- **Movimientos categorizados:** ingresos/egresos con categorías del catálogo dinámico + centro de costo
- **Contabilidad:** el usuario NO usa sistema contable — hoy es un Excel de ingresos/egresos. **Decisión: WaveOps Finanzas ES el sistema;** la 'integración' = exportar a Excel para el contador. N5 RESUELTO
- **Datos desde CERO** (no se importa nada del Excel actual) — pero la app **conservará una herramienta de importación desde Excel** para migraciones futuras puntuales (usuarios, catálogos)
- **Dashboard básico:** entradas vs salidas del día/mes por punto de venta y departamento
- **Recomendación:** fase 1 = Caja + Por Pagar + Caja chica (lo urgente); Por Cobrar y dashboard en fase 2

## 4.13 PATRÓN ARQUITECTÓNICO: ACTIVITY OPS (Motor de Operaciones de Actividades)
> Decisión clave derivada de Surf Ops: **Dive Ops y Surf Ops no son dos módulos programados aparte — son instancias de UN motor configurable.**
- Cada actividad turística (buceo, surf, kayak, senderismo…) = un PERFIL de actividad creado como dato: roles de tripulación, ratios, reglas de equipo/tanques, waivers, logística, canales de venta
- "Dive Ops" y "Surf Ops" serían vistas del mismo motor con perfil distinto → cumple regla #5 (cero hardcode) y multi-tenant (cada empresa define sus actividades)
- **Respuestas del usuario:**
  - Las actividades se muestran como **módulos separados en el menú** (nombre/ícono/color propios en Develops) pero son instancias del mismo motor — "la cara del módulo es solo un acceso directo"
  - Sí se vende por Bokun, **pero ciertas actividades solo existen en la app** (no en Bokun) → el motor no depende de Bokun; la reserva puede entrar manual
  - **Los waivers son DIFERENTES por actividad** → cada perfil de actividad lleva su propio set de documentos/waivers (Catálogo Dinámico)
  - La tripulación no importa por título: **todos pueden ser guías; el perfil de usuario complementa qué son** (instructor, buzo, surfista…) → los roles de tripulación por actividad son configurables

## 4.14 MÓDULO: DIVE SHOP — REGISTRO / CHECK-IN (borrador)
- **Info de pax desde Bokun** compartida aquí
- **Emite hacia:** Dive Ops (waivers, tallas), Cocina (plato + bebidas + snacks)
- **Waivers y datos del pasajero:** se llenan aquí o por **formulario externo (link/QR)** — diseño del formulario: pendiente (el usuario lo dará después)
- **Solicitud de equipos de prueba/demo a Warehouse** cuando no hay stock
- **Clock in del departamento** aquí (kiosco iPad, coherente con RRHH)
- **Confirmación visual de fotos cargadas a la web** (conectado a su página web)
- **Doble chequeo de waivers hasta la noche anterior:** señal visual compartida con Dive Ops
- **Lista de pasajeros + formato de zarpe** (documento portuario) generado aquí: Bokun + waivers
- **Info del cálculo de bebidas** hecho en Cocina
- **Mensaje automático a pasajeros:** salida, destino, actividad, punto de encuentro
- **Formularios de actividades:** por venta pueden existir varios formularios; completan datos faltantes desde Bokun o manual (tallas, 1 o 2 tanques, restricciones alimenticias); los formularios **reparten info a varios módulos**
- **Recomendaciones del experto:**
  - **Tablero de check-in estilo aeropuerto:** cada salida del día con cada pasajero y su estado (waiver ✅/❌, tallas ✅/❌, plato ✅/❌) — el personal atiende primero a los incompletos
  - QR de la reserva: el pasajero escanea → abre SU formulario (auto-servicio para cruceristas)
  - **Consentimiento de fotos en el waiver** antes de publicar a la web
  - Canal del mensaje automático: plantilla configurable; WhatsApp Business como fase 2 (email/SMS primero)
  - Walk-ins sin Bokun: venta directa en caja (Ventas) que dispara el mismo formulario
- **Respuestas del usuario:**
  - Mensaje automático: **WhatsApp + email** (WhatsApp Business API como fase 2; email y plantillas configurables desde el inicio)
  - **Fotos:** el equipo de foto del Dive Shop recibe las cámaras, sube las fotos y quedan para **descarga pública gratuita** en la página web → la subida y la confirmación visual viven aquí; el consentimiento de uso de imagen va en el waiver
  - **Formato de zarpe:** el usuario lo enviará después (adjunto pendiente)
  - **Walk-ins sin reserva que pagan en caja: pasa mucho** → la venta directa en caja (Ventas → Finanzas caja) dispara el mismo formulario de check-in
- **Lo compartido con otros módulos (pregunta del usuario):** tablero de check-in estilo aeropuerto (patrón "tablero de preparación" compartido con Dive Ops y Cocina), solicitudes aceptables (patrón compartido con guías/taxistas), y movimientos de kardex por rentas (compartido con Inventario)

## 4.15 MÓDULO: VESSELS — EMBARCACIONES (borrador con respuestas)
- **Parecido a Movilidad** (flota externa/interna, tripulación, solicitudes) con capa adicional de mantenimiento
- **Embarcaciones como entidad dinámica:** pueden ser varias, el número puede subir o cambiar (nada hardcodeado)
- **Tripulación:** capitán, marinero y roles adicionales configurables (ej. salonero) — perfil de usuario complementa qué es cada persona
- **Gestiona:** patentes (vencimientos = Catálogo Dinámico), mantenimiento (alimenta el módulo transversal Mantenimiento), base/home port (ubicación), consumo de combustible (alimenta el cálculo de Dive Ops), reposiciones de insumos, equipos de emergencia (checklist por embarcación con controles y vencimientos)
- Tripulación acepta salidas como ofertas de trabajo (mismo patrón); acumula ganancias al Rol de Pagos

## 4.16 MÓDULO: WAREHOUSE — RENTA DE EQUIPOS (borrador con respuestas)
- **Gestiona el inventario de equipos de renta de la operación** (wetsuits, reguladores, BCDs, tanques, máscaras…)
- **Órdenes de renta que llegan desde:**
  - **Ventas:** renta EXTERNA (persona u empresa) → orden fácil, asignada al personal de Warehouse con turno ese día
  - **Dive Shop:** renta INTERNA (basada en la salida: cuántos pasajeros y cuáles pasajeros → tallas ya cargadas)
  - **Cualquier departamento** (retail y otros — departamentos creables desde Develops)
- **Regla de oro:** toda renta (interna o externa) **descuenta/marca el equipo como RENTADO** → imposible sobre-rentar lo mismo dos veces
- **Ciclo de vida del equipo (estados):** disponible → rentado → devuelto → verificado → almacenado **o** enviado a reparación → (reparado) → disponible. Cada transición con usuario/fecha = kardex del equipo
- **Retornos:** se revisa estado del equipo; si dañado → a reparación (conecta con Mantenimiento); si ok → se almacena
- **Multi-operación simultánea:** varias salidas con distintas embarcaciones/destinos + distintos clientes (personas y empresas) rentando al mismo tiempo, y no solo en Warehouse — también en otras bodegas/tiendas (todas son ubicaciones del catálogo)
- **CLARIFICACIÓN DEL USUARIO (pregunta respondida):** Warehouse NO es solo equipos de renta — también administra **todos los insumos y suministros de la empresa** (aceites, repuestos, consumibles que otros módulos/departamentos necesitan)
  - **Decisión de arquitectura: UNA bodega física, DOS inventarios lógicos sobre el mismo motor (Inventario/Requisiciones):**
    - **(a) Equipos de renta:** serializados, ciclo de vida (disponible→rentado→…→reparación), fianzas, QR por equipo
    - **(b) Insumos/repuestos/consumibles:** kardex, stock por ubicación, mínimos/máximos, transferencias, requisiciones entre departamentos
  - **Warehouse = la cara OPERATIVA del motor de Inventario** (igual que Guías es la cara operativa de RRHH): órdenes de renta, requisiciones de entrada/salida, empacado de salidas (desde Dive Ops), retornos. La pestaña Inventario/Requisiciones = la cara ADMIN (catálogos, stock, kardex, conteos). Un solo dato, dos caras — mismo patrón de 'acceso directo' que Activity Ops.
  - **TURNO: NO se duplica con Horarios** (decisión del usuario). Horarios sigue siendo la fuente; Warehouse solo muestra un **resumen del turno del día** (lectura) del personal que entra
- **Recomendaciones del experto:**
  - **Fianza/depósito en garantía** registrada en la orden de renta externa (monto configurable), descontable de reparaciones — estándar del negocio de rentas
  - Cada equipo tiene su **QR** (del patrón Inventario): escanear al entregar y al recibir = registro instantáneo del estado
  - Estado "en reparación" bloquea la renta y alimenta la pizarra de Mantenimiento
  - **Preguntas pendientes:** ¿las rentas externas a empresas/agencias pagan al contado o a crédito (fin de mes → Por Cobrar en Finanzas)? ¿Quién autoriza el descuento de la fianza cuando hay daño? → (propuesta por defecto: crédito empresarial sí existe y vive en la cartera del vendedor; descuento de fianza lo aprueba el gerente de Warehouse con evidencia fotográfica)

### 4.16.1 FLUJO CANÓNICO DE RENTA (diseñado con el usuario, 2026-09-12)
> "Varios módulos se activan desde uno solo" — la orden de renta es el punto único de entrada.

**1. Entrada (cualquier canal: WhatsApp, mostrador, teléfono):** el vendedor crea la orden de renta (ej. 15 tanques para X empresa/persona). Soporta crédito empresarial (pendiente de cobro → cartera del vendedor) o pago inmediato.

**2. Cobro en la orden:** el vendedor registra el pago DIRECTO en la orden — ya no está pendiente — adjuntando comprobante (foto o n° de transacción). Soporta **abonos múltiples** y **fianza/depósito** como pago tipo depósito (estado: retenida → devuelta o descontada, con aprobación + evidencia si hay daño). El pago en efectivo **cae automáticamente en la sesión de caja** del vendedor (Finanzas cuadra solo).

**3. Vista filtrada en Warehouse** (el personal NO ve montos ni estado de pago — solo que la orden está pagada/autorizada): ve 15 tanques, cliente, **fecha y hora de entrega**, fecha/hora de creación, **quién creó la orden**, **quién prepara** (asignado por el supervisor), y estados:
**recibido → en preparación → listo para despachar → despachado → entregado al cliente → devuelto → verificado → almacenado o a reparación**

**4. QR doble en despacho:** escanear el QR de la **orden** (registra quién despacha y cuándo) + el QR de **cada equipo** (asigna seriales exactos a la orden — se sabe QUÉ salió, no solo cuánto).

**5. Retorno y verificación:** escanear la orden → lista de seriales → verificar cada equipo → derivación: ok → almacenado (disponible) · dañado → reparación (alimenta Mantenimiento) + flujo de fianza.

**6. Control total desde un solo activador:** inventario (seriales y kardex), quién trabajó la orden, quién despachó, quién recibió el retorno, pagos e ingresos — todo nace de la misma orden.

**El mismo flujo aplica a rentas INTERNAS** (Dive Shop → la salida genera la orden automáticamente con las tallas de los pasajeros) y a cualquier bodega/tienda (todas ubicaciones del catálogo).

---

## 4.17 PURGACIÓN PROFUNDA — RESULTADOS (resoluciones del usuario, 2026-09-12)

1. **LA VENTA dispara la logística:** cuando entra una venta (Bokun o POS), **activa la salida** y ésta dispara: orden de combustible, pedido de snacks, pedido de equipos, pedidos de taxis con rutas. **Al COMPLETAR la salida** se acumulan los pagos de tripulación + cierre de operación. (Venta/activación = logística; cierre = plata)
2. **Checklist de embarcación:** solo indica si la embarcación está completa y operativa (documentación, equipos de emergencia, medicamentos por caducar). Si no está marcada → mensaje "embarcación no apta para salidas". La revisan capitán y marinero DIARIAMENTE. El estado físico/motores es OTRO control (con alertas) que se muestra en **Vessels y Mantenimiento**, NO en la pizarra de Dive Ops
3. **Snacks e insumos salen de los restaurantes**; el cálculo estándar de bebidas por pasajero debe ser **automático** (punto de cálculo configurable)
4. **Guía privado NO baja el ratio** — se suma como **guía extra** pagado adicionalmente por los pasajeros (corrige propuesta #4)
5. Extras de Bokun = **ítems de la reserva**, no notas ✅
6. **Cualquier usuario** puede reportar incidencia de algo dañado (barco, carro, equipo) → crea orden de mantenimiento según lo reportado
7. **Adelanto conectado al Rol de Pagos, mostrado en negativo**: el usuario ve su rol con el adelanto; al pagar el sueldo se descuenta
8. **El gerente financiero (departamento financiero) aprueba el Rol de Pagos** y también Compras & Pagos
9. **Fotos de la web y waivers se descargan solo con código de reserva** (privacidad); el consentimiento vive en el waiver
10. **Regla de vacaciones la crea RRHH** (leyes cambian; días extra o menos, editable)
11. **Roles con nombres formales:** "Conductor" (no taxista), etc.
12. **Contenido bilingüe con campos ES/EN escritos por los usuarios** (no traducción automática)
13. **ZARPES — CORRECCIÓN IMPORTANTE DEL USUARIO:** NO va un selector hardcodeado Norte/Sur. Los zarpes son **PLANTILLAS DE DOCUMENTO creadas y editables desde la app** (mismo motor que las campañas de firma): el admin crea cualquier tipo de zarpe, define sus campos, y los formatos Norte/Sur que entregó el usuario son solo **plantillas iniciales para agilizar** (crítico para multi-tenant: otra empresa en otro país necesitará sus propios documentos). El zarpe **se auto-llena desde los datos de la salida** (embarcación, matrícula, fechas, tripulación, pasajeros) → el personal solo **verifica** y **imprime**. Estados: borrador → verificado → impreso.
    Campos de las plantillas semilla (Norte/Sur): embarcación, matrícula, fechas zarpe/arribo, lugar de zarpe, destino de arribo, tripulación (nombre/cargo/cédula), pasajeros (nombre/nacionalidad/edad/pasaporte-cédula). Los dos archivos originales quedan en el proyecto como referencia visual.

---

## 4.18 CORRECCIONES DE LA FASE 0 (detectadas en validación por el usuario, 2026-09-13)

### Conexiones faltantes (el usuario tiene razón en todas)
1. **Producto → Proveedor:** falta campo "proveedor preferido" (diseñado, no implementado)
2. **Proveedor → Categorías:** agregar multi-select "categorías que suministra" (el proveedor como proveedor DE esas gavetas — más útil que solo por producto)
3. **Proveedor → Centros de costo:** agregar multi-select opcional "centros de costo frecuentes" (a qué bolsillos suele factrar)
4. **Productos — vista para miles de registros:** buscador + filtro por categoría + ordenamiento + agrupación por categoría (el usuario: "vamos a tener 12312323 productos, no puede quedar desorganizado")

### Controles
5. **"Aplica a" debe ser CATÁLOGO DINÁMICO** (no 5 opciones fijas): las opciones semilla (Personas, Equipos, Vehículos, Embarcaciones, Ubicaciones) deben ser editables/eliminables/agregables — cero hardcode. AGREGAR "Departamentos" como opción semilla (el usuario lo pidió explícitamente: Equipos → además Departamentos)
6. **Al asignar un control, notificar al asignado** (campana + email): hoy solo existe la alerta de vencimiento; falta el aviso "se te asignó el control X" en el momento de la asignación
7. **Texto de ayuda en "Roles a los que aplica"**: aclarar que define QUIÉNES deben tener ese control (no es un permiso)

### Bugs críticos detectados
8. **🔴 ALERTAS DE VENCIMIENTO NO LLEGAN (BUG):** se creó un control con vencimiento a ~3 días y NO llegó notificación ni a la persona asignada ni a RRHH (ni campana ni email). Verificar: (a) que el job de cálculo de vencimientos esté corriendo (Cloud Function programada, requiere Blaze en el proyecto), (b) que se creen los documentos de notificación, (c) campana + email. Máxima prioridad.
9. **ROLES — verificar que NO estén hardcodeados:** el usuario pregunta si los roles nuevos (Conductor, Restaurante) y los roles en general se pueden crear/editar/renombrar desde Develops. Regla: la jerarquía base (7 niveles) puede quedar fija por diseño, PERO los roles nuevos deben ser gestionables como datos (crear, renombrar, ajustar toggles). Si hoy no se puede crear un rol nuevo desde la app, agregar esa capacidad.

### Ya anotados antes
10. Ubicaciones: texto de ayuda en "Módulos relacionados" + tarjetas expandibles al clic
11. Contador de unidades dice "producto(s)" → debe decir "unidad(es)"
12. Producto: mostrar foto actual al editar

---

## 4.19 CORRECCIONES FASE 0 — SEGUNDA RONDA (validación del usuario, 2026-09-13)

### Decisión de arquitectura del usuario (importante): ROLES vs POSICIONES
- **Roles = SOLO permisos** (los 7 de la jerarquía + roles mínimos de acceso limitado para externos). NO se crean roles para cada cargo.
- **Posiciones (cargos) = Develops → Posiciones:** ahí viven Guía de buceo, Instructor de surf, Conductor, Capitán, Marinero, Salonero, etc. Conectadas a rol + departamento.
- **Controles:** agregar "Posiciones a las que aplica" (además de roles). Ej.: "Licencia de conducir" aplica a la POSICIÓN Conductor, no a todo Staff.
- Los roles creados en Fase 0 (Conductor/Restaurante) se conservan SOLO si representan acceso limitado de externos (restaurante ve solo su menú; conductor externo ve solo Movilidad). Documentar la distinción rol-vs-posición en la ayuda de Develops.

### Bugs críticos (siguen abiertos)
1. **🔴 Campana no muestra notificaciones** (ni al asignado ni a RRHH): el toast del botón sale, pero la notificación nunca aparece en la campana. Depurar a fondo: documentos creados en colección notifications, query de la campana, reglas de Firestore, filtros por tipo/módulo. Verificar con datos reales, no solo el toast.
2. **🔴 Storage unauthorized:** al subir foto de producto: "User does not have permission to access 'products/...'". Corregir reglas de Storage en la gemela (y preparar para producción) para las rutas nuevas.

### UX / visualización
3. **Controles — doble "Cargar iniciales" confuso:** hay dos catálogos (Tipos de control + "Aplica a"/destinos) y el usuario no entiende la diferencia. Solución: renombrar la sección a **"¿A qué se le puede asignar un control?" (tipos de destino)** con texto de ayuda; UN solo botón "Cargar iniciales" que alimente ambos en orden correcto (destinos primero, luego tipos); explicar en pantalla: destino = personas/departamentos/equipos…; tipo = el documento/certificado concreto (PADI, licencia…).
4. **Proveedores:** la tarjeta debe expandirse (o abrir popup) mostrando la ficha completa: cuentas bancarias, categorías que suministra, centros de costo frecuentes y productos donde es proveedor preferido.
5. **Ubicaciones:** al expandir una tarjeta se expanden otras — debe expandirse SOLO la seleccionada y permitir varias expandidas a la vez (estado independiente por tarjeta).

### Notas
6. Email de alertas NO probar en gemela (secreto SendGrid temporal) — se validará en producción. Campana es la fuente de verdad en staging.

---

## 4.20 CORRECCIONES FASE 0 — TERCERA RONDA (re-prueba del usuario, 2026-09-13)

Validado ✅: campana con notificación, foto de producto (Storage), posiciones semilla.

### Rediseño del módulo Controles (decisión del usuario, 2026-09-13)
- El módulo Controles tiene TRES PESTAÑAS: **Tipos de control | Destinos | Controles asignados**
- **Pestaña "Destinos"** (= el antiguo "¿A qué se le puede asignar un control?"): administra los tipos de cosas que pueden tener controles. Contiene los 4 DESTINOS BASE protegidos (ya existen y están conectados, NO hardcodeados como datos pero no se eliminan): PERSONAS, ROLES, POSICIONES, DEPARTAMENTOS + CRUD para crear destinos personalizados (Equipos, Vehículos, Embarcaciones, Extintores…), renombrarlos y activar/desactivar.
- **Formulario de Tipo de control:** un chip por cada destino activo (los 4 base + personalizados), con el comportamiento de interruptor: activado muestra sus opciones, desactivado las oculta; solo persisten selecciones de chips activos.

Pendientes (rondas anteriores, ya corregidos salvo indicación):
1. **Tarjetas expandibles con foto:** al expandir una tarjeta que tiene foto (producto, ubicación, etc.), la foto NO se muestra en la vista expandida — debe mostrarse.
2. **Layout de expansión (bug visual):** al expandir una tarjeta, TODO el grid se estira y las tarjetas vecinas muestran recuadros blancos vacíos expandidos. Debe expandirse SOLO la tarjeta clickeada, sin deformar las demás (las vecinas permanecen colapsadas e iguales).
3. **Formulario de Tipo de control — selectores dependientes (bug de lógica):** al elegir "Aplica a = Personas" a veces solo aparece la palabra "Personas" sin nada más. Debe funcionar así:
   - Aplica a = **Personas** → mostrar lista de USUARIOS agrupados por departamento (selección usuario por usuario) + "Roles a los que aplica" + "Posiciones a las que aplica"
   - Aplica a = **Departamentos** → mostrar lista de DEPARTAMENTOS (selección múltiple)
   - Aplica a = Equipos/Vehículos/Embarcaciones/Ubicaciones → su catálogo correspondiente
   Los selectores deben aparecer/desaparecer según el destino elegido.

---

## 4.21 CORRECCIONES FASE 1 — RONDA 2 (validación del usuario, 2026-09-15)

### Decisiones de control anti-fraude (importantes)
1. **SEPARACIÓN DE QUIEN ENVÍA vs QUIEN RECIBE:** quien envía NUNCA puede marcar "recibido". Solo el responsable de la ubicación destino confirma la recepción. Para EQUIPOS/SERIALES: recepción con escaneo QR (QR de la transferencia/orden + seriales) + confirmación; para CONSUMIBLES (cloro): confirmación simple con botón (sin QR obligatorio, flujo liviano).
2. **DESPACHO OBLIGA ESCANEO:** no se puede avanzar una orden a "despachado" manualmente; el estado solo avanza al escanear el QR de la orden + los seriales. Idem para la DEVOLUCIÓN (escaneo de orden + seriales para verificar qué regresa). El botón manual queda eliminado o como "modo emergencia" con aprobación de gerente + motivo.
3. **"Estados" (catálogo de estados de renta) se MUEVE de Warehouse a Develops** (es un catálogo maestro).

### Mejoras de visibilidad y facilidad
4. **Formulario de transferencia:** al elegir origen/destino, mostrar el stock disponible de ese producto en cada ubicación (ej: "The Warehouse: 20 gal disponibles").
5. **Notificaciones de recepción pendiente:** al enviar una transferencia, notificar al responsable de la ubicación destino (campana); queda visible en su bandeja hasta recibir.
6. **Orden de renta (Warehouse):** el selector de ubicación de entrega debe mostrar cuántas unidades de los productos pedidos hay disponibles ahí. Fecha/hora de entrega en formato 24h.
7. **BOTONES RÁPIDOS en Warehouse:** acciones directas por tarjeta de orden: Despachar (escaneo), Ver detalle, Registrar retorno (escaneo), Imprimir QR — menos pasos, todo desde la pizarra.
8. **Renta desde otros puntos:** quien vende no debe tener que entrar al módulo Warehouse (queda resuelto en Fase 2 con Ventas; la orden nace en Ventas y llega sola a Warehouse).
9. **Formulario de movimiento:** selector de producto por CATEGORÍA primero (para cuando no recuerdas el nombre) y luego productos en orden alfabético con buscador. Origen debe permitir "compra directa externa" (proveedor) como opción de origen en el mismo formulario.
10. **Proveedores — condiciones de pago:** botones de opciones fijas comunes (Contado, Crédito 15 días, Crédito 30 días, Crédito 60 días, Anticipo 50%) + botón "Otro" que permite escribir texto libre.

### Dudas de dónde está cada cosa (para mejorar ayudas en pantalla)
- Mínimos/máximos: se configuran en Catálogos → Producto (campos min/max); la alerta llega a la campana cuando el stock ≤ mínimo. Agregar ayuda visible en Stock.
- Conteos cíclicos: Inventario → Conteos → "+ Programar conteo" (ubicación, frecuencia, ciego sí/no).

### Hallazgos adicionales del usuario (2026-09-15)
11. **Mínimos/máximos viven en Stock (lápiz de la tarjeta expandida), NO en Catálogos** — está bien ahí (son por producto×ubicación), PERO editarlos debe estar RESTRINGIDO a supervisor+ (riesgo si cualquiera los modifica). Agregar permiso y ayuda.
12. **Conteos cíclicos deben exigir escaneo QR para validez:** la app debe verificar qué productos tienen QR (escaneo obligatorio en el conteo) y cuáles no (esos se cuentan manualmente).
15. **PRECIOS VISIBLES SEGÚN ROL + LISTAS DE PRECIOS:** al crear una orden de renta, quien vende/cobra SÍ debe ver los precios a cobrar (hoy no se ven). El STAFF de Warehouse sigue sin verlos. Además: precios múltiples y modificables por producto — precio base, precios ESCALONADOS por cantidad (ej: 1-5 unidades $X, 6-15 $Y), descuentos preconfigurados seleccionables (se marcan directo). Todo como datos configurables.
16. **MÓDULOS POR DEPARTAMENTO — SELECCIÓN MANUAL DESDE DEVELOPS (regla global, NO automática):** en Develops → Departamentos, cada departamento tiene un selector MANUAL de qué módulos ve (multi-select). Solo admin (DG) lo configura. No es automático por nombre: el departamento Warehouse no ve Warehouse por defecto — lo ve si el admin así lo marca. Así un depto puede ver módulos de otros (ej: Dive Shop ver Warehouse). Complementario a roles/permisos.

---

## 4.22 CORRECCIONES FASE 1 — RONDA 3 (validación del usuario, 2026-09-15)

1. **ESTADOS DE ORDEN: bloqueo manual solo para serializados.** Las órdenes con seriales/QR exigen escaneo para despachar/devolver; las de productos sin QR avanzan con botón de confirmación simple. Nada se queda atascado.
2. **SIN POP-UPS EN ÓRDENES:** toda la operación desde la tarjeta, con botones grandes tipo módulo (despachar, retorno, detalle). Eliminar ventanitas.

### Bugs de transferencias (detectados en prueba)
3. **Stock NO muestra la línea "en tránsito a X"** — debe verse qué cantidad está viajando.
4. **La transferencia DESAPARECE de la lista al ponerse "en tránsito"** — la pestaña Transferencias debe mostrar TODAS las transferencias con filtros por estado (pendiente / en tránsito / recibida / cancelada). Nada se pierde.
5. **El botón debe llamarse "Despachar"** (no "marcar en tránsito"): al despachar, el estado pasa a "en tránsito" automáticamente.
6. **RECEPCIÓN: quién puede recibir.** Debe poder recibir: el responsable de la ubicación destino O cualquier usuario del departamento al que pertenece esa ubicación O Supervisor+. En la prueba, un usuario STAFF no pudo recibir — verificar por qué (probablemente no es del departamento destino ni responsable). El botón "Recibir" debe estar visible para quien pueda recibir.
7. **BUG updateDoc undefined:** al guardar módulos del departamento falla con "Unsupported field value: undefined (field description)". Sanitizar campos vacíos antes de guardar.
8. **LÓGICA DE MÓDULOS POR DEPARTAMENTO = ADITIVA (decisión del usuario):** la selección de módulos en Develops → Departamentos marca los módulos EXTRA que ese departamento ve, SUMADOS a lo que su rol ya permite. NUNCA resta visibilidad que el rol/permisos conceden. Texto de ayuda nuevo: "Selecciona los módulos adicionales que verá este departamento. Se suman a lo que su rol ya permite; no quitan visibilidad. Si no marcas nada, ven lo que su rol define." Ejemplo: Staff + depto Warehouse marcando Warehouse → ven Warehouse además de lo básico; un gerente sigue viendo todo.

---

## 4.23 CORRECCIONES FASE 1 — RONDA 4 (validación del usuario, 2026-09-16)

### 🔴 BUGS
1. **RECEPCIÓN: el receptor no ve "Recibir"** — solo quien envía lo ve. El usuario del departamento destino debe ver el botón Recibir en Transferencias.
2. **Escáner abre pero el escaneo no registra nada** (no pasa nada al escanear).
3. **Stock no muestra el Cloro** pese a tener stock registrado — revisar datos/consulta de la pestaña Stock.
4. **SERIALES — MODELO CORREGIDO (usuario, 2026-09-16):** CANTIDAD EN LA ORDEN, INDIVIDUALIDAD EN EL DESPACHO. Crear la orden = rápido, por cantidad (ej: 15 tanques), sin escanear uno por uno. El escaneo serio solo en puntos de control: DESPACHO (escanear los 15 seriales que salen; la app valida "faltan N por escanear") y RETORNO (escanear los que regresan). El Stock muestra seriales por estado ("12 disponibles · 3 rentados · 2 en reparación"), no un número plano "68 unidad". Al crear producto preguntar: "¿se controla por seriales?" y "¿lleva QR?" con ayudas. Movimientos de cantidad solo para productos NO serializados.

### 🏪 WAREHOUSE — TODO COMO MÓDULOS
5. Módulos faltantes: agregar **Órdenes** y **Retornos** como tarjetas-módulo. La Pizarra queda como vista resumen abierta; ELIMINAR el bloque de texto "Tablero del día: las órdenes activas..." que confunde (o reemplazar por el tablero real). Tarjetas-módulo más PEQUEÑAS: 2-3 por fila.
6. **Formulario de orden = principio de Transferencia:** PRIMERO seleccionar ubicación de entrega → LUEGO categorías → productos con disponibilidad real (menos lo ya seleccionado), con buscador y escaneo. Los ítems seleccionados se listan como LÍNEAS DE FACTURA con precio (arriba del subtotal/total). Luego impuestos + badge de estado de pago.
7. **Recepción de transferencia con verificación:** al Recibir, escaneo OBLIGATORIO de lo recibido; productos sin QR → adjuntar foto + RECUADRO DE FIRMA de quien recibe.

### 📦 INVENTARIO/REQUISICIONES — TODO COMO MÓDULOS
8. Todas las secciones como tarjetas-módulo: Stock, Movimientos, Transferencias (hoy aparece 3 veces — dejar UNA), Conteos, Seriales, Catálogos, Ajustes, **Escanear QR**. ELIMINAR la tarjeta "Registrar movimiento" (es redundante: Compra/Consumo/Ajuste/Transferencia ya existen). Tarjetas 2-3 por fila.
9. **EL ESCANER = CENTRO DE OPERACIONES (gran idea del usuario):** escanear un QR de producto → abre su ficha con acciones directas: Comprar, Transferir, Consumir, Rentar (agregar a una orden de renta), Enviar a reparación, Ver historial/kardex. El escáner también funciona para buscar (escanear = buscar el producto).
10. Formulario de transferencia: origen y destino PRIMERO → luego categoría → productos (con buscador y escaneo).
11. Formato categoría→producto con buscador en TODOS los formularios (consumo, ajuste, orden).

### ✅ FUNCIONANDO (confirmado)
- Módulos por departamento aditivos (punto 1 ronda 3)
- Staff ve Warehouse sin montos (punto 2)
- Consumo: DG ve todas las ubicaciones (correcto por jerarquía)

## 5. Módulos pendientes por definir

### Definidos hasta ahora
RRHH ✅ · Ubicaciones ✅ · Inventario/Requisiciones (fundamentos ✅, detalle pendiente) · Compras & Pagos (fundamentos ✅, detalle pendiente) · Dive Ops 🔄 (borrador enriquecido)

### Faltan según la conversación (mapa del experto)
0. **Guías 🔄 · Movilidad 🔄 · Cocina 🔄 · Finanzas (propuesta completa 4.12) 🔄 · Dive Shop/Check-in 🔄 · Activity Ops ✅ · Vessels 🔄 · Warehouse/Renta 🔄** — todos registrados como borradores enriquecidos con respuestas (secciones 4.9–4.16)
1. **Inventario/Requisiciones — detalle** — ✅ CONFIRMADO para implementar. Todo dinámico: catálogo de productos, QR, kardex, transferencias y conteos se crean/gestionan como DATOS por los usuarios responsables (regla #5, nada hardcodeado)
4. **Compras & Pagos — detalle** — ✅ CONFIRMADO. Igual: aprobaciones por monto, proveedores y rol de pagos son configurables por los usuarios
5. **Reportes** — analítica general de la app (flag ya existe)
6. **Finanzas/Contabilidad** — integración con sistema contable (N5: cuál usan, pendiente)
7. **Ventas/CRM** — ✅ CONFIRMADO con alcance ampliado por el usuario: hay ventas FUERA de Bokun → la app debe registrarlas: **renta de equipos externos, ventas a otras agencias/operadores, ventas al público general**. Perfil de cliente propio + servicios adicionales + fidelización
8. **Mantenimiento** — ✅ DECISIÓN DEL USUARIO: **módulo propio y transversal** (no espejo de otros). Dos capas:
   - **Correctivo:** órdenes de trabajo de mantenimiento, creadas aquí o desde cualquier módulo (Vessels, Movilidad, Warehouse…) — cada origen reporta, aquí se unifica
   - **Preventivo:** agregado de todos los controles preventivos (via Catálogo Dinámico de Controles) de embarcaciones, vehículos, equipos e instalaciones
   - **Vista única para el jefe de mantenimiento + visibilidad del gerente de operaciones**: todo el mantenimiento de la empresa en una sola pizarra, filtrable por activo/tipo/estado
9. **Multi-tenant + landing** — gestión de empresas clientes (decisión: ver respuesta del experto en chat; data-model listo, feature después)
10. **Negocios futuros** — The Body, The Main House, The Pub, The TRVL Agency, Lumen Hub (ya previstos como ubicaciones)

### Recomendación del experto: mapa de módulos COMPLETO ✅ — propuestas de los 3 pendientes

#### A. VENTAS / CRM (propuesta)

**⚡ REGLA DE ORO ANTI-DUPLICACIÓN BOKUN (diseñada con el usuario):** una venta = UNA sola fuente.
- **Venta online Bokun con tarjeta:** dinero que no pasa por caja. Entra sola como método "Bokun tarjeta" y vive como **Por Cobrar de Bokun** → al llegar el payout se marca cobrada (comisión registrada como gasto). El cajero no toca nada.
- **Venta presencial cargada en Bokun pero cobrada en efectivo:** NO se re-registra como venta del POS. Al cierre de caja, la app genera **automáticamente la línea consolidada** "Ventas cobradas en efectivo vía Bokun ($X, n reservas)" cruzando los IDs de reserva. El cajero cuenta el efectivo físico; el esperado = ventas POS registradas en WaveOps + línea consolidada Bokun-efectivo. Diferencias quedan marcadas con motivo.
- **Venta directa del mostrador (walk-in):** se registra SOLO en WaveOps Ventas (con su cliente), nunca en Bokun.
- Métodos de pago: efectivo, transferencia (n° comprobante), tarjeta (voucher, sin pasarela por ahora).
- **Canales de venta** (catálogo dinámico): mostrador/walk-in, renta externa de equipos, agencias/operadores (mayorista), público general, negocios futuros
- **Registro de venta simple** (no es un POS completo): ítem/servicio + precio + cliente (opcional) + método de pago (efectivo/tarjeta/transferencia registrado, sin pasarela de cobro por ahora) + caja → dispara automático: Finanzas (caja), Warehouse (si es renta), Dive Shop (si es actividad → formulario de check-in)
- **Catálogo vendible** (dinámico): retail del Inventario, servicios, rentas, cursos
- **Lista de precios por canal:** precio agencia/wholesale configurable vs precio público
- **Base de datos de CLIENTES** (respuesta a la pregunta del usuario): vive en Ventas/CRM como entidad "Clientes" y crece sola: auto-creada desde Bokun (cada reserva), auto-creada al vender (walk-in), editable por cualquier vendedor, depuración por RRHH/admin con alerta de duplicados (cédula/email/teléfono). **Tipo de cliente "Interno":** cada departamento es un cliente interno (Dive Shop Interno, Cocina Interna…) — las rentas internas son rentas normales cuyo cliente es el departamento → un solo motor para renta interna/externa + centro de costo por departamento sin esfuerzo. La empresa misma es cliente de sí misma.
- **Perfil de cliente:** datos + historial de compras + buceos/tallas/alergias si es buzo + consentimiento de fotos + valor acumulado. Control de duplicados por email/cédula
- **Crédito empresarial con control diario a mensual** (ajuste del usuario): aging (antigüedad de deudas), alertas y recordatorios constantes al vendedor responsable de la cartera
- **Por cobrar con CARTERA POR VENDEDOR** (ajuste del usuario): hay varios vendedores; **cada vendedor ve y gestiona su propia cartera** (sus cuentas por cobrar) y **siempre tiene recordatorios disponibles** de sus pendientes de cobro
- **Conexiones:** Bokun (referencia de reserva cuando aplica), Finanzas, Warehouse, Dive Shop, Cocina

#### B. REPORTES (propuesta)
- Analítica TRANSVERSAL para Directorio/Gerencia (cada módulo ya tiene la suya propia)
- **Librería de reportes pre-armados** (catálogo dinámico, creables por el admin): ventas por canal/período · ocupación de salidas · cancelaciones por causal · rendimiento y consumo real vs calculado por embarcación · stock valorizado y rotación · envejecimiento de por pagar/por cobrar · asistencia y ausentismo · resumen de rol de pagos
- **REPORTES PERSONALES ACCESIBLES PARA TODOS** (ajuste del usuario): cada colaborador consulta sus propios datos — horas trabajadas en el mes, faltas, días enfermo, salidas realizadas, cuánto lleva ganando — mezclando datos de RRHH + Horarios + sus módulos. Auto-servicio, sin pedirle nada a RRHH
- **ESTADÍSTICAS POR DEPARTAMENTO Y TIPO DE FALLO** (ajuste del usuario): reportes de incidencias/fallas con tendencias para ver qué mejoró y qué empeoró — estadísticas comparativas por período
- Filtros por fecha/departamento/ubicación/actividad; exportar Excel/PDF
- **Fase 2:** reportes programados (llegan solos por email semanal/mensual a directivos)

#### C. CALENDARIO MAESTRO DE OPERACIONES (vista, no módulo)
- Timeline semanal/mensual con TODO: salidas (con su estado de preparación), mantenimientos programados, entregas de restaurantes, vencimientos críticos (patentes, licencias, hidrostáticas, seguros)
- Filtros por tipo/departamento/embarcación; clic en un ítem salta a su módulo
- **Solo dispositivos grandes** (ajuste del usuario): computadoras e iPads — no en celulares
- **Visible para el Gerente de Operaciones y todos los superiores** (ajuste del usuario)
- Vive en el Dashboard como **"Vista Operación"** — no se duplica en otro módulo
- Solo lee datos de Activity Ops + Mantenimiento + Catálogo Dinámico + Cocina — no crea datos nuevos

### Futuros confirmados por el usuario
- **Multi-tenant:** SÍ a futuro (data-model ya preparado; panel de empresas y onboarding cuando la app madure)
- **IA (Fase 15):** SÍ a futuro — ideas registradas: sugerencias de tripulación, pronóstico de demanda por temporada, detección de anomalías (caja, inventario), chatbot de manuales/SOPs, programación inteligente de turnos
- **Reservas directas propias:** NO (Bokun permanece como el canal de reservas)
- Landing/dominio: ya en fases del plan original

(pendiente — el usuario los irá dando uno por uno)

---

---

## 7. PLAN DE CONSTRUCCIÓN POR FASES (Paso 3 — según dependencias)

Cada fase entrega un pedazo usable de la app. Principio: primero los cimientos de datos, luego el dinero y el inventario, luego la operación, luego las personas, luego el resto.

- **FASE 0 — Cimientos (Develops):** `tenant_id` en todo (multi-tenant data-model) · claves i18n ES/EN en pantallas nuevas · roles nuevos formales (Conductor, Restaurante…) · pestaña **Ubicaciones** (Locations/Groups/Types) · catálogos maestros: Proveedores, Productos, Centros de Costo, Canales de Venta, **Clientes** (con tipo Interno por departamento) · **Catálogo Dinámico de Controles** (motor de licencias/controles/pruebas con alertas)
- **FASE 1 — Inventario + Warehouse:** productos, stock por ubicación, **QR**, kardex, transferencias (con en-tránsito), mínimos, conteos cíclicos · **Flujo Canónico de Renta** completo (estados, QR doble, fianzas/abonos opcionales, vista filtrada)
- **FASE 2 — Finanzas + Ventas:** sesiones de caja + **Gran Caja** + caja chica · POS simple + regla anti-duplicación Bokun (estructurada) · cartera por vendedor + crédito empresarial con aging · Por Cobrar Bokun (payout)
- **FASE 3 — Activity Ops (Dive Ops) + Cocina + Dive Shop:** motor de actividades · sync Bokun en vivo (extras como ítems) · pizarra + tripulación aceptable + ratios con override · waivers auto-llenados + firma en recuadro + email · **generador de zarpe Norte/Sur** · logística automática al crear salida (combustible/snacks/equipos/taxis) · cierre de salida (pagos tripulación + cierre) · Dive Shop: tablero de check-in + formularios link/QR · Cocina: órdenes kanban + menú con alérgenos + cálculo automático de bebidas + rol Restaurante
- **FASE 4 — RRHH completo:** clock in/out (kiosco + celular) · onboarding/offboarding (nivel 1+2, firma dibujada) · voluntarios (plan de beneficios, canjes auto + verificación RRHH) · licencias (usuario sube + RRHH verifica + alertas) · evaluación (opción C) · nóminas con reglas Ecuador + adelantos en negativo en el rol
- **FASE 5 — Compras & Pagos + Rol de Pagos unificado:** proveedores · aprobaciones por monto (árbbol) · órdenes de compra · **rol unificado** (personal RRHH + restaurantes + proveedores + servicios) con aprobación del gerente financiero
- **FASE 6 — Movilidad + Vessels + Mantenimiento:** Conductores (rol limitado), rutas con tarifas + Google Maps link, flota externa, pagos por viaje · embarcaciones (checklist diario, consumo, patente, tripulación base) · **Mantenimiento transversal** (correctivo desde incidencias + preventivo agregado)
- **FASE 7 — Surf Ops y demás actividades:** solo configuración de perfiles (sin código nuevo — validación del motor)
- **FASE 8 — Reportes + Calendario Maestro + reportes personales**
- **FASE 9 — Futuras (ya aprobadas):** contenido ES/EN completo · offline · WhatsApp Business API · firma certificada · modo oscuro · **multi-tenant feature** · IA (Fase 15 original) · **botón 'Sugerir traducción'** en campos es/en (rellena como borrador, el usuario edita)
- **MANUAL VIVO (decisión del usuario, 2026-09-13):** al terminar la app, crear un MANUAL COMPLETO de cada función con ejemplos reales de la operación (estilo del manual que el usuario ya hizo para la app actual, pero para todo) — y enriquecerlo con IA: un **chatbot dentro de la app** que responda preguntas del equipo leyendo ese manual ("¿cómo hago una requisición urgente?", "¿qué hago si un tanque falla la hidrostática?") = manual vivo, soporte inmediato 24/7 sin molestar a nadie. Vive en Fase 9 (futuras) junto a la IA, y el contenido del manual se escribe fase por fase a medida que se construye (no al final, para no acumular).

**Notas de dependencia clave:** Ubicaciones/catálogos antes que todo · Inventario antes que Rentas y Dive Ops logística · Caja antes que Ventas POS · RRHH nóminas antes que el Rol unificado completo · Bokun API keys necesarias al iniciar Fase 3.


---

## 8. PROTOCOLO DE PROTECCIÓN DEL CÓDIGO EXISTENTE (respuesta al miedo del usuario de dañar lo construido)

Reglas OBLIGATORIAS para Kimi Code en cada fase:

1. **La app tendrá una GEMELA DE PRUEBAS** (ajuste por petición del usuario): mismo código, otra URL (ej. pruebas.waveops.app) y base de datos de prueba. **El usuario prueba SIEMPRE en la propia app (la gemela)** — nada de ambientes ajenos. Si algo se rompe ahí, no afecta datos reales. Cuando el usuario aprueba, la fase se pasa a la app real. En producción además: doble candado (punto 2) + "Departamento de Pruebas" con usuarios ficticios para el smoke test final.
2. **Todo módulo nuevo nace APAGADO** tras su propio **feature flag en Develops** (patrón que ya existe en la app). Hasta que no se valide, el módulo no es visible para nadie y no afecta nada de lo que hoy funciona.
3. **Los módulos existentes (Tasks, Horarios, Recordatorios, Develops, login) son intocables en su lógica.** Solo se les PUEDE: (a) agregar colecciones/campos NUEVOS, (b) agregar pestañas/enlaces, (c) cambiar nombres visibles (displayName). Nunca reescribir flujos que ya funcionan. Los renombres aprobados (Requisiciones→Inventario/Requisiciones, etc.) son solo de presentación.
4. **Respaldo antes de cada fase:** exportación de Firestore + punto de restauración. Si algo sale mal, se vuelve atrás completo.
5. **Lista de supervivencia (regresión):** al terminar cada fase se prueba manualmente que sigue funcionando: login y recuperación de contraseña · invitar usuarios · crear/asignar/publicar turnos · solicitudes de días libres con aprobación jerárquica · tareas extra y específicas · incidencias · recordatorios · Develops (roles, departamentos, auditoría). Si algo de eso falla, la fase no se aprueba.
6. **Una fase a la vez, con tu validación:** cada fase termina con una checklist que TÚ pruebas en staging antes de producción.
7. **Reglas de seguridad versionadas:** cambios en permisos solo aditivos hasta auditoría completa (Fase 16 original: revisión profunda de notificaciones/permisos).
8. **El prompt de cada fase incluirá estas reglas al inicio** para que Kimi Code las respete siempre.

### Flujo de trabajo con Kimi Code (registrado 2026-09-12)
- **MASTER_RESUME.md** (en la raíz del repo): es la bitácora del proyecto que Kimi Code mantiene. Cada prompt debe: (1) iniciar pidiendo LEER MASTER_RESUME.md para contexto, y (2) cerrar EXIGIENDO actualizarlo con la entrada de la entrega (qué se hizo, archivos modificados, decisiones, problemas conocidos, pendientes, fecha/build).
- **WAVEOPS_DESIGN.md** (recomendado): copiar este Documento Maestro a la raíz del repo para que Kimi Code tenga acceso al diseño completo (módulos, reglas, fases). Cada prompt puede referenciarlo por secciones.
- Cada fase se entrega con: prompt estricto + checklist de validación para el usuario en la app gemela + actualización obligatoria del MASTER_RESUME.


## 6. PROMPT DE EJECUCIÓN PARA KIMI CODE

⚠️ NO redactar todavía. Se construye al final de la fase de definición,
con base en este documento completo y validado por el usuario.
Debe ser: estricto, sin ambigüedades, ordenado por módulos, con reglas de
conexión entre módulos, roles/permisos por jerarquía y criterios de UX.

---

*Fin del documento. Próxima actualización: siguiente módulo. Pendientes sueltos para el cierre final: mapeo exacto meses Excel de voluntarios (N6), proveedor firma certificada, formato de zarpe (usuario lo adjuntará), rentas a crédito y autorización de fianzas.*
