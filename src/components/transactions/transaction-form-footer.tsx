import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface TransactionFormFooterProps {
  onBack: () => void;
  isSubmitting: boolean;
  isValid: boolean;
  backLabel?: string;
  saveLabel?: string;
}

export function TransactionFormFooter({
  onBack,
  isSubmitting,
  isValid,
  backLabel = 'Back [Ctrl+BK]',
  saveLabel = 'Save [Ctrl+Enter]'
}: TransactionFormFooterProps) {
  return (
    <div className="flex justify-between items-center pt-4 border-t border-border/50">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="text-muted-foreground/40 hover:text-red-600 hover:bg-red-50 text-[10px] font-bold uppercase tracking-widest py-6 group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        {backLabel}
      </Button>

      <Button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="px-12 h-14 rounded-none text-[11px] font-bold uppercase tracking-[0.25em] shadow-lg hover:shadow-primary/20 transition-all"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  );
}
