#!/usr/bin/env python3
import re

FILE = "src/components/Dashboard.tsx"
with open(FILE, "r") as f:
    content = f.read()

# 1. Agregar 'tasks' al hook
content = content.replace(
    "const { getTaskCounts } = useTasks();",
    "const { tasks, getTaskCounts } = useTasks();"
)
print("[OK] tasks agregado al hook")

# 2. Agregar calculos personales
old = "  const taskCounts = getTaskCounts();"
new = """  const taskCounts = getTaskCounts();

  // ─── CONTEOS PERSONALES DEL USUARIO ACTUAL ───
  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getLocalDate();

  const userId = user?.id;
  const myTasks = userId ? tasks.filter((t) =>
    (t.assignedTo?.includes(userId)) ||
    (t.supportUserIds?.includes(userId)) ||
    (t.supervisorId === userId)
  ) : [];

  const myPendingToday    = myTasks.filter((t) => t.dueDate === todayStr && t.status === 'PENDING').length;
  const myInProgressToday = myTasks.filter((t) => t.dueDate === todayStr && t.status === 'IN_PROGRESS').length;
  const myCompletedToday  = myTasks.filter((t) => t.dueDate === todayStr && t.status === 'COMPLETED').length;
  const myOverdue = myTasks.filter((t) => {
    if (!t.dueDate) return false;
    return t.dueDate < todayStr && t.status !== 'COMPLETED' && t.status !== 'VERIFIED';
  }).length;

  const totalTodayMyTasks = myPendingToday + myInProgressToday + myCompletedToday;
  const progressPercent = totalTodayMyTasks > 0 ? Math.round((myCompletedToday / totalTodayMyTasks) * 100) : 0;"""

content = content.replace(old, new)
print("[OK] Conteos personales agregados")

# 3. Agregar prop progress a interface
content = content.replace(
    "bottomStatus: 'active' | 'inactive' | 'progress';",
    "bottomStatus: 'active' | 'inactive' | 'progress';\\n  progress?: number;"
)
print("[OK] prop progress agregada")

# 4. Agregar progress a destructuring
content = content.replace(
    """  bottomStatus,
  onClick,""",
    """  bottomStatus,
  progress,
  onClick,"""
)
print("[OK] progress en destructuring")

# 5. Reemplazar bottom con barra de progreso opcional
old_bottom = """      {/* Bottom */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            bottomStatus === 'active' && 'bg-[#34C759]',
            bottomStatus === 'inactive' && 'bg-[#8E8E93]',
            bottomStatus === 'progress' && 'bg-[#FF9500]'
          )}
        />
        <span className="text-xs text-[#86868B]">{bottomText}</span>
      </div>"""

new_bottom = """      {/* Bottom */}
      {progress !== undefined ? (
        <div className="mt-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#86868B]">{bottomText}</span>
            <span className="font-semibold text-[#1D1D1F]">{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#E5E5E7] rounded-full overflow-hidden">
            <div className="h-full bg-corporate rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              bottomStatus === 'active' && 'bg-[#34C759]',
              bottomStatus === 'inactive' && 'bg-[#8E8E93]',
              bottomStatus === 'progress' && 'bg-[#FF9500]'
            )}
          />
          <span className="text-xs text-[#86868B]">{bottomText}</span>
        </div>
      )}"""

if old_bottom in content:
    content = content.replace(old_bottom, new_bottom)
    print("[OK] Bottom reemplazado con barra de progreso")
else:
    print("[WARN] Bottom exacto no encontrado")

# 6. Actualizar modulo Tasks
old_tasks = """    {
      id: 'tasks',
      title: 'Tasks',
      icon: ClipboardList,
      iconColor: 'text-corporate',
      bgColor: 'bg-corporate/10',
      stat1: { label: 'Hoy', value: taskCounts.pending + taskCounts.inProgress },
      stat2: { label: 'Atrasados', value: taskCounts.overdue },
      bottomText: 'Progreso',
      bottomStatus: 'progress' as const,
    },"""

new_tasks = """    {
      id: 'tasks',
      title: 'Tasks',
      icon: ClipboardList,
      iconColor: 'text-corporate',
      bgColor: 'bg-corporate/10',
      stat1: { label: 'Hoy', value: myPendingToday },
      stat2: { label: 'Atrasadas', value: myOverdue },
      bottomText: 'Progreso',
      bottomStatus: 'progress' as const,
      progress: progressPercent,
    },"""

if old_tasks in content:
    content = content.replace(old_tasks, new_tasks)
    print("[OK] Modulo Tasks actualizado")
else:
    print("[WARN] Modulo Tasks exacto no encontrado")

with open(FILE, "w") as f:
    f.write(content)

print("[FINALIZADO]")
