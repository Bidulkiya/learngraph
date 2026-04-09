/**
 * 학습 문서 관련 공용 유틸리티.
 *
 * - buildPrintableHtml: 학습 문서(HTML 또는 마크다운)를 self-contained HTML 문서로 변환
 * - isHtmlDoc: 콘텐츠가 HTML인지 마크다운인지 감지
 * - plainTextToHtml: 텍스트 입력을 기본 HTML 포매팅 (제목 감지, 줄바꿈)
 *
 * NodeDetailPopup (학생)과 NodeEditor (교사) 양쪽에서 재사용된다.
 */

/**
 * 콘텐츠가 HTML인지 마크다운인지 감지.
 */
export function isHtmlDoc(content: string): boolean {
  const trimmed = content.trimStart()
  return trimmed.startsWith('<') && /<(div|html|body|table|h[1-6]|p|section|article)/i.test(trimmed)
}

/**
 * 학습 문서를 다운로드/프린트용 self-contained HTML 문서로 변환.
 *
 * - HTML이면 그대로 삽입
 * - 마크다운이면 간단 변환 (h1-h3, ul/li, bold/italic, p)
 */
export function buildPrintableHtml(title: string, content: string): string {
  const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  let body = content
  if (!isHtmlDoc(content)) {
    const lines = content.replace(/</g, '&lt;').replace(/>/g, '&gt;').split('\n')
    const out: string[] = []
    let inList = false
    for (const line of lines) {
      if (/^### (.+)$/.test(line)) {
        if (inList) { out.push('</ul>'); inList = false }
        out.push(line.replace(/^### (.+)$/, '<h3>$1</h3>'))
      } else if (/^## (.+)$/.test(line)) {
        if (inList) { out.push('</ul>'); inList = false }
        out.push(line.replace(/^## (.+)$/, '<h2>$1</h2>'))
      } else if (/^# (.+)$/.test(line)) {
        if (inList) { out.push('</ul>'); inList = false }
        out.push(line.replace(/^# (.+)$/, '<h1>$1</h1>'))
      } else if (/^- (.+)$/.test(line)) {
        if (!inList) { out.push('<ul>'); inList = true }
        out.push(line.replace(/^- (.+)$/, '<li>$1</li>'))
      } else if (line.trim() === '') {
        if (inList) { out.push('</ul>'); inList = false }
        out.push('')
      } else {
        if (inList) { out.push('</ul>'); inList = false }
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
        out.push(`<p>${formatted}</p>`)
      }
    }
    if (inList) out.push('</ul>')
    body = out.join('\n')
  }
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${safeTitle} - 학습 문서</title>
<style>
  body { font-family: -apple-system, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 820px; margin: 40px auto; padding: 24px; line-height: 1.65; color: #1f2937; background: #fff; }
  * { box-sizing: border-box; }
  h1 { color: #4F6BF6; border-bottom: 2px solid #4F6BF6; padding-bottom: 8px; margin-top: 0; }
  h2 { color: #1f2937; margin-top: 28px; }
  h3 { color: #4F6BF6; margin-top: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 8px 10px; }
  ul, ol { padding-left: 22px; }
  p { margin: 12px 0; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; text-align: center; }
  @media print { body { margin: 0; max-width: none; } .footer { page-break-before: avoid; } }
</style>
</head>
<body>
${body}
<div class="footer">NodeBloom — AI 기반 학습 문서</div>
</body>
</html>`
}

/**
 * 교사가 직접 입력한 평문 텍스트를 기본 HTML 포매팅으로 변환.
 *
 * 변환 규칙:
 * - 첫 줄 → h1 (제목)
 * - "제목:"/"# " 으로 시작하는 줄 → h2
 * - "- " 또는 "* " → ul/li
 * - "1. " "2. " → ol/li
 * - 빈 줄 → 문단 구분
 * - 나머지 → p
 *
 * 최종 결과는 `<div class="ws-doc">...</div>` 프래그먼트.
 */
export function plainTextToHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return '<div class="ws-doc"></div>'

  // 이미 HTML이면 래핑만
  if (isHtmlDoc(trimmed)) {
    return trimmed.includes('ws-doc') ? trimmed : `<div class="ws-doc">${trimmed}</div>`
  }

  const escape = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const lines = trimmed.split(/\r?\n/)
  const out: string[] = ['<div class="ws-doc" style="font-family: -apple-system, \'Malgun Gothic\', sans-serif; line-height: 1.65; color: #1f2937;">']

  let isFirstContent = true
  let inUl = false
  let inOl = false

  const closeLists = (): void => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trimEnd()

    if (!line.trim()) {
      closeLists()
      continue
    }

    // 첫 줄 또는 첫 비어있지 않은 줄 → h1 (제목)
    if (isFirstContent) {
      isFirstContent = false
      out.push(`<h1 style="color: #4F6BF6; border-bottom: 2px solid #4F6BF6; padding-bottom: 8px; margin-top: 0;">${escape(line)}</h1>`)
      continue
    }

    // 마크다운 헤딩
    if (/^#{1,3}\s+/.test(line)) {
      closeLists()
      const level = line.match(/^(#{1,3})/)?.[1].length ?? 2
      const text = line.replace(/^#{1,3}\s+/, '')
      const tag = `h${Math.min(level + 1, 4)}`
      out.push(`<${tag} style="color: #4F6BF6; margin-top: 20px;">${escape(text)}</${tag}>`)
      continue
    }

    // "제목:" 또는 "주제:" 등 콜론 헤딩
    if (/^[가-힣\w\s]{1,20}:\s*$/.test(line)) {
      closeLists()
      out.push(`<h2 style="color: #4F6BF6; margin-top: 24px;">${escape(line.replace(/:\s*$/, ''))}</h2>`)
      continue
    }

    // 순서 없는 리스트
    if (/^[-*]\s+/.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul style="padding-left: 22px;">'); inUl = true }
      out.push(`<li>${escape(line.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }

    // 순서 있는 리스트
    if (/^\d+\.\s+/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol style="padding-left: 22px;">'); inOl = true }
      out.push(`<li>${escape(line.replace(/^\d+\.\s+/, ''))}</li>`)
      continue
    }

    closeLists()
    // 일반 문단 — 볼드/이탤릭 간단 지원
    let formatted = escape(line)
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>')
    out.push(`<p style="margin: 12px 0;">${formatted}</p>`)
  }

  closeLists()
  out.push('</div>')
  return out.join('\n')
}
