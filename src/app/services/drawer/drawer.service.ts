import { Injectable } from '@angular/core';
import { NzDrawerRef } from 'ng-zorro-antd/drawer';

@Injectable({ providedIn: 'root' })
export class DrawerManagerService {
  private drawers: NzDrawerRef[] = [];

  register(drawer: NzDrawerRef): void {
    this.drawers.push(drawer);
    drawer.afterClose.subscribe(() => {
      this.drawers = this.drawers.filter(d => d !== drawer);
    });
  }

  closeAll(): void {
    for (const drawer of this.drawers) {
      drawer.close();
    }
    this.drawers = [];
  }
}
