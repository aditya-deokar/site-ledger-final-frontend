# SiteLedger Frontend

## Overview

This is the Next.js frontend for SiteLedger. It provides the authentication flow, dashboard, company setup, sites, vendors, customers, investors, expenses, and reporting interfaces.

## Prerequisites

- Node.js 20+
- A running backend API

## Environment

Copy `.env.example` to `.env` and update the values:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
```

Notes:

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is optional for local development.
- When reCAPTCHA v3 is enabled, it is invisible. You should not expect a visible checkbox.

## Scripts

- `npm run dev`: start the development server
- `npm run build`: create a production build
- `npm run start`: run the production build
- `npm run lint`: run ESLint

## Authentication

- The frontend now uses secure cookie-based sessions.
- Access and refresh tokens are managed by the backend and are not stored in browser `localStorage`.

## Important Gaps

- The test scripts in `package.json` currently reference Playwright specs that are not present in the repository.
- The repository currently includes both `package-lock.json` and `pnpm-lock.yaml`; choose one package manager and standardize on it.
