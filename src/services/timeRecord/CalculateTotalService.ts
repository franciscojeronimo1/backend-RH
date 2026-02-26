import { TimeRecordType } from '../../../generated/prisma/enums';
import { formatLocalDate, formatLocalTime, diffInMinutes, getCurrentLocalDate } from '../../utils/dateUtils';

interface Period {
    start: Date;
    stop: Date | null;
    minutes: number;
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

