import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetClose } from '@/components/ui/sheet';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createEmployeeSchema,
  type CreateEmployeeInput,
} from '@/schemas/employee.schema';

export function EmployeeForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
  submitLabel,
}: {
  defaultValues?: Partial<CreateEmployeeInput>;
  onSubmit: (values: CreateEmployeeInput) => void;
  isPending: boolean;
  error?: unknown;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      designation: '',
      department: '',
      dateOfJoining: new Date().toISOString().slice(0, 10),
      salary: 0,
      salaryDate: null,
      status: 'active',
      ...defaultValues,
    },
  });

  return (
    <>
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Name
              </Label>
              <Input {...register('name')} className="h-11 rounded-none border-none bg-muted text-sm" />
              {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Designation
              </Label>
              <Input {...register('designation')} className="h-11 rounded-none border-none bg-muted text-sm" />
              {errors.designation && (
                <p className="text-[10px] text-destructive">{errors.designation.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Department
              </Label>
              <Input {...register('department')} className="h-11 rounded-none border-none bg-muted text-sm" />
              {errors.department && (
                <p className="text-[10px] text-destructive">{errors.department.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Phone
              </Label>
              <Input {...register('phone')} className="h-11 rounded-none border-none bg-muted text-sm" />
              {errors.phone && <p className="text-[10px] text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Email
              </Label>
              <Input {...register('email')} className="h-11 rounded-none border-none bg-muted text-sm" />
              {errors.email && <p className="text-[10px] text-destructive">{errors.email.message}</p>}
            </div>
            <div />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Address
            </Label>
            <Input {...register('address')} className="h-11 rounded-none border-none bg-muted text-sm" />
            {errors.address && <p className="text-[10px] text-destructive">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Date Of Joining
              </Label>
              <Input
                type="date"
                {...register('dateOfJoining')}
                className="h-11 rounded-none border-none bg-muted text-sm"
              />
              {errors.dateOfJoining && (
                <p className="text-[10px] text-destructive">{errors.dateOfJoining.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Salary
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                {...register('salary', { valueAsNumber: true })}
                className="h-11 rounded-none border-none bg-muted text-sm"
              />
              {errors.salary && <p className="text-[10px] text-destructive">{errors.salary.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Status
              </Label>
              <select
                {...register('status')}
                className="h-11 w-full rounded-none border-none bg-muted px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Salary Due Date <span className="font-normal normal-case">(day of month, e.g. 28)</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={31}
                placeholder="e.g. 28"
                {...register('salaryDate', {
                  valueAsNumber: true,
                  setValueAs: (value) => (value === '' || isNaN(value) ? null : Number(value)),
                })}
                className="h-11 rounded-none border-none bg-muted text-sm"
              />
              {errors.salaryDate && (
                <p className="text-[10px] text-destructive">{errors.salaryDate.message}</p>
              )}
            </div>
            <div />
          </div>

          {Boolean(error) && (
            <p className="text-xs text-destructive">
              {getApiErrorMessage(error, 'Unable to save employee.')}
            </p>
          )}
        </form>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border p-8 pt-4">
        <SheetClose className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground">
          Cancel
        </SheetClose>
        <Button
          form="employee-form"
          type="submit"
          disabled={isPending}
          className="h-11 gap-2 rounded-none px-8 text-[10px] font-bold uppercase tracking-widest"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
        </Button>
      </div>
    </>
  );
}
