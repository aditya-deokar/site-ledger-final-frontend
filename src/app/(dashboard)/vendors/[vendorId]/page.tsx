'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { VendorProfile, type VendorProfileTab } from '@/components/dashboard/vendor-profile';
import { isVendorWorkspaceTab } from '@/lib/vendor-workspace';

function getRequestedTab(value: string | null): VendorProfileTab {
  return isVendorWorkspaceTab(value) ? value : 'overview';
}

export default function VendorWorkspaceRoute() {
  const params = useParams<{ vendorId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vendorId = Array.isArray(params.vendorId) ? params.vendorId[0] : params.vendorId;
  const initialTab = getRequestedTab(searchParams.get('tab'));

  if (!vendorId) {
    return (
      <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground italic">
        Vendor workspace could not be opened because the vendor id is missing.
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8">
      <VendorProfile
        vendorId={vendorId}
        initialTab={initialTab}
        onClose={() => {
          if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
            return;
          }

          router.push('/vendors');
        }}
      />
    </div>
  );
}
