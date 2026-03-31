# WaveOps - Sistema de Gestión de Turnos y Tareas

![WaveOps](https://img.shields.io/badge/WaveOps-v1.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-06B6D4?logo=tailwindcss)

Sistema integral para la gestión de turnos, tareas e incidencias en entornos operativos.

## 🚀 Características

### Módulos Implementados

- **👥 Autenticación** - Sistema de login con roles y permisos
- **📊 Dashboard** - Vista general con estadísticas y actividad reciente
- **📋 Tasks** - Gestión completa de tareas e incidencias
- **📅 Horarios** - Visualización de turnos y asignaciones

### Sistema de Roles (RBAC)

| Rol | Nivel | Permisos |
|-----|-------|----------|
| DIRECTOR_GENERAL | 1 | Acceso total |
| DIRECTOR | 2 | Gestión de gerentes |
| RRHH | 3 | Gestión de personal |
| GERENTE_OPERACIONES | 4 | Gestión de departamentos |
| GERENTE_DEPARTAMENTO | 5 | Gestión de supervisores |
| SUPERVISOR | 6 | Gestión de staff |
| STAFF | 7 | Solo tareas asignadas |

## 📦 Estructura del Proyecto

```
app/
├── src/
│   ├── components/
│   │   ├── modules/          # Módulos principales
│   │   │   ├── TasksModule.tsx
│   │   │   └── HorariosModule.tsx
│   │   ├── ui/               # Componentes shadcn/ui
│   │   ├── Dashboard.tsx
│   │   ├── Layout.tsx
│   │   └── LoginScreen.tsx
│   ├── hooks/                # Custom hooks
│   │   ├── useAuth.tsx
│   │   ├── useTasks.tsx
│   │   └── useShifts.tsx
│   ├── data/                 # Datos de prueba
│   │   ├── users.ts
│   │   ├── shifts.ts
│   │   ├── shiftAssignments.ts
│   │   ├── tasks.ts
│   │   └── incidencias.ts
│   ├── types/                # Tipos TypeScript
│   │   └── index.ts
│   └── lib/                  # Utilidades
│       ├── utils.ts
│       └── permissions-config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.js
```

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone https://github.com/TU_USUARIO/waveops.git

# Entrar al directorio
cd waveops/app

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## 👤 Usuarios de Prueba

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| dg | 123456 | DIRECTOR_GENERAL |
| dir | 123456 | DIRECTOR |
| rrhh | 123456 | RRHH |
| gop | 123456 | GERENTE_OPERACIONES |
| gdep | 123456 | GERENTE_DEPARTAMENTO |
| sup | 123456 | SUPERVISOR |
| staff | 123456 | STAFF |

## 📝 Funcionalidades por Módulo

### Tasks Module (Fase 2C) ✅

#### Crear Tareas
- ✅ Tareas Extra con asignación a departamentos
- ✅ Tareas Específicas con asignación a usuarios
- ✅ Incidencias con flujo completo de estados

#### Tarjetas de Tareas
- ✅ Información del creador (nombre + departamento)
- ✅ Descripción con formato preservado
- ✅ Checklist de subtareas marcables
- ✅ Notas siempre visibles
- ✅ Botones de estado funcionales
- ✅ Botón desbloquear (para autorizados)
- ✅ Supervisor asignado
- ✅ Turnos asignados
- ✅ Hora en formato 24h

#### Estados de Tareas
- `PENDING` → `IN_PROGRESS` → `COMPLETED` → `VERIFIED`
- Estados especiales: `BLOCKED`, `OVERDUE`

#### Flujo de Incidencias
- `NEW` → `OPEN` → `VERIFIED` → `RESOLVED` → `CLOSED`
- Reapertura: `CLOSED` → `REOPENED`

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo

# Construcción
npm run build        # Compilar para producción
npm run preview      # Previsualizar build

# Calidad de código
npm run lint         # Ejecutar ESLint
npx tsc --noEmit     # Verificar TypeScript
```

## 🌐 Despliegue

El proyecto está configurado para despliegue estático. El build genera archivos en la carpeta `dist/`.

### URL del Preview
https://fuusldt4ngh3y.ok.kimi.link

## 📄 Licencia

Proyecto privado - WaveOps Team

---

## 🔄 Historial de Cambios

### Fase 2C - Módulo de Tasks Completo
- Modal funcional para crear tareas e incidencias
- Tarjetas de tareas con información completa
- Sistema de estados con validaciones de permisos
- Flujo completo de incidencias
- Formato de hora 24h
- Prioridad y supervisores como botones
