import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { OrderApiService, OrderDetail } from './order-api.service';

export interface StatusOption {
  value: number;
  label: string;
  icon: string;
  description: string;
  isDestructive: boolean;
}

@Component({
  selector: 'app-site-order',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './site-order.component.html',
  styleUrls: ['./site-order.component.scss']
})
export class SiteOrderComponent implements OnInit {
  @ViewChild('realisationInput') realisationInput!: ElementRef;

  orderId: string = '';
  order: OrderDetail | null = null;
  isLoading: boolean = true;
  isEditing: boolean = false;
  isSaving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // Модальное окно реализации
  showRealisationModal: boolean = false;
  realisationNumber: string = '';
  pendingStatusChange: number | null = null;

  // Модальное окно напоминания о печати (для самовывоза)
  showPrintReminderModal: boolean = false;

  // QR-код для этикетки (base64)
  labelQrCodeDataUrl: string = '';

  statuses: { [key: number]: { label: string; icon: string; description: string; isDestructive: boolean } } = {
    0: { label: 'Черновик', icon: '📝', description: 'Заказ создан, но не отправлен', isDestructive: false },
    1: { label: 'Обработка', icon: '⚙️', description: 'Заказ находится в обработке', isDestructive: false },
    2: { label: 'Подтвержден', icon: '✅', description: 'Заказ принят в работу и подтвержден', isDestructive: false },
    3: { label: 'В сборке', icon: '📦', description: 'Товары собираются для заказа', isDestructive: false },
    4: { label: 'Передан в доставку', icon: '🚚', description: 'Заказ передан курьеру', isDestructive: false },
    5: { label: 'На доработке', icon: '🔧', description: 'Заказ требует доработки', isDestructive: false },
    6: { label: 'Зарезервирован', icon: '🔒', description: 'Заказ зарезервирован', isDestructive: false },
    8: { label: 'Готов к выдаче', icon: '🎁', description: 'Заказ готов и ждет клиента', isDestructive: false },
    9: { label: 'Завершен', icon: '🏁', description: 'Заказ успешно завершен', isDestructive: false },
    10: { label: 'Отложен', icon: '⏸️', description: 'Заказ временно отложен', isDestructive: false },
    11: { label: 'Отменен пользователем', icon: '❌', description: 'Заказ отменен клиентом', isDestructive: true },
    12: { label: 'Отменен администратором', icon: '🚫', description: 'Отменить заказ от имени администратора', isDestructive: true }
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderApi: OrderApiService
  ) { }

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.orderId) {
      this.loadOrder();
    } else {
      this.errorMessage = 'ID заказа не указан';
      this.isLoading = false;
    }
  }

  loadOrder(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.orderApi.getOrder(this.orderId).subscribe({
      next: (response) => {
        try {
          const data = typeof response === 'string' ? JSON.parse(response) : response;
          this.order = data.data || data;
        } catch (e) {
          this.errorMessage = 'Ошибка обработки данных заказа';
        }
        this.isLoading = false;

        setTimeout(() => this.generateLabelQrCode(), 500);
      },
      error: (error) => {
        this.errorMessage = 'Ошибка загрузки заказа: ' + (error.message || 'Неизвестная ошибка');
        this.isLoading = false;
      }
    });
  }

  getAvailableStatuses(): StatusOption[] {
    if (!this.order) return [];

    const currentStatus = this.order.orderStatus;
    const availableValues: number[] = [];

    switch (currentStatus) {
      case 0: availableValues.push(1); break;
      case 1: availableValues.push(2); break;
      case 2: availableValues.push(3); break;
      case 3: availableValues.push(8); break;
      case 8: availableValues.push(9); break;
    }

    if (currentStatus !== 12 && currentStatus !== 11 && currentStatus !== 9) {
      availableValues.push(12);
    }

    return availableValues.map(value => ({
      value,
      label: this.statuses[value].label,
      icon: this.statuses[value].icon,
      description: this.statuses[value].description,
      isDestructive: this.statuses[value].isDestructive
    }));
  }

  isStatusAvailable(statusValue: number): boolean {
    return this.getAvailableStatuses().some(s => s.value === statusValue);
  }

  
  skipRealisation(): void {
    const confirmSkip = confirm(
      '⚠️ ВНИМАНИЕ: Если реализация уже была создана в 1С, ее номер необходимо ввести обязательно!\n\n' +
      'Вы уверены, что хотите пропустить ввод номера реализации?'
    );

    if (confirmSkip) {
      this.showRealisationModal = false;
      const statusToSet = this.pendingStatusChange;
      this.pendingStatusChange = null;
      this.realisationNumber = '';

      // Вызываем смену статуса без номера реализации
      if (statusToSet !== null) {
        this.executeStatusChangeOnly(statusToSet);
      }
    }
  }

  onRealisationInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (value.toUpperCase().startsWith('00ЦП-') || value.toUpperCase().startsWith('00ЦП-')) {
      value = value.substring(5);
    } else if (value.toUpperCase().startsWith('00ЦП')) {
      value = value.substring(4);
    }

    value = value.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\-]/g, '');

    this.realisationNumber = value;
    input.value = value;
  }

  confirmRealisation(): void {
    if (!this.realisationNumber || !this.pendingStatusChange) return;

    this.isSaving = true;

    // Сначала сохраняем номер реализации через новый отдельный запрос
    this.orderApi.changeRealisationNumber(this.orderId, this.realisationNumber).subscribe({
      next: () => {
        // Только после успешного сохранения номера меняем статус
        this.executeStatusChangeOnly(this.pendingStatusChange!);
      },
      error: (error) => {
        this.errorMessage = 'Ошибка сохранения номера реализации: ' + (error.message || 'Неизвестная ошибка');
        this.isSaving = false;
      }
    });
  }

  private executeStatusChangeOnly(newStatus: number): void {
    if (!this.order) return;

    const statusInfo = this.statuses[newStatus];

    this.orderApi.changeOrderStatus(this.orderId, newStatus).subscribe({
      next: () => {
        // Обновляем локальное состояние
        this.order!.orderStatus = newStatus;
        this.order!.realisationNumber = this.realisationNumber;

        this.successMessage = `Статус успешно изменен на "${statusInfo.label}", номер реализации сохранен`;
        this.isSaving = false;

        // Очищаем модальное окно
        this.showRealisationModal = false;
        this.pendingStatusChange = null;
        this.realisationNumber = '';

        setTimeout(() => this.successMessage = '', 3000);

        // Показываем напоминание о печати для самовывоза
        if (newStatus === 8 && this.isSelfPickup()) {
          setTimeout(() => {
            this.showPrintReminderModal = true;
          }, 600);
        }

        // Обновляем QR-код
        setTimeout(() => this.generateLabelQrCode(), 300);
      },
      error: (error) => {
        this.errorMessage = 'Ошибка изменения статуса: ' + (error.message || 'Неизвестная ошибка');
        this.isSaving = false;
      }
    });
  }



  closeRealisationModal(): void {
    this.showRealisationModal = false;
    this.pendingStatusChange = null;
    this.realisationNumber = '';
  }

  private executeStatusChange(newStatus: number, realisationNumber: string | null): void {
    if (!this.order) return;

    const statusInfo = this.statuses[newStatus];

    this.isSaving = true;
    this.orderApi.changeOrderStatus(this.orderId, newStatus).subscribe({
      next: () => {
        this.order!.orderStatus = newStatus;
        if (realisationNumber) {
          this.order!.realisationNumber = realisationNumber;
        }
        this.successMessage = `Статус успешно изменен на "${statusInfo.label}"`;
        this.isSaving = false;
        setTimeout(() => this.successMessage = '', 3000);

        // НОВОЕ: Если статус "Готов к выдаче" (8) и это самовывоз, показываем напоминание о печати
        if (newStatus === 8 && this.isSelfPickup()) {
          setTimeout(() => {
            this.showPrintReminderModal = true;
          }, 600); // Небольшая задержка, чтобы пользователь успел заметить сообщение об успехе
        }
      },
      error: (error) => {
        this.errorMessage = 'Ошибка изменения статуса: ' + (error.message || 'Неизвестная ошибка');
        this.isSaving = false;
      }
    });
  }

  // НОВЫЙ МЕТОД: Проверка, является ли доставка самовывозом
  isSelfPickup(): boolean {
    if (!this.order?.deliveryType) return false;
    const name = (this.order.deliveryType.fullName || this.order.deliveryType.shortName || '').toLowerCase();
    return name.includes('самовывоз');
  }

  closePrintReminderModal(): void {
    this.showPrintReminderModal = false;
  }


  printLabelAndClose(): void {
    this.printLabel();
    setTimeout(() => {
      this.closePrintReminderModal();
    }, 300);
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  saveOrder(): void {
    if (!this.order) return;

    this.isSaving = true;
    const updateDto: any = {
      id: this.orderId,
      consultation: this.order.consultation,
      paymentType: this.order.paymentType,
      contactType: this.order.contactType
    };

    this.orderApi.updateOrder(this.orderId, updateDto).subscribe({
      next: () => {
        this.successMessage = 'Заказ успешно сохранен';
        this.isEditing = false;
        this.isSaving = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = 'Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка');
        this.isSaving = false;
      }
    });
  }

  getStatusName(status: number): string {
    return this.statuses[status]?.label || this.orderApi.getStatusName(status);
  }

  getStatusColor(status: number): string {
    return this.orderApi.getStatusColor(status);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(price || 0);
  }

  getPaymentTypeName(type: number): string {
    const types: { [key: number]: string } = {
      0: 'Не указан',
      1: 'Наличные',
      2: 'Карта',
      3: 'Безналичный расчет'
    };
    return types[type] || 'Не указан';
  }

  getContactTypeName(type: number): string {
    const types: { [key: number]: string } = {
      0: 'Не указан',
      1: 'Телефон',
      2: 'Email',
      3: 'Мессенджер'
    };
    return types[type] || 'Не указан';
  }

  getRealisationQrData(): string {
    if (!this.order?.realisationNumber) return '';
    return `00ЦП-${this.order.realisationNumber}`;
  }

  printOrder(): void {
    setTimeout(() => {
      window.print();
    }, 100);
  }

  private generateLabelQrCode(): void {
    if (!this.order?.realisationNumber) {
      this.labelQrCodeDataUrl = '';
      return;
    }

    const qrContainer = document.querySelector('#label-qr-canvas canvas') as HTMLCanvasElement;
    if (qrContainer) {
      this.labelQrCodeDataUrl = qrContainer.toDataURL('image/png');
    }
  }

  maskPhoneNumber(phone: string | undefined): string {
    if (!phone) return '';

    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 4) return phone;

    const last4 = digits.slice(-4);
    const maskedPart = digits.slice(0, -4).replace(/./g, '•');

    if (digits.length === 11) {
      return `+${digits[0]} (${maskedPart.slice(1, 4)}) ${maskedPart.slice(4, 7)}-${maskedPart.slice(7, 9)}-${last4}`;
    }
    if (digits.length === 10) {
      return `(${maskedPart.slice(0, 3)}) ${maskedPart.slice(3, 6)}-${maskedPart.slice(6, 8)}-${last4}`;
    }

    return `${maskedPart} ${last4}`;
  }

  printLabel(): void {
    if (!this.order?.realisationNumber) {
      this.errorMessage = 'Для печати этикетки необходим номер реализации. Сначала измените статус на "Готов к выдаче".';
      setTimeout(() => this.errorMessage = '', 4000);
      return;
    }

    // 1. Генерируем QR-код
    this.generateLabelQrCode();

    // 2. Открываем окно печати
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) {
      this.errorMessage = 'Браузер заблокировал всплывающее окно печати. Разрешите всплывающие окна для этого сайта.';
      setTimeout(() => this.errorMessage = '', 5000);
      return;
    }

    const orderNumber = this.order.orderNumber || this.orderId;
    const totalCost = this.formatPrice(this.order.totalCost);
    const qrDataUrl = this.labelQrCodeDataUrl;
    const maskedPhone = null;
    //  this.maskPhoneNumber(this.order.userInstance?.phoneNumber)
    const logoUrl = window.location.origin + '/logo.png';

    // ВНИМАНИЕ: Мы убрали тег <script> отсюда. Мы вызовем печать из родительского окна.
    const printContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Этикетка ${orderNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { font-family: 'Arial', 'Helvetica', sans-serif; background: #fff; color: #000; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; width: 210mm; height: 297mm; }
    .label { width: 100mm; height: 70mm; border: 2px solid #000; border-top: none; border-left: none; background: #fff; display: flex; overflow: hidden; position: absolute; top: 0; left: 0; }
    .label::before { content: ''; position: absolute; top: 3mm; right: 3mm; width: 5mm; height: 5mm; border-top: 2px solid #000; border-right: 2px solid #000; border-top-right-radius: 3mm; z-index: 2; }
    .label::after { content: ''; position: absolute; bottom: 3mm; left: 3mm; width: 5mm; height: 5mm; border-bottom: 2px solid #000; border-left: 2px solid #000; border-bottom-left-radius: 3mm; z-index: 2; }
    .label-qr-side { width: 42mm; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5mm 3mm; border-right: 2px solid #000; background: repeating-linear-gradient(45deg, transparent, transparent 2.5mm, rgba(0,0,0,0.04) 2.5mm, rgba(0,0,0,0.04) 2.8mm); flex-shrink: 0; gap: 2mm; }
    .qr-frame { width: 30mm; height: 30mm; padding: 2mm; background: #fff; border: 2px solid #000; border-radius: 3mm; display: flex; align-items: center; justify-content: center; box-shadow: 1.5mm 1.5mm 0 rgba(0,0,0,0.15); }
    .qr-frame img { width: 100%; height: 100%; display: block; image-rendering: pixelated; image-rendering: crisp-edges; border-radius: 1mm; }
    .label-info-side { flex: 1; padding: 2mm 3mm; display: flex; flex-direction: column; gap: 1.5mm; position: relative; }
    .label-brand { width: 100%; display: flex; justify-content: center; align-items: center; padding: 2mm 0; }
    .brand-logo { height: 12mm; width: auto; max-width: 90%; display: block; object-fit: contain; }
    .brand-logo-fallback { font-size: 14pt; font-weight: 900; letter-spacing: 2px; color: #000; display: none; }
    .brand-logo-fallback.show { display: block; }
    .label-divider { height: 1px; background: #000; margin: 0.5mm 0; opacity: 0.3; }
    .label-divider.dashed { height: 0; background: none; border-top: 1px dashed #000; opacity: 0.5; }
    .label-order-block, .label-amount-block { display: flex; flex-direction: column; gap: 0.5mm; }
    .label-title { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; }
    .label-value { font-size: 12pt; font-weight: 800; color: #000; line-height: 1.1; word-break: break-all; }
    .order-value { font-size: 12pt; letter-spacing: 0.5px; }
    .amount-value { font-size: 13pt; font-weight: 900; letter-spacing: 0.3px; padding: 1.5mm 4mm; background: #00000077; color: #fff; align-self: flex-start; display: inline-block; border-radius: 3mm; }
    .label-thanks { margin-top: auto; text-align: center; padding-top: 1mm; display: flex; flex-direction: column; gap: 0.5mm; background: rgba(0,0,0,0.04); padding: 1mm 2mm; border-radius: 3mm; }
    .label-phone-block { display: flex; flex-direction: column; gap: 0.5mm; }
    .phone-value { font-size: 8pt; font-weight: 500; font-family: 'Courier New', 'Consolas', monospace; letter-spacing: 0.8px; padding: 1mm 2mm; border: 1px solid #000; border-radius: 2mm; background: #fff; align-self: flex-start; color: #000; }
    .thanks-text { font-size: 8.5pt; font-weight: 800; font-style: italic; color: #000; letter-spacing: 0.3px; }
    .thanks-subtext { font-size: 6.5pt; font-weight: 500; color: #333; }
  </style>
</head>
<body>
  <div class="label">
    <div class="label-qr-side">
      <div class="qr-frame">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:8pt;color:#999;">QR</div>`}
      </div>
    </div>
    <div class="label-info-side">
      <div class="label-brand">
        <img src="${logoUrl}" alt="Пакетон.рф" class="brand-logo" onerror="this.style.display='none'; this.nextElementSibling.classList.add('show');" />
        <span class="brand-logo-fallback">ПАКЕТОН.РФ</span>
      </div>
      <div class="label-divider"></div>
      <div class="label-order-block">
        <span class="label-title">Заказ №</span>
        <span class="label-value order-value">${orderNumber}</span>
      </div>
      <div class="label-amount-block">
        <span class="label-title">На сумму</span>
        <span class="label-value amount-value">${totalCost}</span>
      </div>

      <div class="label-divider dashed"></div>
      <div class="label-thanks">
        <span class="thanks-text">Спасибо, что выбрали нас!</span>
        <span class="thanks-subtext">Ждём вас снова</span>
      </div>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close(); // Критически важно для завершения парсинга DOM

    // 3. Вызываем печать из родительского окна с задержкой, чтобы браузер успел отрисовать картинку логотипа и QR
    setTimeout(() => {
      printWindow.focus(); // Передаем фокус на новое окно (обязательно для Safari и некоторых версий Chrome)
      printWindow.print();

      // Опционально: закрыть окно после печати (браузеры иногда делают это сами)
      // setTimeout(() => printWindow.close(), 1000); 
    }, 500);
  }

  // private generateLabelQrCode(): void {
  //   if (!this.order?.realisationNumber) {
  //     this.labelQrCodeDataUrl = '';
  //     return;
  //   }

  //   // ИСПРАВЛЕНИЕ: angularx-qrcode может рендерить как <canvas>, так и <img>. Проверяем оба варианта.
  //   let qrElement = document.querySelector('#label-qr-canvas canvas') as HTMLCanvasElement | HTMLImageElement;

  //   if (!qrElement) {
  //     qrElement = document.querySelector('#label-qr-canvas img') as HTMLImageElement;
  //   }

  //   if (qrElement) {
  //     if (qrElement.tagName.toLowerCase() === 'img') {
  //       // Если это img, просто берем его src (он уже в base64)
  //       this.labelQrCodeDataUrl = (qrElement as HTMLImageElement).src;
  //     } else {
  //       // Если это canvas, конвертируем в base64
  //       this.labelQrCodeDataUrl = (qrElement as HTMLCanvasElement).toDataURL('image/png');
  //     }
  //   } else {
  //     console.warn('Элемент QR-кода не найден в DOM. Возможно, компонент еще не отрисовался.');
  //   }
  // }


  isCompany(): boolean {
    return !!(this.order?.partnerInstance?.partner?.inn || this.order?.partnerInstance?.partner?.shortName);
  }

  getClientDisplayName(): string {
    if (this.isCompany()) {
      return this.order!.partnerInstance!.partner!.shortName || this.order!.partnerInstance!.partner!.fullName;
    }
    return `${this.order?.userInstance?.lastName} ${this.order?.userInstance?.firstName} ${this.order?.userInstance?.middleName}`.trim() || 'Не указано';
  }

  copyToClipboard(text: string, label: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage = `${label} скопирован в буфер обмена!`;
      setTimeout(() => this.successMessage = '', 2000);
    }).catch(() => {
      this.errorMessage = 'Не удалось скопировать';
      setTimeout(() => this.errorMessage = '', 2000);
    });
  }


  isDelivery(): boolean {
    if (!this.order?.deliveryType) return false;
    const name = (this.order.deliveryType.fullName || this.order.deliveryType.shortName || '').toLowerCase();
    return name.includes('доставка');
  }

  getRealisationModalTitle(): string {
    return this.pendingStatusChange === 3 ? 'В сборке (Доставка)' : 'Готов к выдаче';
  }

  getRealisationModalHint(): string {
    if (this.pendingStatusChange === 3) {
      return 'Для перевода заказа в статус <strong>"В сборке"</strong> (Доставка) необходимо указать номер реализации товаров и услуг.';
    }
    return 'Для перевода заказа в статус <strong>"Готов к выдаче"</strong> необходимо указать номер реализации товаров и услуг.';
  }

  changeStatus(newStatus: number): void {
    if (!this.order || !this.isStatusAvailable(newStatus)) return;

    // Показываем модалку ввода реализации, если:
    // 1. Это статус "Готов к выдаче" (8)
    // 2. ИЛИ это статус "В сборке" (3) И тип доставки - "Доставка"
    if (newStatus === 8 || (newStatus === 3 && this.isDelivery())) {
      this.pendingStatusChange = newStatus;
      this.realisationNumber = this.order.realisationNumber || '';
      this.showRealisationModal = true;
      
      setTimeout(() => {
        if (this.realisationInput?.nativeElement) {
          this.realisationInput.nativeElement.focus();
          this.realisationInput.nativeElement.select();
        }
      }, 100);
      return;
    }

    const statusInfo = this.statuses[newStatus];
    const confirmText = statusInfo.isDestructive
      ? `Вы уверены, что хотите ОТМЕНИТЬ заказ? Это действие нельзя будет отменить.`
      : `Изменить статус на "${statusInfo.label}"?`;

    if (!confirm(confirmText)) return;

    this.executeStatusChangeOnly(newStatus);
  }

}