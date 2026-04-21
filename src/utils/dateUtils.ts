import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Fuso fixo para calendário (início/fim de dia, mês, formatação BR).
 * Independe do TZ do servidor — evita divergência entre dev e produção.
 */
export const APP_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma string de data (YYYY-MM-DD) para o instante de meia-noite
 * no fuso de São Paulo.
 */
export function parseLocalDate(dateString: string): Date {
    return dayjs.tz(dateString, APP_TIMEZONE).startOf('day').toDate();
}

/**
 * Momento atual (instante absoluto). Use com getStartOfDay/getEndOfDay
 * para obter limites do dia no fuso {@link APP_TIMEZONE}.
 */
export function getCurrentLocalDate(): Date {
    return dayjs().toDate();
}

/**
 * Início do dia (00:00:00) em {@link APP_TIMEZONE} para a data informada.
 */
export function getStartOfDay(date: Date | string): Date {
    const d =
        typeof date === 'string'
            ? dayjs.tz(date, APP_TIMEZONE)
            : dayjs(date).tz(APP_TIMEZONE);
    return d.startOf('day').toDate();
}

/**
 * Fim do dia (23:59:59.999) em {@link APP_TIMEZONE} para a data informada.
 */
export function getEndOfDay(date: Date | string): Date {
    const d =
        typeof date === 'string'
            ? dayjs.tz(date, APP_TIMEZONE)
            : dayjs(date).tz(APP_TIMEZONE);
    return d.endOf('day').toDate();
}

/**
 * Formata instante para data YYYY-MM-DD no calendário de São Paulo.
 */
export function formatLocalDate(date: Date): string {
    return dayjs(date).tz(APP_TIMEZONE).format('YYYY-MM-DD');
}

/**
 * Formata instante para hora HH:mm no relógio de São Paulo.
 */
export function formatLocalTime(date: Date): string {
    return dayjs(date).tz(APP_TIMEZONE).format('HH:mm');
}

/**
 * Calcula a diferença em minutos entre duas datas
 */
export function diffInMinutes(start: Date, end: Date): number {
    return dayjs(end).diff(dayjs(start), 'minute');
}

/**
 * Valida se uma string é uma data válida no formato YYYY-MM-DD
 */
export function isValidDateString(dateString: string): boolean {
    return dayjs(dateString, 'YYYY-MM-DD', true).isValid();
}

/**
 * Retorna o início do dia que está a N dias atrás (últimos N dias),
 * no calendário de São Paulo.
 */
export function getStartOfLastDays(days: number): Date {
    return dayjs().tz(APP_TIMEZONE).subtract(days, 'day').startOf('day').toDate();
}

/**
 * Retorna o início do mês (YYYY-MM). Ex: "2025-02" -> 1º dia 00:00 em SP
 */
export function getStartOfMonth(monthString: string): Date {
    return dayjs
        .tz(`${monthString}-01`, 'YYYY-MM-DD', APP_TIMEZONE)
        .startOf('month')
        .toDate();
}

/**
 * Retorna o fim do mês (YYYY-MM). Ex: "2025-02" -> último dia 23:59:59 em SP
 */
export function getEndOfMonth(monthString: string): Date {
    return dayjs
        .tz(`${monthString}-01`, 'YYYY-MM-DD', APP_TIMEZONE)
        .endOf('month')
        .toDate();
}

/**
 * Valida se uma string é um mês válido no formato YYYY-MM
 */
export function isValidMonthString(monthString: string): boolean {
    return dayjs(monthString, 'YYYY-MM', true).isValid();
}
