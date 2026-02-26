import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Configurar plugins do dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Utilitários para tratamento de datas no sistema
 * Garante que as datas sejam tratadas como data local (sem timezone)
 */

/**
 * Converte uma string de data (YYYY-MM-DD) para Date local
 * Exemplo: "2025-12-30" -> Date local (não UTC)
 */
export function parseLocalDate(dateString: string): Date {
    // dayjs interpreta "YYYY-MM-DD" como meia-noite local, não UTC
    return dayjs(dateString).startOf('day').toDate();
}

/**
 * Obtém a data atual no timezone local
 */
export function getCurrentLocalDate(): Date {
    return dayjs().toDate();
}

/**
 * Obtém o início do dia (00:00:00) no timezone local
 */
export function getStartOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
    return dayjs(dateObj).startOf('day').toDate();
}

/**
 * Obtém o fim do dia (23:59:59.999) no timezone local
 */
export function getEndOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
    return dayjs(dateObj).endOf('day').toDate();
}

/**
 * Formata uma data para string no formato YYYY-MM-DD (data local)
 */
export function formatLocalDate(date: Date): string {
    return dayjs(date).format('YYYY-MM-DD');
}

/**
 * Formata uma data/hora para string no formato HH:MM (hora local)
 */
export function formatLocalTime(date: Date): string {
    return dayjs(date).format('HH:mm');
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
 * Retorna o início do dia que está a N dias atrás (últimos N dias).
 * Ex: getStartOfLastDays(30) = início do dia de 30 dias atrás
 */
export function getStartOfLastDays(days: number): Date {
    return dayjs().subtract(days, 'day').startOf('day').toDate();
}

/**
 * Retorna o início do mês (YYYY-MM). Ex: "2025-02" -> 1º dia 00:00
 */
export function getStartOfMonth(monthString: string): Date {
    return dayjs(monthString + '-01').startOf('month').toDate();
}

/**
 * Retorna o fim do mês (YYYY-MM). Ex: "2025-02" -> último dia 23:59:59
 */
export function getEndOfMonth(monthString: string): Date {
    return dayjs(monthString + '-01').endOf('month').toDate();
}

/**
 * Valida se uma string é um mês válido no formato YYYY-MM
 */
export function isValidMonthString(monthString: string): boolean {
    return dayjs(monthString, 'YYYY-MM', true).isValid();
}

