import { Request, Response } from 'express';
import { StartTimeRecordService } from '../../services/timeRecord/StartTimeRecordService';

class StartTimeRecordController {
    async handle(req: Request, res: Response) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const startTimeRecordService = new StartTimeRecordService();
        const result = await startTimeRecordService.execute(req.user.id);
        
        return res.status(201).json(result);
    }
}

export { StartTimeRecordController };

