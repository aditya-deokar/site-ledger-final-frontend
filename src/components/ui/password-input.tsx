"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function PasswordInput({ label, error, className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label htmlFor={props.id} className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          id={props.id}
          type={showPassword ? "text" : "password"}
          className={cn(
            "h-12 bg-muted/50 border-none rounded-none text-sm placeholder:text-muted-foreground/30 focus-visible:bg-muted transition-colors pr-12",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors p-1"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && (
        <p className="text-[10px] font-medium text-destructive mt-1">{error}</p>
      )}
    </div>
  )
}
