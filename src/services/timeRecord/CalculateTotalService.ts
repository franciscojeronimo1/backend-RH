import { TimeRecordType } from '../../../generated/prisma/enums';
import { formatLocalDate, formatLocalTime, diffInMinutes, getCurrentLocalDate } from '../../utils/dateUtils';

export interface Period {
    start: Date;
    stop: Date | null;
    minutes: number;
}

export interface DaySummary {
    date: string;
    periods: Array<{
        start: string;
        stop: string | null;
        minutes: number;
    }>;
    totalMinutes: number;
    totalHours: string;
    status: 'started' | 'stopped';
}

export interface Summary {
    date: string;
    periods: Array<{
        start: string;
        stop: string | null;
        minutes: number;
    }>;
    totalMinutes: number;
    totalHours: string;
    status: 'started' | 'stopped';
    /** Preenchido quando o resumo é por período (ex: últimos 30 dias ou mês) */
    startDate?: string;
    endDate?: string;
}

class CalculateTotalService {

    /**
     * Períodos START/STOP em ordem cronológica (turno que cruza meia-noite fica num único período).
     */
    buildPeriods(records: Array<{ type: string; timestamp: Date }>): Period[] {
        const periods: Period[] = [];
        let currentStart: Date | null = null;

        const sortedRecords = [...records].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );

        for (const record of sortedRecords) {
            if (record.type === TimeRecordType.START) {
                currentStart = record.timestamp;
            } else if (record.type === TimeRecordType.STOP && currentStart) {
                const minutes = diffInMinutes(currentStart, record.timestamp);
                periods.push({
                    start: currentStart,
                    stop: record.timestamp,
                    minutes,
                });
                currentStart = null;
            }
        }

        if (currentStart) {
            periods.push({
                start: currentStart,
                stop: null,
                minutes: 0,
            });
        }

        return periods;
    }

    /**
     * Resumo por dia local: cada período conta no dia em que o START ocorreu (inclui turno noturno).
     */
    summarizeByLocalDay(records: Array<{ type: string; timestamp: Date }>): DaySummary[] {
        if (records.length === 0) {
            return [];
        }

        const sortedRecords = [...records].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );

        const periods = this.buildPeriods(records);
        const byDate = new Map<string, Period[]>();

        for (const period of periods) {
            const d = formatLocalDate(period.start);
            const list = byDate.get(d) ?? [];
            list.push(period);
            byDate.set(d, list);
        }

        const dates = [...byDate.keys()].sort();
        return dates.map((date) => {
            const dayPeriods = byDate.get(date)!;
            const totalMinutes = dayPeriods.reduce((sum, p) => sum + p.minutes, 0);
            const formattedPeriods = dayPeriods.map((period) => ({
                start: formatLocalTime(period.start),
                stop: period.stop ? formatLocalTime(period.stop) : null,
                minutes: period.minutes,
            }));

            const dayRecords = sortedRecords.filter((r) => formatLocalDate(r.timestamp) === date);
            const lastOfDay = dayRecords[dayRecords.length - 1];
            const status =
                lastOfDay && lastOfDay.type === TimeRecordType.START ? 'started' : 'stopped';

            return {
                date,
                periods: formattedPeriods,
                totalMinutes,
                totalHours: this.formatHours(totalMinutes),
                status,
            };
        });
    }

    calculateDayTotal(records: Array<{ type: string; timestamp: Date }>): Summary {
        if (records.length === 0) {
            return {
                date: formatLocalDate(getCurrentLocalDate()),
                periods: [],
                totalMinutes: 0,
                totalHours: '0:00',
                status: 'stopped',
            };
        }

        const sortedRecords = [...records].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );

        const periods = this.buildPeriods(records);
        const totalMinutes = periods.reduce((sum, period) => sum + period.minutes, 0);

        const lastRecord = sortedRecords[sortedRecords.length - 1];
        const status = lastRecord && lastRecord.type === TimeRecordType.START ? 'started' : 'stopped';

        const formattedPeriods = periods.map((period) => ({
            start: formatLocalTime(period.start),
            stop: period.stop ? formatLocalTime(period.stop) : null,
            minutes: period.minutes,
        }));

        return {
            date: formatLocalDate(sortedRecords[0]?.timestamp || getCurrentLocalDate()),
            periods: formattedPeriods,
            totalMinutes,
            totalHours: this.formatHours(totalMinutes),
            status,
        };
    }

    private formatHours(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
}

export { CalculateTotalService };

