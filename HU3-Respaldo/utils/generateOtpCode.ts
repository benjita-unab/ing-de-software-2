const OTP_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const OTP_LENGTH = 6;

/**
 * Generates a secure uppercase alphanumeric OTP code of 6 characters.
 * Uses rejection sampling to avoid modulo bias.
 */
export function generateOtpCode(length: number = OTP_LENGTH): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error("Secure random generator is not available in this runtime.");
  }

  const result: string[] = [];
  const alphabetLength = OTP_ALPHABET.length;
  const maxValidByte = Math.floor(256 / alphabetLength) * alphabetLength - 1;

  while (result.length < length) {
    const randomBytes = new Uint8Array(length * 2);
    cryptoApi.getRandomValues(randomBytes);

    for (const byte of randomBytes) {
      if (byte > maxValidByte) continue;
      result.push(OTP_ALPHABET[byte % alphabetLength]);
      if (result.length === length) break;
    }
  }

  return result.join("");
}
