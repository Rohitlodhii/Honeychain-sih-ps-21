import { OfflineContent } from './offline-content'

export const metadata = {
  title: 'Offline — Beelink',
  description: 'You are offline. Beelink will sync when connectivity returns.',
}

export default function OfflinePage() {
  return <OfflineContent />
}
