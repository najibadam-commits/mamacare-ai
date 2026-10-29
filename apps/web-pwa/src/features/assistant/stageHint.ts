import type { StageId } from '../../data/stages'

/** Maps the app's stage to the free-text hint the RAG engine understands. */
export function stageHint(stage: StageId | ''): string | undefined {
  if (!stage) return undefined
  if (stage === 'postnatal') return 'postnatal'
  if (stage === 'baby-care') return 'newborn'
  return 'pregnancy'
}
