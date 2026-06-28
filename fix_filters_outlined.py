#!/usr/bin/env python3
import re

FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

def replace_solid(text):
    text = re.sub(r"bg-\[([#0-9A-Fa-f]+)\] text-white", r"border-[\\1] text-[\\1] bg-transparent", text)
    text = text.replace("bg-corporate text-white", "border-corporate text-corporate bg-transparent")
    return text

content = replace_solid(content)
print("[OK] Filtros outlined")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
