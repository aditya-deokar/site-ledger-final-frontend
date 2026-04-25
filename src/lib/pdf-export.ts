/**
 * Renders a DOM node to a multi-page A4 PDF using html2canvas + jsPDF.
 * Applies safe hex colors to avoid unsupported oklch/oklab color function errors.
 */

const PDF_SAFE_COLORS_CSS = `
.pdf-export-safe-mode {
  --background: #ffffff !important;
  --foreground: #111827 !important;
  --card: #ffffff !important;
  --card-foreground: #111827 !important;
  --popover: #ffffff !important;
  --popover-foreground: #111827 !important;
  --primary: #14b8a6 !important;
  --primary-foreground: #1a1a1a !important;
  --secondary: #f7f7f7 !important;
  --secondary-foreground: #353535 !important;
  --muted: #f8f8f8 !important;
  --muted-foreground: #6b7280 !important;
  --accent: #f8f8f8 !important;
  --accent-foreground: #373737 !important;
  --destructive: #ef4444 !important;
  --border: #e5e7eb !important;
  --input: #e5e7eb !important;
  --ring: #b5b5b5 !important;
  --chart-1: #e0e0e0 !important;
  --chart-2: #6b7280 !important;
  --chart-3: #737373 !important;
  --chart-4: #5f5f5f !important;
  --chart-5: #444444 !important;
  --sidebar: #1e1b3a !important;
  --sidebar-foreground: #f2f2f7 !important;
  --sidebar-primary: #14b8a6 !important;
  --sidebar-primary-foreground: #ffffff !important;
  --sidebar-accent: #2d2a4a !important;
  --sidebar-accent-foreground: #f2f2f7 !important;
  --sidebar-border: #2d2a4a !important;
  --sidebar-ring: #14b8a6 !important;
}

.pdf-export-safe-mode .bg-white {
  background-color: #ffffff !important;
}

.pdf-export-safe-mode .bg-slate-50 {
  background-color: #f8fafc !important;
}

.pdf-export-safe-mode .bg-slate-100 {
  background-color: #f1f5f9 !important;
}

.pdf-export-safe-mode .bg-teal-50 {
  background-color: #f0fdfa !important;
}

.pdf-export-safe-mode .bg-teal-600 {
  background-color: #0d9488 !important;
}

.pdf-export-safe-mode .bg-teal-700 {
  background-color: #0f766e !important;
}

.pdf-export-safe-mode .text-slate-900 {
  color: #0f172a !important;
}

.pdf-export-safe-mode .text-slate-800 {
  color: #1e293b !important;
}

.pdf-export-safe-mode .text-slate-700 {
  color: #334155 !important;
}

.pdf-export-safe-mode .text-slate-600 {
  color: #475569 !important;
}

.pdf-export-safe-mode .text-slate-500 {
  color: #64748b !important;
}

.pdf-export-safe-mode .text-teal-700 {
  color: #0f766e !important;
}

.pdf-export-safe-mode .text-teal-800 {
  color: #115e59 !important;
}

.pdf-export-safe-mode .text-teal-900 {
  color: #134e4a !important;
}

.pdf-export-safe-mode .text-red-600 {
  color: #dc2626 !important;
}

.pdf-export-safe-mode .border-slate-100 {
  border-color: #f1f5f9 !important;
}

.pdf-export-safe-mode .border-slate-200 {
  border-color: #e2e8f0 !important;
}

.pdf-export-safe-mode .border-teal-200 {
  border-color: #99f6e4 !important;
}

.pdf-export-safe-mode * {
  box-shadow: none !important;
  text-shadow: none !important;
}
`

export async function exportElementToPdf(element: HTMLElement, filename: string) {
  // Validate element
  if (!element || !element.offsetWidth || !element.offsetHeight) {
    throw new Error("Element is not visible or has no dimensions. Ensure the preview is fully loaded.")
  }

  let html2canvas: any
  let jsPDF: any

  try {
    const modules = await Promise.all([import("html2canvas"), import("jspdf")])
    html2canvas = modules[0].default
    jsPDF = modules[1].jsPDF
  } catch (error) {
    console.error("Failed to load PDF libraries:", error)
    throw new Error("Failed to load PDF generation libraries. Please refresh and try again.")
  }

  // Inject PDF-safe colors stylesheet
  const styleElement = document.createElement("style")
  styleElement.id = "pdf-export-safe-colors-temp"
  styleElement.textContent = PDF_SAFE_COLORS_CSS
  document.head.appendChild(styleElement)

  // Add the safe mode class to the element
  element.classList.add("pdf-export-safe-mode")

  const previousShadow = element.style.boxShadow
  const previousMaxH = element.style.maxHeight
  element.style.boxShadow = "none"
  element.style.maxHeight = "none"

  try {
    // Wait for styles to apply
    await new Promise(resolve => setTimeout(resolve, 200))

    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      imageTimeout: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    })

    if (!canvas || canvas.width < 2 || canvas.height < 2) {
      console.error("Canvas dimensions:", canvas?.width, canvas?.height)
      throw new Error("The receipt could not be rendered (empty canvas). Try again or use Print.")
    }

    const pdf = new jsPDF("p", "mm", "a4")
    const margin = 8
    const pageWidth = pdf.internal.pageSize.getWidth() - 2 * margin
    const pageHeightMm = pdf.internal.pageSize.getHeight() - 2 * margin

    // Fit full canvas width to page width; total image height in mm
    const imgWidthMm = pageWidth
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width

    // How many source pixels of canvas = one full PDF page
    const pageHeightCanvasPx = (pageHeightMm / imgHeightMm) * canvas.height

    let yPx = 0
    let isFirst = true
    while (yPx < canvas.height) {
      if (!isFirst) {
        pdf.addPage()
      }
      isFirst = false

      const slicePx = Math.min(pageHeightCanvasPx, canvas.height - yPx)
      const sliceCanvas = document.createElement("canvas")
      sliceCanvas.width = canvas.width
      sliceCanvas.height = Math.max(1, Math.ceil(slicePx))
      const ctx = sliceCanvas.getContext("2d")
      if (!ctx) {
        console.error("Failed to get 2d context for slice canvas")
        break
      }
      ctx.drawImage(canvas, 0, yPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx)

      const data = sliceCanvas.toDataURL("image/png", 1.0)
      const sliceHeightMm = (slicePx * imgWidthMm) / canvas.width
      pdf.addImage(data, "PNG", margin, margin, pageWidth, sliceHeightMm, undefined, "FAST")
      yPx += slicePx
    }

    pdf.save(filename)
  } catch (error) {
    console.error("PDF generation error:", error)
    
    // If it's still a color function error, provide helpful message
    if (error instanceof Error && (error.message.includes("color function") || error.message.includes("oklab") || error.message.includes("oklch"))) {
      throw new Error("PDF generation failed due to unsupported colors. Please use your browser's Print dialog (Ctrl+P or Cmd+P) and save as PDF instead.")
    }
    
    throw error
  } finally {
    // Cleanup
    element.style.boxShadow = previousShadow
    element.style.maxHeight = previousMaxH
    element.classList.remove("pdf-export-safe-mode")
    
    const styleEl = document.getElementById("pdf-export-safe-colors-temp")
    if (styleEl) {
      styleEl.remove()
    }
  }
}
