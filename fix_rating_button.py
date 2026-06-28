#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# 1. Agregar canRate despues de canVerify
old1 = "const canVerify = currentUserId && ((task.supervisorId === currentUserId) || (!task.supervisorId && (task.createdBy === currentUserId)) || currentUser?.role === Role.GERENTE_DEPARTAMENTO || currentUser?.role === Role.SUPERVISOR || currentUser?.role === Role.GERENTE_OPERACIONES || currentUser?.role === Role.RRHH || currentUser?.role === Role.DIRECTOR || currentUser?.role === Role.DIRECTOR_GENERAL);"
new1 = old1 + "\n  const canRate = currentUserId && (task.status === TaskStatus.VERIFIED) && !task.rating && ((task.supervisorId === currentUserId) || (!task.supervisorId && (task.createdBy === currentUserId)) || currentUser?.role === Role.GERENTE_DEPARTAMENTO || currentUser?.role === Role.SUPERVISOR || currentUser?.role === Role.GERENTE_OPERACIONES || currentUser?.role === Role.RRHH || currentUser?.role === Role.DIRECTOR || currentUser?.role === Role.DIRECTOR_GENERAL);"
if old1 in content:
    content = content.replace(old1, new1)
    print("[OK] canRate agregado")

# 2. Boton de calificar despues de Verificar
old2 = "{task.status === TaskStatus.COMPLETED && (canVerify || task.createdBy === currentUserId) && (<><Button size=\"sm\" className=\"bg-[#5856D6] hover:bg-[#5856D6]/90 text-white\" onClick={() => onStatusChange?.(task.id, TaskStatus.VERIFIED)}>Verificar</Button><Button size=\"sm\" variant=\"outline\" onClick={() => setShowReopenModal(true)}>Marcar como Pendiente</Button></>)}"
new2 = old2 + "\n            {task.status === TaskStatus.VERIFIED && canRate && (<Button size=\"sm\" className=\"bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white gap-1\" onClick={() => setShowRateModal(true)}><span className=\"text-lg\">&#128542;</span>Calificar</Button>)}"
if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] Boton Calificar agregado")

# 3. Estados showRateModal y rateNote
old3 = "const [showBlockModal, setShowBlockModal] = useState(false);"
new3 = "const [showBlockModal, setShowBlockModal] = useState(false);\n  const [showRateModal, setShowRateModal] = useState(false);\n  const [rateNote, setRateNote] = useState('');"
if old3 in content:
    content = content.replace(old3, new3)
    print("[OK] Estados agregados")

# 4. Modal de calificacion
old4 = "{showBlockModal && (<div className=\"fixed inset-0 bg-black/50 flex items-center justify-center z-50\"><div className=\"bg-white rounded-xl p-6 max-w-sm w-full mx-4\"><h3 className=\"text-lg font-semibold mb-2\">Bloquear Tarea</h3><p className=\"text-sm text-slate-600 mb-4\">Indica el motivo por el cual se bloquea la tarea:</p><textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder=\"Escribe el motivo del bloqueo...\" className=\"w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm\" rows={3} /><div className=\"flex justify-end gap-2\"><Button variant=\"outline\" onClick={() => setShowBlockModal(false)}>Cancelar</Button><Button className=\"bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white\" onClick={() => { if (blockReason.trim()) { onStatusChange?.(task.id, TaskStatus.BLOCKED, blockReason); setShowBlockModal(false); setBlockReason(''); } }} disabled={!blockReason.trim()}>Bloquear</Button></div></div></div>)}"
new4 = old4 + "\n          {showRateModal && (<div className=\"fixed inset-0 bg-black/50 flex items-center justify-center z-50\"><div className=\"bg-white rounded-xl p-6 max-w-sm w-full mx-4\"><h3 className=\"text-lg font-semibold mb-2 flex items-center gap-2\"><span className=\"text-2xl\">&#128542;</span>Calificacion Negativa</h3><p className=\"text-sm text-slate-600 mb-4\">Indica el motivo por el cual calificas negativamente esta tarea. La calificacion se guardara para los usuarios asignados.</p><textarea value={rateNote} onChange={(e) => setRateNote(e.target.value)} placeholder=\"Escribe el motivo de la calificacion negativa...\" className=\"w-full p-3 border border-slate-300 rounded-lg mb-4 text-sm\" rows={4} /><div className=\"flex justify-end gap-2\"><Button variant=\"outline\" onClick={() => setShowRateModal(false)}>Cancelar</Button><Button className=\"bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white gap-1\" onClick={() => { if (rateNote.trim() && currentUserId) { onRateTask?.(task.id, 'bad', rateNote, currentUserId); setShowRateModal(false); setRateNote(''); } }} disabled={!rateNote.trim()}\"><span>&#128542;</span>Calificar Negativamente</Button></div></div></div>)}"
if old4 in content:
    content = content.replace(old4, new4)
    print("[OK] Modal agregado")

# 5. onRateTask en TaskCardProps
old5 = "onEdit?: (task: Task) => void;"
new5 = "onEdit?: (task: Task) => void;\n  onRateTask?: (taskId: string, rating: 'good' | 'bad', note: string, userId: string) => void;"
if old5 in content:
    content = content.replace(old5, new5)
    print("[OK] onRateTask en props")

# 6. onRateTask en TaskCard destructuring
old6 = "function TaskCard({ task, onStatusChange, onComplete, onReopen, onAddNote, canReopen, canUnblock, onToggleSubtask, onAddPhoto, onDelete, onEdit, currentUserId, currentUser }: TaskCardProps) {"
new6 = "function TaskCard({ task, onStatusChange, onComplete, onReopen, onAddNote, canReopen, canUnblock, onToggleSubtask, onAddPhoto, onDelete, onEdit, onRateTask, currentUserId, currentUser }: TaskCardProps) {"
if old6 in content:
    content = content.replace(old6, new6)
    print("[OK] onRateTask en destructuring")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
