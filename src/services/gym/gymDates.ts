import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { APP_TIMEZONE, expirationDateToYmd } from '../../utils/dateUtils';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Hoje (YYYY-MM-DD) no calendário de São Paulo. */
export function todayYmd(now: Date = new Date()): string {
    return dayjs(now).tz(APP_TIMEZONE).format('YYYY-MM-DD');
}

/** "YYYY-MM-DD" → Date em meia-noite UTC (padrão das colunas @db.Date do projeto). */
export function ymdToDbDate(ymd: string): Date {
    return new Date(`${ymd}T00:00:00.000Z`);
}

/** Coluna @db.Date → "YYYY-MM-DD" (sem deslocar o dia). */
export function dbDateToYmd(date: Date | null | undefined): string | null {
    return date ? expirationDateToYmd(date) : null;
}

/** Soma meses/dias a uma data civil. */
export function addToYmd(ymd: string, months: number, days: number): string {
    return dayjs.utc(ymd).add(months, 'month').add(days, 'day').format('YYYY-MM-DD');
}

/**
 * Último dia de validade de um plano que começa em startYmd (inclusive).
 * Ex.: mensal começando 15/01 vale até 14/02; a renovação começa 15/02.
 */
export function planEndYmd(startYmd: string, months: number, days: number): string {
    return addToYmd(addToYmd(startYmd, months, days), 0, -1);
}
