'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/schemas/auth.schema';
import { useForgotPassword } from '@/hooks/api/auth.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { mutate: forgotPassword, isPending, error } = useForgotPassword();
  const [successData, setSuccessData] = useState<{ message: string; resetToken: string } | null>(null);
  const [countdown, setCountdown] = useState(3);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (formData: ForgotPasswordInput) => {
    forgotPassword(formData, {
      onSuccess: (response: any) => {
        const data = response.data?.data || response.data || null;
        setSuccessData(data);
      }
    });
  };

  useEffect(() => {
    if (successData) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push(`/reset-password?token=${successData.resetToken}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [successData, router]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-serif tracking-tight text-foreground sm:text-4xl">Reset</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Request a secure password reset token for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {error && !successData && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <p className="text-[11px] font-bold tracking-widest uppercase text-destructive">
              {typeof error === 'string' ? error : (error as any)?.message || 'Request Failed'}
            </p>
          </div>
        )}

        {successData && (
          <div className="flex flex-col gap-4 bg-emerald-500/10 border border-emerald-500/20 p-6 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <p className="text-[12px] font-bold tracking-widest uppercase text-emerald-500">
                Secure Link Generated
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground italic">
                Simulating email delivery... Redirecting to secure reset page in {countdown}s
              </p>
              <div className="h-1 w-full bg-emerald-500/10 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-linear" 
                  style={{ width: `${(countdown / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {!successData && (
          <>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
                  Institutional Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@siteledger.com"
                  className="h-12 bg-muted/50 border-none rounded-none text-sm placeholder:text-muted-foreground/30 focus-visible:bg-muted transition-colors"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-[10px] font-medium text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="h-12 rounded-none font-bold tracking-[0.2em] uppercase text-[10px] gap-3 bg-primary text-black hover:bg-primary/90 transition-all" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
            </Button>
          </>
        )}
      </form>

      <div className="pt-4 border-t border-border mt-2">
        <p className="text-[11px] text-muted-foreground italic flex items-center justify-center gap-2">
          Remembered your info?{' '}
          <Link href="/login" className="font-bold uppercase tracking-widest text-primary not-italic hover:underline underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
