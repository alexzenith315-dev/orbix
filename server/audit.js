import { prisma } from './db.js';

// Every privileged action writes a row here. Failures to audit should fail the action.
export async function audit({ actorId = null, action, target, metadata = null, ip = null }) {
  return prisma.auditLog.create({
    data: { actorId, action, target: String(target), metadata, ip },
  });
}
