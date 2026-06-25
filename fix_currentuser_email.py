#!/usr/bin/env python3
import re

FILE = "src/components/modules/TasksModule.tsx"

with open(FILE, "r") as f:
    content = f.read()

# 1. Eliminar la declaracion de currentUserEmail que agregamos antes
# (ya no la necesitamos porque usamos currentUser?.email directamente)
content = re.sub(r"\n\s*const currentUserEmail = user\?\.email;", "", content)

# 2. Dentro de TaskCard, reemplazar currentUserEmail por currentUser?.email
# (TaskCard recibe currentUser como prop, asi que currentUser?.email SI esta disponible)
content = content.replace("currentUserEmail", "currentUser?.email")

with open(FILE, "w") as f:
    f.write(content)

print("[OK] currentUserEmail reemplazado por currentUser?.email en todo el archivo")
print("[OK] Declaracion innecesaria eliminada")
