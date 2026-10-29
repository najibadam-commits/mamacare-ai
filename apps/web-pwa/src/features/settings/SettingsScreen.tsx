import { useCallback, useEffect, useState } from 'react'
import { Download, HardDrive, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react'
import ConfirmDialog from '../../components/ConfirmDialog'
import Sheet from '../../components/Sheet'
import { useI18n } from '../../i18n/i18nContext'
import { fieldCrypto } from '../../services/crypto'
import { buildExport, downloadJson, exportFileName, getStorageAudit, toKB, wipeAllData } from '../../services/privacy'
import type { StorageAudit } from '../../services/privacy'

interface SettingsScreenProps {
  onClose: () => void
}

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { t } = useI18n()
  const [audit, setAudit] = useState<StorageAudit | null>(null)
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const encrypted = fieldCrypto.available()

  const refreshAudit = useCallback(() => {
    getStorageAudit().then(setAudit).catch(() => setAudit(null))
  }, [])
  useEffect(refreshAudit, [refreshAudit])

  const exportData = async () => {
    setExportMsg(null)
    try {
      const data = await buildExport()
      downloadJson(data, exportFileName())
      setExportMsg({ ok: true, text: t('settings.export.done', { n: data.appointments.length, p: data.preferences.length }) })
    } catch (err) {
      console.error('Export failed', err)
      setExportMsg({ ok: false, text: t('settings.export.error') })
    }
  }

  const deleteEverything = async () => {
    setConfirmDelete(false)
    setDeleting(true)
    setDeleteFailed(false)
    try {
      await wipeAllData()
      window.location.reload() // restart from a pristine state (guides are re-seeded from the app bundle)
    } catch (err) {
      console.error('Wipe failed', err)
      setDeleting(false)
      setDeleteFailed(true)
    }
  }

  const rows: { label: string; value: string }[] = audit
    ? [
        { label: t('settings.audit.appointments'), value: `${toKB(audit.appointments.bytes)} · ${t('settings.audit.records', { n: audit.appointments.count })}` },
        { label: t('settings.audit.preferences'), value: `${toKB(audit.preferences.bytes)} · ${t('settings.audit.records', { n: audit.preferences.count })}` },
        { label: t('settings.audit.guides'), value: `${toKB(audit.guides.bytes)} · ${t('settings.audit.records', { n: audit.guides.count })}` },
        { label: t('settings.audit.localStorage'), value: toKB(audit.localStorageBytes) },
        { label: t('settings.audit.total'), value: audit.totalUsageBytes === null ? t('settings.audit.unknown') : toKB(audit.totalUsageBytes) },
      ]
    : []

  return (
    <Sheet title={t('settings.title')} onClose={onClose}>
      <div className="space-y-4" data-testid="settings">
        <section className="rounded-2xl border border-teal/30 bg-white p-4" aria-labelledby="privacy-title">
          <div className="flex items-center gap-2 text-navy">
            <ShieldCheck className="h-5 w-5 text-teal" aria-hidden />
            <h3 id="privacy-title" className="text-base font-bold">{t('settings.privacy.title')}</h3>
          </div>
          <p className="mt-2 text-sm text-slate-dark">{t('settings.privacy.intro')}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-dark">
            <li>{t('settings.privacy.p1')}</li>
            <li>{t('settings.privacy.p2')}</li>
            <li>{t('settings.privacy.p3')}</li>
            <li>{t('settings.privacy.p4')}</li>
          </ul>
          <p className="mt-3 text-sm font-semibold text-navy">{t('settings.privacy.rights')}</p>
          <p className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${encrypted ? 'bg-teal/10 text-teal' : 'bg-amber-100 text-amber-900'}`}>
            <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden />
            {encrypted ? t('settings.encryption.active') : t('settings.encryption.unavailable')}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="export-title">
          <h3 id="export-title" className="text-base font-bold text-navy">{t('settings.export.title')}</h3>
          <p className="mt-1 text-sm text-slate-600">{t('settings.export.desc')}</p>
          <button type="button" onClick={exportData} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal/90">
            <Download className="h-4 w-4" aria-hidden />
            {t('settings.export.button')}
          </button>
          {exportMsg && (
            <p role="status" className={`mt-2 text-sm ${exportMsg.ok ? 'text-teal' : 'text-red-700'}`}>{exportMsg.text}</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-labelledby="audit-title">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-navy">
              <HardDrive className="h-5 w-5 text-teal" aria-hidden />
              <h3 id="audit-title" className="text-base font-bold">{t('settings.audit.title')}</h3>
            </div>
            <button type="button" onClick={refreshAudit} className="text-xs font-semibold text-teal underline">{t('settings.audit.refresh')}</button>
          </div>
          <p className="mt-1 text-sm text-slate-600">{t('settings.audit.desc')}</p>
          <dl className="mt-3 divide-y divide-slate-100 text-sm" data-testid="storage-audit">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-3 py-2">
                <dt className="text-slate-600">{r.label}</dt>
                <dd className="text-right font-semibold text-slate-dark">{r.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-red-200 bg-red-50 p-4" aria-labelledby="delete-title">
          <h3 id="delete-title" className="text-base font-bold text-red-900">{t('settings.delete.title')}</h3>
          <p className="mt-1 text-sm text-red-900/90">{t('settings.delete.desc')}</p>
          <button
            type="button"
            disabled={deleting}
            onClick={() => setConfirmDelete(true)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {deleting ? t('settings.delete.working') : t('settings.delete.button')}
          </button>
          {deleteFailed && <p role="alert" className="mt-2 text-sm font-semibold text-red-800">{t('settings.delete.error')}</p>}
        </section>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={t('settings.delete.confirmTitle')}
          message={t('settings.delete.confirmBody')}
          confirmLabel={t('settings.delete.confirmButton')}
          destructive
          onConfirm={deleteEverything}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </Sheet>
  )
}
