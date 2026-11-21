/** Erro de negócio do módulo Academia com status HTTP explícito. */
export class GymError extends Error {
    constructor(
        message: string,
        public readonly status: number = 400,
        public readonly code?: string
    ) {
        super(message);
        this.name = 'GymError';
    }
}
