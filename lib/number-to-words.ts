export function numberToWords(num: number): string {
    const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million', 'billion', 'trillion'];

    if (num === 0) return 'zero';

    let words = '';
    let scaleIndex = 0;

    // Split into integer and decimal parts
    const [integerPart, decimalPart] = num.toString().split('.');

    let n = parseInt(integerPart);

    while (n > 0) {
        let chunk = n % 1000;
        if (chunk > 0) {
            let chunkWords = '';
            if (chunk >= 100) {
                chunkWords += units[Math.floor(chunk / 100)] + ' hundred ';
                chunk %= 100;
            }
            if (chunk >= 20) {
                chunkWords += tens[Math.floor(chunk / 10)] + (chunk % 10 > 0 ? '-' + units[chunk % 10] : '');
            } else if (chunk > 0) {
                chunkWords += units[chunk];
            }
            words = chunkWords + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (words ? ' ' + words : '');
        }
        n = Math.floor(n / 1000);
        scaleIndex++;
    }

    if (decimalPart) {
        words += ' point';
        for (let i = 0; i < decimalPart.length; i++) {
            words += ' ' + units[parseInt(decimalPart[i])];
        }
    }

    return words.trim();
}
