// Cross-component refresh signal: navbar actions (e.g. creating a harvest
// batch) dispatch this event so dashboard pages showing that data reload it.

export const DATA_CHANGED_EVENT = "honeychain:data-changed"

export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT))
  }
}
