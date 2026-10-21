import { DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

export type SummaryCardTone = 'emerald' | 'sky' | 'orange' | 'violet' | 'blue' | 'cyan' | 'rose' | 'amber' | 'slate';
export type SummaryCardFormat = 'number' | 'currency' | 'text';
export type SummaryCardBadgePosition = 'top' | 'bottom';

@Component({
  standalone: true,
  selector: 'app-summary-cards',
  templateUrl: './summary-cards.html',
  styleUrl: './summary-cards.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, NgClass, NzIconModule]
})
export class SummaryCards {
  readonly label = input.required<string>();
  readonly value = input<string | number | null | undefined>(null);
  readonly icon = input.required<string>();
  readonly tone = input<SummaryCardTone>('slate');
  readonly format = input<SummaryCardFormat>('number');
  readonly unit = input<string>('');
  readonly tooltip = input<string>('');
  readonly badge = input<string>('');
  readonly badgePosition = input<SummaryCardBadgePosition>('bottom');
  readonly compact = input<boolean>(true);

  protected cardClass(): Record<string, boolean> {
    return {
      [`summary-${this.tone()}`]: true,
      'summary-card--has-badge': !!this.badge(),
      [`summary-card--badge-${this.badgePosition()}`]: !!this.badge(),
      'summary-card--compact': this.compact()
    };
  }
}
