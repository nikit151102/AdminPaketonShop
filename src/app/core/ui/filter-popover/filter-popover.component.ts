import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterType } from './filter-type.enum';

export interface ColumnConfig {
  field: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'guid';
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: FilterType;
  enumOptions?: { value: string | number; label: string }[];
  formatter?: (value: any, row: any) => string;
  sticky?: 'left' | 'right';
  hidden?: boolean;
  groupable?: boolean;
  align?: 'left' | 'center' | 'right';
  tooltip?: (row: any) => string;
  cellClass?: (row: any) => string;
}

@Component({
  selector: 'app-filter-popover',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-popover.component.html',
  styleUrl: './filter-popover.component.scss'
})
export class FilterPopoverComponent implements OnInit {
  @Input() column!: ColumnConfig;
  @Input() currentFilter: any;
  @Output() apply = new EventEmitter<{ values: any[]; type: FilterType }>();

  selectedType: FilterType = FilterType.Contains;
  singleValue: any = '';
  multiValues: any[] = [];
  rangeFrom: any = null;
  rangeTo: any = null;
  boolValue: boolean | null = null;

  availableTypes: { value: FilterType; label: string }[] = [];

  get isSingleValue(): boolean {
    return [FilterType.Contains, FilterType.Equal, FilterType.LessThan,
    FilterType.GreaterThan, FilterType.DateEqual, FilterType.DateBefore,
    FilterType.DateAfter].includes(this.selectedType);
  }
  get isMultiValue(): boolean {
    return [FilterType.EnumIn, FilterType.GuidIn, FilterType.CollectionAny].includes(this.selectedType);
  }
  get isBetween(): boolean {
    return [FilterType.Between, FilterType.DateBetween].includes(this.selectedType);
  }
  get isBoolean(): boolean {
    return this.selectedType === FilterType.BooleanEqual;
  }
  
  // Новый геттер для HTML, чтобы отличать диапазон дат от числового диапазона
  get isDateBetween(): boolean {
    return this.selectedType === FilterType.DateBetween;
  }

  ngOnInit() {
    this.availableTypes = this.getAvailableTypes();
    if (this.column.filterType !== undefined) this.selectedType = this.column.filterType;

    // Инициализация значений из текущего фильтра (если он уже активен)
    if (this.currentFilter && this.currentFilter.length > 0) {
      if (this.isSingleValue) {
        this.singleValue = this.currentFilter[0];
      } else if (this.isMultiValue) {
        this.multiValues = [...this.currentFilter];
      } else if (this.isBetween) {
        // Форматируем даты в YYYY-MM-DD для input type="date"
        this.rangeFrom = this.formatDateForInput(this.currentFilter[0]);
        this.rangeTo = this.formatDateForInput(this.currentFilter[1]);
      } else if (this.isBoolean) {
        this.boolValue = this.currentFilter[0];
      }
    }
  }

  // Конвертирует дату в формат YYYY-MM-DD для input type="date"
  // Безопасно парсит ISO-строки, чтобы избежать сдвига из-за часовых поясов
  formatDateForInput(date: any): string {
    if (!date) return '';
    if (typeof date === 'string' && date.includes('T')) {
      return date.substring(0, 10); // Просто берем YYYY-MM-DD из строки вида 2026-07-17T00:00:00.000Z
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  private getAvailableTypes() {
    const map: { [key: string]: FilterType[] } = {
      string: [FilterType.Contains, FilterType.Equal],
      number: [FilterType.Equal, FilterType.LessThan, FilterType.GreaterThan, FilterType.Between],
      date: [FilterType.DateEqual, FilterType.DateBefore, FilterType.DateAfter, FilterType.DateBetween],
      boolean: [FilterType.BooleanEqual],
      enum: [FilterType.EnumIn],
      guid: [FilterType.GuidIn, FilterType.Equal]
    };
    const types = map[this.column.type] || [FilterType.Contains];
    const labels: { [key: number]: string } = {
      0: 'Содержит', 1: 'В списке', 2: 'Равно', 3: 'Меньше', 4: 'Больше',
      5: 'Диапазон', 6: 'Дата равна', 7: 'Дата раньше', 8: 'Дата позже',
      9: 'Диапазон дат', 10: 'GUID в списке', 11: 'Коллекция содержит', 12: 'Равно (bool)'
    };
    return types.map(t => ({ value: t, label: labels[t] }));
  }

  toggleMulti(val: any) {
    const idx = this.multiValues.indexOf(val);
    if (idx >= 0) this.multiValues.splice(idx, 1);
    else this.multiValues.push(val);
  }

  getApply() {
    let values: any[] = [];
    if (this.isSingleValue) values = [this.singleValue];
    else if (this.isMultiValue) values = this.multiValues;
    else if (this.isBetween) values = [this.rangeFrom, this.rangeTo];
    else if (this.isBoolean) values = [this.boolValue];
    
    // Используем this.selectedType, так как он гарантировано имеет тип FilterType (ошибка исчезнет)
    this.apply.emit({ values, type: this.selectedType });
  }

  clear() {
    this.singleValue = '';
    this.multiValues = [];
    this.rangeFrom = this.rangeTo = null;
    this.boolValue = null;
    this.apply.emit({ values: [], type: this.selectedType });
  }
}