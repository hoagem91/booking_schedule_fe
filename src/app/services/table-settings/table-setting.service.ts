import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { cloneDeep } from 'lodash-es';
import { TableColumn } from '../../components/share-table/share-table.interface';

export interface SavedTableColumn {
  key: string;
  visible: boolean;
  width?: number | null;
  defaultWidth?: number | null;
  fixed: 'left' | 'right' | null;
  align: 'left' | 'center' | 'right' | null;
}

/** Apply presentation preferences only; schema, renderers and permissions stay in code. */
export function mergeTableSettings(defaults: TableColumn[], saved: unknown[]): TableColumn[] {
  const remaining = new Map(cloneDeep(defaults).map(column => [column.key, column]));
  const result: TableColumn[] = [];
  for (const item of saved) {
    if (!item || typeof item !== 'object' || !('key' in item) || typeof item.key !== 'string') continue;
    const column = remaining.get(item.key);
    if (!column) continue;
    remaining.delete(item.key);
    const preference = item as Partial<SavedTableColumn>;
    if (typeof preference.visible === 'boolean') column.visible = preference.visible;
    const sameDefault = !Object.hasOwn(preference, 'defaultWidth') || preference.defaultWidth === column.width;
    if (sameDefault && preference.width === null) column.width = null;
    else if (sameDefault && typeof preference.width === 'number' && Number.isFinite(preference.width)) {
      column.width = Math.max(column.minWidth ?? 80, Math.min(2000, preference.width));
    }
    if (preference.fixed === null) delete column.fixed;
    else if (preference.fixed === 'left' || preference.fixed === 'right') column.fixed = preference.fixed;
    if (preference.align === null || ['left', 'center', 'right'].includes(preference.align ?? '')) column.align = preference.align ?? null;
    result.push(column);
  }
  result.push(...remaining.values());
  // A saved preference must never leave the user with an entirely empty table.
  if (result.length && result.every(column => column.visible === false)) result[0].visible = true;
  return result;
}

@Injectable({ providedIn: 'root' })
export class TableSettingService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  private key(userId: number, tableKey: string): string {
    if (!Number.isSafeInteger(userId) || userId <= 0 || !tableKey.trim()) throw new Error('Thiếu tài khoản hoặc mã bảng.');
    return `booking-schedule:table-settings:v1:${userId}:${encodeURIComponent(tableKey.trim())}`;
  }

  getSetting(userId: number, tableKey: string): unknown[] | null {
    if (!this.browser) return null;
    const raw = this.document.defaultView?.localStorage.getItem(this.key(userId, tableKey));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('version' in value) || ![1, 2].includes(Number(value.version))
      || !('columns' in value) || !Array.isArray(value.columns)) return null;
    if (value.version === 2) return value.columns;
    // V1 saved every width, including untouched defaults. Those snapshots must
    // not overwrite new widths in tableColumns; preserve other preferences.
    return value.columns.map(item => item && typeof item === 'object'
      ? { ...item, width: undefined, defaultWidth: undefined } : item);
  }

  saveSetting(userId: number, tableKey: string, columns: TableColumn[], defaults: TableColumn[] = columns): void {
    if (!this.browser) return;
    const preferences: SavedTableColumn[] = columns.map(column => {
      const original = defaults.find(item => item.key === column.key);
      return {
        key: column.key, visible: column.visible !== false,
        fixed: column.fixed ?? null, align: column.align,
        ...(original && column.width !== original.width ? { width: column.width, defaultWidth: original.width } : {}),
      };
    });
    // Retain the storage key for compatibility; the payload carries its version.
    this.document.defaultView?.localStorage.setItem(this.key(userId, tableKey), JSON.stringify({ version: 2, columns: preferences }));
  }

  deleteSetting(userId: number, tableKey: string): void {
    if (this.browser) this.document.defaultView?.localStorage.removeItem(this.key(userId, tableKey));
  }
}
