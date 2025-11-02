"use client"

interface TicketDownloadButtonProps {
  referenceId: string
}

export default function TicketDownloadButton({ referenceId }: TicketDownloadButtonProps) {
  const downloadTicket = async () => {
    try {
      const html2canvas = (await import("html2canvas")).default
      const ticketElement = document.getElementById("ticket-card")
      
      if (!ticketElement) {
        alert("Ticket element not found")
        return
      }

      const canvas = await html2canvas(ticketElement, {
        backgroundColor: null,
        scale: 3,
        logging: false,
      })

      const link = document.createElement("a")
      link.download = `ticket-${referenceId}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (error) {
      console.error("Error downloading ticket:", error)
      alert("Failed to download ticket. Please try again.")
    }
  }

  return (
    <button
      onClick={downloadTicket}
      className="w-full mt-4 bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Download Ticket as Image
    </button>
  )
}