'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Loader2, Upload, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { companyService } from '@/services/company.service';
import { toast } from 'sonner';

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
};

export function CompanyLogoUploader({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = () => fileRef.current?.click();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await companyService.uploadLogoToS3(file);
      onChange(url);
      toast.success('Logo uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="border border-border bg-muted/10 p-3">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden border border-border bg-background">
              <Image src={value} alt="Company logo" fill className="object-contain" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={handlePick} className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange(null)}
                className="h-9 rounded-none text-[10px] font-bold uppercase tracking-widest text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handlePick}
          disabled={uploading}
          className="h-10 rounded-none text-[10px] font-bold uppercase tracking-widest"
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Upload Logo
        </Button>
      )}
    </div>
  );
}
