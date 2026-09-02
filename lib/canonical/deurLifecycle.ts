export type DeurLifecycleStatus = 'Draft' | 'In Progress' | 'Submitted' | string;

export const isDeurReadOnly = (status: DeurLifecycleStatus): boolean => status === 'Submitted';
export const isDeurOpenForOperatorMutation = (status: DeurLifecycleStatus): boolean => status === 'Draft' || status === 'In Progress';
