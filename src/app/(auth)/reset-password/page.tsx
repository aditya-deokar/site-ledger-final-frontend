'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordInput } from '@/schemas/auth.schema';
import { useResetPassword } from '@/hooks/api/auth.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlToken = searchParams.get('token');
  const { mutate: resetPassword, isPending, error, isSuccess } = useResetPassword();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(3);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: urlToken || '',
      newPassword: '',
    }
  });

  useEffect(() => {
    if (urlToken) {
      setValue('token', urlToken);
    }
  }, [urlToken, setValue]);

  useEffect(() => {
    if (isSuccess) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isSuccess, router]);

  const onSubmit = (data: ResetPasswordInput) => {
    resetPassword(data, {
      onSuccess: (response: any) => {
        setSuccessMessage(response.data?.message || 'Password successfully reset.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-serif tracking-tight text-foreground sm:text-4xl">New Password</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Create a new secure password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {error && !isSuccess && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <p className="text-[11px] font-bold tracking-widest uppercase text-destructive">
              Invalid or expired token
            </p>
          </div>
        )}

        {isSuccess && (
          <div className="flex flex-col gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-[11px] font-bold tracking-widest uppercase text-emerald-500">
                {successMessage || 'Password successfully reset.'}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Success! Redirecting to login in {countdown}s...
            </p>
          </div>
        )}

        {!isSuccess && (
          <>
            <div className="flex flex-col gap-5">
              {!urlToken && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="token" className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
                    Reset Token
                  </Label>
                  <Input
                    id="token"
                    type="text"
                    placeholder="Paste your reset token"
                    className="h-12 bg-muted/50 border-none rounded-none text-sm font-mono placeholder:text-muted-foreground/30 placeholder:font-sans focus-visible:bg-muted transition-colors"
                    {...register('token')}
                  />
                  {errors.token && (
                    <p className="text-[10px] font-medium text-destructive mt-1">{errors.token.message}</p>
                  )}
                </div>
              )}

              <PasswordInput
                id="newPassword"
                label="Secure Password"
                placeholder="Create your new password"
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
            </div>

            <Button type="submit" className="h-12 rounded-none font-bold tracking-[0.2em] uppercase text-[10px] gap-3 bg-primary text-black hover:bg-primary/90 transition-all" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
