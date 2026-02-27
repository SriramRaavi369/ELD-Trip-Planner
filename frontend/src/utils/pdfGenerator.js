import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export const generateTripPDF = async (tripData) => {
    try {
        // Create new PDF document
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        })

        const A4_WIDTH = 210
        const A4_HEIGHT = 297
        const MARGIN = 10
        const CONTENT_WIDTH = A4_WIDTH - (MARGIN * 2)

        // Helper to add a canvas to PDF
        const addCanvasToPdf = (canvas, isFirstPage = false) => {
            if (!isFirstPage) {
                pdf.addPage()
            }
            const imgData = canvas.toDataURL('image/png')
            const imgProps = pdf.getImageProperties(imgData)
            const pdfHeight = (imgProps.height * CONTENT_WIDTH) / imgProps.width

            // Check if height exceeds A4 page height
            let finalHeight = pdfHeight
            let yOffset = MARGIN

            if (pdfHeight > A4_HEIGHT - (MARGIN * 2)) {
                // If it's too tall, scale it down to fit one page (or we could split, but scaling is safer for logs)
                finalHeight = A4_HEIGHT - (MARGIN * 2)
                const scaledWidth = (imgProps.width * finalHeight) / imgProps.height
                const xOffset = MARGIN + (CONTENT_WIDTH - scaledWidth) / 2
                pdf.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, finalHeight)
            } else {
                pdf.addImage(imgData, 'PNG', MARGIN, yOffset, CONTENT_WIDTH, finalHeight)
            }
        }

        // 1. Capture Trip Summary
        const summaryElement = document.getElementById('pdf-summary-export')
        if (summaryElement) {
            const summaryCanvas = await html2canvas(summaryElement, {
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })
            addCanvasToPdf(summaryCanvas, true)
        }

        // 2. Capture each ELD Log Sheet
        if (tripData?.trip?.daily_logs) {
            for (let i = 0; i < tripData.trip.daily_logs.length; i++) {
                const logElement = document.getElementById(`pdf-log-export-${i}`)
                if (logElement) {
                    const logCanvas = await html2canvas(logElement, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    })
                    addCanvasToPdf(logCanvas, false)
                }
            }
        }

        // Create filename with current location and date
        const origin = tripData.trip.stops[0]?.location_name?.split(',')[0] || 'Trip'
        const destination = tripData.trip.stops[tripData.trip.stops.length - 1]?.location_name?.split(',')[0] || 'Destination'
        const date = new Date().toISOString().split('T')[0]
        const fileName = `SpotterAI_${origin}_to_${destination}_${date}.pdf`

        // Save the PDF
        pdf.save(fileName)
        return true
    } catch (error) {
        console.error('Error generating PDF:', error)
        throw error
    }
}
