import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    photoUrl ? 'loading' : 'error'
  );

  const showImage = photoUrl && status !== 'error';
  const showFallback = !photoUrl || status === 'error';

  return (
    <Avatar className={cn(sizeClasses[size], className)} title={title}>
      {showImage && (
        <img
          src={photoUrl}
          alt={name}
          className={cn(
            'aspect-square size-full object-cover rounded-full transition-opacity duration-200',
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {showFallback && (
        <AvatarFallback
          className={cn('bg-corporate text-white font-semibold', fallbackClassName)}
        >
          {getInitials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
