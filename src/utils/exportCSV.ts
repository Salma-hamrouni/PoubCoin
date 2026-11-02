import { Share, Platform } from 'react-native';

export function reportsToCSV(reports: any[]): string {
  const header = 'ID,Adresse,Statut,Date,Coins,UserId\n';
  const rows = reports.map(r =>
    [
      r.id,
      `"${(r.address || '').replace(/"/g, '""')}"`,
      r.status,
      r.date || '',
      r.coins || 0,
      r.userId || '',
    ].join(',')
  ).join('\n');
  return header + rows;
}

export async function exportReportsCSV(reports: any[], filename = 'poubcoin_export.csv') {
  const csv = reportsToCSV(reports);

  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      await Share.share({ message: csv, title: filename });
    }
    return;
  }

  // Native: share CSV text directly
  await Share.share({ message: csv, title: filename });
}
