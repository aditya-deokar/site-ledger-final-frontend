"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { usePathname } from "next/navigation"

const steps = [
  { id: "01", title: "Create Account", path: "/sign-up" },
  { id: "02", title: "Setup Company", path: "/setup-company" },
  { id: "03", title: "Add Partners", path: "/add-partners" },
  { id: "04", title: "Create First Site", path: "/create-site" },
]

export function Stepper() {
  const pathname = usePathname()
  
  const currentStepIndex = steps.findIndex(s => s.path === pathname)
  const activeIndex = currentStepIndex !== -1 ? currentStepIndex : 0

  return (
    <div className="flex flex-col gap-10 relative">
      {/* Vertical Line */}
      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-white/10" />

      {steps.map((step, index) => {
        const isCompleted = index < activeIndex
        const isActive = index === activeIndex
        const isPending = index > activeIndex

        return (
          <div key={step.id} className="flex items-center gap-6 relative z-10 group">
            {/* Step Icon/Box */}
            <div 
              className={cn(
                "w-8 h-8 flex items-center justify-center border transition-all duration-300",
                isCompleted && "bg-primary border-primary text-black",
                isActive && "bg-primary border-primary text-black shadow-[0_0_20px_rgba(0,229,255,0.3)]",
                isPending && "bg-white/5 border-white/10 text-white/40"
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4 stroke-3" />
              ) : (
                <span className={cn(
                  "text-[10px] font-bold tracking-tighter transition-colors",
                  isActive ? "text-black" : "text-white/40"
                )}>{step.id}</span>
              )}
            </div>

            {/* Step Info */}
            <div className="flex flex-col">
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-[0.2em]",
                isActive ? "text-primary" : "text-white/40"
              )}>
                {isActive ? (index === 1 ? "Setup Required" : "Step " + step.id) : (isCompleted ? "Completed" : "Pending")}
              </span>
              <span className={cn(
                "text-sm font-serif",
                isActive ? "text-white" : "text-white/40"
              )}>
                {step.title}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
