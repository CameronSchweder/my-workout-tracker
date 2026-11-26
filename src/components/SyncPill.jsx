export const SYNC_LABEL = {
  loading: ['Syncing…', 'busy'],
  syncing: ['Syncing…', 'busy'],
  synced: ['Backed up', 'ok'],
  idle: ['Backed up', 'ok'],
  offline: ['Offline · will sync', 'warn'],
  error: ['Sync error', 'bad'],
};

export function syncLabel(cloud) {
  if (cloud.user === null) return ['Not backed up', 'warn'];
  return SYNC_LABEL[cloud.status] || SYNC_LABEL.idle;
}

export default function SyncPill({ cloud, onClick }) {
  if (cloud.user === undefined) return null;
  const [text, tone] = syncLabel(cloud);
  return (
    <button className={`sync-pill ${tone}`} onClick={onClick}>
      <i />
      {text}
    </button>
  );
}
