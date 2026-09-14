// نطاق اليوم للإجازة (Leave.period): FULL يوم كامل، MORNING/EVENING نصف يوم —
// عرض موحّد لشاشات الإجازات والتقويم بدل «0.5 يوم» كأنها يوم كامل

export const isHalfDay = (period?: string | null): period is 'MORNING' | 'EVENING' =>
  period === 'MORNING' || period === 'EVENING'

// «نصف يوم صباحي/مسائي» — null لليوم الكامل
export const halfDayLabel = (period?: string | null): string | null =>
  period === 'MORNING'
    ? 'نصف يوم صباحي'
    : period === 'EVENING'
      ? 'نصف يوم مسائي'
      : null
