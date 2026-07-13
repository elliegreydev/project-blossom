export function shouldApplyRemoteChange(
  localPendingAt: string | null,
  remoteChangedAt: string
): boolean {
  return localPendingAt === null || remoteChangedAt >= localPendingAt;
}

