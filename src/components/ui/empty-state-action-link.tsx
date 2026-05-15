'use client';

import Link from 'next/link';

interface EmptyStateActionLinkProps {
  href: string;
  label: string;
  className: string;
  onNavigate?: () => void;
}

export function EmptyStateActionLink({
  href,
  label,
  className,
  onNavigate,
}: EmptyStateActionLinkProps) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.()}
      className={className}
    >
      {label}
    </Link>
  );
}
