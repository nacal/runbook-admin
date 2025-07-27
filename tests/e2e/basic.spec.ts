import { test, expect } from '@playwright/test'

test.describe('Runbook Admin Basic E2E', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check that the page title contains "Runbook Admin"
    await expect(page).toHaveTitle(/Runbook Admin/)
    
    // Check for the main heading
    await expect(page.getByText('🔥 Runbook Admin')).toBeVisible()
    
    // Check for description text
    await expect(page.getByText('Local GUI for running and managing Runn runbooks')).toBeVisible()
  })

  test('should navigate to history page', async ({ page }) => {
    await page.goto('/')
    
    // Click on History link
    await page.getByText('📋 History').click()
    
    // Should be on history page
    await expect(page.getByText('Execution History')).toBeVisible()
    await expect(page.getByText('View all runbook execution results')).toBeVisible()
  })

  test('should show search functionality', async ({ page }) => {
    await page.goto('/')
    
    // Check for search input
    const searchInput = page.getByPlaceholder('Search runbooks...')
    await expect(searchInput).toBeVisible()
    
    // Type in search
    await searchInput.fill('test')
    await expect(searchInput).toHaveValue('test')
  })

  test('should display current project path', async ({ page }) => {
    await page.goto('/')
    
    // Check that project path is displayed - be more specific
    await expect(page.locator('p.text-slate-500').filter({ hasText: /📁.*runbook-admin/ })).toBeVisible()
  })
})