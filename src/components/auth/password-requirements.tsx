'use client';

import { CheckCircle2, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  getPasswordRequirementStatuses,
  PASSWORD_POLICY_SUMMARY,
} from '@/lib/password-policy';

export function PasswordRequirements({ password }: { password: string }) {
  const requirementStatuses = getPasswordRequirementStatuses(password);
  const hasInput = password.length > 0;

  return (
    <div className="border border-border/60 bg-muted/[0.18] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
        Password Requirements
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground/80">
        {PASSWORD_POLICY_SUMMARY}
      </p>
      <div className="mt-3 grid gap-2">
        {requirementStatuses.map((requirement) => (
          <div
            key={requirement.id}
            className={cn(
              'flex items-center gap-2 text-[11px] transition-colors',
              requirement.met
                ? 'text-emerald-600'
                : hasInput
                  ? 'text-amber-700 dark:text-amber-500'
                  : 'text-muted-foreground/70'
            )}
          >
            {requirement.met ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{requirement.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
