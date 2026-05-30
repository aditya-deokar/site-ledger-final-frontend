import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function VendorCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border border-border bg-card glass p-4 sm:p-6 mb-6 animate-[fadeInSlideUp_0.5s_ease-out]">
      <header className="mb-4">
        <h2 className="text-2xl font-serif text-foreground mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
};

/* Add keyframes for animation in a global CSS file or Tailwind config */
