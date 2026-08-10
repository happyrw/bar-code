/**
 * Validates the GS1 mod-10 check digit shared by UPC-A, EAN-8, and EAN-13.
 * Camera-based 1D decoding occasionally misreads a bar as the wrong digit;
 * a failed checksum is a strong signal the read is garbage rather than a
 * legitimately unknown product.
 */
export function isValidGtinChecksum(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return true;

  const digits = code.split("").map(Number);
  const checkDigit = digits[digits.length - 1];
  const payload = digits.slice(0, -1);

  let sum = 0;
  let weight = 3;
  for (let i = payload.length - 1; i >= 0; i--) {
    sum += payload[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }

  return (10 - (sum % 10)) % 10 === checkDigit;
}
