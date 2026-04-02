"use client"

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, Info } from "lucide-react"

interface EditCompanyDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCompanyDrawer({ isOpen, onOpenChange }: EditCompanyDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] border-l border-border p-0 flex flex-col overflow-hidden bg-background">
        <SheetHeader className="p-10 pb-6 flex-row justify-start items-center space-y-0">
          <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">Edit Company</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-10 pb-10 flex flex-col gap-10">
          <form className="flex flex-col gap-8 mt-4">
            <div className="grid gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Company Name</Label>
              <Input defaultValue="GAA Builders" className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest focus-visible:bg-card focus-visible:ring-primary/20 text-foreground" />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Company Address</Label>
              <Textarea 
                placeholder="Enter full physical address..." 
                className="min-h-[120px] bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/50 focus-visible:bg-card focus-visible:ring-primary/20 p-4 text-foreground" 
              />
            </div>

            <div className="p-6 bg-muted border border-border flex gap-4 items-start">
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3 h-3 text-black" />
              </div>
              <p className="text-[9px] leading-normal font-bold text-muted-foreground uppercase tracking-widest">
                VERIFICATION OF ADDRESS MAY TAKE UP TO 24 HOURS FOR SECURITY PROTOCOLS. ALL ARCHITECTURAL AUDITS ARE LINKED TO THIS IDENTIFIER.
              </p>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-10 pt-6 border-t border-border flex items-center justify-between gap-6">
          <SheetClose className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all px-4 py-2 text-foreground">
            Cancel
          </SheetClose>
          <Button className="h-14 flex-1 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2">
            Save Changes <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
