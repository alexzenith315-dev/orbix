// Pure launch-state derivation. Inputs are DB fields and the indexed mint count; output is never stored, so it cannot drift.
export const LAUNCH_STATES = ['UPCOMING', 'LIVE', 'SOLD_OUT', 'COMPLETED', 'CANCELLED'];

export function deriveLaunchState(project, { now = new Date(), mintedCount = null } = {}) {
  if (project.cancelledAt) return 'CANCELLED';
  const launchAt = new Date(project.launchAt);
  const endAt = new Date(project.endAt);
  if (now < launchAt) return 'UPCOMING';
  if (mintedCount !== null && mintedCount >= project.supply) return 'SOLD_OUT';
  if (now <= endAt) return 'LIVE';
  return 'COMPLETED';
}

// Application lifecycle. Only ADMINISTRATOR may approve, reject or publish. Approval never implies verification.
export const APP_TRANSITIONS = {
  DRAFT: { SUBMITTED: ['CREATOR'] },
  SUBMITTED: { UNDER_REVIEW: ['MODERATOR'], APPROVED: ['ADMINISTRATOR'], REJECTED: ['ADMINISTRATOR'] },
  UNDER_REVIEW: { APPROVED: ['ADMINISTRATOR'], REJECTED: ['ADMINISTRATOR'] },
  APPROVED: { PUBLISHED: ['ADMINISTRATOR'] },
  REJECTED: {},
  PUBLISHED: {},
};

// Returns the required role for a transition, or null when the transition is not allowed.
export function transitionRole(from, to) {
  const next = APP_TRANSITIONS[from]?.[to];
  return next ? next : null;
}
