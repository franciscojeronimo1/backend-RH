import { Request, Response } from 'express';
import { ListTimeRecordsService } from '../../services/timeRecord/ListTimeRecordsService';

class ListTimeRecordsController {
    async handle(req: Request, res: Response) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const { userId, date, periodDays, month } = req.query;
        const listTimeRecordsService = new ListTimeRecordsService();
        const result = await listTimeRecordsService.execute(req.user.id, userId as string | null, {
            date: date as string | undefined,
            periodDays: periodDays !== undefined ? Number(periodDays) : undefined,
            month: month as string | undefined,
        });
        
        return res.json(result);
    }
}

export { ListTimeRecordsController };

