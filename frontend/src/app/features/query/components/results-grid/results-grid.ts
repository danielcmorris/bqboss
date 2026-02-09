import { Component, input, computed } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, SideBarDef } from 'ag-grid-enterprise';
import { themeQuartz, colorSchemeDarkBlue } from 'ag-grid-community';
import type { QueryResult } from '../../../../models/query-result.model';

@Component({
  selector: 'app-results-grid',
  standalone: true,
  imports: [AgGridAngular],
  template: `
    @if (queryResult(); as result) {
      <div class="results-info">
        {{ result.totalRows }} rows &middot; {{ result.executionTimeMs }}ms
      </div>
      <ag-grid-angular
        style="width: 100%; flex: 1;"
        [theme]="theme"
        [rowData]="result.rows"
        [columnDefs]="columnDefs()"
        [defaultColDef]="defaultColDef"
        [sideBar]="sideBar"
        [pagination]="true"
        [paginationPageSize]="100"
        [cellSelection]="true"
        rowGroupPanelShow="always"
      />
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .results-info {
      padding: 8px 4px;
      color: #9e9e9e;
      font-size: 0.85rem;
    }
  `]
})
export class ResultsGridComponent {
  queryResult = input<QueryResult | null>(null);
  theme = themeQuartz.withPart(colorSchemeDarkBlue);

  columnDefs = computed<ColDef[]>(() => {
    const result = this.queryResult();
    if (!result) return [];
    return result.columns.map(col => ({
      field: col,
      headerName: col,
      sortable: true,
      filter: true,
      resizable: true
    }));
  });

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 100,
    enableRowGroup: true,
  };

  sideBar: SideBarDef = {
    toolPanels: [
      { id: 'columns', labelDefault: 'Columns', labelKey: 'columns', iconKey: 'columns', toolPanel: 'agColumnsToolPanel' },
      { id: 'filters', labelDefault: 'Filters', labelKey: 'filters', iconKey: 'filter', toolPanel: 'agFiltersToolPanel' }
    ]
  };
}
