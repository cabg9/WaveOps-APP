#!/usr/bin/env python3
FILE = "src/components/modules/TasksModule.tsx"
with open(FILE, "r") as f:
    content = f.read()

old = """function TimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
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
}"""

new = """function TimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const quickTimes = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  const [customMode, setCustomMode] = useState(false);
  const [customTime, setCustomTime] = useState(value || '09:00');
  
  if (customMode) {
    return (
      <div className="flex items-center gap-2">
        <Input type="time" value={customTime} onChange={(e) => { setCustomTime(e.target.value); onChange(e.target.value); }} className="w-full text-sm" />
        <Button type="button" size="sm" variant="outline" onClick={() => setCustomMode(false)}>Listo</Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {quickTimes.map((t) => (
          <button key={t} type="button" onClick={() => onChange(t)}
            className={cn('px-1 py-1.5 rounded-lg text-xs font-medium transition-all', value === t ? 'border border-corporate text-corporate bg-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
            {t}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setCustomMode(true)}
        className={cn('w-full mt-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all', !quickTimes.includes(value) && value ? 'border border-corporate text-corporate bg-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
        {quickTimes.includes(value) ? 'Otra hora...' : value || 'Otra hora...'}
      </button>
    </div>
  );
}"""

if old in content:
    content = content.replace(old, new)
    print("[OK] TimePicker reemplazado")
else:
    print("[WARN] TimePicker no encontrado")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
