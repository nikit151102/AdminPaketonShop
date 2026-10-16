import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Добавлено для ngModel
import { ActivatedRoute } from '@angular/router';
import { WholesaleOrderService, WholesaleOrderDetail } from './wholesale-order.service';

@Component({
  selector: 'app-wholesale-order',
  standalone: true,
  imports: [CommonModule, FormsModule], // Добавлен FormsModule
  templateUrl: './wholesale-order.component.html',
  styleUrl: './wholesale-order.component.scss'
})
export class WholesaleOrderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orderService = inject(WholesaleOrderService);

  orderId: string = '';
  order: any | null = null;
  isLoading = true;
  isUploading = false;

  // Свойства модальных окон
  showContractModal = false;
  modalMode: 'contract' | 'security' = 'contract';
  selectedViewPriceType: number | null = null;
  salePercentInput: number | null = null;
  contractFile: File | null = null;

  selectedPrepaymentType: number | null = null;
  prepaymentPercentInput: number | null = null;
  selectedPaymentDeferralType: number | null = null;
  paymentDeferralDaysInput: number | null = null;
  securityCheckFile: File | null = null;

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.orderId) {
      this.loadOrderDetails();
    }
  }

  loadOrderDetails(): void {
    this.isLoading = true;
    this.orderService.authenticate().subscribe(() => {
      this.orderService.getOrder(this.orderId).subscribe({
        next: (res) => {
          this.order = res.data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Ошибка загрузки заявки', err);
          this.isLoading = false;
        }
      });
    });
  }

  downloadDocument(url: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.click();
  }

  // --- Договор ---
  openContractModal(): void {
    this.modalMode = 'contract';
    this.showContractModal = true;
    this.selectedViewPriceType = this.order?.viewPriceType ?? null;
    this.salePercentInput = this.order?.salePercent != null ? this.order.salePercent * 100 : null;
    this.contractFile = null;
  }

  openSecurityCheckModal(): void {
    this.modalMode = 'security';
    this.showContractModal = true;
    this.selectedPrepaymentType = this.order?.prepaymentType ?? null;
    this.prepaymentPercentInput = this.order?.prepaymentPercent != null
      ? this.order.prepaymentPercent * 100
      : null;
    this.selectedPaymentDeferralType = this.order?.paymentDeferralType ?? null;
    this.paymentDeferralDaysInput = this.order?.paymentDeferralDaysCount ?? null;
    this.securityCheckFile = null;
  }

  closeContractModal(): void {
    this.showContractModal = false;
  }

  onContractFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.contractFile = input.files?.[0] ?? null;
  }

  onSecurityCheckFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.securityCheckFile = input.files?.[0] ?? null;
  }

  isContractFormValid(): boolean {
    return this.selectedViewPriceType !== null &&
      this.salePercentInput !== null &&
      this.salePercentInput >= 0 &&
      this.salePercentInput <= 8 &&
      this.contractFile !== null;
  }

  isSecurityFormValid(): boolean {
    const prepaymentValid =
      this.selectedPrepaymentType !== null &&
      (this.selectedPrepaymentType !== 1 ||
        (this.prepaymentPercentInput !== null &&
          this.prepaymentPercentInput >= 0 &&
          this.prepaymentPercentInput <= 100));

    const deferralValid =
      this.selectedPaymentDeferralType !== null &&
      (this.selectedPaymentDeferralType !== 0 ||
        (this.paymentDeferralDaysInput !== null &&
          Number.isInteger(this.paymentDeferralDaysInput) &&
          this.paymentDeferralDaysInput >= 0));

    return prepaymentValid && deferralValid && this.securityCheckFile !== null;
  }

  submitContract(): void {
    if (!this.isContractFormValid() || !this.contractFile) return;

    this.isUploading = true;
    const payload = {
      id: this.orderId,
      viewPriceType: this.selectedViewPriceType,
      salePercent: Number(((this.salePercentInput ?? 0) / 100).toFixed(4))
    };

    this.orderService.updateOrder(this.orderId, payload).subscribe({
      next: () => {
        this.orderService.addDocuments(this.orderId, [this.contractFile!], [99]).subscribe({
          next: () => {
            alert('Договор успешно подписан и загружен!');
            this.closeContractModal();
            this.loadOrderDetails();
            this.isUploading = false;
          },
          error: (err) => {
            console.error('Ошибка загрузки договора', err);
            alert('Данные договора сохранены, но файл загрузить не удалось.');
            this.isUploading = false;
          }
        });
      },
      error: (err) => {
        console.error('Ошибка обновления договора', err);
        alert('Не удалось сохранить данные договора.');
        this.isUploading = false;
      }
    });
  }

  submitSecurityCheck(): void {
    if (!this.isSecurityFormValid() || !this.securityCheckFile) return;

    this.isUploading = true;

    // PUT содержит только id и четыре поля условий оплаты.
    const payload = {
      id: this.orderId,
      prepaymentType: this.selectedPrepaymentType,
      prepaymentPercent: this.selectedPrepaymentType === 1
        ? Number(((this.prepaymentPercentInput ?? 0) / 100).toFixed(4))
        : null,
      paymentDeferralType: this.selectedPaymentDeferralType,
      paymentDeferralDaysCount: this.selectedPaymentDeferralType === 0
        ? this.paymentDeferralDaysInput
        : null
    };

    this.orderService.updateOrder(this.orderId, payload).subscribe({
      next: () => {
        // Файл проверки СБ загружается отдельным multipart-запросом.
        this.orderService.addDocuments(this.orderId, [this.securityCheckFile!], [98]).subscribe({
          next: () => {
            alert('Проверка СБ и условия оплаты сохранены.');
            this.closeContractModal();
            this.loadOrderDetails();
            this.isUploading = false;
          },
          error: (err) => {
            console.error('Ошибка загрузки файла проверки СБ', err);
            alert('Условия оплаты сохранены, но файл проверки СБ загрузить не удалось.');
            this.closeContractModal();
            this.loadOrderDetails();
            this.isUploading = false;
          }
        });
      },
      error: (err) => {
        console.error('Ошибка обновления условий заявки', err);
        alert('Не удалось сохранить условия оплаты.');
        this.isUploading = false;
      }
    });
  }

  hasDocument(type: number): boolean {
    return !!this.order?.orderDocuments?.some((doc:any) => doc.orderDocumentType === type);
  }

  hasContract(): boolean {
    return this.hasDocument(99);
  }

  hasSecurityCheck(): boolean {
    return this.hasDocument(98);
  }

  // --- Загрузка других документов ---
  uploadDocument(type: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    this.isUploading = true;

    this.orderService.addDocuments(this.orderId, files, [type]).subscribe({
      next: () => {
        alert('Документ успешно загружен!');
        this.loadOrderDetails();
        input.value = '';
        this.isUploading = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки файла', err);
        alert('Ошибка при загрузке файла');
        this.isUploading = false;
      }
    });
  }

  activate(): void {
    if (!confirm('Вы уверены, что хотите разблокировать заявку?')) return;
    this.orderService.activateOrder(this.orderId).subscribe({
      next: () => {
        alert('Заявка разблокирована');
        this.loadOrderDetails();
      },
      error: (err) => console.error('Ошибка активации', err)
    });
  }

  deactivate(): void {
    if (!confirm('Вы уверены, что хотите ЗАБЛОКИРОВАТЬ заявку?')) return;
    this.orderService.deactivateOrder(this.orderId).subscribe({
      next: () => {
        alert('Заявка заблокирована');
        this.loadOrderDetails();
      },
      error: (err) => console.error('Ошибка деактивации', err)
    });
  }

  getFullName(): string {
    if (!this.order?.userInstance) return '';

    const u = this.order.userInstance;
    const parts = [u.lastName, u.firstName, u.middleName]
      .filter(part => part != null && part !== '')
      .join(' ');

    return parts;
  }

  getEmail(): string {
    if (!this.order?.userInstance) return '';
    const u = this.order.userInstance;
    return `${u.email}`;
  }

  getPhone(): string {
    if (!this.order?.userInstance) return '';
    const u = this.order.userInstance;
    return `${u.phoneNumber}`;
  }

}