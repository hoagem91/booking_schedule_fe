import { Component } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { UIUtils } from '../../utils/ui.utils';

@Component({
  standalone: true,
  selector: 'app-display-loading',
  templateUrl: './display-loading.component.html',
  styleUrl: './display-loading.component.css',
  imports: [
    NzIconModule
  ]
})
export class DisplayLoadingComponent {
  protected iconSizeClass = '';
  private parentWidth = 0;

  ngOnInit(): void {
    this.updateIconSize();
  }

  setParentWidth(width: number): void {
    this.parentWidth = width;
    this.updateIconSize();
  }

  private updateIconSize() {
    const widthToUse = this.parentWidth > 0 ? this.parentWidth : window.innerWidth;
    this.iconSizeClass = UIUtils.getIconSizeClass(widthToUse);
  }
}
