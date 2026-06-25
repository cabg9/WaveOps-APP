#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# YESTERDAY: quitar excepcion de verificacion (ya pasaria por dueDate === yesterday)
old = "case TimeFilter.YESTERDAY: result = result.filter((t) => t.dueDate === yesterday || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED)); break;"
new = "case TimeFilter.YESTERDAY: result = result.filter((t) => t.dueDate === yesterday); break;"
if old in content:
    content = content.replace(old, new)
    print("[OK] YESTERDAY: excepcion removida")

# TOMORROW: quitar excepcion
old = "case TimeFilter.TOMORROW: result = result.filter((t) => t.dueDate === tomorrow || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED)); break;"
new = "case TimeFilter.TOMORROW: result = result.filter((t) => t.dueDate === tomorrow); break;"
if old in content:
    content = content.replace(old, new)
    print("[OK] TOMORROW: excepcion removida")

# PAST_WEEKS: quitar excepcion (una tarea de hoy NO debe aparecer en anteriores)
old = "case TimeFilter.PAST_WEEKS: result = result.filter((t) => t.dueDate < today || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED)); break;"
new = "case TimeFilter.PAST_WEEKS: result = result.filter((t) => t.dueDate < today); break;"
if old in content:
    content = content.replace(old, new)
    print("[OK] PAST_WEEKS: excepcion removida")

# UPCOMING: quitar excepcion
old = "case TimeFilter.UPCOMING: result = result.filter((t) => t.dueDate > tomorrow || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED)); break;"
new = "case TimeFilter.UPCOMING: result = result.filter((t) => t.dueDate > tomorrow); break;"
if old in content:
    content = content.replace(old, new)
    print("[OK] UPCOMING: excepcion removida")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
