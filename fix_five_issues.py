#!/usr/bin/env python3
import re

FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# 1. Input time -> formato 24h
count = 0
def replace_time_input(match):
    global count
    count += 1
    full = match.group(0)
    return full.replace('type="time"', 'type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="HH:mm"')

content = re.sub(r'<Input type="time"[^>]+>', replace_time_input, content)
if count > 0:
    print(f"[OK] {count} input(s) time -> 24h")

# 2. Badge prioridad a la derecha
old_badges = """<div className="flex items-center gap-1.5 flex-shrink-0"><Badge style={{ backgroundColor: priorityColor, color: '#fff' }} className="text-xs">{getPriorityLabel(task.priority)}</Badge>{task.status === TaskStatus.COMPLETED && (<Badge className="text-xs bg-[#5856D6] text-white animate-pulse">Por verificar: {supervisorName}</Badge>)}
            {task.status === TaskStatus.VERIFIED && (<Badge className="text-xs bg-[#5856D6] text-white">Verificada</Badge>)}</div>"""

new_badges = """<div className="flex items-center gap-1.5 flex-shrink-0">{task.status === TaskStatus.COMPLETED && (<Badge className="text-xs bg-[#5856D6] text-white animate-pulse">Por verificar: {supervisorName}</Badge>)}
            {task.status === TaskStatus.VERIFIED && (<Badge className="text-xs bg-[#5856D6] text-white">Verificada</Badge>)}
            {task.rating === 'bad' && task.ratingNote && (<Badge className="text-xs bg-[#FF3B30] text-white"><ThumbsDown className="w-3 h-3 inline" /></Badge>)}
            <Badge style={{ backgroundColor: priorityColor, color: '#fff' }} className="text-xs">{getPriorityLabel(task.priority)}</Badge></div>"""

if old_badges in content:
    content = content.replace(old_badges, new_badges)
    print("[OK] Badge prioridad a la derecha")
else:
    print("[WARN] Badges no encontrados")

# 3. Eliminar emoji 😞
content = content.replace('<span className="text-2xl">&#128542;</span>Calificacion Negativa', 'Calificacion Negativa')
content = content.replace('<span>&#128542;</span>Calificar Negativamente', 'Calificar Negativamente')
print("[OK] Emojis eliminados")

# 4. Boton calificar: borde rojo
content = content.replace(
    '<Button size="sm" className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white gap-1" onClick={() => setShowRateModal(true)}><ThumbsDown className="w-4 h-4" />Calificar</Button>',
    '<Button size="sm" variant="outline" className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10 gap-1" onClick={() => setShowRateModal(true)}><ThumbsDown className="w-4 h-4" />Calificar</Button>'
)
content = content.replace(
    '<Button className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white gap-1"',
    '<Button variant="outline" className="border-[#FF3B30] text-[#FF3B30] hover:bg-[#FF3B30]/10 gap-1"'
)
print("[OK] Botones calificar: borde rojo")

# 5. Calificacion negativa en tarjeta expandida
old_supervisor = """<div className="text-sm bg-blue-50 rounded-lg p-2"><span className="text-blue-600 font-medium">Supervisor:</span> <span className="text-[#1D1D1F]">{supervisorName}</span></div>"""
new_supervisor = """<div className="text-sm bg-blue-50 rounded-lg p-2"><span className="text-blue-600 font-medium">Supervisor:</span> <span className="text-[#1D1D1F]">{supervisorName}</span></div>
            {task.rating === 'bad' && task.ratingNote && (
              <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                <div className="flex items-center gap-1 text-red-600 font-medium mb-1">
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Calificacion negativa</span>
                </div>
                <p className="text-sm text-[#1D1D1F]">{task.ratingNote}</p>
              </div>
            )}"""

if old_supervisor in content:
    content = content.replace(old_supervisor, new_supervisor)
    print("[OK] Calificacion negativa en tarjeta")
else:
    print("[WARN] Supervisor section no encontrada")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
