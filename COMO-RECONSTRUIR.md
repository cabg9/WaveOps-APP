# WAVEOPS - GUÍA COMPLETA DE RECONSTRUCCIÓN

> **Última actualización:** Marzo 2025  
> **Versión:** 1.0.0.0  
> **Autor:** Desarrollador original + Documentación para continuidad

---

## 📦 STACK TECNOLÓGICO

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | Framework UI |
| TypeScript | 5.x | Tipado estático |
| Vite | 6.x | Build tool y dev server |
| Tailwind CSS | 3.x | Estilos utilitarios |
| shadcn/ui | Latest | Componentes UI base |
| @dnd-kit | Latest | Drag & Drop funcionalidad |
| date-fns | Latest | Manipulación de fechas |
| Lucide React | Latest | Iconos |
| Radix UI | Latest | Primitives para shadcn |

---

## 🚀 INSTALACIÓN RÁPIDA

```bash
# 1. Clonar repositorio
git clone https://github.com/cabg9/WaveOps.git

# 2. Entrar a la carpeta
cd WaveOps

# 3. Instalar dependencias
npm install

# 4. Iniciar servidor de desarrollo
npm run dev

# 5. Abrir navegador en http://localhost:5173
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
WaveOps/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── table.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── menubar.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── toggle.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   ├── resizable.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── input-otp.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── command.tsx
│   │   │   ├── form.tsx
│   │   │   ├── label.tsx
│   │   │   ├── aspect-ratio.tsx
│   │   │   ├── kbd.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── empty.tsx
│   │   │   ├── item.tsx
│   │   │   ├── field.tsx
│   │   │   ├── input-group.tsx
│   │   │   ├── button-group.tsx
│   │   │   └── sidebar.tsx
│   │   ├── Layout.tsx         # Layout principal con sidebar
│   │   ├── LoginScreen.tsx    # Pantalla de login
│   │   ├── Dashboard.tsx      # Dashboard principal
│   │   └── modules/
│   │       ├── TasksModule.tsx     # Módulo de tareas
│   │       └── HorariosModule.tsx  # Módulo de horarios
│   ├── hooks/
│   │   ├── useAuth.tsx        # Hook de autenticación
│   │   ├── useTasks.tsx       # Hook de gestión de tareas
│   │   ├── useShifts.tsx      # Hook de gestión de horarios
│   │   └── use-mobile.ts      # Hook para detectar móvil
│   ├── lib/
│   │   ├── utils.ts           # Utilidades (cn, etc.)
│   │   └── permissions-config.ts  # Configuración de permisos RBAC
│   ├── data/
│   │   ├── users.ts           # Datos de usuarios mock
│   │   ├── tasks.ts           # Datos de tareas mock
│   │   ├── shifts.ts          # Datos de horarios mock
│   │   └── incidencias.ts     # Datos de incidencias mock
│   ├── types/
│   │   └── index.ts           # Tipos TypeScript globales
│   ├── App.tsx                # Componente principal
│   ├── App.css                # Estilos adicionales
│   ├── index.css              # Estilos globales + Tailwind
│   └── main.tsx               # Punto de entrada
├── index.html                 # HTML principal
├── package.json               # Dependencias
├── vite.config.ts             # Configuración Vite
├── tailwind.config.js         # Configuración Tailwind
├── tsconfig.json              # Configuración TypeScript
├── components.json            # Configuración shadcn/ui
├── README.md                  # Documentación general
├── GITHUB_SETUP.md            # Guía de setup GitHub
└── COMO-RECONSTRUIR.md        # ESTE ARCHIVO
```

---

## 🎨 SISTEMA DE DISEÑO

### Paleta de Colores

| Uso | Color | Tailwind |
|-----|-------|----------|
| Sidebar (fondo) | Gris oscuro | `bg-slate-900` |
| Sidebar (texto) | Gris claro | `text-slate-300` |
| Sidebar (activo) | Azul | `bg-blue-600` |
| Contenido (fondo) | Gris muy claro | `bg-slate-50` |
| Primario | Azul | `blue-600` |
| Éxito | Verde | `green-500` |
| Advertencia | Ámbar | `amber-500` |
| Error | Rojo | `red-500` |
| Información | Azul claro | `blue-500` |

### Tipografía
- **Font:** Inter (default de Tailwind)
- **Tamaños:** Usar clases de Tailwind (text-sm, text-base, text-lg, etc.)

### Espaciado
- Usar sistema de Tailwind (p-4, m-2, gap-3, etc.)
- Sidebar width: `w-64` (16rem / 256px)

---

## 👤 SISTEMA DE USUARIOS

### Usuarios de Prueba (Login)

| Email | Contraseña | Rol | Nombre |
|-------|------------|-----|--------|
| superadmin@waveops.com | password | Super Admin | Super Admin |
| admin@waveops.com | password | Admin | Admin User |
| manager@waveops.com | password | Manager | Manager User |
| supervisor@waveops.com | password | Supervisor | Supervisor User |
| teamlead@waveops.com | password | Team Lead | Team Lead |
| senior@waveops.com | password | Senior | Senior Staff |
| junior@waveops.com | password | Junior | Junior Staff |

### Jerarquía de Roles (de mayor a menor)
1. **Super Admin** - Acceso total
2. **Admin** - Acceso administrativo
3. **Manager** - Gestión de equipo
4. **Supervisor** - Supervisión
5. **Team Lead** - Líder de equipo
6. **Senior** - Staff senior
7. **Junior** - Staff junior

---

## 🔐 SISTEMA DE PERMISOS (RBAC)

### Módulos de la Aplicación

1. **Dashboard** - Vista general
2. **Tareas** - Gestión de tareas
3. **Horarios** - Gestión de horarios
4. **Equipo** - Gestión de equipo
5. **Reportes** - Reportes y análisis
6. **Configuración** - Configuración del sistema
7. **Develops** - Área de desarrollo
8. **Notificaciones** - Centro de notificaciones
9. **Mi Perfil** - Perfil de usuario
10. **Ayuda** - Centro de ayuda

### Niveles de Permiso

| Nivel | Descripción |
|-------|-------------|
| `none` | Sin acceso |
| `view` | Solo ver |
| `edit` | Ver y editar propio |
| `manage` | Gestionar todo |
| `admin` | Acceso administrativo |
| `full` | Control total |

### Función de Verificación

```typescript
// Verificar si usuario tiene permiso
const canView = hasPermission(userRole, 'tasks', 'view');
const canEdit = hasPermission(userRole, 'tasks', 'edit');
const canManage = hasPermission(userRole, 'tasks', 'manage');
```

---

## 📋 TIPOS DE DATOS PRINCIPALES

### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  active: boolean;
}
```

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId: string;
  dueDate: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
```

### Shift (Horario)
```typescript
interface Shift {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'regular' | 'extra' | 'rest' | 'vacation' | 'absent';
  notes?: string;
}
```

### Incidencia
```typescript
interface Incidencia {
  id: string;
  taskId: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  status: 'open' | 'in-progress' | 'resolved';
}
```

---

## 🧩 COMPONENTES PRINCIPALES

### 1. LoginScreen.tsx

**Función:** Pantalla de autenticación

**Características:**
- Formulario de email y contraseña
- Lista desplegable de usuarios de prueba
- Validación básica
- Redirección al dashboard tras login

**Estado:**
- `email`: string
- `password`: string
- `error`: string | null

---

### 2. Layout.tsx

**Función:** Layout principal con navegación

**Características:**
- Sidebar fijo a la izquierda
- Header con notificaciones y perfil
- Área de contenido dinámico
- Menú de 10 módulos con iconos
- Badge de notificaciones
- Dropdown de usuario

**Props:**
- `children`: ReactNode - Contenido a mostrar

**Módulos del menú:**
1. Dashboard (LayoutDashboard)
2. Tareas (ClipboardList)
3. Horarios (Calendar)
4. Equipo (Users)
5. Reportes (BarChart3)
6. Configuración (Settings)
7. Develops (Code)
8. Notificaciones (Bell)
9. Mi Perfil (User)
10. Ayuda (HelpCircle)

---

### 3. Dashboard.tsx

**Función:** Vista general del sistema

**Características:**
- Grid de tarjetas con métricas
- Tareas pendientes por prioridad
- Turnos de hoy
- Tareas recientes
- Accesos rápidos

**Métricas mostradas:**
- Tareas pendientes
- Tareas en progreso
- Turnos hoy
- Miembros activos

---

### 4. TasksModule.tsx

**Función:** Gestión completa de tareas

**Características:**
- **Tabs:** Mis Tareas, Asignadas por Mí, Todas, Incidencias
- **Filtros:** Estado, Prioridad, Asignado, Búsqueda
- **Cards:** Vista de tarjetas con toda la info
- **Modal:** Crear/Editar tarea
- **Incidencias:** Modal para ver/agregar incidencias por tarea
- **Paginación:** Navegación por páginas

**Funcionalidades:**
- Crear nueva tarea
- Editar tarea existente
- Cambiar estado (drag & drop o botones)
- Filtrar por múltiples criterios
- Buscar por texto
- Ver incidencias
- Agregar incidencia

**Estados de tarea:**
- `pending` - Pendiente
- `in-progress` - En progreso
- `completed` - Completada
- `cancelled` - Cancelada

**Prioridades:**
- `low` - Baja (verde)
- `medium` - Media (azul)
- `high` - Alta (naranja)
- `urgent` - Urgente (rojo)

---

### 5. HorariosModule.tsx

**Función:** Gestión de horarios y turnos

**Características:**
- **3 Tabs:** Mi Horario, Equipo, Asignar

#### Tab "Mi Horario"
- Calendario semanal personal
- Vista de turnos del usuario logueado
- Indicadores visuales por tipo de turno

#### Tab "Equipo"
- Vista semanal de todo el equipo
- Tabla con usuarios y sus turnos
- Filtro por semana

#### Tab "Asignar" (DRAG & DROP)
- **Panel izquierdo:** Usuarios disponibles (draggables)
- **Panel derecho:** Calendario semanal con slots (droppables)
- Funcionalidad drag & drop con @dnd-kit
- Asignar turnos arrastrando usuarios a slots

**Tipos de turno:**
- `regular` - Regular (azul)
- `extra` - Extra (verde)
- `rest` - Descanso (gris)
- `vacation` - Vacaciones (púrpura)
- `absent` - Ausente (rojo)

**Implementación DnD:**
- Usa `@dnd-kit/core` y `@dnd-kit/sortable`
- `DndContext` envuelve la zona de drag
- `useDraggable` para usuarios
- `useDroppable` para slots del calendario
- `onDragEnd` maneja la asignación

---

## 🪝 HOOKS PERSONALIZADOS

### useAuth()

**Propósito:** Manejar autenticación

**Retorna:**
```typescript
{
  user: User | null;           // Usuario actual
  login: (email, password) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}
```

**Uso:**
```typescript
const { user, login, logout } = useAuth();
```

---

### useTasks()

**Propósito:** Gestionar tareas

**Retorna:**
```typescript
{
  tasks: Task[];               // Todas las tareas
  myTasks: Task[];             // Tareas del usuario
  tasksAssignedByMe: Task[];   // Tareas asignadas por el usuario
  createTask: (task) => void;
  updateTask: (id, updates) => void;
  deleteTask: (id) => void;
  getTaskById: (id) => Task | undefined;
  getTasksByStatus: (status) => Task[];
  getTasksByPriority: (priority) => Task[];
  getTasksByAssignee: (userId) => Task[];
  getOverdueTasks: () => Task[];
  getTasksDueToday: () => Task[];
  getTaskStats: () => TaskStats;
}
```

---

### useShifts()

**Propósito:** Gestionar horarios

**Retorna:**
```typescript
{
  shifts: Shift[];             // Todos los turnos
  myShifts: Shift[];           // Turnos del usuario
  teamShifts: Shift[];         // Turnos del equipo
  createShift: (shift) => void;
  updateShift: (id, updates) => void;
  deleteShift: (id) => void;
  getShiftById: (id) => Shift | undefined;
  getShiftsByUser: (userId) => Shift[];
  getShiftsByDate: (date) => Shift[];
  getShiftsByDateRange: (start, end) => Shift[];
  getTodayShifts: () => Shift[];
  getUpcomingShifts: (days) => Shift[];
  getShiftStats: () => ShiftStats;
}
```

---

## 📦 DATOS MOCK

### Ubicación
- `src/data/users.ts` - 7 usuarios de prueba
- `src/data/tasks.ts` - ~20 tareas de ejemplo
- `src/data/shifts.ts` - ~15 turnos de ejemplo
- `src/data/incidencias.ts` - ~10 incidencias de ejemplo

### Nota importante
Los datos son **estáticos** (almacenados en memoria). Al recargar la página, los cambios se pierden.

**Para persistencia real:**
- Conectar con Firebase
- O usar localStorage
- O implementar backend API

---

## 🎯 FLUJOS DE USUARIO

### Flujo 1: Login
1. Usuario ve pantalla de login
2. Selecciona usuario del dropdown o escribe email
3. Escribe contraseña ("password")
4. Clic en "Iniciar Sesión"
5. Redirige a Dashboard

### Flujo 2: Crear Tarea
1. Usuario va a módulo "Tareas"
2. Clic en botón "Nueva Tarea"
3. Llena formulario (título, descripción, prioridad, asignado, fecha)
4. Clic en "Crear Tarea"
5. Tarea aparece en la lista

### Flujo 3: Asignar Turno (Drag & Drop)
1. Usuario va a módulo "Horarios"
2. Clic en tab "Asignar"
3. Arrastra usuario del panel izquierdo
4. Suelta en slot del calendario (derecha)
5. Turno se crea automáticamente

### Flujo 4: Ver Incidencias
1. Usuario va a módulo "Tareas"
2. Clic en botón de incidencias de una tarea
3. Se abre modal con lista de incidencias
4. Puede agregar nueva incidencia

---

## 🔧 COMANDOS ÚTILES

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar build
npm run preview

# Linting
npm run lint
```

---

## 🐛 DEPURACIÓN

### Problemas comunes

**1. Error "Cannot find module"**
```bash
# Solución: Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

**2. Error de TypeScript**
```bash
# Verificar tipos
npx tsc --noEmit
```

**3. Puerto ocupado**
```bash
# Cambiar puerto
npm run dev -- --port 3000
```

---

## 🚀 DESPLIEGUE

### Opción 1: Vercel (Recomendado)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar
vercel
```

### Opción 2: Netlify
1. Conectar repositorio GitHub
2. Build command: `npm run build`
3. Publish directory: `dist`

### Opción 3: GitHub Pages
```bash
# Instalar gh-pages
npm i -D gh-pages

# Agregar a package.json:
# "homepage": "https://cabg9.github.io/WaveOps"
# "scripts": { "deploy": "gh-pages -d dist" }

# Desplegar
npm run build
npm run deploy
```

---

## 📸 REFERENCIAS VISUALES

Para replicar el diseño EXACTO, solicitar al cliente:
1. Screenshots del dashboard
2. Screenshots del módulo de tareas
3. Screenshots del módulo de horarios
4. Screenshots del menú lateral

Las fotos deben mostrar:
- Colores exactos
- Espaciado
- Tipografía
- Layout responsive

---

## 📝 CHECKLIST DE RECONSTRUCCIÓN

- [ ] Clonar repositorio
- [ ] Instalar dependencias (`npm install`)
- [ ] Verificar que corre localmente (`npm run dev`)
- [ ] Revisar todos los módulos funcionan
- [ ] Verificar login con usuarios de prueba
- [ ] Probar drag & drop en horarios
- [ ] Probar creación/edición de tareas
- [ ] Verificar permisos por rol
- [ ] Compilar para producción (`npm run build`)
- [ ] Desplegar en hosting

---

## 📞 CONTACTO Y SOPORTE

**Propietario del proyecto:** cabg9  
**Repositorio:** https://github.com/cabg9/WaveOps  
**Versión actual:** 1.0.0.0

---

## 🔄 HISTORIAL DE VERSIONES

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0.0 | Mar 2025 | Versión inicial - Dashboard, Tareas, Horarios con DnD |

---

> **NOTA PARA DESARROLLADORES FUTUROS:**  
> Esta app fue construida con mucho cuidado siguiendo especificaciones visuales exactas proporcionadas por el cliente. Antes de hacer cambios significativos, consultar con el cliente y revisar las fotos de referencia si están disponibles.
