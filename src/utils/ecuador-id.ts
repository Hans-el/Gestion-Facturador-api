const toDigits = (value: string) => value.split("").map(Number);

// Provincias 01-24; 30 es para ecuatorianos registrados en el exterior
const isValidProvince = (value: string) => {
  const code = Number(value.slice(0, 2));
  return (code >= 1 && code <= 24) || code === 30;
};

function modulo10(d: number[]): boolean {
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let product = d[i] * coefficients[i];
    if (product > 9) product -= 9;
    sum += product;
  }
  return (10 - (sum % 10)) % 10 === d[9];
}

function modulo11(
  d: number[],
  coefficients: number[],
  checkIndex: number,
): boolean {
  const sum = coefficients.reduce((acc, c, i) => acc + c * d[i], 0);
  const residue = sum % 11;
  const check = residue === 0 ? 0 : 11 - residue; // si da 10, ningún dígito coincide
  return check === d[checkIndex];
}

export function isValidCedula(value: string): boolean {
  if (!/^\d{10}$/.test(value) || !isValidProvince(value)) return false;
  const d = toDigits(value);
  return d[2] < 6 && modulo10(d);
}

export function isValidRuc(value: string): boolean {
  if (!/^\d{13}$/.test(value) || !isValidProvince(value)) return false;
  const d = toDigits(value);
  const third = d[2];

  if (third < 6) return modulo10(d) && Number(value.slice(10)) >= 1; // persona natural
  if (third === 6)
    return (
      modulo11(d, [3, 2, 7, 6, 5, 4, 3, 2], 8) && Number(value.slice(9)) >= 1
    ); // público
  if (third === 9)
    return (
      modulo11(d, [4, 3, 2, 7, 6, 5, 4, 3, 2], 9) &&
      Number(value.slice(10)) >= 1
    ); // privada
  return false;
}

// Devuelve el mensaje de error, o null si la identificación es válida
export function validateIdentification(
  type: string,
  number: string,
): string | null {
  switch (type) {
    case "CEDULA":
      return isValidCedula(number) ? null : "Cédula inválida";
    case "RUC":
      return isValidRuc(number) ? null : "RUC inválido";
    case "PASAPORTE":
    case "EXTERIOR":
      return /^[A-Z0-9]{3,20}$/.test(number)
        ? null
        : "Debe tener entre 3 y 20 letras o números, sin espacios ni guiones";
    case "CONSUMIDOR_FINAL":
      return number === "9999999999999" ? null : "Identificación inválida";
    default:
      return "Tipo de identificación inválido";
  }
}
