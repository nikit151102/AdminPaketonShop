import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-view-switcher',
  imports: [],
  templateUrl: './view-switcher.component.html',
  styleUrl: './view-switcher.component.scss'
})
export class ViewSwitcherComponent {
  
  @Input() currentView: 'compact' | 'wide' = 'compact';
  @Output() viewChange = new EventEmitter<'compact' | 'wide'>();

  setView(view: 'compact' | 'wide') {
    this.viewChange.emit(view);
  }

}
