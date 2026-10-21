import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyVnd',
  standalone: true
})
export class CurrencyVndPipe implements PipeTransform {

  transform(value: number | string | null | undefined, ...args: unknown[]): string {
    if (value === null || value === undefined || value === '') {
      return '0 VNĐ';
    }

    let numberValue: number;
    if (typeof value === 'string') {
      numberValue = parseFloat(value);
      if (isNaN(numberValue)) {
        return '0 VNĐ'; // Or handle error appropriately
      }
    } else {
      numberValue = value;
    }

    const formattedValue = numberValue.toLocaleString('de-DE'); // 'de-DE' uses dot as thousand separator

    return `${formattedValue} VNĐ`;
  }
}

// pipe currency no VNĐ
@Pipe({
  name: 'currencyNoVnd',
  standalone: true
})
export class CurrencyNoVndPipe implements PipeTransform {

  transform(value: number | string | null | undefined, ...args: unknown[]): string {
    if (value === null || value === undefined || value === '') {
      return '0';
    }

    let numberValue: number;
    if (typeof value === 'string') {
      numberValue = parseFloat(value);
      if (isNaN(numberValue)) {
        return '0'; // Or handle error appropriately
      }
    } else {
      numberValue = value;
    }

    const formattedValue = numberValue.toLocaleString('de-DE'); // 'de-DE' uses dot as thousand separator

    return `${formattedValue}`;
  }
}

@Pipe({
  name: 'currencyVndShort',
  standalone: true
})
export class CurrencyVndShortPipe implements PipeTransform {

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return '0';
    }

    let numberValue: number;

    // Convert string => number
    if (typeof value === 'string') {
      numberValue = parseFloat(value);
      if (isNaN(numberValue)) return '0';
    } else {
      numberValue = value;
    }

    // Bỏ hàng nghìn
    const shortValue = Math.floor(numberValue / 1000);

    // Format theo de-DE (1.000.000 → 1.000.000)
    return shortValue.toLocaleString('de-DE');
  }
}
