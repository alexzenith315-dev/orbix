// Role ordering used for server-side checks. The role is always read from the database, never from the request.
export const ROLE_RANK = { USER: 0, CREATOR: 1, MODERATOR: 2, ADMINISTRATOR: 3 };

export function hasRole(userRole, required) {
  return (ROLE_RANK[userRole] ?? -1) >= ROLE_RANK[required];
}

export const ROLES = Object.keys(ROLE_RANK);
