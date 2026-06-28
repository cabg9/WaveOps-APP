#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

old = '{task.status === TaskStatus.VERIFIED && canRate && (<Button size="sm" className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white gap-1" onClick={() => setShowRateModal(true)}><ThumbsDown className="w-4 h-4" />Calificar</Button>)}'
new = '''{task.status === TaskStatus.VERIFIED && (
              <>
                {canRate && (<Button size="sm" className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white gap-1" onClick={() => setShowRateModal(true)}><ThumbsDown className="w-4 h-4" />Calificar</Button>)}
                <Button size="sm" variant="outline" onClick={() => setShowReopenModal(true)}>Marcar como Pendiente</Button>
                {task.rating === 'bad' && task.ratingNote && canRate && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-lg p-2 mt-1">
                    <p className="text-xs text-red-600 font-medium">Calificacion negativa:</p>
                    <p className="text-sm text-red-700">{task.ratingNote}</p>
                  </div>
                )}
              </>
            )}'''

if old in content:
    content = content.replace(old, new)
    print("[OK] VERIFIED section actualizada")
else:
    print("[WARN] No encontrado, buscando alternativa...")
    # Buscar con emoji
    old2 = '{task.status === TaskStatus.VERIFIED && canRate && (<Button size="sm" className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white gap-1" onClick={() => setShowRateModal(true)}><span className="text-lg">&#128542;</span>Calificar</Button>)}'
    if old2 in content:
        content = content.replace(old2, new)
        print("[OK] VERIFIED section actualizada (con emoji)")
    else:
        print("[ERROR] No se pudo encontrar el bloque")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
