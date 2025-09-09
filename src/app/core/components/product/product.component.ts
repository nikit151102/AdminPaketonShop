import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AboutRoutingModule } from "../../../modules/about/about-routing.module";

@Component({
  selector: 'app-product',
  imports: [CommonModule, FormsModule, AboutRoutingModule],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent {

  @Input() view: 'compact' | 'wide' = 'compact';
  @Input() showCompare: boolean = true;
  @Input() product: any;
  inCart: boolean = false;
  hovered = true;
  showQuickView = false;

  toggleFavorite() {
    this.product.favorite = !this.product.favorite;
  }

  toggleCompare() {
    this.product.compare = !this.product.compare;
  }

  increaseQty(product: any) {
    product.qty++;
  }

  decreaseQty(product: any) {
    if (product.qty > 1) {
      product.qty--;
    } else {
      this.inCart = false;
      product.qty = 1;
    }
  }

  openQuickView() {
    this.showQuickView = true;
  }

  closeQuickView() {
    this.showQuickView = false;
  }

}
