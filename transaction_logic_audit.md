# Navigator Transaction Logic Audit

This document outlines critical logical and structural flaws identified within the Navigator's `TransactionHistoryView` and its associated data-fetching flows. These issues span across redundant network requests, dangerous data aggregation practices, and brittle UI implementations.

## 1. Ambiguous Scoping: "All" vs "Company" Transactions
**The Flaw:**
The actions `all-transactions` and `company-transactions` map to the exact same React Query configuration:
```typescript
const companyActivityQuery = useQuery({
  queryKey: ['company-activity', action],
  queryFn: () => companyService.getActivity(undefined, 50),
  // ...
});
```
**The Impact:** 
Both actions fetch and display identical datasets. Because the queryKey includes `action`, switching between the two tabs will trigger a redundant network request for the exact same data. Furthermore, there is no parameter passed to the backend to differentiate between "Global" (All) activity and "Company-specific" internal activity.

## 2. Dangerous Client-Side Financial Aggregation
**The Flaw:**
The "Stat Cards" displayed at the top of the transaction views rely heavily on `Array.prototype.reduce` to calculate critical financial totals directly from the rendered `rows` array.
*   **Company Gross Flow:** Calculated by summing the last 50 transactions.
*   **Site Inflow/Outflow:** Calculated by summing the `recentActivity` items returned in the site report.
*   **Investor Paid:** Calculated by summing `amountPaid` from the local rows.

**The Impact:**
Because endpoints like `companyService.getActivity` have a hardcoded `limit=50`, the UI totals (like "Gross Flow") only represent the *visible/paginated* data, not the actual global ledger totals. This presents mathematically incorrect financial data to the user, creating a severe transparency risk.

## 3. Hardcoded Pagination Limits
**The Flaw:**
The `companyActivityQuery` enforces a hardcoded limit of `50` (`companyService.getActivity(undefined, 50)`).
**The Impact:**
The frontend lacks any pagination state (e.g., page numbers, cursors, or "Load More" functionality). If a company has more than 50 historical transactions, they are permanently inaccessible from the Navigator UI, leading to silent data loss in the presentation layer.

## 4. Unstable Key Generation via `Math.random()`
**The Flaw:**
In the row mapping logic for `vendor-transactions`, the code attempts to fallback to a random ID if the transaction lacks one:
```typescript
id: item.transactionId || `vs-${item.date}-${Math.random()}`,
```
**The Impact:**
While wrapped in a `useMemo`, any underlying data refresh (e.g., query invalidation or background refetch) will generate entirely new keys for the same Vendor Statement entries. This completely breaks React's reconciliation process, forcing the table rows to unmount and remount from scratch, destroying localized state (like user text selection or focus).

## 5. Brittle Lexical Date Sorting
**The Flaw:**
The column sorting mechanism uses `String().localeCompare()` for non-numeric fields.
**The Impact:**
For the `date` columns, this strictly assumes the backend returns an ISO-8601 string (e.g., `YYYY-MM-DD`). If the API format changes to localized strings (e.g., `10 Oct 2023`) or returns a native JS `Date` object, lexical string comparison will alphabetize the dates rather than ordering them chronologically, silently breaking the chronological view.

## 6. Entity Context Silent Failure
**The Flaw:**
Queries relying on a selected entity are guarded cautiously:
```typescript
enabled: action === 'vendor-transactions' && !!selectedEntity?.id,
```
**The Impact:**
If a user route or shortcut attempts to load an entity-specific transaction view (like `vendor-transactions`) but the `selectedEntity` state is null or dropped, the query silently disables itself. The UI will render an empty table forever, providing no error message or visual fallback to instruct the user to reselect an entity.
