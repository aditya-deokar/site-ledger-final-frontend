'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@/schemas/auth.schema';
import { useSignIn } from '@/hooks/api/auth.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { getApiErrorMessage } from '@/lib/api-error';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { mutate: signIn, isPending, error } = useSignIn();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const loginErrorMessage = error ? getApiErrorMessage(error, 'Authentication failed.') : null;

  const onSubmit = (data: LoginInput) => {
    signIn(data);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-serif tracking-tight text-foreground sm:text-4xl">Sign In</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Access your real estate portfolio and managed sites with your secure credentials.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <p className="text-[11px] font-bold tracking-widest uppercase text-destructive">
              {loginErrorMessage}
            </p>
          </div>
        )}

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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
                Secure Password
              </Label>
              <Link href="/forgot-password" className="text-[9px] font-bold tracking-widest uppercase text-primary hover:text-primary/70 transition-colors">
                Forgot?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password')}
            />
          </div>
        </div>

        <Button type="submit" className="h-12 rounded-none font-bold tracking-[0.2em] uppercase text-[10px] gap-3 bg-primary text-black hover:bg-primary/90 transition-all" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authorize Access'}
        </Button>
      </form>

      <div className="pt-4 border-t border-border mt-2">
        <p className="text-[11px] text-muted-foreground italic flex items-center justify-center gap-2">
          New to SiteLedger?{' '}
          <Link href="/register" className="font-bold uppercase tracking-widest text-primary not-italic hover:underline underline-offset-4">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
