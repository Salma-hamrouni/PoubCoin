// Centralized report status colors — use these everywhere instead of hardcoded hex values
export const STATUS_COLORS = {
  pending: {
    text:   '#B45309',
    bg:     '#FEF3C7',
    border: '#FDE68A',
    label:  'En attente',
    icon:   'time-outline' as const,
  },
  validated: {
    text:   '#15803D',
    bg:     '#DCFCE7',
    border: '#BBF7D0',
    label:  'Validé',
    icon:   'checkmark-circle-outline' as const,
  },
  rejected: {
    text:   '#DC2626',
    bg:     '#FEE2E2',
    border: '#FECACA',
    label:  'Rejeté',
    icon:   'close-circle-outline' as const,
  },
} as const;

export type ReportStatus = keyof typeof STATUS_COLORS;
