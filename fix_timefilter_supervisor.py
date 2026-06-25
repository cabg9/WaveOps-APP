#!/usr/bin/env python3
import re

FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

cond = " || (user && t.supervisorId === user.id && t.status === TaskStatus.COMPLETED)"

# TODAY
content = content.replace(
    "result = result.filter((t) => t.dueDate === today || (t.dueDate < today && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED));",
    f"result = result.filter((t) => t.dueDate === today || (t.dueDate < today && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.VERIFIED){cond});"
)
print("[OK] TODAY")

# YESTERDAY
content = content.replace(
    "result = result.filter((t) => t.dueDate === yesterday);",
    f"result = result.filter((t) => t.dueDate === yesterday{cond});"
)
print("[OK] YESTERDAY")

# TOMORROW
content = content.replace(
    "result = result.filter((t) => t.dueDate === tomorrow);",
    f"result = result.filter((t) => t.dueDate === tomorrow{cond});"
)
print("[OK] TOMORROW")

# PAST_WEEKS
content = content.replace(
    "result = result.filter((t) => t.dueDate < today);",
    f"result = result.filter((t) => t.dueDate < today{cond});"
)
print("[OK] PAST_WEEKS")

# UPCOMING
content = content.replace(
    "result = result.filter((t) => t.dueDate > tomorrow);",
    f"result = result.filter((t) => t.dueDate > tomorrow{cond});"
)
print("[OK] UPCOMING")

with open(FILE, "w") as f:
    f.write(content)

print("[FINALIZADO]")
