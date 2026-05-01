import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { CreateEmployeeInput } from '@/schemas/employee.schema';

import { EmployeeForm } from './employee-form';

export function EmployeeFormSheet({
  open,
  title,
  submitLabel,
  defaultValues,
  isPending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  defaultValues?: Partial<CreateEmployeeInput>;
  isPending: boolean;
  error?: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateEmployeeInput) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-l border-border bg-background p-0 sm:max-w-[640px]">
        <SheetHeader className="p-8 pb-4">
          <SheetTitle className="text-3xl font-serif italic tracking-tight text-foreground">
            {title}
          </SheetTitle>
        </SheetHeader>
        <EmployeeForm
          defaultValues={defaultValues}
          submitLabel={submitLabel}
          isPending={isPending}
          error={error}
          onSubmit={onSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}
