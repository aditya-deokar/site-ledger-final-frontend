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
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export default function LoginPage() {
  const { mutate: signIn, isPending, error } = useSignIn();
  // const { executeRecaptcha } = useGoogleReCaptcha();
  
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const loginErrorMessage = error ? getApiErrorMessage(error, 'Authentication failed.') : null;

  const onSubmit = async (data: LoginInput) => {
    // if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
    //   if (!executeRecaptcha) {
    //     // Recaptcha library not ready or failed to load -> Bypass gracefully
    //     data.recaptchaToken = 'BYPASS';
    //   } else {
    //     try {
    //       const token = await executeRecaptcha('login');
    //       data.recaptchaToken = token;
    //     } catch (err) {
    //       // Execution failed -> bypass
    //       data.recaptchaToken = 'BYPASS';
    //     }
    //   }
    // }
    signIn(data);
  };

  return (
    <div className="rounded border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Login</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to continue.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        {error && (
          <div className="rounded border border-destructive/20 bg-destructive/10 p-3">
            <p className="text-xs font-medium text-destructive">
              {loginErrorMessage}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" className="text-xs font-medium text-foreground">
            Email
          </Label>
          <Input id="email" type="email" placeholder="name@example.com" className="h-10" {...register('email')} />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password" className="text-xs font-medium text-foreground">
            Password
          </Label>
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

          {errors.recaptchaToken && (
            <p className="mt-2 text-xs font-medium text-destructive">{errors.recaptchaToken.message}</p>
          )}

        <Button type="submit" className="h-10 w-full" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Login'}
        </Button>
      </form>

      <div className="mt-4 border-t border-border pt-4 space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          New to SiteLedger?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create Account
          </Link>
        </p>
        <p className="text-sm text-muted-foreground">
          Forgot password?{" "}
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Reset it
          </Link>
        </p>
      </div>
    </div>
  );
}
