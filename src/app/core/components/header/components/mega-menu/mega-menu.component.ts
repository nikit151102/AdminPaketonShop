import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-mega-menu',
  imports: [CommonModule],
  templateUrl: './mega-menu.component.html',
  styleUrl: './mega-menu.component.scss'
})
export class MegaMenuComponent {
  @Input() niches: any[] = [];
  @Input() selectedNiche: string = '';
  @Output() nicheSelected = new EventEmitter<string>();

  selectNiche(nicheId: string) {
    this.nicheSelected.emit(nicheId);
  }

}
