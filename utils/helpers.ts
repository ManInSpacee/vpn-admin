function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function getDays(plan: string): number | null {
  if (plan === "unlimited") return null;
  if (plan === "1m") return 30;
  if (plan === "3m") return 90;
  if (plan === "12m") return 360;
  return 30;
}

function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export { formatBytes, getDays, asyncHandler };
