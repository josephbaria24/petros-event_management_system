import { QRScanner } from '@/components/qr-scanner'

export default function QRScanPage({ params }: { params: { id: string } }) {
  return <QRScanner eventId={params.id} />
}