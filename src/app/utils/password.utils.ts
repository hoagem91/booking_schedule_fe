export interface PasswordOptions {
  length?: number;               // độ dài
  upper?: boolean;               // A-Z
  lower?: boolean;               // a-z
  digits?: boolean;              // 0-9
  symbols?: boolean;             // ký tự đặc biệt
  avoidAmbiguous?: boolean;      // bỏ O/0, l/1, I, |, etc.
  customSymbols?: string;        // nếu muốn set bộ symbol riêng
}

const DEFAULT_OPTIONS: Required<PasswordOptions> = {
  length: 12,
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
  customSymbols: ''
};

export class PasswordUtils {
  private static AMBIGUOUS = new Set(['O','0','I','l','1','|','S','5','B','8','Z','2','o']);

  private static secureRandomInt(maxExclusive: number): number {
    // Dùng Web Crypto để random an toàn
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    // Tránh bias
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    return (array[0] < limit) ? (array[0] % maxExclusive) : this.secureRandomInt(maxExclusive);
  }

  private static buildCharset(opts: Required<PasswordOptions>) {
    let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lower = 'abcdefghijklmnopqrstuvwxyz';
    let digits = '0123456789';
    let symbols = opts.customSymbols || '!@#$%^&*()-_=+[]{};:,.?';

    if (opts.avoidAmbiguous) {
      const filter = (s: string) => [...s].filter(c => this.AMBIGUOUS.has(c)).join('');
      upper = filter(upper);
      lower = filter(lower);
      digits = filter(digits);
      symbols = filter(symbols);
    }

    const pools: string[] = [];
    if (opts.upper) pools.push(upper);
    if (opts.lower) pools.push(lower);
    if (opts.digits) pools.push(digits);
    if (opts.symbols && symbols) pools.push(symbols);

    if (pools.length === 0) throw new Error('At least one character set must be enabled.');

    return { pools, upper, lower, digits, symbols };
  }

  public static generatePassword(options: PasswordOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    if (opts.length < 4) throw new Error('Password length should be >= 4.');

    const { pools, upper, lower, digits, symbols } = this.buildCharset(opts);

    // Bước 1: đảm bảo có tối thiểu 1 ký tự từ mỗi pool đã bật
    const requiredChars: string[] = [];
    if (opts.upper)  requiredChars.push(upper[this.secureRandomInt(upper.length)]);
    if (opts.lower)  requiredChars.push(lower[this.secureRandomInt(lower.length)]);
    if (opts.digits) requiredChars.push(digits[this.secureRandomInt(digits.length)]);
    if (opts.symbols && symbols) requiredChars.push(symbols[this.secureRandomInt(symbols.length)]);

    // Bước 2: phần còn lại chọn ngẫu nhiên từ tất cả pool gộp
    const all = pools.join('');
    const chars = [...requiredChars];
    for (let i = requiredChars.length; i < opts.length; i++) {
      chars.push(all[this.secureRandomInt(all.length)]);
    }

    // Bước 3: xáo trộn Fisher–Yates để tránh pattern predictable
    for (let i = chars.length - 1; i > 0; i--) {
      const j = this.secureRandomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }
}