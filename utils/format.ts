import { format, isThisYear } from 'date-fns';

export const formatNumber = (count: number | undefined | null): string => {
    if (count === undefined || count === null) return '0';

    if (count >= 1000000) {
        return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
        return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return count.toString();
};

export const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return '';
    const d = new Date(date);
    if (!isThisYear(d)) {
        return format(d, 'dd MMM yyyy');
    }
    return format(d, 'dd MMM');
};
