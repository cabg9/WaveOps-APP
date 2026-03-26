# 🌊 WaveOps

Sistema de Gestión Operativa

## 📋 Descripción

Aplicación web para la gestión de tareas, horarios, incidencias y operaciones.

## 🚀 Tecnologías

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** React Context API
- **Drag & Drop:** @dnd-kit
- **Icons:** Lucide React

## 📦 Instalación

```bash
# Clonar repositorio
git clone https://github.com/cabg9/waveops.git
cd waveops

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build
```

## 🔑 Credenciales Demo

- **Email:** `andres.bonilla@waveops.com`
- **Contraseña:** Cualquiera (mínimo 6 caracteres)

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── modules/          # Módulos principales
│   │   ├── TasksModule.tsx
│   │   └── HorariosModule.tsx
│   ├── ui/               # Componentes shadcn
│   ├── Layout.tsx
│   ├── Dashboard.tsx
│   └── LoginScreen.tsx
├── data/                 # Datos iniciales
│   ├── users.ts
│   ├── shifts.ts
│   ├── tasks.ts
│   └── incidencias.ts
├── hooks/                # Custom hooks
│   ├── useAuth.tsx
│   ├── useTasks.tsx
│   └── useShifts.tsx
├── lib/                  # Utilidades
│   ├── permissions-config.ts
│   └── utils.ts
├── types/                # TypeScript types
│   └── index.ts
└── App.tsx
```

## 🎯 Módulos

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Vista principal con resumen de operaciones |
| **Tasks** | Gestión de tareas e incidencias |
| **Horarios** | Mi Horario, Equipo, Asignar (Drag & Drop) |
| **Dive Ops** | Operaciones de buceo (placeholder) |
| **Vessels** | Gestión de embarcaciones (placeholder) |
| **Movilidad** | Gestión de vehículos (placeholder) |
| **Requisiciones** | Pedidos y aprobaciones (placeholder) |
| **Órdenes de Pago** | Pagos y aprobaciones (placeholder) |
| **Reportes** | Estadísticas (placeholder) |
| **Develops** | Configuración avanzada (solo nivel 1) |

## 👥 Roles y Permisos

| Nivel | Rol | Permisos |
|-------|-----|----------|
| 1 | Director General | Todo |
| 2 | Director | Todo excepto Develops |
| 3 | RRHH | Gestión de personal |
| 4 | Gerente Operaciones | Todo operativo |
| 5 | Gerente Departamento | Su departamento |
| 6 | Supervisor | Su departamento, menos permisos |
| 7 | Staff | Operaciones básicas |

## 🏷️ Versiones

```
V1.0.0.0 - Fundamentos (Tipos, Datos, Permisos, Hooks)
V1.0.0.1 - Layout y Login
V1.0.0.2 - Dashboard
V1.3.0.0 - Tasks Base
V1.3.1.0 - Tasks Core (Tarjetas, Modal, Incidencias)
V1.3.10.0 - Horarios con Drag & Drop
```

## 📝 Licencia

Proyecto privado
