import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener } from '@angular/core';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent {
  notificationsOpen = false;

  notifications = [
    { type: 'order', text: 'Новый заказ №1234 оформлен', time: '5 минут назад' },
    { type: 'message', text: 'Новое сообщение от клиента', time: '10 минут назад' },
    { type: 'sale', text: 'Скидка 20% на товар "Кофеварка"', time: '1 час назад' },
    { type: 'order', text: 'Заказ №1233 отправлен', time: '2 часа назад' },
  ];

  constructor(private elementRef: ElementRef) {}

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.notificationsOpen = false;
    }
  }
}
