export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

/** Parses the guide markup ("## Heading", "- item", paragraphs) into blocks. */
export function parseContent(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = []
  let list: string[] = []
  const flushList = () => {
    if (list.length) blocks.push({ type: 'list', items: list })
    list = []
  }
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (!line) {
      flushList()
    } else if (line.startsWith('## ')) {
      flushList()
      blocks.push({ type: 'heading', text: line.slice(3) })
    } else if (line.startsWith('- ')) {
      list.push(line.slice(2))
    } else {
      flushList()
      blocks.push({ type: 'paragraph', text: line })
    }
  }
  flushList()
  return blocks
}

export interface ContentSection {
  heading?: string
  blocks: ContentBlock[]
}

/** Groups blocks under their headings so each section renders as one card. */
export function toSections(content: string): ContentSection[] {
  const sections: ContentSection[] = []
  for (const block of parseContent(content)) {
    if (block.type === 'heading') sections.push({ heading: block.text, blocks: [] })
    else {
      if (!sections.length) sections.push({ blocks: [] })
      sections[sections.length - 1].blocks.push(block)
    }
  }
  return sections
}
