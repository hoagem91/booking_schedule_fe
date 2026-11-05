import { Component, inject } from '@angular/core';
import { ManagementAccessService } from '../services/management-access.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import { UserEditor } from './management-users/user-editor/user-editor';
import { InternalRole, roleLabels } from '../models/management.models';

@Component({
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzTagModule,
    NzDescriptionsModule
  ],
  templateUrl: './management-account.html',
  styleUrl: './management-account.css'
})
export class ManagementAccount {
  readonly access = inject(ManagementAccessService);
  private readonly drawer = inject(NzDrawerService);
  private passwordOpen = false;

  /** Lấy tên hiển thị tiếng Việt của vai trò */
  protected getRoleLabel(roleName: string): string {
    return roleLabels[roleName as InternalRole] || roleName;
  }

  /** Lấy 2 ký tự viết tắt họ tên để làm avatar */
  protected getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  changePassword(): void {
    if (this.passwordOpen) return;
    this.passwordOpen = true;
    this.drawer.create({
      nzTitle: 'Đổi mật khẩu cá nhân',
      nzContent: UserEditor,
      nzData: { mode: 'self-password' },
      nzWidth: 'min(1000px, 100vw)',
      nzMaskClosable: false,
      nzClosable: false,
      nzKeyboard: false,
      nzBodyStyle: { padding: '24px', background: '#f8fafc' },
    }).afterClose.subscribe(() => {
      this.passwordOpen = false;
    });
  }
}
