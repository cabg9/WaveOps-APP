#!/usr/bin/env python3
import re

FILE = "src/components/modules/TasksModule.tsx"

with open(FILE, "r") as f:
    content = f.read()

# 1. Revertir filtro Mis Tareas - volver a comparacion simple
old = r"\(\(t\.supervisorId === user\.id \|\| t\.supervisorId === user\.email\) && t\.status === TaskStatus\.COMPLETED\)"
new = "(t.supervisorId === user.id && t.status === TaskStatus.COMPLETED)"
content = re.sub(old, new, content)
print("[OK] Filtro supervisorId revertido a comparacion simple")

# 2. Revertir filtro createdBy
old = r"\(!t\.supervisorId && \(t\.createdBy === user\.id \|\| t\.createdBy === user\.email\) && t\.status === TaskStatus\.COMPLETED\)"
new = "(!t.supervisorId && t.createdBy === user.id && t.status === TaskStatus.COMPLETED)"
content = re.sub(old, new, content)
print("[OK] Filtro createdBy revertido a comparacion simple")

# 3. Revertir canVerify supervisorId - quitar comparacion por email
old = r"\(task\.supervisorId === currentUserId \|\| \(currentUser\?\.email && task\.supervisorId === currentUser\?\.email\)\)"
new = "(task.supervisorId === currentUserId)"
content = re.sub(old, new, content)
print("[OK] canVerify supervisorId revertido")

# 4. Revertir canVerify createdBy
old = r"\(task\.createdBy === currentUserId \|\| \(currentUser\?\.email && task\.createdBy === currentUser\?\.email\)\)"
new = "(task.createdBy === currentUserId)"
content = re.sub(old, new, content)
print("[OK] canVerify createdBy revertido")

# 5. Revertir borde morado supervisorId
count = 0
def revert_border_supervisor(match):
    global count
    count += 1
    if count == 2:  # segunda ocurrencia = borde morado
        return "(task.supervisorId === currentUserId)"
    return match.group(0)

old = r"\(task\.supervisorId === currentUserId \|\| \(currentUser\?\.email && task\.supervisorId === currentUser\?\.email\)\)"
content = re.sub(old, revert_border_supervisor, content)
print("[OK] Borde morado supervisorId revertido")

# 6. Revertir borde morado createdBy
count_cb = 0
def revert_border_createdby(match):
    global count_cb
    count_cb += 1
    if count_cb == 2:  # segunda ocurrencia = borde morado
        return "(task.createdBy === currentUserId)"
    return match.group(0)

old = r"\(task\.createdBy === currentUserId \|\| \(currentUser\?\.email && task\.createdBy === currentUser\?\.email\)\)"
content = re.sub(old, revert_border_createdby, content)
print("[OK] Borde morado createdBy revertido")

# 7. Limpiar cualquier currentUser?.email restante
content = content.replace("currentUser?.email", "currentUserId")

with open(FILE, "w") as f:
    f.write(content)

print("\n[OK] Todas las comparaciones revertidas a lo simple")
print("[INFO] El fix funciona porque ahora supervisorId se guarda como email")
print("[INFO] y currentUserId (user?.id) tambien es email, asi que coinciden")
