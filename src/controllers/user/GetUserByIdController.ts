import { Request, Response } from "express";
import { GetUserByIdService } from "../../services/user/GetUserByIdService";

class GetUserByIdController {
  async handle(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const { id } = req.params;
    const getUserByIdService = new GetUserByIdService();
    const user = await getUserByIdService.execute(
      id as unknown as string,
      req.user.id,
      req.user.role
    );
    return res.json({ user });
  }
}

export { GetUserByIdController };
