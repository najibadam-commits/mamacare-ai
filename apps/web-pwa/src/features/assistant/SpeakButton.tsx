import { Square, Volume2 } from 'lucide-react'
import { useI18n } from '../../i18n/i18nContext'

interface SpeakButtonProps {
  playing: boolean
  supported: boolean
  onPlay: () => void
  onStop: () => void
}

/** Speaker icon that becomes a Stop button while the text is being read aloud. */
export default function SpeakButton({ playing, supported, onPlay, onStop }: SpeakButtonProps) {
  const { t } = useI18n()
  const label = playing ? t('assistant.stopLabel') : supported ? t('assistant.speakLabel') : t('assistant.speechUnsupported')
  const Icon = playing ? Square : Volume2
  return (
    <button
      type="button"
      onClick={playing ? onStop : onPlay}
      disabled={!supported}
      aria-label={label}
      aria-pressed={playing}
      title={label}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        playing ? 'border-red-600 bg-red-50 text-red-700' : 'border-teal/40 bg-white text-teal hover:bg-teal/5'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {playing ? t('assistant.stop') : t('assistant.speak')}
    </button>
  )
}
