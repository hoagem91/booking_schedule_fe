import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

@Component({
  standalone: true,
  selector: 'app-share-button',
  templateUrl: './share-button.html',
  styleUrl: './share-button.css',
  imports: [NzButtonModule, NzIconModule, NzTooltipModule]
})
export class ShareButton {
  @Input() icon = '';
  @Input() tooltip = '';
  @Input() type: 'primary' | 'default' | 'dashed' | 'text' | 'link' = 'default';
  @Input() size: 'large' | 'default' | 'small' = 'default';
  @Input() disabled = false;
  @Input() loading = false;
  @Output() buttonClick = new EventEmitter<void>();
}
