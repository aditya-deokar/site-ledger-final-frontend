const { test, expect } = require('@playwright/test')
const path = require('path')

const baseURL = process.env.PW_BASE_URL || 'http://localhost:3001'
const qaEmail = process.env.PW_QA_EMAIL
const qaPassword = process.env.PW_QA_PASSWORD
const qaSiteId = process.env.PW_QA_SITE_ID
const qaAccessToken = process.env.PW_QA_ACCESS_TOKEN
const qaRefreshToken = process.env.PW_QA_REFRESH_TOKEN
const hasTokenSession = Boolean(qaAccessToken && qaRefreshToken)
const hasLoginSession = Boolean(qaEmail && qaPassword)

test.describe('customer agreement smoke', () => {
  test.skip(!qaSiteId || (!hasTokenSession && !hasLoginSession), 'PW_QA_SITE_ID and either tokens or login credentials are required')

  test('renders the agreement-first customer flow', async ({ page }) => {
    test.setTimeout(90_000)

    if (hasTokenSession) {
      await page.addInitScript(
        ([accessToken, refreshToken]) => {
          window.localStorage.setItem('accessToken', accessToken)
          window.localStorage.setItem('refreshToken', refreshToken)
        },
        [qaAccessToken, qaRefreshToken],
      )
    } else {
      await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
      await page.locator('#email').fill(qaEmail)
      await page.locator('#password').fill(qaPassword)
      await page.getByRole('button', { name: 'Login', exact: true }).click()
      await page.waitForFunction(() => Boolean(window.localStorage.getItem('accessToken')))
    }

    await page.goto(`${baseURL}/sites/${qaSiteId}`, { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('button', { name: 'Floors & Flats', exact: true })).toBeVisible()
    await expect(page.getByText('Projected Profit', { exact: true })).toBeVisible()

    await page.screenshot({
      path: path.join('D:\\final-sitesledger\\.qa-artifacts', 'customer-agreement-site.png'),
      fullPage: true,
    })

    await page.getByRole('button', { name: 'Floors & Flats', exact: true }).click()
    await expect(page.getByRole('button', { name: 'UI QA Buyer', exact: true })).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'View', exact: true }).first().click()

    await expect(page).toHaveURL(/\/customers\/[^/?#]+$/)
    await expect(page.getByRole('link', { name: 'Back to Customers' })).toBeVisible()
    await expect(page.getByText('Financial Summary', { exact: true })).toBeVisible()
    await expect(page.getByText('Agreement Total', { exact: true })).toBeVisible()
    await expect(
      page.getByText(
        'Collections and agreement changes are now tracked separately. Edit price, GST, discounts, or charges below without creating fake payments.',
        { exact: true },
      ),
    ).toBeVisible()
    await expect(page.getByText('Agreement Ledger', { exact: true })).toBeVisible()
    await expect(
      page.getByText(
        'Base price, taxes, charges, discounts, and credits live here. Payments stay separate in the customer ledger.',
        { exact: true },
      ),
    ).toBeVisible()
    await expect(page.getByText('GST 10%', { exact: true })).toBeVisible()
    await expect(page.getByText('Parking', { exact: true })).toBeVisible()
    await expect(page.getByText('Festival Discount', { exact: true })).toBeVisible()

    await page.screenshot({
      path: path.join('D:\\final-sitesledger\\.qa-artifacts', 'customer-agreement-profile.png'),
      fullPage: true,
    })

    await page.getByRole('button', { name: 'Receipt / Statement', exact: true }).click()

    await expect(page.getByText('Customer Receipt & Statement', { exact: true })).toBeVisible()
    await expect(page.getByText('Money receipt', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeVisible()
    await expect(page.getByText('Recorded agreement lines', { exact: true }).first()).toBeVisible()
    await expect(
      page.getByText(
        'Review the actual document, adjust print details, and export a PDF instead of downloading raw HTML.',
        { exact: true },
      ),
    ).toBeVisible()

    await page.screenshot({
      path: path.join('D:\\final-sitesledger\\.qa-artifacts', 'customer-agreement-receipt.png'),
      fullPage: true,
    })
  })
})
