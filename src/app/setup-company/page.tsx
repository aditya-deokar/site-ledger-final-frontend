'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCompanySchema, CreateCompanyInput } from '@/schemas/company.schema';
import { useCreateCompany, useCompany } from '@/hooks/api/company.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2 } from 'lucide-react';
import { useAuthBootstrap } from '@/hooks/use-auth-bootstrap';
import { CompanyLogoUploader } from '@/components/dashboard/company-logo-uploader';

function SetupCompanyForm() {
  const router = useRouter();
  const { data: companyData, isLoading: isCheckingCompany } = useCompany();
  const { mutate: createCompany, isPending, error } = useCreateCompany();

  // If company already exists, skip setup and go to navigator
  useEffect(() => {
    if (companyData?.data?.company) {
      router.replace('/navigator');
    }
  }, [companyData, router]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
  });
  const logo = watch('logo');

  const onSubmit = (data: CreateCompanyInput) => {
    createCompany(data);
  };

  if (isCheckingCompany) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative z-10 w-16 h-16 bg-zinc-950 flex items-center justify-center border border-primary/20">
            <Building2 className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground/50">Site Ledger</p>
          <p className="text-sm font-serif italic text-muted-foreground animate-pulse">Initializing organization context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-3xl border-primary/20 bg-white dark:bg-zinc-950">
        <CardHeader className="space-y-1 text-center px-4 sm:px-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-serif tracking-tight">Setup Your Company</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Create your organization to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {typeof error === 'string' ? error : 'Failed to create company'}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Legal Company Name</Label>
                <Input id="name" placeholder="e.g. Acme Realty Pvt Ltd" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradeName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trade Name (Optional)</Label>
                <Input id="tradeName" placeholder="e.g. Acme Realty" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('tradeName')} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Corporate Address (Optional)</Label>
                <Input id="address" placeholder="123 Main St, City, Country" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('address')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Support Contact Number (Optional)</Label>
                <Input id="phone" placeholder="+91 98xxxxxx10" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('phone')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company Logo (Optional)</Label>
              <CompanyLogoUploader value={logo ?? null} onChange={(url) => setValue('logo', url ?? undefined)} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="gstin" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">GSTIN</Label>
                <Input id="gstin" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('gstin')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PAN</Label>
                <Input id="pan" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('pan')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tan" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">TAN</Label>
                <Input id="tan" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('tan')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cin" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CIN</Label>
                <Input id="cin" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('cin')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reraNumber" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">RERA Registration</Label>
                <Input id="reraNumber" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('reraNumber')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="msmeUdyamNumber" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MSME / Udyam No.</Label>
                <Input id="msmeUdyamNumber" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('msmeUdyamNumber')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="epfNumber" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">EPF Number</Label>
                <Input id="epfNumber" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('epfNumber')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esicNumber" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ESIC Number</Label>
                <Input id="esicNumber" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('esicNumber')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bocwNumber" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">BOCW Registration</Label>
                <Input id="bocwNumber" className="h-10 bg-gray-50 dark:bg-zinc-900 border-transparent text-sm rounded-none shadow-none" {...register('bocwNumber')} />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-none font-bold tracking-widest uppercase text-[11px]" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Company
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupCompanyPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuthBootstrap();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
          <div className="relative z-10 w-16 h-16 bg-zinc-950 flex items-center justify-center border border-primary/20">
            <Building2 className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground/50">Site Ledger</p>
          <p className="text-sm font-serif italic text-muted-foreground animate-pulse">Verifying access before company setup...</p>
        </div>
      </div>
    );
  }

  return <SetupCompanyForm />;
}
