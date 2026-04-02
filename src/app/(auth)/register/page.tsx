'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, SignUpInput } from '@/schemas/auth.schema';
import { useSignUp } from '@/hooks/api/auth.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const { mutate: signUp, isPending, error } = useSignUp();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = (data: SignUpInput) => {
    signUp(data);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-serif tracking-tight text-foreground sm:text-4xl">Create Account</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Join a robust ecosystem designed for the modern real estate professional.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <p className="text-[11px] font-bold tracking-widest uppercase text-destructive">
              {typeof error === 'string' ? error : 'Registration Failed'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName" className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">First Name</Label>
              <Input id="firstName" placeholder="John" className="h-12 bg-muted/50 border-none rounded-none text-sm placeholder:text-muted-foreground/30 focus-visible:bg-muted transition-colors" {...register('firstName')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName" className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Last Name</Label>
              <Input id="lastName" placeholder="Doe" className="h-12 bg-muted/50 border-none rounded-none text-sm placeholder:text-muted-foreground/30 focus-visible:bg-muted transition-colors" {...register('lastName')} />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Professional Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="h-12 bg-muted/50 border-none rounded-none text-sm placeholder:text-muted-foreground/30 focus-visible:bg-muted transition-colors"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-[10px] font-medium text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <PasswordInput
            id="password"
            label="Secure Password"
            placeholder="Create a strong password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <Button type="submit" className="h-12 rounded-none font-bold tracking-[0.2em] uppercase text-[10px] gap-3 bg-primary text-black hover:bg-primary/90 transition-all" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Institutional Identity'}
        </Button>
      </form>

      <div className="pt-4 border-t border-border mt-2">
        <p className="text-[11px] text-muted-foreground italic flex items-center justify-center gap-2">
          Already registered?{' '}
          <Link href="/login" className="font-bold uppercase tracking-widest text-primary not-italic hover:underline underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
