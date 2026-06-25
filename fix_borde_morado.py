#!/usr/bin/env python3
"""
Fix para el borde morado - Arregla la comparacion de supervisorId
El problema: supervisorId puede ser Firestore doc ID, pero currentUser.id es email.
Este script hace las comparaciones robustas comparando por ID y por email.
"""

import re

print("=" * 70)
print("FIX BORDE MORADO - WaveOps")
print("=" * 70)

# =============================================================================
# FIX 1: TasksModule.tsx - Filtro Mis Tareas, canVerify, y borde morado
# =============================================================================

FILE1 = "src/components/modules/TasksModule.tsx"
print(f"\n[1/3] Procesando {FILE1}...")

try:
    with open(FILE1, "r") as f:
        content = f.read()
    original = content

    # PASO 1: Agregar currentUserEmail despues de currentUserId
    pattern = r"(const currentUserId = user\?\.id;)"
    if re.search(pattern, content):
        content = re.sub(pattern, r"\1\n  const currentUserEmail = user?.email;", content)
        print("  [OK] Agregada variable currentUserEmail")
    else:
        pattern2 = r"(const currentUserId = [^;]+;)"
        match = re.search(pattern2, content)
        if match:
            content = content[:match.end()] + "\n  const currentUserEmail = user?.email;" + content[match.end():]
            print("  [OK] Agregada currentUserEmail (fallback)")

    # PASO 2: Arreglar filtro "Mis Tareas" - supervisorId === user.id
    old = r"\(t\.supervisorId === user\.id && t\.status === TaskStatus\.COMPLETED\)"
    new = "((t.supervisorId === user.id || t.supervisorId === user.email) && t.status === TaskStatus.COMPLETED)"
    if re.search(old, content):
        content = re.sub(old, new, content)
        print("  [OK] Filtro Mis Tareas: supervisorId compara por id+email")

    # PASO 3: Arreglar filtro createdBy
    old = r"\(!t\.supervisorId && t\.createdBy === user\.id && t\.status === TaskStatus\.COMPLETED\)"
    new = "(!t.supervisorId && (t.createdBy === user.id || t.createdBy === user.email) && t.status === TaskStatus.COMPLETED)"
    if re.search(old, content):
        content = re.sub(old, new, content)
        print("  [OK] Filtro Mis Tareas: createdBy compara por id+email")

    # PASO 4: Arreglar canVerify (primera ocurrencia de supervisorId === currentUserId)
    idx = content.find("task.supervisorId === currentUserId")
    if idx != -1:
        content = (
            content[:idx]
            + "(task.supervisorId === currentUserId || (currentUserEmail && task.supervisorId === currentUserEmail))"
            + content[idx + len("task.supervisorId === currentUserId"):]
        )
        print("  [OK] canVerify: supervisorId compara por id+email")

    # PASO 5: Arreglar canVerify - createdBy
    old = r"\(!task\.supervisorId && task\.createdBy === currentUserId\)"
    new = "(!task.supervisorId && (task.createdBy === currentUserId || (currentUserEmail && task.createdBy === currentUserEmail)))"
    if re.search(old, content):
        content = re.sub(old, new, content)
        print("  [OK] canVerify: createdBy compara por id+email")

    # PASO 6: Arreglar borde morado (segunda ocurrencia de supervisorId === currentUserId)
    target = "task.supervisorId === currentUserId"
    positions = []
    start = 0
    while True:
        pos = content.find(target, start)
        if pos == -1:
            break
        positions.append(pos)
        start = pos + 1

    if len(positions) >= 2:
        idx = positions[1]
        content = (
            content[:idx]
            + "(task.supervisorId === currentUserId || (currentUserEmail && task.supervisorId === currentUserEmail))"
            + content[idx + len(target):]
        )
        print("  [OK] Borde morado: supervisorId compara por id+email")

    # PASO 7: Arreglar borde morado - createdBy
    target2 = "!task.supervisorId && task.createdBy === currentUserId"
    positions2 = []
    start = 0
    while True:
        pos = content.find(target2, start)
        if pos == -1:
            break
        positions2.append(pos)
        start = pos + 1

    if len(positions2) >= 2:
        idx = positions2[1]
        old_str = "!task.supervisorId && task.createdBy === currentUserId"
        new_str = "(!task.supervisorId && (task.createdBy === currentUserId || (currentUserEmail && task.createdBy === currentUserEmail)))"
        content = content[:idx] + new_str + content[idx + len(old_str):]
        print("  [OK] Borde morado: createdBy compara por id+email")

    if content != original:
        with open(FILE1, "w") as f:
            f.write(content)
        print(f"  [GUARDADO] Cambios aplicados en {FILE1}")
    else:
        print(f"  [SIN CAMBIOS] No se detectaron cambios necesarios")

except Exception as e:
    print(f"  [ERROR] {e}")


# =============================================================================
# FIX 2: TasksModule.tsx - Select de supervisor al CREAR tarea (guardar email)
# =============================================================================

print(f"\n[2/3] Procesando select de supervisor en {FILE1}...")

try:
    with open(FILE1, "r") as f:
        content = f.read()
    original = content

    for keyword in ["Supervisor", "supervisor"]:
        idx = content.find(keyword)
        if idx != -1:
            select_end = content.find("</select>", idx)
            if select_end != -1:
                section_end = select_end + len("</select>")
                section = content[idx:section_end]

                old_opt = "value={u.id}>"
                new_opt = "value={u.email || u.id}>"
                if old_opt in section:
                    section = section.replace(old_opt, new_opt)
                    content = content[:idx] + section + content[section_end:]
                    print(f"  [OK] Select de supervisor: value usa email en lugar de id")
                break

    if content != original:
        with open(FILE1, "w") as f:
            f.write(content)
        print(f"  [GUARDADO] Cambios aplicados")
    else:
        print(f"  [SIN CAMBIOS] No se detectaron cambios necesarios")

except Exception as e:
    print(f"  [ERROR] {e}")


# =============================================================================
# FIX 3: EditTaskModal.tsx - Botones de supervisor al EDITAR tarea
# =============================================================================

FILE2 = "src/components/EditTaskModal.tsx"
print(f"\n[3/3] Procesando {FILE2}...")

try:
    with open(FILE2, "r") as f:
        content = f.read()
    original = content

    old = "setSupervisorId(u.id)"
    new = "setSupervisorId(u.email || u.id)"
    if old in content:
        content = content.replace(old, new)
        print("  [OK] setSupervisorId ahora usa email")
    else:
        matches = list(re.finditer(r'setSupervisorId\(u\.id\)', content))
        if matches:
            for m in matches:
                content = content[:m.start()] + new + content[m.end():]
            print(f"  [OK] setSupervisorId ahora usa email ({len(matches)} ocurrencias)")

    old_comp = "u.id === supervisorId"
    new_comp = "(u.id === supervisorId || u.email === supervisorId)"
    if old_comp in content:
        content = content.replace(old_comp, new_comp)
        print("  [OK] Comparacion de seleccion arreglada")

    old_comp2 = "supervisorId === u.id"
    new_comp2 = "(supervisorId === u.id || supervisorId === u.email)"
    if old_comp2 in content:
        content = content.replace(old_comp2, new_comp2)
        print("  [OK] Comparacion inversa arreglada")

    if content != original:
        with open(FILE2, "w") as f:
            f.write(content)
        print(f"  [GUARDADO] Cambios aplicados en {FILE2}")
    else:
        print(f"  [SIN CAMBIOS] No se detectaron cambios necesarios")

except FileNotFoundError:
    print(f"  [SKIP] {FILE2} no encontrado")
except Exception as e:
    print(f"  [ERROR] {e}")


print("\n" + "=" * 70)
print("FIX COMPLETADO")
print("=" * 70)
print("\nResumen de cambios:")
print("  1. Filtro Mis Tareas detecta tareas para verificar por email tambien")
print("  2. Borde morado funciona comparando supervisorId con email")
print("  3. canVerify reconoce al supervisor por email")
print("  4. Al crear tarea, supervisorId guarda email en vez de id")
print("  5. Al editar tarea, supervisorId guarda email en vez de id")
print("\nAhora ejecuta: npm run build && firebase deploy")
