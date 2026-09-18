// Whether a roadmap item gets a "Recently added" or "Recently shipped" label.
// Kept apart from the roadmap page so a test can reach it without React.

export interface RecencyFields {
  stage: string;
  created_at: string;
  stage_changed_at: string;
}

// How long something counts as new. Long enough that somebody who opens the
// roadmap every couple of weeks still sees what changed, short enough that
// the label keeps meaning something.
export const RECENT_DAYS = 21;

/*
 * Worked out from dates, never from a box somebody ticks. It used to be the
 * is_recent column, ticked by hand when items were added and never unticked,
 * and by September 2026 it sat on 53 of 86 items including everything in Up
 * next and ideas added two months earlier. The label had come to mean "this
 * exists".
 *
 * Planned items count from when they were added. Available items count from
 * when they moved into Available, which the database records itself on a
 * stage change (supabase/roadmap_stage_changed_at.sql). updated_at would not
 * do: it moves on any edit, so rewording a description would have announced
 * a feature as freshly shipped.
 */
export function recentLabel(item: RecencyFields, now: number): string | null {
  const since = item.stage === "available" ? item.stage_changed_at : item.created_at;
  const at = Date.parse(since);
  if (!Number.isFinite(at)) return null;
  if (now - at > RECENT_DAYS * 24 * 60 * 60 * 1000) return null;
  return item.stage === "available" ? "Recently shipped" : "Recently added";
}
