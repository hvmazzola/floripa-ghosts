export type RecordAction = {
  id: string;
  label: string;
  allowed: boolean;
  destructive?: boolean;
};

export function visibleRecordActions<T extends RecordAction>(actions: T[]): T[] {
  return actions.filter((action) => action.allowed);
}
