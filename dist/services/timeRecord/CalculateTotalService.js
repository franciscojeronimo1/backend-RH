"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculateTotalService = void 0;
const enums_1 = require("../../../generated/prisma/enums");
const dateUtils_1 = require("../../utils/dateUtils");
class CalculateTotalService {
    calculateDayTotal(records) {
        if (records.length === 0) {
            return {
                date: (0, dateUtils_1.formatLocalDate)((0, dateUtils_1.getCurrentLocalDate)()),
                periods: [],
                totalMinutes: 0,
                totalHours: '0:00',
                status: 'stopped',
            };
        }
        const periods = [];
        let currentStart = null;
        const sortedRecords = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        for (const record of sortedRecords) {
            if (record.type === enums_1.TimeRecordType.START) {
                currentStart = record.timestamp;
            }
            else if (record.type === enums_1.TimeRecordType.STOP && currentStart) {
                const minutes = (0, dateUtils_1.diffInMinutes)(currentStart, record.timestamp);
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
        const status = lastRecord && lastRecord.type === enums_1.TimeRecordType.START ? 'started' : 'stopped';
        const formattedPeriods = periods.map((period) => ({
            start: (0, dateUtils_1.formatLocalTime)(period.start),
            stop: period.stop ? (0, dateUtils_1.formatLocalTime)(period.stop) : null,
            minutes: period.minutes,
        }));
        return {
            date: (0, dateUtils_1.formatLocalDate)(sortedRecords[0]?.timestamp || (0, dateUtils_1.getCurrentLocalDate)()),
            periods: formattedPeriods,
            totalMinutes,
            totalHours: this.formatHours(totalMinutes),
            status,
        };
    }
    formatHours(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
}
exports.CalculateTotalService = CalculateTotalService;
//# sourceMappingURL=CalculateTotalService.js.map