#!/usr/bin/env python3
FILE = "src/components/Dashboard.tsx"
with open(FILE, "r") as f:
    content = f.read()

old = "const myPendingToday    = myTasks.filter((t) => t.dueDate === todayStr && t.status === 'PENDING').length;"
new = "const myPendingToday    = myTasks.filter((t) => t.dueDate === todayStr && t.status === 'PENDING').length;\n  const myTasksForVerification = myTasks.filter((t) => t.status === 'COMPLETED' && ((t.supervisorId === userId) || (!t.supervisorId && t.createdBy === userId))).length;"
if old in content:
    content = content.replace(old, new)
    print("[OK] Agregado myTasksForVerification")

old2 = "const totalTodayMyTasks = myPendingToday + myInProgressToday + myCompletedToday;"
new2 = "const totalTodayMyTasks = myPendingToday + myInProgressToday + myCompletedToday + myTasksForVerification;"
if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] Total incluye verificacion")

old3 = "stat1: { label: 'Hoy', value: myPendingToday },"
new3 = "stat1: { label: 'Hoy', value: myPendingToday + myTasksForVerification },"
if old3 in content:
    content = content.replace(old3, new3)
    print("[OK] Stat Hoy incluye verificacion")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
