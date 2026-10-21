// Minimal pub/sub so lists refresh when a write lands after they regained focus
// (e.g. the note editor's final autosave flushes as the screen is popped).
type Topic = 'notes' | 'finance' | 'tasks';
const listeners = new Map<Topic, Set<() => void>>();

export function onDataChanged(topic: Topic, fn: () => void): () => void {
  const set = listeners.get(topic) ?? new Set();
  set.add(fn);
  listeners.set(topic, set);
  return () => set.delete(fn);
}

export function emitDataChanged(topic: Topic) {
  listeners.get(topic)?.forEach((fn) => fn());
}
