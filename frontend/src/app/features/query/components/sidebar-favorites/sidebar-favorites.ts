import { Component, input, output } from '@angular/core';
import type { FavoriteQuery } from '../../../../db/app-database';

@Component({
  selector: 'app-sidebar-favorites',
  standalone: true,
  template: `
    <div class="favorites-panel">
      @if (favorites().length === 0) {
        <p class="empty">No favorites yet</p>
      }
      @for (fav of favorites(); track fav.id ?? fav.name) {
        <div class="fav-item" (click)="selectFavorite.emit(fav.sql)" [title]="fav.sql">
          <div class="fav-row">
            <span class="fav-name">{{ fav.name }}</span>
            @if (!fav.isBuiltIn) {
              <button class="delete-btn" title="Delete" (click)="onDelete($event, fav.id!)">&#10005;</button>
            }
          </div>
          <span class="sql-preview">{{ fav.sql.substring(0, 50) }}{{ fav.sql.length > 50 ? '...' : '' }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .favorites-panel {
      height: 100%;
      overflow-y: auto;
      padding: 12px;
    }
    .empty { color: #4a4a5e; font-size: 0.82rem; }
    .fav-item {
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 2px;
      transition: all 0.15s;
      border: 1px solid transparent;
    }
    .fav-item:hover {
      background: rgba(79,195,247,0.04);
      border-color: rgba(79,195,247,0.1);
    }
    .fav-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .fav-name {
      font-size: 0.82rem;
      color: #c0c0d0;
      font-weight: 500;
    }
    .delete-btn {
      background: none;
      border: none;
      color: #4a4a5e;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 2px 5px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .delete-btn:hover { color: #ef9a9a; background: rgba(244,67,54,0.08); }
    .sql-preview {
      display: block;
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      color: #5a5a6e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
  `]
})
export class SidebarFavoritesComponent {
  favorites = input<FavoriteQuery[]>([]);
  selectFavorite = output<string>();
  deleteFavorite = output<number>();

  onDelete(event: Event, id: number) {
    event.stopPropagation();
    this.deleteFavorite.emit(id);
  }
}
