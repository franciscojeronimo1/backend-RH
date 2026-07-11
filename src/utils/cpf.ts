/** Remove caracteres não numéricos do CPF. */
export function digitsOnlyCpf(value: string): string {
    return value.replace(/\D/g, '');
}

/** Valida CPF brasileiro (11 dígitos + dígitos verificadores). */
export function isValidCpf(value: string): boolean {
    const cpf = digitsOnlyCpf(value);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i), 10) * (10 - i);
    }
    let rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.charAt(9), 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i), 10) * (11 - i);
    }
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.charAt(10), 10)) return false;

    return true;
}
