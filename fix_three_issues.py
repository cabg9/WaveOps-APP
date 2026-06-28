#!/usr/bin/env python3
FILE = "src/components/Dashboard.tsx"
with open(FILE, "r") as f:
    content = f.read()

# 1. Barra de progreso: incluir atrasadas en el total (nunca 100% si hay atrasadas)
old_total = "const totalTodayMyTasks = myPendingToday + myInProgressToday + myCompletedToday + myTasksForVerification;"
new_total = "const totalTodayMyTasks = myPendingToday + myInProgressToday + myCompletedToday + myTasksForVerification + myOverdue;"
if old_total in content:
    content = content.replace(old_total, new_total)
    print("[OK] Barra de progreso: atrasadas incluidas en el total")

# 2. Atrasadas personales: solo donde el usuario es responsable o apoyo (no supervisor)
old_overdue = """  const myOverdue = myTasks.filter((t) => {
    if (!t.dueDate) return false;
    return t.dueDate < todayStr && t.status !== 'COMPLETED' && t.status !== 'VERIFIED';
  }).length;"""
new_overdue = """  const myOverdue = tasks.filter((t) => {
    if (!t.dueDate) return false;
    return t.dueDate < todayStr && t.status !== 'COMPLETED' && t.status !== 'VERIFIED' && userId && ((t.assignedTo?.includes(userId)) || (t.supportUserIds?.includes(userId)));
  }).length;"""
if old_overdue in content:
    content = content.replace(old_overdue, new_overdue)
    print("[OK] Atrasadas: solo tareas donde el usuario es responsable o apoyo")

with open(FILE, "w") as f:
    f.write(content)

# 3. Mostrar calificación en la tarjeta de tarea
FILE2 = "src/components/modules/TasksModule.tsx"
with open(FILE2, "r") as f:
    content2 = f.read()

# Agregar display de calificación en la sección expandida de la tarjeta
# Buscar donde se muestra "Supervisor:" y agregar después
old_supervisor = """<div className="text-sm bg-blue-50 rounded-lg p-2"><span className="text-blue-600 font-medium">Supervisor:</span> <span className="text-[#1D1D1F]">{supervisorName}</span></div>"""
new_supervisor = """<div className="text-sm bg-blue-50 rounded-lg p-2"><span className="text-blue-600 font-medium">Supervisor:</span> <span className="text-[#1D1D1F]">{supervisorName}</span></div>
            {task.rating === 'bad' && task.ratingNote && (
              <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                <div className="flex items-center gap-1 text-red-600 font-medium">
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Calificacion negativa</span>
                </div>
                <p className="text-[#1D1D1F] mt-1">{task.ratingNote}</p>
                {(() => { const rEntry = task.history?.find((h) => h.action?.includes('calificada') || h.action?.includes('Calificada')); const rater = rEntry ? getUserName(rEntry.performedBy) : '—'; return <p className="text-xs text-[#86868B] mt-1\">Por: {rater}</p>; })()}
              </div>
            )}"""
if old_supervisor in content2:
    content2 = content2.replace(old_supervisor, new_supervisor)
    print("[OK] Calificacion negativa mostrada en tarjeta expandida")
else:
    print("[WARN] Seccion de Supervisor no encontrada exacta")

with open(FILE2, "w") as f:
    f.write(content2)

print("[FINALIZADO]")
