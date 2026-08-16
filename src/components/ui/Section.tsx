import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function Section({ title, children, icon: Icon, className }: SectionProps) {
  return (
    <div className={cn('bg-white rounded-2xl border border-[#E5E5E7] p-4 space-y-4', className)}>
      <div className="flex items-center gap-2 pb-2 border-b border-[#F5F5F7]">
        {Icon && <Icon className="w-4 h-4 text-corporate" />}
        <h3 className="text-sm font-semibold text-[#1D1D1F]">{title}</h3>
      </div>
      {children}
    </div>
  );
}
