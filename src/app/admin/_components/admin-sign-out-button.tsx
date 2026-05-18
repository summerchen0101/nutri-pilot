'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { createClient } from '@/lib/supabase/client';

export function AdminSignOutButton({
  iconOnly = false,
  fullWidth = true,
  className,
}: Readonly<{
  iconOnly?: boolean;
  fullWidth?: boolean;
  className?: string;
}>) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.replace('/admin/login');
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        'mt-2',
        fullWidth && 'w-full',
        iconOnly && 'px-2',
        className,
      )}
      aria-label={iconOnly ? '登出' : undefined}
      onClick={() => void handleSignOut()}
    >
      {iconOnly ? (
        <LogOut className="mx-auto h-4 w-4" aria-hidden />
      ) : (
        '登出'
      )}
    </Button>
  );
}
