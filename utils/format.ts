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

export const formatDateWithTime = (dateString: string) => {
        const date = new Date(dateString);
        
        // Format: 05 May, 2026 09:55 AM
        const day = date.getDate().toString().padStart(2, '0');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strTime = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

        return `${day} ${month}, ${year} - ${strTime}`;
    };

    export const formatDateWithYear = (dateString: string) => {
        const date = new Date(dateString);
        
        // Format: 05 May, 2026 09:55 AM
        const day = date.getDate().toString().padStart(2, '0');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();

        return `${day} ${month}, ${year}`;
    };