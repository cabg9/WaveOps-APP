#!/usr/bin/env python3
FILE1 = "src/hooks/firestore/useFirestoreTasks.ts"
with open(FILE1, "r") as f:
    c1 = f.read()

old = "        rating,\n        ratingNote: note,\n        updatedAt: new Date().toISOString(),"
new = "        rating,\n        ratingNote: note,\n        ratedBy: userId,\n        ratedAt: new Date().toISOString(),\n        updatedAt: new Date().toISOString(),"
if old in c1:
    c1 = c1.replace(old, new)
    print("[OK] ratedBy y ratedAt agregados")

with open(FILE1, "w") as f:
    f.write(c1)

FILE2 = "src/components/modules/TasksModule.tsx"
with open(FILE2, "r") as f:
    c2 = f.read()

old2 = "onEdit={(task) => { setEditingTask(task); setIsEditModalOpen(true); }} canReopen={hasPermission('canReopenTask')}"
new2 = "onEdit={(task) => { setEditingTask(task); setIsEditModalOpen(true); }} onRateTask={(taskId, rating, note, userId) => rateTask(taskId, rating, note, userId)} canReopen={hasPermission('canReopenTask')}"
if old2 in c2:
    c2 = c2.replace(old2, new2)
    print("[OK] onRateTask pasado al TaskCard")

with open(FILE2, "w") as f:
    f.write(c2)
print("[FINALIZADO]")
