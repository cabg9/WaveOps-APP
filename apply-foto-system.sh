#!/bin/bash
set -e

echo "=== [1/4] src/types/index.ts ==="
python3 << 'PYEOF'
with open('src/types/index.ts', 'r') as f:
    c = f.read()
if 'export interface PhotoItem' not in c:
    c = c.replace('export interface Task {',
        "export interface PhotoItem {\n  id: string;\n  url: string;\n  createdBy: string;\n  createdByName?: string;\n  createdAt: string;\n}\n\nexport interface Task {")
    print("  + PhotoItem")
if 'photos?: PhotoItem[];' not in c:
    c = c.replace('  viewers?: string[]; // userIds que han visto la incidencia\n  notes: Note[];',
        '  viewers?: string[]; // userIds que han visto la incidencia\n  photos?: PhotoItem[];\n  notes: Note[];')
    print("  + photos en Incidencia")
with open('src/types/index.ts', 'w') as f:
    f.write(c)
PYEOF

echo "=== [2/4] src/hooks/firestore/useFirestoreIncidencias.ts ==="
python3 << 'PYEOF'
with open('src/hooks/firestore/useFirestoreIncidencias.ts', 'r') as f:
    c = f.read()
if 'PhotoItem' not in c:
    c = c.replace(
        "import { Incidencia, IncidenciaStatus, TaskPriority, Department } from '@/types';",
        "import { Incidencia, IncidenciaStatus, TaskPriority, Department, PhotoItem } from '@/types';")
    print("  + import PhotoItem")
if 'photos: (data.photos' not in c:
    c = c.replace(
        '            viewers: data.viewers || undefined,\n            resolvedBy: data.resolvedBy || undefined,',
        '            viewers: data.viewers || undefined,\n            photos: (data.photos || []).map((p: any) => ({ id: p.id || Date.now().toString(), url: p.url || \'\', createdBy: p.createdBy || \'\', createdByName: p.createdByName || \'\', createdAt: timestampToISO(p.createdAt) })) as PhotoItem[],\n            resolvedBy: data.resolvedBy || undefined,')
    print("  + mapeo photos Firestore")
if 'photos?: PhotoItem[];' not in c:
    c = c.replace('      targetDepartments?: Department[];\n    }) => {',
        '      targetDepartments?: Department[];\n      photos?: PhotoItem[];\n    }) => {')
    print("  + param photos")
if "photos: data.photos || []," not in c:
    c = c.replace('        targetDepartments: data.targetDepartments || [data.targetDepartment],\n        notes: [],',
        '        targetDepartments: data.targetDepartments || [data.targetDepartment],\n        photos: data.photos || [],\n        notes: [],')
    print("  + photos en createIncidencia")
if 'const addPhoto = useCallback(' not in c:
    c = c.replace('  // Get counts',
        "  // Agregar foto\n  const addPhoto = useCallback(\n    async (id: string, photo: Omit<PhotoItem, 'id'>) => {\n      const ref = doc(db, 'incidencias', id);\n      const inc = incidencias.find((i) => i.id === id);\n      const existingPhotos = inc?.photos || [];\n      await updateDoc(ref, { photos: [...existingPhotos, { id: Date.now().toString(), url: photo.url, createdBy: photo.createdBy, createdByName: photo.createdByName || '', createdAt: new Date().toISOString() }] });\n    },\n    [incidencias]\n  );\n\n  // Get counts")
    print("  + funcion addPhoto")
if 'addPhoto,' not in c:
    c = c.replace('    addNote,\n    getCounts,', '    addNote,\n    addPhoto,\n    getCounts,')
    print("  + export addPhoto")
with open('src/hooks/firestore/useFirestoreIncidencias.ts', 'w') as f:
    f.write(c)
PYEOF

echo "=== [3/4] src/hooks/useTasks.tsx ==="
python3 << 'PYEOF'
with open('src/hooks/useTasks.tsx', 'r') as f:
    c = f.read()
if 'createIncidencia:' not in c:
    c = c.replace('    confirmIncidencia: incidenciasHook.confirmIncidencia,',
        '    createIncidencia: incidenciasHook.createIncidencia,\n    confirmIncidencia: incidenciasHook.confirmIncidencia,')
    print("  + createIncidencia")
if 'addIncidenciaPhoto:' not in c:
    c = c.replace('    addIncidenciaNote: incidenciasHook.addNote,',
        '    addIncidenciaNote: incidenciasHook.addNote,\n    addIncidenciaPhoto: incidenciasHook.addPhoto,')
    print("  + addIncidenciaPhoto")
with open('src/hooks/useTasks.tsx', 'w') as f:
    f.write(c)
PYEOF

echo "=== [4/4] src/components/modules/TasksModule.tsx ==="
python3 << 'PYEOF'
with open('src/components/modules/TasksModule.tsx', 'r') as f:
    c = f.read()

if 'Camera,\n  X,\n  Image as ImageIcon,' not in c:
    c = c.replace("  Lock,\n  Unlock,\n} from 'lucide-react';",
        "  Lock,\n  Unlock,\n  Camera,\n  X,\n  Image as ImageIcon,\n} from 'lucide-react';")

if 'useStorageUpload' not in c:
    c = c.replace("import { useTasks } from '@/hooks/useTasks';",
        "import { useTasks } from '@/hooks/useTasks';\nimport { useStorageUpload } from '@/hooks/firestore/useStorageUpload';")

if 'Department,' not in c:
    c = c.replace("  Incidencia,\n} from '@/types';",
        "  Incidencia,\n  Department,\n} from '@/types';")

if 'createIncidencia }' not in c and 'createIncidencia,' not in c:
    c = c.replace('addIncidenciaPhoto } = useTasks();',
        'addIncidenciaPhoto, createIncidencia } = useTasks();')

if 'incTitle' not in c:
    c = c.replace(
        "  const [editingTask, setEditingTask] = useState<Task | null>(null);\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false);",
        "  const [editingTask, setEditingTask] = useState<Task | null>(null);\n  const [isEditModalOpen, setIsEditModalOpen] = useState(false);\n\n  // Estados para formulario de incidencias\n  const [incTitle, setIncTitle] = useState('');\n  const [incDescription, setIncDescription] = useState('');\n  const [incPriority, setIncPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);\n  const [incDepartments, setIncDepartments] = useState<Department[]>([]);\n  const [incPhotos, setIncPhotos] = useState<{ id: string; url: string }[]>([]);\n  const [incPhotoUrl, setIncPhotoUrl] = useState('');\n  const [isSubmitting, setIsSubmitting] = useState(false);\n\n  const { uploadImage } = useStorageUpload();")

if 'onAddPhoto?:' not in c:
    c = c.replace(
        '  onAddNote?: (id: string, content: string, userId: string) => void;\n}',
        '  onAddNote?: (id: string, content: string, userId: string) => void;\n  onAddPhoto?: (id: string, photo: { url: string; createdBy: string; createdByName?: string }) => void;\n}')

if 'onAddPhoto,\n}: IncidenciaCardProps' not in c:
    c = c.replace('  onAddNote,\n}: IncidenciaCardProps) {',
        '  onAddNote,\n  onAddPhoto,\n}: IncidenciaCardProps) {')

if 'showPhotoUpload' not in c:
    c = c.replace(
        "  const [reopenReason, setReopenReason] = useState('');\n  const [viewers, setViewers] = useState<string[]>([]);",
        "  const [reopenReason, setReopenReason] = useState('');\n  const [showPhotoUpload, setShowPhotoUpload] = useState(false);\n  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState('');\n  const [photoPreview, setPhotoPreview] = useState('');")

if 'Photos Gallery' not in c:
    gallery = '''              {/* Photos Gallery */}\n              {incidencia.photos && incidencia.photos.length > 0 && (\n                <div className="space-y-2">\n                  <div className="flex items-center gap-2">\n                    <ImageIcon className="w-4 h-4 text-[#86868B]" />\n                    <h5 className="text-sm font-medium text-[#1D1D1F]">Fotos ({incidencia.photos.length})</h5>\n                  </div>\n                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">\n                    {incidencia.photos.map((photo) => (\n                      <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-[#E5E5E7] bg-[#F5F5F7]">\n                        <img src={photo.url} alt="Foto de incidencia" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />\n                        <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">\n                          <p className="text-[8px] text-white truncate">{photo.createdByName || 'Desconocido'}</p>\n                        </div>\n                      </div>\n                    ))}\n                  </div>\n                </div>\n              )}'''
    c = c.replace("            }\n\n            {/* Actions */}", "            }\n" + gallery + "\n\n            {/* Actions */}")

if 'Photo Upload Section' not in c:
    upload = '''              {/* Photo Upload Section */}\n              {showPhotoUpload && (\n                <div className="space-y-3 p-3 bg-[#F5F5F7] rounded-lg">\n                  <div className="flex items-center justify-between">\n                    <h5 className="text-sm font-medium text-[#1D1D1F]">Agregar Foto</h5>\n                    <button onClick={(e) => { e.stopPropagation(); setShowPhotoUpload(false); setPhotoPreview(''); setUploadedPhotoUrl(''); }} className="text-[#86868B] hover:text-[#1D1D1F]"><X className="w-4 h-4" /></button>\n                  </div>\n                  <div className="space-y-2">\n                    <label className="text-xs text-[#86868B]">URL de la imagen (o usa la camara)</label>\n                    <div className="flex gap-2">\n                      <input type="text" value={uploadedPhotoUrl} onChange={(e) => { setUploadedPhotoUrl(e.target.value); setPhotoPreview(e.target.value); }} placeholder="https://..." className="flex-1 rounded-lg border border-[#E5E5E7] px-3 py-2 text-sm focus:outline-none focus:border-corporate focus:ring-1 focus:ring-corporate" />\n                      <CameraCapture onCapture={(file) => { const url = URL.createObjectURL(file); setUploadedPhotoUrl(url); setPhotoPreview(url); }} />\n                    </div>\n                  </div>\n                  {photoPreview && (\n                    <div className="relative aspect-video rounded-lg overflow-hidden border border-[#E5E5E7] bg-white">\n                      <img src={photoPreview} alt="Preview" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />\n                    </div>\n                  )}\n                  <div className="flex justify-end gap-2">\n                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowPhotoUpload(false); setPhotoPreview(''); setUploadedPhotoUrl(''); }}>Cancelar</Button>\n                    <Button size="sm" className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white" onClick={(e) => { e.stopPropagation(); if (currentUserId && uploadedPhotoUrl.trim()) { onAddPhoto?.(incidencia.id, { url: uploadedPhotoUrl.trim(), createdBy: currentUserId, createdByName: currentUser?.name || '' }); setShowPhotoUpload(false); setPhotoPreview(''); setUploadedPhotoUrl(''); } }} disabled={!uploadedPhotoUrl.trim()}>Subir Foto</Button>\n                  </div>\n                </div>\n              )}'''
    c = c.replace('            {/* Actions */}', upload + '\n            {/* Actions */}')

if '<Camera className="w-4 h-4 mr-1" />' not in c:
    btn = '''              {/* Add Photo Button */}\n              <Button size="sm" variant="outline" className="border-[#34C759] text-[#34C759] hover:bg-[#34C759]/5" onClick={(e) => { e.stopPropagation(); setShowPhotoUpload(!showPhotoUpload); }}>\n                <Camera className="w-4 h-4 mr-1" /> Foto\n              </Button>\n'''
    c = c.replace('              {/* Add Note Button */}', btn + '              {/* Add Note Button */}')

if 'onAddPhoto={addIncidenciaPhoto}' not in c:
    c = c.replace(
        '                    onAddNote={addIncidenciaNote}\n                  />',
        '                    onAddNote={addIncidenciaNote}\n                    onAddPhoto={addIncidenciaPhoto}\n                  />')

if "Modal en desarrollo..." in c and 'incTitle' in c:
    old = '''            <div className="py-8 text-center text-[#86868B]">\n              Modal en desarrollo...\n            </div>'''
    new = '''            {createType === 'incidencia' ? (\n              <div className="space-y-4 py-2">\n                <div className="space-y-1.5"><label className="text-sm font-medium text-[#1D1D1F]">Titulo</label><input type="text" value={incTitle} onChange={(e) => setIncTitle(e.target.value)} placeholder="Describe brevemente la incidencia" className="w-full rounded-lg border border-[#E5E5E7] px-3 py-2 text-sm focus:outline-none focus:border-corporate focus:ring-1 focus:ring-corporate" /></div>\n                <div className="space-y-1.5"><label className="text-sm font-medium text-[#1D1D1F]">Descripcion</label><textarea value={incDescription} onChange={(e) => setIncDescription(e.target.value)} placeholder="Describe los detalles de la incidencia..." rows={3} className="w-full rounded-lg border border-[#E5E5E7] px-3 py-2 text-sm resize-none focus:outline-none focus:border-corporate focus:ring-1 focus:ring-corporate" /></div>\n                <div className="space-y-1.5"><label className="text-sm font-medium text-[#1D1D1F]">Prioridad</label><div className="flex gap-2">{([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.CRITICAL] as TaskPriority[]).map((p) => (<button key={p} onClick={() => setIncPriority(p)} className={cn('flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all', incPriority === p ? p === TaskPriority.LOW ? 'bg-[#34C759] text-white border-[#34C759]' : p === TaskPriority.MEDIUM ? 'bg-[#FF9500] text-white border-[#FF9500]' : p === TaskPriority.HIGH ? 'bg-[#FF3B30] text-white border-[#FF3B30]' : 'bg-[#5856D6] text-white border-[#5856D6]' : 'bg-white text-[#86868B] border-[#E5E5E7] hover:border-[#C7C7CC]')}>{getPriorityLabel(p)}</button>))}</div></div>\n                <div className="space-y-1.5"><label className="text-sm font-medium text-[#1D1D1F]">Departamentos reportados</label><div className="flex flex-wrap gap-2">{Object.values(Department).map((dept) => (<button key={dept} onClick={() => { setIncDepartments((prev) => prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]); }} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', incDepartments.includes(dept) ? 'bg-corporate text-white border-corporate' : 'bg-white text-[#86868B] border-[#E5E5E7] hover:border-[#C7C7CC]')}>{dept}</button>))}</div></div>\n                <div className="space-y-2"><label className="text-sm font-medium text-[#1D1D1F]">Fotos</label><div className="flex gap-2"><input type="text" value={incPhotoUrl} onChange={(e) => setIncPhotoUrl(e.target.value)} placeholder="URL de imagen o usa la camara" className="flex-1 rounded-lg border border-[#E5E5E7] px-3 py-2 text-sm focus:outline-none focus:border-corporate focus:ring-1 focus:ring-corporate" /><CameraCapture onCapture={(file) => { const url = URL.createObjectURL(file); setIncPhotos((prev) => [...prev, { id: Date.now().toString(), url }]); }} />{incPhotoUrl && <Button size="sm" className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white" onClick={() => { if (incPhotoUrl.trim()) { setIncPhotos((prev) => [...prev, { id: Date.now().toString(), url: incPhotoUrl.trim() }]); setIncPhotoUrl(''); } }}>Agregar</Button>}</div>{incPhotos.length > 0 && (<div className="grid grid-cols-4 gap-2">{incPhotos.map((photo) => (<div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-[#E5E5E7] bg-[#F5F5F7]"><img src={photo.url} alt="Foto" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /><button onClick={() => setIncPhotos((prev) => prev.filter((p) => p.id !== photo.id))} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"><X className="w-3 h-3" /></button></div>))}</div>)}</div>\n                <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => { setIsCreateModalOpen(false); setIncTitle(''); setIncDescription(''); setIncPriority(TaskPriority.MEDIUM); setIncDepartments([]); setIncPhotos([]); setIncPhotoUrl(''); }}>Cancelar</Button><Button className="bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white" disabled={!incTitle.trim() || !incDescription.trim() || isSubmitting} onClick={async () => { if (!user) return; setIsSubmitting(true); try { const photoItems = incPhotos.map((p) => ({ id: p.id, url: p.url, createdBy: user.id, createdByName: user.name || '', createdAt: new Date().toISOString() })); await createIncidencia({ title: incTitle.trim(), description: incDescription.trim(), priority: incPriority, reportedBy: user.id, targetDepartment: incDepartments[0] || Department.DIVE_SHOP, targetDepartments: incDepartments.length > 0 ? incDepartments : undefined, photos: photoItems }); setIncTitle(''); setIncDescription(''); setIncPriority(TaskPriority.MEDIUM); setIncDepartments([]); setIncPhotos([]); setIncPhotoUrl(''); setIsCreateModalOpen(false); } catch (err) { console.error('Error:', err); } finally { setIsSubmitting(false); } }}>{isSubmitting ? 'Creando...' : 'Crear Incidencia'}</Button></div>\n              </div>\n            ) : (\n              <div className="py-8 text-center text-[#86868B]">Modal en desarrollo...</div>\n            )}'''
    c = c.replace(old, new)

with open('src/components/modules/TasksModule.tsx', 'w') as f:
    f.write(c)
PYEOF

echo ""
echo "=== BUILD ==="
npm run build

echo ""
echo "=== GIT COMMIT ==="
git add -A
git commit -m "Add photo system to incidencias"

echo ""
echo "LISTO! Ahora: git push origin master"
