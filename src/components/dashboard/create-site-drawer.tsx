"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Database, Hammer, Loader2, Users } from "lucide-react"

import { useCreateSite } from "@/hooks/api/site.hooks"
import { getApiErrorMessage } from "@/lib/api-error"
import { createSiteSchema, CreateSiteInput } from "@/schemas/site.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

interface CreateSiteDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseOptionalPositiveInteger(value: unknown) {
  if (value === "" || value === null || value === undefined) {
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

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setValue,
  } = useForm<CreateSiteInput>({
    resolver: zodResolver(createSiteSchema),
    defaultValues: {
      name: "",
      address: "",
      projectType: "NEW_CONSTRUCTION",
      totalFloors: undefined,
      totalFlats: undefined,
    },
  })

  const projectType = watch("projectType") || "NEW_CONSTRUCTION"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-hidden border-l border-border bg-background p-0 sm:max-w-[500px]">
        <SheetHeader className="flex-row items-center justify-start space-y-0 p-10 pb-6">
          <SheetTitle className="text-3xl font-serif italic tracking-tight text-foreground">Create New Site</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-10 overflow-y-auto px-10 pb-10">
          <form id="create-site-form" onSubmit={handleSubmit((data) => createSite(data))} className="mt-4 flex flex-col gap-8">
            {error && (
              <div className="bg-destructive/10 p-3 text-[11px] font-bold tracking-wide text-destructive">
                {getApiErrorMessage(error, "Failed to create site")}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40">Project Name</Label>
              <Input
                placeholder="e.g. Sai Residency Villa 1"
                className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
                {...register("name")}
              />
              <p className="text-[10px] text-muted-foreground/60">
                This name is reused across site dashboards and prefilled receipt screens.
              </p>
              {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40">Site Address</Label>
              <Textarea
                placeholder="Plot 45, Sector 8, Tech-City North"
                className="min-h-20 resize-none rounded-none border-none bg-muted text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
                {...register("address")}
              />
              <p className="text-[10px] text-muted-foreground/60">
                This address becomes the default site location shown in receipt downloads.
              </p>
              {errors.address && <p className="text-[10px] text-destructive">{errors.address.message}</p>}
            </div>

            <input type="hidden" {...register("projectType")} />
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40">Project Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue("projectType", "NEW_CONSTRUCTION", { shouldValidate: true })}
                  className={[
                    "flex flex-col items-center gap-3 border p-4 transition-colors",
                    projectType === "NEW_CONSTRUCTION"
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-muted/10 hover:bg-muted/20",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-11 w-11 items-center justify-center border transition-colors",
                      projectType === "NEW_CONSTRUCTION"
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground",
                    ].join(" ")}
                  >
                    <Building2 className="h-5 w-5" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-widest">NEW SITE</p>
                </button>

                <button
                  type="button"
                  onClick={() => setValue("projectType", "REDEVELOPMENT", { shouldValidate: true })}
                  className={[
                    "flex flex-col items-center gap-3 border p-4 transition-colors",
                    projectType === "REDEVELOPMENT"
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-muted/10 hover:bg-muted/20",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "relative flex h-11 w-11 items-center justify-center border transition-colors",
                      projectType === "REDEVELOPMENT"
                        ? "border-primary/30 bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground",
                    ].join(" ")}
                  >
                    <Users className="h-5 w-5" />
                    <Hammer className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-none bg-background p-0.5" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-widest">REDEVELOPMENT</p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40">Total Floors</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 5"
                  className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
                  {...register("totalFloors", { setValueAs: parseOptionalPositiveInteger })}
                />
                <p className="text-[10px] text-muted-foreground/60">
                  Optional. Leave blank to configure floors later from Site Structure.
                </p>
                {errors.totalFloors && <p className="text-[10px] text-destructive">{errors.totalFloors.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40">Total Units/Flats</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 20"
                  className="h-12 rounded-none border-none bg-muted text-[10px] font-bold tracking-widest text-foreground placeholder:text-muted-foreground/30 focus-visible:bg-card focus-visible:ring-primary/20"
                  {...register("totalFlats", { setValueAs: parseOptionalPositiveInteger })}
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

        <div className="flex items-center justify-between gap-6 border-t border-border p-10 pt-6">
          <SheetClose className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40 transition-all hover:opacity-100">
            Cancel
          </SheetClose>
          <Button
            form="create-site-form"
            type="submit"
            disabled={isPending}
            className="h-14 flex-1 gap-2 rounded-none bg-primary text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-primary/90"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Commit Site to Ledger</span>
                <Database className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
