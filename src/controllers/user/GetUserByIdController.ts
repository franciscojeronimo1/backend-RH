import { Request, Response } from "express";
import { GetUserByIdService } from "../../services/user/GetUserByIdService";

class GetUserByIdController {
  async handle(req: Request, res: Response) {
    const { id } = req.params;
    const getUserByIdService = new GetUserByIdService();
    const user = await getUserByIdService.execute(id as unknown as string);
    return res.json({ user });
  }
}

export { GetUserByIdController };
