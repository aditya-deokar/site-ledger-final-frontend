# Implementation Plan - Frontend Bug Fixes

This plan outlines the steps to address the following frontend issues in `site-ledger-frontend`:
1. Remove Profile icon and Notification icon from header.
2. Change the Numbers Font (they are not properly visible).
3. Fix the Investor and right-side drawer opening animation.
4. Fix the number input field (remove increase/decrease buttons).
5. Remove setting option from sidebar.

## Step 1: Remove Header Icons

**Goal**: Remove the Bell (Notification) and User (Profile) icons from the top header.

**Files**:
- `site-ledger-frontend/src/components/dashboard/header.tsx`

**Action**:
- Remove the `<button>` containing the `Bell` icon.
- Remove the `<button>` containing the `User` icon.

## Step 2: Fix Number Fonts Visibility

**Goal**: Replace `font-serif` (Cormorant Garamond) with `font-sans` (Inter/Geist) or `font-mono` for numeric values to improve visibility and readability.

**Files**:
- `site-ledger-frontend/src/app/dashboard/page.tsx`
- `site-ledger-frontend/src/app/customers/page.tsx`
- `site-ledger-frontend/src/components/dashboard/equity-chart.tsx`
- `site-ledger-frontend/src/components/dashboard/vendor-profile.tsx`
- `site-ledger-frontend/src/components/dashboard/investors-tab.tsx`
- `site-ledger-frontend/src/app/(auth)/layout.tsx` (Check if Auth metrics need updating)

**Action**:
- Search for usages of `font-serif` where numbers are displayed (e.g., `stat.value`, `formatINR(...)`).
- Replace `font-serif` with `font-sans` or remove the class (defaulting to Inter).
- Ensure high contrast colors are maintained.

## Step 3: Fix Drawer Animation

**Goal**: Fix the opening animation for the Right Side Drawer (Sheet component).

**Files**:
- `site-ledger-frontend/package.json`
- `site-ledger-frontend/src/components/ui/sheet.tsx`
- `site-ledger-frontend/src/app/globals.css` (Optional Check)

**Action**:
1.  **Install `tailwindcss-animate`**:
    -   The standard Shadcn UI animation classes depend on this plugin.
    -   Command: `pnpm add tailwindcss-animate` (inside `site-ledger-frontend`).
    -   Update `tailwind.config.js` or `postcss.config.mjs` (if using v4, check valid config) to include the plugin if needed. *Note: Tailwind v4 handles plugins differently, often auto-detecting or via CSS import. We might need to stick to standard CSS transitions if v4 complicates plugins.*
    -   *Alternative*: If using Tailwind v4, we can use native CSS transitions on the `SheetContent`.
    -   *Decision*: Update `SheetContent` to use `data-[state=open]:animate-in` classes if supported, OR revert to standard boolean-based CSS transitions if the library allows (Radix usually handles `data-state`).
    -   Given `@base-ui` usage, check if `data-state` is provided. If not, use standard CSS transitions.
2.  **Update `sheet.tsx`**:
    -   Replace the `data-starting-style` classes with standard `tailwindcss-animate` classes:
        ```tsx
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=right]:slide-in-from-right-2 ..."
        ```
    -   If `tailwindcss-animate` is not viable, use manual transition classes.

## Step 4: Fix Number Input Fields

**Goal**: Remove the browser-default spinners (increase/decrease arrows) from number inputs.

**Files**:
- `site-ledger-frontend/src/app/globals.css`

**Action**:
- Add the following CSS to hide spin buttons:
  ```css
  @layer utilities {
    /* Chrome, Safari, Edge, Opera */
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
  /* Firefox */
  input[type="number"] {
      -moz-appearance: textfield;
  }
  ```

## Step 5: Remove Settings from Sidebar

**Goal**: Remove the "Settings" link from the sidebar navigation.

**Files**:
- `site-ledger-frontend/src/components/dashboard/sidebar.tsx`

**Action**:
- Locate the `bottomItems` array.
- Remove the object `{ icon: Settings, label: "Settings", href: "/settings" }`.

## Verification
- Check Header to ensure icons are gone.
- Check Dashboard numbers for font change.
- Open "Investor" drawer to verify animation.
- Check any number input to ensure arrows are hidden.
- Check Sidebar to ensure Settings is gone.
