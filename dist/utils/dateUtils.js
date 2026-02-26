"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLocalDate = parseLocalDate;
exports.getCurrentLocalDate = getCurrentLocalDate;
exports.getStartOfDay = getStartOfDay;
exports.getEndOfDay = getEndOfDay;
exports.formatLocalDate = formatLocalDate;
exports.formatLocalTime = formatLocalTime;
exports.diffInMinutes = diffInMinutes;
exports.isValidDateString = isValidDateString;
exports.getStartOfLastDays = getStartOfLastDays;
exports.getStartOfMonth = getStartOfMonth;
exports.getEndOfMonth = getEndOfMonth;
exports.isValidMonthString = isValidMonthString;
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
function parseLocalDate(dateString) {
    return (0, dayjs_1.default)(dateString).startOf('day').toDate();
}
function getCurrentLocalDate() {
    return (0, dayjs_1.default)().toDate();
}
function getStartOfDay(date) {
    const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
    return (0, dayjs_1.default)(dateObj).startOf('day').toDate();
}
function getEndOfDay(date) {
    const dateObj = typeof date === 'string' ? parseLocalDate(date) : date;
    return (0, dayjs_1.default)(dateObj).endOf('day').toDate();
}
function formatLocalDate(date) {
    return (0, dayjs_1.default)(date).format('YYYY-MM-DD');
}
function formatLocalTime(date) {
    return (0, dayjs_1.default)(date).format('HH:mm');
}
function diffInMinutes(start, end) {
    return (0, dayjs_1.default)(end).diff((0, dayjs_1.default)(start), 'minute');
}
function isValidDateString(dateString) {
    return (0, dayjs_1.default)(dateString, 'YYYY-MM-DD', true).isValid();
}
function getStartOfLastDays(days) {
    return (0, dayjs_1.default)().subtract(days, 'day').startOf('day').toDate();
}
function getStartOfMonth(monthString) {
    return (0, dayjs_1.default)(monthString + '-01').startOf('month').toDate();
}
function getEndOfMonth(monthString) {
    return (0, dayjs_1.default)(monthString + '-01').endOf('month').toDate();
}
function isValidMonthString(monthString) {
    return (0, dayjs_1.default)(monthString, 'YYYY-MM', true).isValid();
}
//# sourceMappingURL=dateUtils.js.map