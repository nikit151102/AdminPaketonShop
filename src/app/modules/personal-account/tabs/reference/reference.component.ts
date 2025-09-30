import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReferenceBookComponent } from './reference-book/reference-book.component';

@Component({
  selector: 'app-reference',
  imports: [CommonModule, ReferenceBookComponent],
  templateUrl: './reference.component.html',
  styleUrl: './reference.component.scss'
})
export class ReferenceComponent {

  selectReference: any;

  references: { id: string; label: string; command: () => void }[] = [
    { id: '030521', label: 'Пользователи', command: () => this.executeReference('030521') },
    { id: '030521', label: 'Сотрудники', command: () => this.executeReference('030521') },
    { id: '495142', label: 'Роли сотрудников', command: () => this.executeReference('495142') },
    { id: '104346', label: 'Права доступа сотрудников', command: () => this.executeReference('104346') },
    { id: '161283', label: 'Единицы измерения', command: () => this.executeReference('161283') },
    { id: '925812', label: 'Характеристики', command: () => this.executeReference('925812') },
    { id: '103825', label: 'Адреса', command: () => this.executeReference('103825') },
    { id: '135128', label: 'Компании', command: () => this.executeReference('135128') },
    { id: '234591', label: 'Типы компании', command: () => this.executeReference('234591') },
    { id: '496235', label: 'Банки контрагентов', command: () => this.executeReference('496235') },
    { id: '300001', label: 'Категории товаров', command: () => this.executeReference('300001') },
    { id: '300002', label: 'Магазины', command: () => this.executeReference('300002') },
    { id: '300003', label: 'Склады', command: () => this.executeReference('300003') },
    { id: '300004', label: 'Статусы заказов', command: () => this.executeReference('300004') },
    { id: '300008', label: 'Группы скидок', command: () => this.executeReference('300008') },
    { id: '300011', label: 'Акции и купоны', command: () => this.executeReference('300011') },
    { id: '195735', label: 'Промокоды', command: () => this.executeReference('195735') }
  ];


  selectedId!: string;

  constructor(private activatedRoute: ActivatedRoute,
    private router: Router) { }

  select(id: string) {
    this.selectedId = id;
    this.selectReference = id;
  }

  executeReference(type: string) {
    console.log('type', type)
    this.select(type)
  }

  ngOnInit(): void {
    this.select('030521');

  }
}
