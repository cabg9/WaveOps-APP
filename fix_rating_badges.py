#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# 1. Eliminar primer bloque de calificacion (sin "Por: {rater}")
old = """            {task.rating === 'bad' && task.ratingNote && (
              <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                <div className="flex items-center gap-1 text-red-600 font-medium mb-1">
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>Calificacion negativa</span>
                </div>
                <p className="text-sm text-[#1D1D1F]">{task.ratingNote}</p>
              </div>
            )}"""

if old in content:
    content = content.replace(old, "")
    print("[OK] Primer bloque eliminado")
else:
    print("[WARN] Primer bloque no encontrado")

# 2. Agregar fecha/hora en gris al "Por: {rater}"
old2 = "{(() => { const rEntry = task.history?.find((h) => h.action?.includes('calificada') || h.action?.includes('Calificada')); const rater = rEntry ? getUserName(rEntry.performedBy) : '—'; return <p className=\"text-xs text-[#86868B] mt-1\">Por: {rater}</p>; })()}"
new2 = "{(() => { const rEntry = task.history?.find((h) => h.action?.includes('calificada') || h.action?.includes('Calificada')); const rater = rEntry ? getUserName(rEntry.performedBy) : '—'; const rDate = rEntry?.performedAt ? formatRelativeTime(rEntry.performedAt) : ''; return <p className=\"text-xs text-[#86868B] mt-1\">Por: {rater}{rDate && <span> · {rDate}</span>}</p>; })()}"
if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] Fecha/hora agregada")
else:
    print("[WARN] Segundo bloque no encontrado")

# 3. Badges a outlined
content = content.replace(
    '<Badge className="text-xs bg-[#5856D6] text-white animate-pulse">Por verificar:',
    '<Badge variant="outline" className="text-xs border-[#5856D6] text-[#5856D6] animate-pulse">Por verificar:'
)
content = content.replace(
    '<Badge className="text-xs bg-[#5856D6] text-white">Verificada</Badge>',
    '<Badge variant="outline" className="text-xs border-[#5856D6] text-[#5856D6]\">Verificada</Badge>'
)
content = content.replace(
    '<Badge className="text-xs bg-[#FF3B30] text-white"><ThumbsDown',
    '<Badge variant="outline" className="text-xs border-[#FF3B30] text-[#FF3B30]\"><ThumbsDown'
)
content = content.replace(
    "style={{ backgroundColor: priorityColor, color: '#fff' }}",
    "style={{ borderColor: priorityColor, color: priorityColor, backgroundColor: 'transparent' }}"
)
print("[OK] Badges a outlined")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
