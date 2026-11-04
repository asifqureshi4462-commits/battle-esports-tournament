export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (Number.isInteger(rupees)) {
    return `₹${rupees.toLocaleString('en-IN')}`;
  }
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

export function getTimeRemaining(targetIso: string): { text: string; isPast: boolean; isImminent: boolean } {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) {
    return { text: 'Started', isPast: true, isImminent: false };
  }

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return { text: `in ${days}d ${hours % 24}h`, isPast: false, isImminent: false };
  }
  if (hours > 0) {
    return { text: `in ${hours}h ${mins % 60}m`, isPast: false, isImminent: hours === 0 && mins <= 30 };
  }
  return { text: `in ${mins} mins`, isPast: false, isImminent: mins <= 30 };
}
