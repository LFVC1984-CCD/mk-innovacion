'use client'
import { useState } from 'react'

interface Props {
  targetRef: React.RefObject<HTMLDivElement | null>
  filename?: string
  areaName?: string
}

export default function PDFExportButton({ targetRef, filename = 'comite', areaName = 'Comité' }: Props) {
  const [exporting, setExporting] = useState(false)

  async function exportPDF() {
    if (!targetRef.current) return
    setExporting(true)

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      // Header
      pdf.setFillColor(15, 23, 42) // #0F172A
      pdf.rect(0, 0, pageW, 12, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(8)
      pdf.text(`MK Ingeniería — ${areaName}`, 8, 8)
      pdf.setTextColor(225, 186, 16) // gold
      pdf.text(new Date().toLocaleDateString('es-CL'), pageW - 8, 8, { align: 'right' })

      // Content
      const contentY = 14
      const contentH = pageH - contentY - 6
      const imgW = pageW - 16
      const imgH = (canvas.height / canvas.width) * imgW
      const finalH = Math.min(imgH, contentH)
      const finalW = (finalH / imgH) * imgW

      pdf.addImage(imgData, 'PNG', 8, contentY, finalW, finalH)

      // Footer
      pdf.setFontSize(6)
      pdf.setTextColor(148, 163, 184)
      pdf.text('Generado por Portal de Comités — Construye con Datos', 8, pageH - 3)

      pdf.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    }

    setExporting(false)
  }

  return (
    <button onClick={exportPDF} disabled={exporting}
      className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 disabled:opacity-50">
      {exporting ? 'Exportando...' : 'PDF ↓'}
    </button>
  )
}
