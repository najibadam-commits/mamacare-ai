import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { SEED_GUIDES } from '../src/data/guides.seed'
import { goTab, openApp, readDb, trackChatRequests } from './helpers'

test.describe('Journey 1 - Language switch to Hausa and translated guides', () => {
  test('switching to Hausa translates navigation and guide content', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /^Language/ }).click()
    await page.getByRole('option', { name: /Hausa/ }).click()

    await expect(page.locator('html')).toHaveAttribute('lang', 'ha')
    await goTab(page, /Jagorori/)

    const first = SEED_GUIDES[0]!
    const hausa = first.translations.ha
    const english = first.translations.en
    await expect(page.getByText(hausa.title).first()).toBeVisible()
    await expect(page.getByText(english.title)).toHaveCount(0)

    // open the article: translated key takeaways are shown
    await page.getByText(hausa.title).first().click()
    await expect(page.getByRole('dialog').getByText(hausa.keyTakeaways[0]!, { exact: false }).first()).toBeVisible()
  })

  test('the chosen language survives a reload', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /^Language/ }).click()
    await page.getByRole('option', { name: /Hausa/ }).click()
    await expect.poll(() => readDb(page).then((d) => d?.preferences.find((p) => p.key === 'language')?.value)).toBe('ha')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ha')
  })
})

test.describe('Journey 2 - Antenatal appointment, persistence and discreet reminder', () => {
  test('adds an antenatal appointment, keeps it after reload, encrypts notes, and sends a discreet reminder', async ({ page, context, baseURL }) => {
    await context.grantPermissions(['notifications'], { origin: new URL(baseURL!).origin })
    // Record notifications instead of showing them. sessionStorage keeps the record across the reload below.
    await page.addInitScript(() => {
      ServiceWorkerRegistration.prototype.showNotification = function (title: string, options?: NotificationOptions) {
        const list = JSON.parse(sessionStorage.getItem('__notifications') ?? '[]')
        list.push({ title, body: options?.body, icon: options?.icon })
        sessionStorage.setItem('__notifications', JSON.stringify(list))
        return Promise.resolve()
      }
    })
    const recorded = () =>
      page.evaluate(() => JSON.parse(sessionStorage.getItem('__notifications') ?? '[]') as { title: string; body: string; icon?: string }[])
    await openApp(page)
    await goTab(page, /Appointments/)

    // Turn on reminders through the explicit consent sheet.
    await page.getByRole('button', { name: 'Turn on reminders' }).click()
    await page.getByRole('button', { name: 'Allow reminders' }).click()
    await expect(page.getByText('Reminders are on')).toBeVisible()

    // Appointment in 20 minutes with a 30-minute reminder => due immediately.
    const soon = new Date(Date.now() + 20 * 60_000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}`
    const time = `${pad(soon.getHours())}:${pad(soon.getMinutes())}`

    await page.getByRole('button', { name: 'Add appointment' }).first().click()
    await page.getByRole('radio', { name: 'Antenatal' }).click()
    await page.locator('#appt-title').fill('Secret clinic visit')
    await page.locator('#appt-date').fill(date)
    await page.locator('#appt-time').fill(time)
    await page.locator('#appt-facility').fill('Gwarzo General Hospital')
    await page.locator('#appt-reminder').selectOption('30')
    await page.locator('#appt-notes').fill('PRIVATE-NOTE: ask about blood pressure')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Gwarzo General Hospital').first()).toBeVisible()
    await expect(page.getByText('PRIVATE-NOTE: ask about blood pressure')).toBeVisible()

    // Local persistence: stored in IndexedDB, notes are ciphertext, and it survives a reload.
    const db = await readDb(page)
    expect(db?.appointments).toHaveLength(1)
    expect(db?.appointments[0]).toMatchObject({ appointmentType: 'antenatal', date, time, reminderOffsetMinutes: 30, status: 'scheduled' })
    expect(String(db?.appointments[0]?.notes)).toMatch(/^enc:v1:/)
    expect(JSON.stringify(db)).not.toContain('PRIVATE-NOTE')
    await page.reload()
    await goTab(page, /Appointments/)
    await expect(page.getByText('Gwarzo General Hospital').first()).toBeVisible()

    // Discreet reminder formatting: generic title/body only, no clinical details, no icon.
    await expect.poll(async () => (await recorded()).length, { timeout: 30_000 }).toBeGreaterThan(0)
    const [n] = await recorded()
    expect(n!.title).toBe('Health reminder')
    expect(n!.body).toMatch(/^Reminder: You have a health visit scheduled for today at \d{1,2}:\d{2}/)
    const shown = JSON.stringify(n).toLowerCase()
    for (const leak of ['antenatal', 'secret', 'gwarzo', 'hospital', 'blood', 'pregnan', 'private']) expect(shown).not.toContain(leak)
    expect(n!.icon).toBeUndefined()
  })
})

test.describe('Journey 3 - Clinical safety triage blocks transmission', () => {
  test('"I am bleeding" opens the emergency modal immediately and sends nothing to the backend', async ({ page }) => {
    const chat = trackChatRequests(page)
    // If anything did try to reach the backend, make it visible rather than silently failing.
    await page.route('**/api/chat', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"answer":"LEAKED","sources":[],"disclaimer":""}' }))

    await openApp(page)
    await goTab(page, /AI Assistant/)
    await page.locator('#assistant-input').fill('I am bleeding')
    await page.getByRole('button', { name: 'Send' }).click()

    const modal = page.getByTestId('emergency-modal')
    await expect(modal).toBeVisible({ timeout: 2_000 })
    await expect(modal.getByText('MamaCare AI is an educational tool. This requires immediate physical clinical attention at a hospital or health post.')).toBeVisible()
    await expect(modal.getByRole('link', { name: /112/ })).toHaveAttribute('href', 'tel:112')

    await page.keyboard.press('Escape')
    await expect(page.getByText('This may be a danger sign')).toBeVisible()
    await expect(page.getByText('Your message was NOT sent to the assistant.')).toBeVisible()
    await expect(page.getByText('LEAKED')).toHaveCount(0)
    expect(chat.count()).toBe(0)
  })

  test('a non-emergency question IS sent to the backend and its answer is shown', async ({ page }) => {
    const chat = trackChatRequests(page)
    await page.route('**/api/chat', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ answer: '- Sleep under a treated net every night.', sources: [{ title: 'Malaria in Pregnancy', category: 'malaria' }], disclaimer: 'Educational only.' }),
      }),
    )
    await openApp(page)
    await goTab(page, /AI Assistant/)
    await expect(page.getByTestId('assistant-privacy-notice')).toContainText('sent to the MamaCare server')
    await page.getByRole('button', { name: 'How do I prevent malaria?' }).click()
    await expect(page.getByText('Sleep under a treated net every night.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Sources \(1\)/ })).toBeVisible()
    expect(chat.count()).toBe(1)
  })
})

test.describe('Journey 4 - NDPA: Delete All My Data', () => {
  test('wipes IndexedDB, web storage and the encryption key, then returns to an empty state', async ({ page }) => {
    await openApp(page)
    await page.evaluate(() => {
      localStorage.setItem('probe', '1')
      sessionStorage.setItem('probe', '1')
    })

    // Create personal data: an appointment with a note, and an emergency contact.
    await goTab(page, /Appointments/)
    await page.getByRole('button', { name: 'Add appointment' }).first().click()
    await page.locator('#appt-notes').fill('WIPE-ME-NOTE')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('WIPE-ME-NOTE')).toBeVisible()

    await page.getByRole('button', { name: 'Emergency help' }).click()
    await page.getByRole('button', { name: 'Add a trusted person to call' }).click()
    await page.getByTestId('emergency-modal').locator('input').first().fill('08031234567')
    await page.getByTestId('emergency-modal').getByRole('button', { name: /Save/ }).click()
    await page.keyboard.press('Escape')

    const before = await readDb(page)
    expect(before?.appointments).toHaveLength(1)
    expect(before?.names).toContain('mamacare-keystore')

    // Export first (data-subject access) - valid JSON.
    await page.getByRole('button', { name: 'Settings and privacy' }).click()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export My Data' }).click()])
    const exported = JSON.parse(await readFile((await download.path())!, 'utf8'))
    expect(exported.schema).toBe('mamacare-export/1')
    expect(exported.appointments[0].notes).toBe('WIPE-ME-NOTE')

    // Delete with explicit confirmation. Cancel does nothing.
    await page.getByRole('button', { name: 'Delete All My Data' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: /Cancel|Not now|No/i }).first().click()
    expect((await readDb(page))?.appointments).toHaveLength(1)

    await page.getByRole('button', { name: 'Delete All My Data' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, delete everything' }).click()
    await page.waitForLoadState('load')
    await expect(page.getByRole('heading', { name: 'MamaCare AI', level: 1 })).toBeVisible()
    await expect.poll(() => readDb(page).then((d) => d?.guides ?? 0)).toBeGreaterThan(0) // pristine: guides re-seeded

    const after = await readDb(page)
    expect(after?.appointments).toEqual([])
    expect(after?.preferences.map((p) => p.key)).toEqual(['guidesSeedVersion'])
    expect(after?.names).not.toContain('mamacare-keystore')
    expect(JSON.stringify(after)).not.toMatch(/WIPE-ME|0803123/)
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0])

    await goTab(page, /Appointments/)
    await expect(page.getByText('Log your first visit')).toBeVisible()
  })
})

test.describe('Journey 5 - Offline resilience', () => {
  test('guides and the offline FAQ keep working with no network', async ({ page, context }) => {
    await openApp(page)
    // Wait for the service worker to take control so a reload can be served from the cache.
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise<void>((r) => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true }))
      return reg.active?.state
    })
    await page.reload()

    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const chat = trackChatRequests(page)

    await context.setOffline(true)
    await page.reload() // served by the service worker
    await expect(page.getByRole('heading', { name: 'MamaCare AI', level: 1 })).toBeVisible()
    await expect(page.getByText(/You are offline/)).toBeVisible()

    // Guides still render (from IndexedDB).
    await goTab(page, /Guides/)
    await expect(page.getByText(SEED_GUIDES[0]!.translations.en.title).first()).toBeVisible()
    await page.getByText(SEED_GUIDES[0]!.translations.en.title).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')

    // Assistant falls back to cached FAQ cards with the offline banner and no network request.
    await goTab(page, /AI Assistant/)
    await page.getByRole('button', { name: 'When do babies get BCG vaccine?' }).click()
    await expect(page.getByText('Offline Mode: Showing verified guidance from our local library.')).toBeVisible()
    await expect(page.locator('article').first()).toBeVisible()
    await expect(page.getByText(/not medical advice/i)).toBeVisible()
    expect(chat.count()).toBe(0)
    expect(errors).toEqual([])

    // Coming back online restores normal behaviour (no stuck offline state).
    await context.setOffline(false)
  })

  test('backend down while the device is online also falls back gracefully', async ({ page }) => {
    await page.route('**/api/chat', (route) => route.fulfill({ status: 502, body: 'Bad gateway' }))
    await openApp(page)
    await goTab(page, /AI Assistant/)
    await page.getByRole('button', { name: 'How do I prevent malaria?' }).click()
    await expect(page.getByText('Offline Mode: Showing verified guidance from our local library.')).toBeVisible()
    await expect(page.getByText(/could not be reached/)).toBeVisible()
    await expect(page.locator('article').first()).toBeVisible()
  })
})

test.describe('Home screen', () => {
  test('shows quick actions, opens emergency help, and navigates', async ({ page }) => {
    await openApp(page)
    await expect(page.getByRole('heading', { name: 'Know the danger signs' })).toBeVisible()
    await expect(page.getByText('No visit planned yet')).toBeVisible()
    await page.getByRole('button', { name: 'Open emergency help' }).click()
    await expect(page.getByTestId('emergency-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Read guides' }).click()
    await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: /Guides/ })).toHaveAttribute('aria-current', 'page')
  })
})
