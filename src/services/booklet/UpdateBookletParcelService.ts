import { prismaClient } from '../../config/prismaClient';

class UpdateBookletParcelService {
    async execute(
        bookletId: string,
        parcelId: string,
        organizationId: string,
        status: 'PENDING' | 'PAID' | 'CANCELLED'
    ) {
        const booklet = await prismaClient.booklet.findFirst({
            where: { id: bookletId, organizationId },
            select: { id: true },
        });

        if (!booklet) {
            throw new Error('Carnê não encontrado');
        }

        const parcel = await prismaClient.bookletParcel.findFirst({
            where: { id: parcelId, bookletId },
        });

        if (!parcel) {
            throw new Error('Parcela não encontrada');
        }

        const updated = await prismaClient.bookletParcel.update({
            where: { id: parcelId },
            data: {
                status,
                paidAt: status === 'PAID' ? new Date() : null,
            },
        });

        return updated;
    }
}

export { UpdateBookletParcelService };
