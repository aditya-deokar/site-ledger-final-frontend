"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createSiteSchema, CreateSiteInput } from "@/schemas/site.schema"
import { useCreateSite } from "@/hooks/api/site.hooks"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Database } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api-error"

interface CreateSiteDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseOptionalPositiveInteger(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  const nextValue = typeof value === "number" ? value : Number(value)
  return Number.isNaN(nextValue) ? undefined : nextValue
}

export function CreateSiteDrawer({ open, onOpenChange }: CreateSiteDrawerProps) {
  const { mutate: createSite, isPending, error } = useCreateSite({
    onSuccess: () => {
      onOpenChange(false)
      reset()
    },
  })

  const { register, handleSubmit, watch, reset, formState: { errors }, setValue } = useForm<CreateSiteInput>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: {
      name: '',
      address: '',
      projectType: 'NEW_CONSTRUCTION',
      totalFloors: undefined,
      totalFlats: undefined,
    },
  })

  const projectType = watch('projectType') || 'NEW_CONSTRUCTION'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] border-l border-border p-0 flex flex-col overflow-hidden bg-background">
        <SheetHeader className="p-10 pb-6 flex-row justify-start items-center space-y-0">
          <SheetTitle className="text-3xl font-serif tracking-tight text-foreground italic">Create New Site</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-10 pb-10 flex flex-col gap-10">
          <form id="create-site-form" onSubmit={handleSubmit((data) => createSite(data))} className="flex flex-col gap-8 mt-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-[11px] font-bold p-3 tracking-wide">
                {getApiErrorMessage(error, 'Failed to create site')}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Project Name</Label>
              <Input
                placeholder="e.g. Sai Residency Villa 1"
                className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground"
                {...register('name')}
              />
              <p className="text-[10px] text-muted-foreground/60">
                This name is reused across site dashboards and prefilled receipt screens.
              </p>
              {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Site Address</Label>
              <Textarea
                placeholder="Plot 45, Sector 8, Tech-City North"
                className="bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 resize-none min-h-20 text-foreground"
                {...register('address')}
              />
              <p className="text-[10px] text-muted-foreground/60">
                This address becomes the default site location shown in receipt downloads.
              </p>
              {errors.address && <p className="text-[10px] text-destructive">{errors.address.message}</p>}
            </div>

            {/* Project Type Selector */}
            <input type="hidden" {...register('projectType')} />
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Project Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue('projectType', 'NEW_CONSTRUCTION', { shouldValidate: true })}
                  className={[
                    'border p-4 flex flex-col items-center gap-2 transition-colors',
                    projectType === 'NEW_CONSTRUCTION'
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-muted/10 hover:bg-muted/20',
                  ].join(' ')}
                >
                  <span className="text-2xl leading-none">🏗️</span>
                  <p className="text-[10px] font-bold tracking-widest uppercase">NEW SITE</p>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('projectType', 'REDEVELOPMENT', { shouldValidate: true })}
                  className={[
                    'border p-4 flex flex-col items-center gap-2 transition-colors',
                    projectType === 'REDEVELOPMENT'
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-muted/10 hover:bg-muted/20',
                  ].join(' ')}
                >
                  <span className="text-2xl leading-none">🏚️</span>
                  <p className="text-[10px] font-bold tracking-widest uppercase">REDEVELOPMENT</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Total Floors</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 5"
                  className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground"
                  {...register('totalFloors', { setValueAs: parseOptionalPositiveInteger })}
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Optional. Leave blank to configure floors later from Site Structure.
                </p>
                {errors.totalFloors && <p className="text-[10px] text-destructive">{errors.totalFloors.message}</p>}
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] tracking-widest uppercase opacity-40 font-bold text-foreground">Total Units/Flats</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 20"
                  className="h-12 bg-muted border-none rounded-none text-[10px] font-bold tracking-widest placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20 text-foreground"
                  {...register('totalFlats', { setValueAs: parseOptionalPositiveInteger })}
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Optional. If added, blank flats are generated automatically and you can name them later.
                </p>
                {errors.totalFlats && <p className="text-[10px] text-destructive">{errors.totalFlats.message}</p>}
              </div>
            </div>

            <div className="border border-dashed border-border bg-muted/20 p-4 text-[10px] leading-relaxed text-muted-foreground">
              When you enter floors or flats here, SiteLedger creates the initial structure automatically. Floor labels and flat IDs can be filled in later from the Site Structure tool.
            </div>
          </form>
        </div>

        <div className="p-10 pt-6 border-t border-border flex items-center justify-between gap-6">
          <SheetClose className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all px-4 py-2 text-foreground">
            Cancel
          </SheetClose>
          <Button form="create-site-form" type="submit" disabled={isPending} className="h-14 flex-1 bg-primary text-black font-bold text-[11px] tracking-[0.2em] uppercase hover:bg-primary/90 rounded-none gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Commit Site to Ledger</span><Database className="w-4 h-4" /></>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
