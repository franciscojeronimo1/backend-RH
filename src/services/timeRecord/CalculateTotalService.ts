import { TimeRecordType } from '../../../generated/prisma/enums';

interface Period {
    start: Date;
    stop: Date | null;
    minutes: number;
}

interface Summary {
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

class CalculateTotalService {

    calculateDayTotal(records: Array<{ type: string; timestamp: Date }>): Summary {
        if (records.length === 0) {
            return {
                date: new Date().toISOString().split('T')[0] || '',
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
                const minutes = Math.floor(
                    (record.timestamp.getTime() - currentStart.getTime()) / 60000
                );
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
            start: this.formatTime(period.start),
            stop: period.stop ? this.formatTime(period.stop) : null,
            minutes: period.minutes,
        }));

        return {
            date: sortedRecords[0]?.timestamp.toISOString().split('T')[0] || '',
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


    private formatTime(date: Date): string {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
}

export { CalculateTotalService };

