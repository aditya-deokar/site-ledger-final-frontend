'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUpSchema, SignUpInput } from '@/schemas/auth.schema';
import { useSignUp, useVerifySignUp } from '@/hooks/api/auth.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import Link from 'next/link';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');

  const { mutate: signUp, isPending: isSignUpPending, error: signUpError } = useSignUp();
  const { mutate: verifySignUp, isPending: isVerifyPending } = useVerifySignUp();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = (data: SignUpInput) => {
    setSignupEmail(data.email);
    signUp(data, {
      onSuccess: () => {
        setVerificationRequired(true);
        toast.success('Verification code sent to your email');
      },
      onError: (err: any) => {
        const errorMessage = err.response?.data?.error || 'Registration failed';
        toast.error(errorMessage);
      }
    });
  };

  const handleVerify = (code: string) => {
    if (code.length !== 6) return;
    
    verifySignUp({ email: signupEmail, code }, {
      onSuccess: () => {
        toast.success('Account verified successfully!');
      },
      onError: (err: any) => {
        const errorMessage = err.response?.data?.error || 'Invalid verification code';
        toast.error(errorMessage);
      }
    });
  };

  if (verificationRequired) {
    return (
      <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="flex flex-col gap-3">
          <Button 
            variant="ghost" 
            className="w-fit p-0 h-auto hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors gap-2 text-[10px] uppercase tracking-widest font-bold"
            onClick={() => setVerificationRequired(false)}
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Signup
          </Button>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-serif tracking-tight text-foreground sm:text-4xl">Verify Email</h1>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            We've sent a 6-digit verification code to <br />
            <span className="text-foreground font-medium underline underline-offset-4">{signupEmail}</span>.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
             <Label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Verification Code</Label>
             <div className="flex justify-start">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => setOtpValue(value)}
                  onComplete={handleVerify}
                  disabled={isVerifyPending}
                >
                  <InputOTPGroup className="gap-3">
                    <InputOTPSlot index={0} className="size-12 md:size-14 text-xl font-bold bg-muted/50 border-none rounded-none focus-visible:bg-muted transition-all" />
                    <InputOTPSlot index={1} className="size-12 md:size-14 text-xl font-bold bg-muted/50 border-none rounded-none focus-visible:bg-muted transition-all" />
                    <InputOTPSlot index={2} className="size-12 md:size-14 text-xl font-bold bg-muted/50 border-none rounded-none focus-visible:bg-muted transition-all" />
                    <InputOTPSlot index={3} className="size-12 md:size-14 text-xl font-bold bg-muted/50 border-none rounded-none focus-visible:bg-muted transition-all" />
                    <InputOTPSlot index={4} className="size-12 md:size-14 text-xl font-bold bg-muted/50 border-none rounded-none focus-visible:bg-muted transition-all" />
                    <InputOTPSlot index={5} className="size-12 md:size-14 text-xl font-bold bg-muted/50 border-none rounded-none focus-visible:bg-muted transition-all" />
                  </InputOTPGroup>
                </InputOTP>
             </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button 
              className="h-12 rounded-none font-bold tracking-[0.2em] uppercase text-[10px] gap-3 bg-primary text-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/10" 
              disabled={isVerifyPending || otpValue.length !== 6}
              onClick={() => handleVerify(otpValue)}
            >
              {isVerifyPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete Registration'}
            </Button>
            
            <p className="text-[11px] text-muted-foreground text-center italic">
              Didn't receive the code?{' '}
              <button 
                type="button"
                className="font-bold uppercase tracking-widest text-primary not-italic hover:underline underline-offset-4 disabled:opacity-50 transition-colors"
                onClick={() => signUp(getValues())}
                disabled={isSignUpPending}
              >
                {isSignUpPending ? 'Resending...' : 'Resend Code'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-serif tracking-tight text-foreground sm:text-4xl">Create Account</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Join a robust ecosystem designed for the modern real estate professional.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
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

        <Button type="submit" className="h-12 rounded-none font-bold tracking-[0.2em] uppercase text-[10px] gap-3 bg-primary text-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/10" disabled={isSignUpPending}>
          {isSignUpPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register Institutional Identity'}
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
