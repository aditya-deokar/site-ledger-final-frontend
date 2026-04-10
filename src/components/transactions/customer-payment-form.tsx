'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { customerPaymentSchema, CustomerPaymentInput } from '@/schemas/transactions.schema';
import { useSites } from '@/hooks/api/site.hooks';
import { useSiteCustomers } from '@/hooks/api/customer.hooks';
import { Site } from '@/schemas/site.schema';
import { Customer } from '@/schemas/customer.schema';

interface CustomerPaymentFormProps {
  onSubmit: (data: CustomerPaymentInput) => void;
  isPending: boolean;
  error?: string | null;
  success?: boolean;
}

export function CustomerPaymentForm({ onSubmit, isPending, error, success }: CustomerPaymentFormProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  
  const form = useForm<CustomerPaymentInput>({
    resolver: zodResolver(customerPaymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: '',
      siteId: '',
      customerId: '',
    },
  });

  // Fetch sites for dropdown
  const { data: sitesData, isLoading: sitesLoading } = useSites();
  const sites = sitesData?.data?.sites || [];

  // Fetch customers for selected site
  const { data: customersData, isLoading: customersLoading } = useSiteCustomers(selectedSiteId);
  const customers = customersData?.data?.customers || [];

  // Find selected customer details
  const selectedCustomer = customers.find(c => c.id === form.watch('customerId'));

  // Watch for site changes
  const watchedSiteId = form.watch('siteId');
  useEffect(() => {
    if (watchedSiteId !== selectedSiteId) {
      setSelectedSiteId(watchedSiteId);
      // Reset customer when site changes
      form.setValue('customerId', '');
    }
  }, [watchedSiteId, selectedSiteId, form]);

  const handleSubmit = (data: CustomerPaymentInput) => {
    onSubmit(data);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Customer payment recorded successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amount Field */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Field */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Site Selector */}
          <FormField
            control={form.control}
            name="siteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sitesLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      sites.map((site: Site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Customer Selector */}
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedSiteId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customersLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      customers.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - Flat {customer.flatNumber}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Customer Details Card */}
          {selectedCustomer && (
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Flat:</span>
                    <p className="font-medium">Flat {selectedCustomer.flatNumber}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Selling Price:</span>
                    <p className="font-medium">Rs. {selectedCustomer.sellingPrice.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining:</span>
                    <p className="font-medium text-red-600">Rs. {selectedCustomer.remaining.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Note Field */}
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note / Reference</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g. Cheque #123, NEFT reference, etc."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isPending}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={isPending || !form.formState.isValid}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording Payment...
                </>
              ) : (
                'Record Payment'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
