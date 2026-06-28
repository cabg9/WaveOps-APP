#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# Condicion: supervisor asignado O creador sin supervisor
cond = "(user && (t.supervisorId === user.id || (!t.supervisorId && t.createdBy === user.id)) && t.status === TaskStatus.COMPLETED)"

# 1. PENDIENTES
old1 = "else if (statusFilter === TaskStatus.PENDING) result = result.filter((t) => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.BLOCKED || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));"
new1 = f"else if (statusFilter === TaskStatus.PENDING) result = result.filter((t) => t.status === TaskStatus.PENDING || t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.BLOCKED || {cond});"
if old1 in content:
    content = content.replace(old1, new1)
    print("[OK] PENDIENTES")

# 2. EN PROGRESO
old2 = "else if (statusFilter === TaskStatus.IN_PROGRESS) result = result.filter((t) => t.status === TaskStatus.IN_PROGRESS || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));"
new2 = f"else if (statusFilter === TaskStatus.IN_PROGRESS) result = result.filter((t) => t.status === TaskStatus.IN_PROGRESS || {cond});"
if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] EN PROGRESO")

# 3. ATRASADAS
old3 = "else if (statusFilter === TaskStatus.OVERDUE) result = result.filter((t) => new Date(t.dueDate + 'T' + (t.dueTime || '23:59')) < new Date() && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED);"
new3 = f"else if (statusFilter === TaskStatus.OVERDUE) result = result.filter((t) => (new Date(t.dueDate + 'T' + (t.dueTime || '23:59')) < new Date() && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED) || {cond});"
if old3 in content:
    content = content.replace(old3, new3)
    print("[OK] ATRASADAS")

# 4. Contadores
old4 = "const isPendingVerification = user && task.supervisorId === user.id && task.status === TaskStatus.COMPLETED;"
new4 = "const isPendingVerification = user && (task.supervisorId === user.id || (!task.supervisorId && task.createdBy === user.id)) && task.status === TaskStatus.COMPLETED;"
if old4 in content:
    content = content.replace(old4, new4)
    print("[OK] Contadores")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
