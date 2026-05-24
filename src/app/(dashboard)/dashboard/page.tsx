export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-3 border border-border bg-card p-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Dashboard</p>
        <h1 className="text-2xl font-serif">Dashboard page is reserved.</h1>
        <p className="text-sm text-muted-foreground">
          This route is now separate from Navigator so you can add a new dashboard here.
        </p>
      </div>
    </div>
  );
}
