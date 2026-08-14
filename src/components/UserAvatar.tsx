import { useEffect, useState } from 'react';
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>(
    photoUrl ? 'loading' : 'error'
  );

  useEffect(() => {
    setStatus(photoUrl ? 'loading' : 'error');
  }, [photoUrl]);

  const showImage = photoUrl && status !== 'error';
  const showFallback = !photoUrl || status === 'error';

  return (
    <Avatar className={cn(sizeClasses[size], className)} title={title}>
      {showImage && (
        <AvatarImage
          src={photoUrl}
          alt={name}
          className="object-cover"
          onLoadingStatusChange={(s) => setStatus(s)}
        />
      )}
      {showFallback && (
        <AvatarFallback
          className={cn('bg-corporate text-white font-semibold', fallbackClassName)}
          delayMs={0}
        >
          {getInitials(name)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
