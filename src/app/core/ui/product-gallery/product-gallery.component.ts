import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-product-gallery',
  imports: [CommonModule],
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.scss',
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ])
  ]
})
export class ProductGalleryComponent {
  images = [
    'https://avatars.mds.yandex.net/i?id=bbc8d604c98e8a47531a26dcc5e15b58_l-8485406-images-thumbs&n=13',
    'https://img.freepik.com/premium-photo/paper-disposable-cups-with-colored-pattern-isolated-on-white-background_93675-33944.jpg?size=626&ext=jpg',
    'https://img.freepik.com/premium-photo/colorful-paper-cups-isolated-white_93675-33950.jpg'
  ];

  currentImageIndex = 0;

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }

  prevImage() {
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.images.length) % this.images.length;
  }

  goToImage(index: number) {
    this.currentImageIndex = index;
  }
}
