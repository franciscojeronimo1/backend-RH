import { Request, Response } from 'express';
import { StopTimeRecordService } from '../../services/timeRecord/StopTimeRecordService';

class StopTimeRecordController {
    async handle(req: Request, res: Response) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const stopTimeRecordService = new StopTimeRecordService();
        const result = await stopTimeRecordService.execute(req.user.id);
        
        return res.status(201).json(result);
    }
}

export { StopTimeRecordController };

