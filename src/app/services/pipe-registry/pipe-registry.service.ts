import { Injectable } from '@angular/core';
import { PipeTransform } from '@angular/core';
import { DateDisplayPipe, DateTimeDisplayPipe, TimeDisplayPipe } from '../../pipes/date.pipe';
import { CurrencyVndPipe } from '../../pipes/currency.pipe';

@Injectable({
  providedIn: 'root'
})
export class PipeRegistryService {
  private registry = new Map<string, PipeTransform>();

  constructor() {
    this.register('dateDisplay', new DateDisplayPipe());
    this.register('dateTimeDisplay', new DateTimeDisplayPipe());
    this.register('displayCurrency', new CurrencyVndPipe());
    this.register('displayHourDisplay', new TimeDisplayPipe());
  }

  register(name: string, pipe: PipeTransform) {
    this.registry.set(name, pipe);
  }

  transform(name: string, value: any, args: any[] = []): any {
    const pipe = this.registry.get(name);
    if (pipe) {
      return pipe.transform(value, ...args);
    }
    return value;
  }

  static readonly REGISTERED_PIPES = [
    'dateDisplay',
    'dateTimeDisplay',
    'displayCurrency',
    'displayHourDisplay'
  ] as const;
}

export type RegisteredPipeName = typeof PipeRegistryService.REGISTERED_PIPES[number];
