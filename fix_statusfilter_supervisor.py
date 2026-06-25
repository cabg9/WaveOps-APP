#!/usr/bin/env python3
import re

FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

cond = "currentUserId && t.supervisorId === currentUserId && t.status === TaskStatus.COMPLETED"

# 1. OVERDUE filter
content = content.replace(
    "else if (statusFilter === TaskStatus.OVERDUE) result = result.filter((t) => new Date(t.dueDate + 'T' + (t.dueTime || '23:59')) < new Date() && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED);",
    f"else if (statusFilter === TaskStatus.OVERDUE) result = result.filter((t) => (new Date(t.dueDate + 'T' + (t.dueTime || '23:59')) < new Date() && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED) || ({cond}));"
)
print("[OK] OVERDUE filter")

# 2. Generic status filter (PENDING, IN_PROGRESS, BLOCKED)
content = content.replace(
    "else if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter);",
    f"else if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter || ({cond}));"
)
print("[OK] Generic status filter (PENDING, IN_PROGRESS, BLOCKED)")

# 3. Contadores - agregar isPendingVerification
content = content.replace(
    "      if (isOverdueByDate) counts.overdue++;\n      switch (task.status) {",
    "      if (isOverdueByDate) counts.overdue++;\n      const isPendingVerification = user && task.supervisorId === user.id && task.status === TaskStatus.COMPLETED;\n      switch (task.status) {"
)
print("[OK] isPendingVerification en contadores")

# 4. Contador PENDING incluye verificacion
content = content.replace(
    "case TaskStatus.PENDING: if (!isOverdueByDate) counts.pending++; break;",
    "case TaskStatus.PENDING: if (!isOverdueByDate || isPendingVerification) counts.pending++; break;"
)
print("[OK] PENDING counter")

# 5. Contador IN_PROGRESS incluye verificacion
content = content.replace(
    "case TaskStatus.IN_PROGRESS: if (!isOverdueByDate) counts.inProgress++; break;",
    "case TaskStatus.IN_PROGRESS: if (!isOverdueByDate || isPendingVerification) counts.inProgress++; break;"
)
print("[OK] IN_PROGRESS counter")

# 6. Contador COMPLETED excluye verificacion (van a pending)
content = content.replace(
    "case TaskStatus.COMPLETED: counts.completed++; break;",
    "case TaskStatus.COMPLETED: if (!isPendingVerification) counts.completed++; break;"
)
print("[OK] COMPLETED counter")

with open(FILE, "w") as f:
    f.write(content)

print("[FINALIZADO]")
