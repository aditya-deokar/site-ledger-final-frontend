'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { useSite } from '@/hooks/api/site.hooks';

import { BookFlatWorkspace } from './book-flat-workspace';
import { useSiteInventory } from './use-site-inventory';

function buildReturnHref(siteId: string) {
  return `/sites/${siteId}?tab=floors`;
}

export function SiteBookFlatPage() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { data: siteData, isLoading: isSiteLoading, error } = useSite(siteId ?? '');
  const { effectiveWings, floors, isLoading: isInventoryLoading } = useSiteInventory(siteId ?? '');
  const initialFlatId = searchParams.get('flatId') ?? undefined;
  const preferredFloorId = searchParams.get('floorId') ?? undefined;
  const preferredWingId = searchParams.get('wingId') ?? undefined;

  if (!siteId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-serif text-foreground">Booking link is incomplete</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This booking page needs a valid site id before we can load the inventory workspace.
        </p>
        <Link href="/navigator" className={buttonVariants({ variant: 'outline', className: 'rounded-none' })}>
          Back to Navigator
        </Link>
      </div>
    );
  }

  if (isSiteLoading || isInventoryLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const site = siteData?.data?.site;
  const returnHref = buildReturnHref(siteId);
  const errorMessage =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'error' in error && typeof error.error === 'string'
        ? error.error
        : 'We could not load this site right now.';

  if (!site) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-3xl font-serif text-foreground">Site unavailable</h1>
        <p className="max-w-md text-sm text-muted-foreground">{errorMessage}</p>
        <Link href="/navigator" className={buttonVariants({ variant: 'outline', className: 'rounded-none' })}>
          Back to Navigator
        </Link>
      </div>
    );
  }

  return (
    <BookFlatWorkspace
      siteId={siteId}
      siteName={site.name}
      floors={floors}
      wings={effectiveWings}
      projectType={site.projectType}
      initialFlatId={initialFlatId}
      preferredFloorId={preferredFloorId}
      preferredWingId={preferredWingId}
      onCancel={() => router.replace(returnHref)}
      onSuccess={() => router.replace(returnHref)}
    />
  );
}
