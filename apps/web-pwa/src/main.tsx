import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import I18nProvider from './i18n/I18nProvider.tsx'
import { encryptLegacyData } from './services/db.ts'
import { seedGuides } from './services/seed.ts'

async function bootstrap() {
  try {
    await seedGuides()
  } catch (err) {
    // The app still renders if IndexedDB is unavailable (e.g. some private modes).
    console.error('Could not seed local guides', err)
  }
  try {
    await encryptLegacyData() // encrypt notes/contacts saved by older versions
  } catch (err) {
    console.error('Could not encrypt legacy data', err)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  )
}

void bootstrap()
