import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  photoUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

export function UserAvatar({
  name,
  photoUrl,
  className,
  fallbackClassName,
  size = 'md',
  title,
}: UserAvatarProps) {
  return (
    <Avatar className={cn(sizeClasses[size], className)} title={title}>
      {photoUrl && (
        <AvatarImage
          src={photoUrl}
          alt={name}
          className="object-cover"
          onError={(e) => {
            // Si la imagen falla, ocultarla para que se muestren las iniciales
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <AvatarFallback className={cn('bg-corporate text-white font-semibold', fallbackClassName)}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
