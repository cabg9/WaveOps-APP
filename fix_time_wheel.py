#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

# Agregar TimePicker component
old = "interface TaskFormModalProps {"
new = """function TimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/.test(navigator.userAgent));
  }, []);
  if (isMobile) {
    return <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="w-full text-sm" />;
  }
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const [h, m] = value ? value.split(':') : ['00', '00'];
  return (
    <div className="flex items-center gap-0 border border-[#E5E5E7] rounded-lg bg-[#F5F5F7] overflow-hidden" style={{ height: '180px' }}>
      <div className="flex-1 h-full overflow-y-auto snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        <div className="py-[72px]">
          {hours.map((hour) => (
            <button key={hour} type="button" onClick={() => onChange(`${hour}:${m || '00'}`)}
              className={cn('w-full h-9 flex items-center justify-center text-sm snap-center transition-all', hour === h ? 'bg-white text-[#1D1D1F] font-semibold shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]')}>
              {hour}
            </button>
          ))}
        </div>
      </div>
      <div className="w-px h-full bg-[#E5E5E7]" />
      <div className="flex-1 h-full overflow-y-auto snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        <div className="py-[72px]">
          {minutes.map((minute) => (
            <button key={minute} type="button" onClick={() => onChange(`${h || '00'}:${minute}`)}
              className={cn('w-full h-9 flex items-center justify-center text-sm snap-center transition-all', minute === m ? 'bg-white text-[#1D1D1F] font-semibold shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]')}>
              {minute}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TaskFormModalProps {"""

content = content.replace(old, new)
print("[OK] TimePicker agregado")

# Reemplazar input time
old2 = '<Input type="time" value={taskForm.startTime} onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })} className="w-full text-sm" />'
new2 = '<TimePicker value={taskForm.startTime} onChange={(time) => setTaskForm({ ...taskForm, startTime: time })} />'
if old2 in content:
    content = content.replace(old2, new2)
    print("[OK] Input reemplazado")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
