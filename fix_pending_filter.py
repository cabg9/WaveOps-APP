#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# 1. Filtro PENDIENTES: incluye PENDING, IN_PROGRESS, BLOCKED, y supervisor verification
old = "else if (statusFilter === TaskStatus.PENDING) result = result.filter((t) => t.status === TaskStatus.PENDING || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));"
new = "else if (statusFilter === TaskStatus.PENDING) result = result.filter((t) => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.BLOCKED || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));"
if old in content:
    content = content.replace(old, new)
    print("[OK] Filtro PENDIENTES")
else:
    print("[WARN] Filtro PENDIENTES no encontrado")

# 2. Contadores: Pendientes cuenta PENDING + IN_PROGRESS + BLOCKED + supervisor verification
old2 = """    tasksByTabAndTime.forEach((task) => {
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
    });"""

new2 = """    tasksByTabAndTime.forEach((task) => {
      const isOverdue = new Date(task.dueDate + 'T' + (task.dueTime || '23:59')) < new Date() && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.VERIFIED;
      const isPendingVerification = user && task.supervisorId === user.id && task.status === TaskStatus.COMPLETED;
      switch (task.status) {
        case TaskStatus.PENDING: counts.pending++; break;
        case TaskStatus.IN_PROGRESS: counts.inProgress++; counts.pending++; break;
        case TaskStatus.COMPLETED:
          if (isPendingVerification) { counts.pending++; counts.completed++; }
          else counts.completed++;
          break;
        case TaskStatus.VERIFIED: counts.completed++; counts.verified++; break;
        case TaskStatus.BLOCKED: counts.blocked++; counts.pending++; break;
      }
      if (isOverdue) counts.overdue++;
    });"""

if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] Contadores")
else:
    print("[WARN] Contadores no encontrados")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
