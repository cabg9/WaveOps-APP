#!/usr/bin/env python3
FILE = "src/components/Dashboard.tsx"
with open(FILE, "r") as f:
    content = f.read()

old = """      {/* Stats */}
      <div className="flex gap-6 mb-3">
        <div>
          <p className="text-xs text-[#86868B] mb-0.5">{stat1.label}</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{stat1.value}</p>
        </div>
        <div>
          <p className="text-xs text-[#86868B] mb-0.5">{stat2.label}</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{stat2.value}</p>
        </div>
      </div>"""

new = """      {/* Stats */}
      <div className="flex items-center justify-center mb-3">
        <div className="text-right pr-5 min-w-[80px]">
          <p className="text-xs text-[#86868B] mb-0.5">{stat1.label}</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{stat1.value}</p>
        </div>
        <div className="w-px h-10 bg-[#E5E5E7]" />
        <div className="text-left pl-5 min-w-[80px]">
          <p className="text-xs text-[#86868B] mb-0.5">{stat2.label}</p>
          <p className="text-xl font-semibold text-[#1D1D1F]">{stat2.value}</p>
        </div>
      </div>"""

if old in content:
    content = content.replace(old, new)
    print("[OK] Stats redisenadas")
else:
    print("[WARN] No se encontro bloque exacto")

with open(FILE, "w") as f:
    f.write(content)
print("[FINALIZADO]")
