import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { useDeleteEmployee } from '@/hooks/api/employee.hooks';
import type { Employee } from '@/schemas/employee.schema';

export function DeleteEmployeeConfirm({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const { mutate, isPending, error } = useDeleteEmployee({ onSuccess: onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm space-y-4 border border-border bg-background p-6">
        <h3 className="text-lg font-serif text-foreground">Delete Employee</h3>
        <p className="text-sm text-muted-foreground">
          Remove <strong>{employee.name}</strong> from active records?
        </p>
        {Boolean(error) && (
          <p className="text-xs text-destructive">
            {getApiErrorMessage(error, 'Unable to delete employee.')}
          </p>
        )}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="h-10 flex-1 rounded-none text-[10px] font-bold uppercase tracking-widest"
            disabled={isPending}
            onClick={() => mutate(employee.id)}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-none px-5 text-[10px] font-bold uppercase tracking-widest"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
