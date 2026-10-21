import * as CryptoJS from 'crypto-js';

export class DataUtils {
  public static encryptUsingAES256(value: any) {
    let _key = CryptoJS.enc.Utf8.parse('FFTCODESECURITY#');
    let _iv = CryptoJS.enc.Utf8.parse('FFTCODESECURITY#');
    let encrypted = CryptoJS.AES.encrypt(value.toString(), _key, {
      iv: _iv,
      mode: CryptoJS.mode.CBC,
    });
    return encrypted.toString();
  }

  public static decryptUsingAES256(text: string): string {
    let _key = CryptoJS.enc.Utf8.parse('FFTCODESECURITY#');
    let _iv = CryptoJS.enc.Utf8.parse('FFTCODESECURITY#');
    return CryptoJS.AES.decrypt(text, _key, {
      iv: _iv,
      mode: CryptoJS.mode.CBC,
    }).toString(CryptoJS.enc.Utf8);
  }

  public static removeAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim();
  }

  public static convertImageToBase64Optimized(imageUrl: string, maxWidth = 300): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      img.onload = () => {
        const canvas = document.createElement('canvas');

        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Chất lượng 0.7 giảm size rất mạnh
        const base64 = canvas.toDataURL('image/png', 0.7);
        resolve(base64);
      };

      img.onerror = reject;
    });
  }

  /**
   * Convert a number to Vietnamese words (đọc số tiền bằng chữ)
   * @param amount - The number to convert
   * @returns Vietnamese text representation
   */
  public static numberToWords(amount: number): string {
    if (amount === 0) return 'Không đồng';
    if (!amount || isNaN(amount)) return '';

    const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const teens = [
      'mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm',
      'mười sáu', 'mười bảy', 'mười tám', 'mười chín'
    ];

    const readHundreds = (n: number, isFirst: boolean): string => {
      if (n === 0) return '';
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const u = n % 10;
      let result = '';

      if (h > 0) {
        result += ones[h] + ' trăm';
      } else if (!isFirst) {
        result += 'không trăm';
      }

      if (t === 0 && u === 0) return result;

      if (t === 0) {
        result += (result ? ' lẻ ' : '') + ones[u];
      } else if (t === 1) {
        result += (result ? ' ' : '') + teens[u];
      } else {
        result += (result ? ' ' : '') + ones[t] + ' mươi';
        if (u === 1) result += ' mốt';
        else if (u === 5) result += ' lăm';
        else if (u > 0) result += ' ' + ones[u];
      }

      return result.trim();
    };

    const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];

    let n = Math.round(Math.abs(amount));
    const isNegative = amount < 0;
    const groups: number[] = [];

    while (n > 0) {
      groups.push(n % 1000);
      n = Math.floor(n / 1000);
    }

    let result = '';
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] === 0) continue;
      const isFirst = result === '';
      result += (result ? ' ' : '') + readHundreds(groups[i], isFirst) + units[i];
    }

    result = result.trim();
    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1);
    if (isNegative) result = 'Âm ' + result.charAt(0).toLowerCase() + result.slice(1);
    return result + ' đồng';
  }
}
