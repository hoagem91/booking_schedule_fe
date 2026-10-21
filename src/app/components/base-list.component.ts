import { debounceTime, distinctUntilChanged, fromEvent, Subject, Subscription, takeUntil } from "rxjs";
import { Component, inject, signal, TemplateRef, viewChild } from "@angular/core";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { NzTableQueryParams } from "ng-zorro-antd/table";
import { BaseComponent } from "./base.component";
import { cloneDeep, isEqual } from "lodash-es";
import { TableColumn } from "./share-table/share-table.interface";
import { UIUtils } from "../utils/ui.utils";

@Component({
  template: ''
})
export abstract class BaseListComponent<T = any> extends BaseComponent {

  protected searchForm: FormGroup = new FormGroup({});
  protected searchFormSubscription: Subscription | undefined;

  protected searchTextControl = new FormControl(null);

  private _dataSource: T[] = [];
  protected isLoadingDataSource = signal<boolean>(false);
  protected total: number = 0;
  protected currentPage: number = 1;
  protected pageSize: number = 20;
  protected sorts: Array<{ sortField: string; sortOrder: string }> = [];
  protected sortDirection: any[] = ['asc', 'desc', null];
  protected abstract tableColumns: TableColumn[];

  private _isInitialized = false;
  private _loadData$ = new Subject<void>();
  private _lastAppliedFilterValue: Record<string, any> = {};
  private _lastAppliedFilterAt: Record<string, number> = {};
  private _hasProcessedQueryParams = false;
  private _lastQueryHadActiveSort = false;

  protected abstract loadData(): void;

  /**
   * Wrapper to guard loadData - ensures loadData is only called after
   * nz-table has fully initialized (first onQueryParamsChange).
   * Subclasses with selectedWarehouse$ or other async triggers should
   * call doLoadData() instead of loadData() directly.
   */
  protected doLoadData(): void {
    if (!this._isInitialized) {
      return;
    }
    this._loadData$.next();
  }

  protected tableScrollX: string = '1200px';
  protected tableScrollY: string = '800px';

  private _processedColumns: TableColumn[] = [];
  protected _visibleColumns: TableColumn[] = [];

  public override ngOnInit() {
    super.ngOnInit();
    this.processColumns();
    this.initDefaultSortsFromColumns();
    this.syncColumnSortOrderFromSorts();
    this.syncFilterWithForm();
    this.listenWindowResize();
    this.listenSearchFormChange();

    // Debounce loadData calls to collapse rapid nz-table emissions during init
    this._loadData$
      .pipe(debounceTime(50), takeUntil(this.unsubscribe))
      .subscribe(() => this.loadData());
  }

  public override ngAfterViewInit() {
    super.ngAfterViewInit();
  }

  public override ngOnDestroy() {
    super.ngOnDestroy();
    if (this.searchFormSubscription) {
      this.searchFormSubscription.unsubscribe();
    }
  }

  protected get dataSource(): T[] {
    return this._dataSource;
  }

  protected set dataSource(value: T[]) {
    this._dataSource = value;
    this.calculateTableScrollY();
    this.calculateTableScrollXByColumns();
  }

  get searchFormValue(): any {
    return { ...this.searchForm.value, searchText: this.searchTextControl.value };
  }

  protected clearSearchForm(): void {
    this.searchForm.reset();
  }

  protected getSearchFormItemControl(name: string): FormControl {
    return this.searchForm.get(name) as FormControl;
  }

  protected getSearchFormItemValue(name: string): any {
    return this.getSearchFormItemControl(name)?.value;
  }

  protected setSearchFormItemValue(name: string, value: any): void {
    this.getSearchFormItemControl(name).setValue(value);
  }

  protected removeSearchFormItem(name: string): void {
    this.searchForm.removeControl(name);
  }

  protected addSearchFormItem(name: string, value: any): void {
    this.searchForm.addControl(name, new FormControl(value));
  }

  get paramsForSearchLoadData() {
    const params = {
      page: this.currentPage - 1,
      size: this.pageSize
    }
    if (this.sorts.length > 0) {
      const sortStr = this.sorts.map(s => `${s.sortField}.${s.sortOrder}`).join(',');
      return { ...params, sort: sortStr };
    }
    return params;
  }

  private convertSortOrderToAscDesc(sortOrder: string | null): string | null {
    if (sortOrder === 'ascend') {
      return 'asc';
    } else if (sortOrder === 'descend') {
      return 'desc';
    }
    return null;
  }

  private convertSortOrderToNz(sortOrder: string | null): 'ascend' | 'descend' | null {
    if (sortOrder === 'asc') {
      return 'ascend';
    }
    if (sortOrder === 'desc') {
      return 'descend';
    }
    return null;
  }

  private convertFilter(filter: Array<{ key: string; value: any }>): any {
    const queryParams: any = {};
    filter.forEach((item: any) => {
      if (item?.value === null || item?.value === undefined) {
        return;
      }
      queryParams[item.key] = item.value;
    });
    return queryParams;
  }

  private getNzSort(nzSort: Array<{ key: string; value: any }>): Array<{ sortField: string; sortOrder: string }> {
    return nzSort
      .filter(item => item.value !== null)
      .map(item => ({
        sortField: item.key,
        sortOrder: this.convertSortOrderToAscDesc(item.value) as string
      }))
      .filter(item => item.sortOrder !== null);
  }

  public getNzSortOrder(columnKey: string): 'ascend' | 'descend' | null {
    const matchedSort = this.sorts.find(sort => sort.sortField === columnKey);
    return this.convertSortOrderToNz(matchedSort?.sortOrder || null);
  }

  private initDefaultSortsFromColumns(): void {
    if (this.sorts.length > 0) return;

    const defaultSorts: Array<{ sortField: string; sortOrder: string }> = [];
    this.tableColumns
      .filter(col => col.sortable && col.sortOrder)
      .sort((a, b) => {
        const pa = typeof a.sortPriority === 'number' ? a.sortPriority : Infinity;
        const pb = typeof b.sortPriority === 'number' ? b.sortPriority : Infinity;
        return pa - pb;
      })
      .forEach(col => {
        const order = this.convertSortOrderToAscDesc(col.sortOrder!);
        if (order) {
          defaultSorts.push({ sortField: col.filterKey || col.key, sortOrder: order });
        }
      });

    if (defaultSorts.length > 0) {
      this.sorts = defaultSorts;
    }
  }

  private syncColumnSortOrderFromSorts(): void {
    if (!Array.isArray(this.tableColumns) || this.tableColumns.length === 0) {
      return;
    }

    const sortOrderMap = new Map<string, 'ascend' | 'descend'>();
    this.sorts.forEach(sort => {
      const order = this.convertSortOrderToNz(sort.sortOrder);
      if (order) {
        sortOrderMap.set(sort.sortField, order);
      }
    });

    let changed = false;
    this.tableColumns.forEach((column) => {
      if (!column.sortable && column.sortOrder === undefined) {
        return;
      }

      const candidateKeys = [column.filterKey, column.key].filter((key): key is string => !!key);
      let nextSortOrder: 'ascend' | 'descend' | null = null;

      for (const key of candidateKeys) {
        const matchedOrder = sortOrderMap.get(key);
        if (matchedOrder) {
          nextSortOrder = matchedOrder;
          break;
        }
      }

      if ((column.sortOrder || null) !== nextSortOrder) {
        column.sortOrder = nextSortOrder;
        changed = true;
      }
    });

    if (changed) {
      this.processColumns();
      this._visibleColumns = cloneDeep(this._visibleColumns);
    }
  }

  protected applySortsFromQueryParams(rawSorts: Array<{ key: string; value: any }>): void {
    const nzSorts = this.getNzSort(rawSorts);
    const hasActiveSort = nzSorts.length > 0;

    if (hasActiveSort) {
      this.sorts = nzSorts;
    } else {
      const isSortClearedFromUi =
        this._hasProcessedQueryParams &&
        this._lastQueryHadActiveSort &&
        rawSorts.length > 0;

      if (isSortClearedFromUi) {
        this.sorts = [];
      }
      // Keep predefined default sorts when table emits neutral sort state.
    }

    this._hasProcessedQueryParams = true;
    this._lastQueryHadActiveSort = hasActiveSort;
    this.syncColumnSortOrderFromSorts();
  }

  private currentSortAndFilter = {};
  onQueryParamsChange(params: NzTableQueryParams): void {
    if (!isEqual(this.currentSortAndFilter, params)) {
      const previousParams = this.currentSortAndFilter as Partial<NzTableQueryParams>;
      const hadPreviousParams = Object.keys(previousParams).length > 0;
      const filterOrSortChanged = hadPreviousParams && (
        !isEqual(previousParams.filter || [], params.filter || []) ||
        !isEqual(previousParams.sort || [], params.sort || [])
      );

      this.currentSortAndFilter = params;
      const rawFilters = params.filter || [];
      const filter = this.convertFilter(rawFilters);
      const now = Date.now();

      rawFilters.forEach((item: any) => {
        if (item?.value !== null && item?.value !== undefined) {
          this._lastAppliedFilterValue[item.key] = item.value;
          this._lastAppliedFilterAt[item.key] = now;
        }
      });

      rawFilters.forEach((item: any) => {
        if (item?.value !== null) {
          return;
        }
        const key = item.key;
        const control = this.searchForm.get(key);
        if (!control) {
          return;
        }

        const lastValue = this._lastAppliedFilterValue[key];
        const lastAt = this._lastAppliedFilterAt[key] || 0;
        const isTransientNull =
          lastValue !== null &&
          lastValue !== undefined &&
          now - lastAt < 250 &&
          isEqual(control.value, lastValue);

        if (!isTransientNull) {
          filter[key] = null;
          this._lastAppliedFilterValue[key] = null;
          this._lastAppliedFilterAt[key] = now;
        }
      });

      this.applySortsFromQueryParams(params.sort || []);
      this.searchForm.patchValue(filter, { emitEvent: false });
      this.syncFilterWithForm();
      // Khi đổi điều kiện lọc/sắp xếp, pageIndex từ nz-table vẫn có thể là
      // trang cũ. Luôn truy vấn lại từ trang đầu để không nhận danh sách rỗng.
      this.currentPage = filterOrSortChanged ? 1 : params.pageIndex;
      this.pageSize = params.pageSize;

      if (!this._isInitialized) {
        this._isInitialized = true;
      }
      this._loadData$.next();
    }
  }

  onBtnSearch(): void {
    if (this.currentPage !== 1) {
      this.currentPage = 1;
    }
    this.loadData();
  }

  resetSort(): void {
    this.sorts = [];
    this._lastQueryHadActiveSort = false;
    this.syncColumnSortOrderFromSorts();
    this.currentPage = 1;
  }

  resetFilter(): void {
    this.searchForm.reset({}, { emitEvent: false });
    this.currentPage = 1;
  }

  hasFilter(): boolean {
    return Object.keys(this.searchForm.value).some(key => {
      const value = this.searchForm.get(key)?.value;
      return value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : value !== '');
    });
  }

  hasSort(): boolean {
    return this.sorts.length > 0;
  }

  setCurrentPageToFirst(): void {
    this.currentPage = 1;
  }

  protected calculateTableScrollY() {
    setTimeout(() => {
      const viewportHeight = window.innerHeight;
      const appHeaderHeight = UIUtils.getBoxModelDimensions(document.querySelector('div.app-header')).totalHeight;
      const totalHeaderHeight = UIUtils.getBoxModelDimensions(document.getElementById('header')).totalHeight;
      const totalNzPaginHeight = UIUtils.getBoxModelDimensions(document.querySelector('nz-pagination.ant-pagination')).totalHeight;
      const totalntTableTHead = UIUtils.getBoxModelDimensions(document.querySelector('div.ant-table-header')).totalHeight;
      const paddingTopOfInnerContent = UIUtils.getBoxModelDimensions(document.querySelector('div.inner-content')).padding.top;
      const paddingBottomOfInnerContent = UIUtils.getBoxModelDimensions(document.querySelector('div.inner-content')).padding.bottom;
      const headerDrawerHeight = UIUtils.getBoxModelDimensions(document.getElementById('header-drawer')).totalHeight || 0;

      const customContentHeight = UIUtils.getBoxModelDimensions(document.getElementById('custom-content')).totalHeight || 0;
      this.tableScrollY = `${viewportHeight - totalHeaderHeight - totalNzPaginHeight - totalntTableTHead - paddingTopOfInnerContent - paddingBottomOfInnerContent - appHeaderHeight - headerDrawerHeight - 72 - customContentHeight}px`;
    }, 1)
  }

  private listenWindowResize(): void {
    fromEvent(window, 'resize')
      .pipe(takeUntil(this.unsubscribe))
      .subscribe(() => {
        this.calculateTableScrollY();
      });
  }

  protected calculateTableScrollXByColumns(): void {
    setTimeout(() => {
      let totalWidth = 0;
      this.tableColumns.forEach(col => {
        if (col.width && col.visible !== false) {
          totalWidth += col.width;
        }
      });
      this.tableScrollX = `${totalWidth}px`;
    }, 1);
  }

  setDataTableColumns(columns: TableColumn[]): void {
    this.tableColumns = columns;
    this.processColumns();
    this.syncColumnSortOrderFromSorts();
    this.calculateTableScrollXByColumns();
  }

  processColumns() {
    this._processedColumns = this.tableColumns.map(col => ({
      ...col,
      ellipsis: col.ellipsis !== false,
      align: col.align || 'left',
      visible: col.visible !== false
    }));

    // Filter out visible columns
    this._visibleColumns = this._processedColumns.filter(col => col.visible);
  }

  protected syncFilterWithForm(): void {
    this.tableColumns.forEach(col => {
      if (col.filterOption?.allowFilter && col.key) {
        const formKey = col.filterKey || col.key;
        if (this.searchForm.get(formKey)) {
          const formValue = this.searchForm.get(formKey)?.value;
          const filterData = col.filterOption.filterData || [];
          filterData.forEach((f: any) => {
            f.byDefault = Array.isArray(formValue)
              ? formValue.includes(f.value)
              : f.value === formValue;
          });
        }
      }
    });
    this.processColumns();
    this._visibleColumns = cloneDeep(this._visibleColumns);
  }

  protected listenSearchFormChange(): void {
    this.searchFormSubscription = this.searchForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => isEqual(a, b)),
        takeUntil(this.unsubscribe)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.syncFilterWithForm();
      });
  }
}
