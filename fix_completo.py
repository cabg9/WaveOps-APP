#!/usr/bin/env python3
import re

FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# =============================================================================
# CAMBIO 1: Contadores - contar TODAS las tareas que aparecen en cada filtro
# =============================================================================
old = """  const filteredTaskCounts = useMemo(() => {
    const counts = { total: tasksByTabAndTime.length, pending: 0, inProgress: 0, completed: 0, verified: 0, blocked: 0, overdue: 0 };
    tasksByTabAndTime.forEach((task) => {
      // Calcular si esta atrasada por fecha (independiente del status)
      const isOverdueByDate = new Date(task.dueDate + 'T' + (task.dueTime || '23:59')) < new Date() && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.VERIFIED;
      if (isOverdueByDate) counts.overdue++;
      const isPendingVerification = user && task.supervisorId === user.id && task.status === TaskStatus.COMPLETED;
      switch (task.status) {
        case TaskStatus.PENDING: if (!isOverdueByDate || isPendingVerification) counts.pending++; break;
        case TaskStatus.IN_PROGRESS: if (!isOverdueByDate || isPendingVerification) counts.inProgress++; break;
        case TaskStatus.COMPLETED: if (!isPendingVerification) counts.completed++; break;
        case TaskStatus.VERIFIED: counts.completed++; counts.verified++; break;
        case TaskStatus.BLOCKED: counts.blocked++; break;
      }
    });
    return counts;
  }, [tasksByTabAndTime]);"""

new = """  const filteredTaskCounts = useMemo(() => {
    const counts = { total: tasksByTabAndTime.length, pending: 0, inProgress: 0, completed: 0, verified: 0, blocked: 0, overdue: 0 };
    tasksByTabAndTime.forEach((task) => {
      const isOverdue = new Date(task.dueDate + 'T' + (task.dueTime || '23:59')) < new Date() && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.VERIFIED;
      const isPendingVerification = user && task.supervisorId === user.id && task.status === TaskStatus.COMPLETED;
      switch (task.status) {
        case TaskStatus.PENDING: counts.pending++; break;
        case TaskStatus.IN_PROGRESS: counts.inProgress++; break;
        case TaskStatus.COMPLETED: counts.completed++; break;
        case TaskStatus.VERIFIED: counts.completed++; counts.verified++; break;
        case TaskStatus.BLOCKED: counts.blocked++; break;
      }
      if (isPendingVerification) { counts.pending++; counts.inProgress++; }
      if (isOverdue) counts.overdue++;
    });
    return counts;
  }, [tasksByTabAndTime]);"""

if old in content:
    content = content.replace(old, new)
    print("[OK] Contadores: cada estado cuenta sus tareas incluyendo atrasadas")
else:
    print("[WARN] No se encont bloque de contadores")

# =============================================================================
# CAMBIO 2: Agregar case VERIFIED en filteredTasks
# =============================================================================
old2 = "    else if (statusFilter === TaskStatus.BLOCKED) result = result.filter((t) => t.status === TaskStatus.BLOCKED);"
new2 = "    else if (statusFilter === TaskStatus.BLOCKED) result = result.filter((t) => t.status === TaskStatus.BLOCKED);\n    else if (statusFilter === TaskStatus.VERIFIED) result = result.filter((t) => t.status === TaskStatus.VERIFIED);"
if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] VERIFIED: solo muestra tareas VERIFIED (no COMPLETED)")
else:
    print("[WARN] No se encont case BLOCKED para agregar VERIFIED")

# =============================================================================
# CAMBIO 3: Ocultar Completadas/Verificadas/Atrasadas en Manana y Proximas
# =============================================================================
# Las 4 lineas de botones a reemplazar
old3 = """              <button onClick={() => setStatusFilter(TaskStatus.COMPLETED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.COMPLETED ? 'bg-[#34C759] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.completed}</span><span>Completadas</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.VERIFIED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.VERIFIED ? 'bg-[#5856D6] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.verified}</span><span>Verificadas</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.BLOCKED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.BLOCKED ? 'bg-[#FF9500] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.blocked}</span><span>Bloqueadas</span></button>
              <button onClick={() => setStatusFilter(TaskStatus.OVERDUE)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.OVERDUE ? 'bg-[#FF3B30] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.overdue}</span><span>Atrasadas</span></button>"""

new3 = """              {timeFilter !== TimeFilter.TOMORROW && timeFilter !== TimeFilter.UPCOMING && (<>
                <button onClick={() => setStatusFilter(TaskStatus.COMPLETED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.COMPLETED ? 'bg-[#34C759] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.completed}</span><span>Completadas</span></button>
                <button onClick={() => setStatusFilter(TaskStatus.VERIFIED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.VERIFIED ? 'bg-[#5856D6] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.verified}</span><span>Verificadas</span></button>
              </>)}
              <button onClick={() => setStatusFilter(TaskStatus.BLOCKED)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.BLOCKED ? 'bg-[#FF9500] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.blocked}</span><span>Bloqueadas</span></button>
              {timeFilter !== TimeFilter.TOMORROW && timeFilter !== TimeFilter.UPCOMING && (
                <button onClick={() => setStatusFilter(TaskStatus.OVERDUE)} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all', statusFilter === TaskStatus.OVERDUE ? 'bg-[#FF3B30] text-white' : 'bg-white text-[#86868B] border border-[#E5E5E7] hover:text-[#1D1D1F]')}><span className="font-semibold">{filteredTaskCounts.overdue}</span><span>Atrasadas</span></button>
              )}"""

if old3 in content:
    content = content.replace(old3, new3)
    print("[OK] Botones Completadas/Verificadas/Atrasadas ocultos en Manana/Proximas")
else:
    print("[WARN] No se encont bloque de botones")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
