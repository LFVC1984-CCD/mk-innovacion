'use client'
import { useState } from 'react'

interface Props {
  renderSlide: (slideIndex: number) => HTMLDivElement | null
  slideCount: number
  filename?: string
  areaName?: string
  onBeforeExport?: () => void
  onAfterExport?: () => void
}

export default function PDFExportButton({ renderSlide, slideCount, filename = 'comite', areaName = 'Comité', onBeforeExport, onAfterExport }: Props) {
  const [exporting, setExporting] = useState(false)

  async function exportPDF() {
    setExporting(true)
    onBeforeExport?.()

    // Wait for React to render all slides
    await new Promise(r => setTimeout(r, 300))

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const headerH = 12
      const footerH = 6
      const margin = 6
      const usableH = pageH - headerH - footerH - margin
      const usableW = pageW - margin * 2
      const gapH = 4

      // Capture slides 0-2 (skip minutas library)
      const captures: HTMLCanvasElement[] = []
      for (let i = 0; i < Math.min(slideCount, 3); i++) {
        const el = renderSlide(i)
        if (!el) continue
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false })
        captures.push(canvas)
      }

      if (captures.length === 0) { setExporting(false); onAfterExport?.(); return }

      const drawHeader = (p: typeof pdf, pageNum: number, totalPages: number) => {
        p.setFillColor(15, 23, 42)
        p.rect(0, 0, pageW, headerH, 'F')
        p.setTextColor(255, 255, 255)
        p.setFontSize(9)
        p.text(`MK Ingeniería — ${areaName}`, margin, 8)
        p.setTextColor(225, 186, 16)
        p.setFontSize(8)
        p.text(`${new Date().toLocaleDateString('es-CL')}  ·  ${pageNum}/${totalPages}`, pageW - margin, 8, { align: 'right' })
      }

      const drawFooter = (p: typeof pdf) => {
        p.setFontSize(6)
        p.setTextColor(148, 163, 184)
        p.text('Generado por Portal de Comités — Construye con Datos', margin, pageH - 3)
      }

      // Calculate total height needed
      const slideHeights = captures.map(c => (c.height / c.width) * usableW)
      const totalNeeded = slideHeights.reduce((s, h) => s + h, 0) + (captures.length - 1) * gapH

      if (totalNeeded <= usableH) {
        // Fits on 1 page
        drawHeader(pdf, 1, 1)
        let y = headerH + 2
        const scale = Math.min(1, usableH / totalNeeded)
        for (let i = 0; i < captures.length; i++) {
          const w = usableW * scale
          const h = slideHeights[i] * scale
          pdf.addImage(captures[i].toDataURL('image/png'), 'PNG', margin, y, w, h)
          y += h + gapH
        }
        drawFooter(pdf)
      } else {
        // 2 pages: slides 0+1 on page 1, slide 2 on page 2
        const split = Math.min(2, captures.length)
        const totalPages = captures.length > split ? 2 : 1

        // Page 1
        drawHeader(pdf, 1, totalPages)
        let y = headerH + 2
        for (let i = 0; i < split; i++) {
          const maxH = (usableH - gapH * (split - 1)) / split
          let w = usableW
          let h = slideHeights[i]
          if (h > maxH) { w = (maxH / h) * w; h = maxH }
          pdf.addImage(captures[i].toDataURL('image/png'), 'PNG', margin, y, w, h)
          y += h + gapH
        }
        drawFooter(pdf)

        // Page 2
        if (split < captures.length) {
          pdf.addPage()
          drawHeader(pdf, 2, totalPages)
          y = headerH + 2
          for (let i = split; i < captures.length; i++) {
            const h = Math.min(slideHeights[i], usableH)
            const w = (h / slideHeights[i]) * usableW
            pdf.addImage(captures[i].toDataURL('image/png'), 'PNG', margin, y, w, h)
            y += h + gapH
          }
          drawFooter(pdf)
        }
      }

      pdf.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    }

    onAfterExport?.()
    setExporting(false)
  }

  return (
    <button onClick={exportPDF} disabled={exporting}
      className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 disabled:opacity-50">
      {exporting ? 'Generando PDF...' : 'PDF ↓'}
    </button>
  )
}
