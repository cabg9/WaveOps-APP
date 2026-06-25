#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# Revertir filtro generico y separar en casos especificos
old = "else if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));"
new = """else if (statusFilter === TaskStatus.PENDING) result = result.filter((t) => t.status === TaskStatus.PENDING || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));
    else if (statusFilter === TaskStatus.IN_PROGRESS) result = result.filter((t) => t.status === TaskStatus.IN_PROGRESS || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));
    else if (statusFilter === TaskStatus.BLOCKED) result = result.filter((t) => t.status === TaskStatus.BLOCKED);"""
if old in content:
    content = content.replace(old, new)
    print("[OK] PENDING e IN_PROGRESS incluyen verificacion; BLOCKED no")
else:
    print("[WARN] No se encont filtro generico")

# Revertir OVERDUE a original (sin supervisor)
old2 = "else if (statusFilter === TaskStatus.OVERDUE) result = result.filter((t) => (new Date(t.dueDate + 'T' + (t.dueTime || '23:59')) < new Date() && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED) || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED));"
new2 = "else if (statusFilter === TaskStatus.OVERDUE) result = result.filter((t) => new Date(t.dueDate + 'T' + (t.dueTime || '23:59')) < new Date() && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED);"
if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] OVERDUE revertido (sin verificacion)")
else:
    print("[WARN] No se encont OVERDUE con supervisor")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
