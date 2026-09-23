import { OfflineContent } from './offline-content'

export const metadata = {
  title: 'Offline — HoneyChain',
  description: 'You are offline. HoneyChain will sync when connectivity returns.',
}

export default function OfflinePage() {
  return <OfflineContent />
}
