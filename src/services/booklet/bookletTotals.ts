type ParcelLike = {
    amount: { toString(): string } | string | number
    status: 'PENDING' | 'PAID' | 'CANCELLED'
    dueDate?: Date | string | null
}

function toDateKey(value: Date | string): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
    }
    return value.includes('T') ? value.split('T')[0]! : value
}

export function computeBookletTotals(parcels: ParcelLike[]) {
    let paid = 0
    let open = 0
    let paidCount = 0
    let pendingCount = 0
    let cancelledCount = 0
    let nextDueDate: string | null = null

    for (const parcel of parcels) {
        const amount = parseFloat(String(parcel.amount))
        if (Number.isNaN(amount)) continue

        if (parcel.status === 'PAID') {
            paid += amount
            paidCount += 1
        } else if (parcel.status === 'PENDING') {
            open += amount
            pendingCount += 1
            if (parcel.dueDate != null) {
                const key = toDateKey(parcel.dueDate)
                if (!nextDueDate || key < nextDueDate) {
                    nextDueDate = key
                }
            }
        } else {
            cancelledCount += 1
        }
    }

    return {
        paidAmount: paid.toFixed(2),
        openAmount: open.toFixed(2),
        paidCount,
        pendingCount,
        cancelledCount,
        nextDueDate,
    }
}
