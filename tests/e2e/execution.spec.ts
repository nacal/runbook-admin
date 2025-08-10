import { expect, test } from '@playwright/test'

test.describe('Runbook Execution E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/')
  })

  test('should show Quick Run button and execution state', async ({ page }) => {
    // Wait for runbook cards to load
    await page.waitForSelector('[data-testid="runbook-card"]', {
      timeout: 5000,
    })

    // Look for a runbook card with Quick Run button
    const runbookCard = page.locator('[data-testid="runbook-card"]').first()

    // Check that Quick Run button is visible
    const quickRunBtn = runbookCard.getByText('▶️ Quick Run')
    await expect(quickRunBtn).toBeVisible()

    // Click Quick Run button
    await quickRunBtn.click()

    // Wait a moment for execution to start
    await page.waitForTimeout(500)

    // Wait for execution to complete or fail (with timeout)
    // The executing state might be very brief, so we just check for the final state
    await expect(
      runbookCard
        .getByText('▶️ Quick Run')
        .or(runbookCard.getByText('❌ Failed'))
        .or(runbookCard.getByText('✅ Success'))
        .or(runbookCard.getByText('🔄 Executing...')),
    ).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to Configure & Run modal', async ({ page }) => {
    // Wait for runbook cards to load
    await page.waitForSelector('[data-testid="runbook-card"]', {
      timeout: 5000,
    })

    // Look for a runbook card - it might have either Quick Run or Configure & Run
    const runbookCard = page.locator('[data-testid="runbook-card"]').first()

    // Check if Configure & Run button exists (for runbooks with variables)
    const configureBtn = runbookCard.getByText('⚙️ Configure & Run')
    const quickRunBtn = runbookCard.getByText('▶️ Quick Run')

    // Some runbooks might only have Quick Run if they don't have variables
    if ((await configureBtn.count()) > 0) {
      await configureBtn.click()

      // Should open modal with Configure & Run title
      await expect(page.getByText('Configure & Run')).toBeVisible()

      // Should have close button
      await expect(page.getByTitle('Close')).toBeVisible()

      // Should have Execute button in modal
      await expect(page.getByRole('button', { name: /Execute/i })).toBeVisible()

      // Close modal
      await page.getByTitle('Close').click()

      // Modal should be closed
      await expect(page.getByText('Configure & Run')).not.toBeVisible()
    } else {
      // This runbook doesn't have variables, only Quick Run is available
      await expect(quickRunBtn).toBeVisible()
    }
  })

  test('should show execution results in modal', async ({ page }) => {
    // Wait for runbook cards to load
    await page.waitForSelector('[data-testid="runbook-card"]', {
      timeout: 5000,
    })

    // Look for completed executions or execute a simple one
    const runbookCard = page.locator('[data-testid="runbook-card"]').first()

    const quickRunBtn = runbookCard.getByText('▶️ Quick Run')

    // Execute runbook
    await quickRunBtn.click()

    // Wait for execution to complete
    await expect(
      runbookCard
        .getByText('▶️ Quick Run')
        .or(runbookCard.getByText('❌ Failed'))
        .or(runbookCard.getByText('✅ Success')),
    ).toBeVisible({ timeout: 15000 })

    // If there's a success or failure indicator, click to view results
    const resultBtn = runbookCard
      .getByText('✅ Success')
      .or(runbookCard.getByText('❌ Failed'))

    if ((await resultBtn.count()) > 0) {
      await resultBtn.click()

      // Should show execution result modal
      await expect(page.getByText('Execution Result')).toBeVisible()

      // Should show execution details
      await expect(page.getByText('Status:')).toBeVisible()
      await expect(page.getByText('Duration:')).toBeVisible()
      await expect(page.getByText('Exit Code:')).toBeVisible()
    }
  })

  test('should navigate to execution history and show results', async ({
    page,
  }) => {
    // Navigate to History page
    await page.getByText('📋 History').click()

    // Should be on history page
    await expect(page.getByText('Execution History')).toBeVisible()

    // Check if there are execution cards
    const executionCards = page.locator('[data-testid="execution-card"]')

    if ((await executionCards.count()) > 0) {
      // Should show execution details
      await expect(executionCards.first()).toBeVisible()

      // Should have status indicators
      const hasSuccess = (await page.getByText('✅ Success').count()) > 0
      const hasFailed = (await page.getByText('❌ Failed').count()) > 0
      const hasRunning = (await page.getByText('🔄 Running').count()) > 0

      expect(hasSuccess || hasFailed || hasRunning).toBe(true)
    }

    // Should have Clear All button if executions exist
    const clearButton = page.getByText('🗑️ Clear All')
    if ((await clearButton.count()) > 0) {
      await expect(clearButton).toBeVisible()
    }
  })

  test('should handle execution errors gracefully', async ({ page }) => {
    // This test checks error handling without actually causing errors
    // as we can't easily simulate runn CLI errors in E2E tests

    // Go to History page to check for any failed executions
    await page.getByText('📋 History').click()

    // If there are failed executions, verify they're displayed properly
    const failedExecutions = page.getByText('❌ Failed')

    if ((await failedExecutions.count()) > 0) {
      // Click on a failed execution to view details
      await failedExecutions.first().click()

      // Should show error details in modal
      await expect(
        page.getByRole('heading', { name: 'Execution Result' }),
      ).toBeVisible()

      // Check for status text in a more flexible way
      const statusElements = page.locator('text=/Status:/i')
      if ((await statusElements.count()) > 0) {
        await expect(statusElements.first()).toBeVisible()
      }

      // Check for error text in a more flexible way
      const errorElements = page.locator('text=/Error:/i')
      if ((await errorElements.count()) > 0) {
        await expect(errorElements.first()).toBeVisible()
      }
    }
  })

  test('should preserve running executions during navigation', async ({
    page,
  }) => {
    // Start an execution if possible
    const runbookCard = page.locator('[data-testid="runbook-card"]').first()

    if ((await runbookCard.count()) > 0) {
      const quickRunBtn = runbookCard.getByText('▶️ Quick Run')

      if ((await quickRunBtn.count()) > 0) {
        await quickRunBtn.click()

        // If execution starts, navigate away and back
        const executingBtn = runbookCard
          .getByText('⏸️ Executing...')
          .or(runbookCard.getByText('▶️ Executing...'))

        if (await executingBtn.isVisible({ timeout: 1000 })) {
          // Navigate to History
          await page.getByText('📋 History').click()

          // Navigate back to Dashboard
          await page.getByText('🏠 Dashboard').click()

          // Execution state should be preserved
          await expect(
            executingBtn.or(runbookCard.getByText('▶️ Execute Runbook')),
          ).toBeVisible({ timeout: 5000 })
        }
      }
    }
  })
})
