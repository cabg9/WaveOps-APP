#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

old = """      {/* Fecha y hora de inicio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 min-w-0 overflow-hidden">
          <Label className="text-xs sm:text-sm">Fecha de inicio</Label>
          <Input type="date" value={taskForm.startDate} onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })} className="w-full text-sm" />
        </div>
        <div className="space-y-2 min-w-0 overflow-hidden">
          <Label className="text-xs sm:text-sm">Hora de inicio (24h)</Label>
          <Input type="time" value={taskForm.startTime} onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })} className="w-full text-sm" />
        </div>
      </div>"""

new = """      {/* Fecha y hora de inicio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs">Fecha de inicio</Label>
          <Input type="date" value={taskForm.startDate} onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })} className="w-full text-sm px-2" />
        </div>
        <div className="space-y-1.5 min-w-0">
          <Label className="text-xs">Hora inicio (24h)</Label>
          {(() => {
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
            return isIOS ? (
              <Input type="time" value={taskForm.startTime} onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })} className="w-full text-sm px-2" />
            ) : (
              <Input type="text" pattern="[0-9]{2}:[0-9]{2}" placeholder="HH:mm" value={taskForm.startTime} onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })} className="w-full text-sm px-2" />
            );
n          })()}
        </div>
      </div>"""

if old in content:
    content = content.replace(old, new)
    print("[OK] Layout arreglado + hora 24h")
else:
    print("[WARN] No encontrado")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
