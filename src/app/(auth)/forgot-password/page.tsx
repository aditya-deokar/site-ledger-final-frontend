'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '@/schemas/auth.schema';
import { useForgotPassword, useVerifyResetCode } from '@/hooks/api/auth.hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');

  const { mutate: forgotPassword, isPending: isRequestPending } = useForgotPassword();
  const { mutate: verifyCode, isPending: isVerifyPending } = useVerifyResetCode();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (formData: ForgotPasswordInput) => {
    setUserEmail(formData.email);
    forgotPassword(formData, {
      onSuccess: () => {
        setVerificationRequired(true);
        toast.success('Reset code sent to your email');
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Request failed');
      }
    });
  };

  const handleVerify = (code: string) => {
    if (code.length !== 6) return;
    
    verifyCode({ email: userEmail, code }, {
      onSuccess: (response: any) => {
        const resetToken = response.data?.data?.resetToken || response.data?.resetToken;
        toast.success('Code verified. You can now reset your password.');
        router.push(`/reset-password?token=${resetToken}`);
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || 'Invalid reset code');
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
            Back to Password Reset
          </Button>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-serif tracking-tight text-foreground sm:text-4xl">Verification</h1>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Please enter the 6-digit reset code sent to <br />
            <span className="text-foreground font-medium underline underline-offset-4">{userEmail}</span>.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
             <Label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">Reset Code</Label>
             <div className="flex justify-start">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(v) => setOtpValue(v)}
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
              {isVerifyPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Code'}
            </Button>
            
            <p className="text-[11px] text-muted-foreground text-center italic">
              Didn't receive the code?{' '}
              <button 
                type="button"
                className="font-bold uppercase tracking-widest text-primary not-italic hover:underline underline-offset-4 disabled:opacity-50 transition-colors"
                onClick={() => onSubmit(getValues())}
                disabled={isRequestPending}
              >
                {isRequestPending ? 'Resending...' : 'Resend Code'}
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
        <h1 className="text-3xl font-serif tracking-tight text-foreground sm:text-4xl">Reset Password</h1>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Request a secure 6-digit verification code to reset your account credentials.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
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

        <Button type="submit" className="h-12 rounded-none font-bold tracking-[0.2em] uppercase text-[10px] gap-3 bg-primary text-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/10" disabled={isRequestPending}>
          {isRequestPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Reset Code'}
        </Button>
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
