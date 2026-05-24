import { useMemo, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { getApiErrorMessage } from '@/lib/api-error';
import { calculateFixedRateInterest } from '@/lib/investors';
import {
  useAddTransaction,
  usePayInterest,
  useReturnInvestment,
  useTransactions,
  useUpdateInvestorPayment,
} from '@/hooks/api/investor.hooks';
import { useSite } from '@/hooks/api/site.hooks';
import {
  transactionSchema,
  type Investor,
  type Transaction,
  type TransactionInput,
} from '@/schemas/investor.schema';

import type { InvestorLedgerMode } from './types';

export type InvestorLedgerForm = UseFormReturn<TransactionInput>;

export function useInvestorLedger(investor: Investor) {
  const { data, isLoading } = useTransactions(investor.id);
  const { data: investorSiteData, isLoading: isSiteLoading } = useSite(investor.siteId ?? '');
  const [addMode, setAddMode] = useState<InvestorLedgerMode | null>(null);
  const [calcResult, setCalcResult] = useState<{
    annual: number;
    monthly: number;
    daily: number;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [payTx, setPayTx] = useState<Transaction | null>(null);

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
  });

  const { reset, setValue } = form;

  function resetTransactionForm(defaultAmount?: number) {
    reset(
      defaultAmount !== undefined
        ? { amount: defaultAmount, note: '' }
        : { amount: undefined, note: '' },
    );
  }

  function handleMutationSuccess() {
    setAddMode(null);
    resetTransactionForm();
    setCalcResult(null);
    setApiError(null);
  }

  const { mutateAsync: addTransactionAsync, isPending: addingTransaction } = useAddTransaction({
    onSuccess: handleMutationSuccess,
  });
  const { mutateAsync: returnInvestmentAsync, isPending: returningInvestment } =
    useReturnInvestment({
      onSuccess: handleMutationSuccess,
    });
  const { mutateAsync: payInterestAsync, isPending: payingInterest } = usePayInterest({
    onSuccess: handleMutationSuccess,
  });
  const { mutate: updatePayment, isPending: updatingPayment } = useUpdateInvestorPayment(
    investor.id,
    { onSuccess: () => setPayTx(null) },
  );

  const transactions: Transaction[] = data?.data?.transactions ?? [];
  const totalInvested = data?.data?.totalInvested ?? investor.totalInvested;
  const totalReturned = data?.data?.totalReturned ?? investor.totalReturned;
  const equityProfitTransactions = investor.type === 'EQUITY'
    ? transactions.filter((transaction) => transaction.kind === 'INTEREST')
    : [];
  const interestPaid = investor.type === 'EQUITY'
    ? equityProfitTransactions.reduce((sum, transaction) => sum + transaction.amountPaid, 0)
    : data?.data?.interestPaid ?? investor.interestPaid;
  const outstandingPrincipal = data?.data?.outstandingPrincipal ?? investor.outstandingPrincipal;
  const isPending = addingTransaction || returningInvestment || payingInterest;
  const siteProfit = Math.max(investorSiteData?.data?.site?.totalProfit ?? 0, 0);
  const estimatedProfitShare = investor.type === 'EQUITY'
    ? Math.round(((investor.equityPercentage ?? 0) / 100) * siteProfit)
    : 0;
  const recordedProfitShare = investor.type === 'EQUITY'
    ? equityProfitTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
    : 0;
  const pendingProfitShare = investor.type === 'EQUITY'
    ? equityProfitTransactions.reduce((sum, transaction) => sum + Math.max(transaction.remaining, 0), 0)
    : 0;
  const hasOpenProfitShare = investor.type === 'EQUITY'
    ? equityProfitTransactions.some((transaction) => transaction.paymentStatus !== 'COMPLETED')
    : false;
  const availableProfitShareToRecord = investor.type === 'EQUITY'
    ? Math.max(estimatedProfitShare - recordedProfitShare, 0)
    : 0;
  const canRecordProfitShare = investor.type === 'EQUITY'
    ? !isLoading
      && !isSiteLoading
      && totalInvested > 0
      && availableProfitShareToRecord > 0
      && !hasOpenProfitShare
    : false;
  const principalReturned = Math.max(totalReturned - interestPaid, 0);

  const calculateInterest = () => {
    setCalcResult(
      calculateFixedRateInterest(
        outstandingPrincipal,
        investor.fixedRate,
        investor.fixedRateCadence,
      ),
    );
  };

  const openAddMode = (nextMode: InvestorLedgerMode) => {
    if (nextMode === 'interest' && investor.type === 'EQUITY' && !canRecordProfitShare) {
      return;
    }

    setAddMode(nextMode);
    setApiError(null);
    setCalcResult(null);

    if (nextMode === 'interest' && investor.type === 'EQUITY') {
      resetTransactionForm(availableProfitShareToRecord);
      return;
    }

    resetTransactionForm();
  };

  const closeAddMode = () => {
    setAddMode(null);
    resetTransactionForm();
    setCalcResult(null);
    setApiError(null);
  };

  const onSubmit = async (formData: TransactionInput) => {
    setApiError(null);

    try {
      if (addMode === 'invest') {
        await addTransactionAsync({ investorId: investor.id, data: formData });
        return;
      }

      if (addMode === 'return') {
        await returnInvestmentAsync({ investorId: investor.id, data: formData });
        return;
      }

      if (addMode === 'interest') {
        await payInterestAsync({ investorId: investor.id, data: formData });
      }
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'Request failed.'));
    }
  };

  const submitPayment = (payment: { amount: number; note?: string }) => {
    if (!payTx) return;

    updatePayment({
      transactionId: payTx.id,
      data: {
        amount: payment.amount,
        note: payment.note,
      },
    });
  };

  const addModeLabel = useMemo(() => {
    if (addMode === 'invest') return 'New Investment';
    if (addMode === 'return') return 'Return Principal';
    if (addMode === 'interest') {
      return investor.type === 'EQUITY' ? 'Profit Share Payout' : 'Interest Payment';
    }
    return null;
  }, [addMode, investor.type]);

  return {
    addMode,
    addModeLabel,
    apiError,
    calcResult,
    canRecordProfitShare,
    availableProfitShareToRecord,
    estimatedProfitShare,
    hasOpenProfitShare,
    interestPaid,
    investorSiteData,
    isLoading,
    isPending,
    isSiteLoading,
    outstandingPrincipal,
    payTx,
    pendingProfitShare,
    principalReturned,
    recordedProfitShare,
    siteProfit,
    totalInvested,
    transactions,
    updatingPayment,
    form,
    closeAddMode,
    calculateInterest,
    openAddMode,
    onSubmit,
    setPayTx,
    setValue,
    submitPayment,
  };
}

export type InvestorLedgerController = ReturnType<typeof useInvestorLedger>;
