//Season:

const TRACKING_STARTS = new Date(2026, 8, 21); 

export const SEASONS = {
    spring: { key: "spring", label: "Primavera", icon: "flower", color: "#F06292", mascotAsset: require("../assets/spring/images/flower.png") },
    summer: { key: "summer", label: "Verano", icon: "white-balance-sunny", color: "#FFB74D", mascotAsset: null },
    autumn: { key: "autumn", label: "Otoño", icon: "leaf", color: "#D2691E", mascotAsset: null },
    winter: { key: "winter", label: "Invierno", icon: "snowflake", color: "#4FC3F7", mascotAsset: null },
    };

    function seasonStartDates(year) {
    return {
        autumn: new Date(year, 2, 20), 
        winter: new Date(year, 5, 21), 
        spring: new Date(year, 8, 21), 
        summer: new Date(year, 11, 21), 
    };
    }

    export function getSeasonInfo(now = new Date()) {
    if (now < TRACKING_STARTS) {
        return {
        key: "spring",
        start: TRACKING_STARTS,
        end: new Date(2026, 11, 21),
        notStartedYet: true,
        };
    }

    const year = now.getFullYear();
    const prev = seasonStartDates(year - 1);
    const curr = seasonStartDates(year);
    const next = seasonStartDates(year + 1);

    const timeline = [
        { key: "summer", start: prev.summer },
        { key: "autumn", start: curr.autumn },
        { key: "winter", start: curr.winter },
        { key: "spring", start: curr.spring },
        { key: "summer", start: curr.summer },
        { key: "autumn", start: next.autumn },
    ];

    let currentIndex = 0;
    for (let i = 0; i < timeline.length; i++) {
        if (now >= timeline[i].start) currentIndex = i;
    }

    return {
        key: timeline[currentIndex].key,
        start: timeline[currentIndex].start,
        end: timeline[currentIndex + 1].start,
        notStartedYet: false,
    };
    }

    export function getNextSeasonKey(key) {
    const order = ["spring", "summer", "autumn", "winter"];
    const idx = order.indexOf(key);
    return order[(idx + 1) % order.length];
    }

    export const SEASON_PREP_BUFFER_DAYS = 7;

    export function getVisibleSeasonEnd(seasonInfo) {
    return new Date(seasonInfo.end.getTime() - SEASON_PREP_BUFFER_DAYS * 24 * 60 * 60 * 1000);
    }

    export function formatCountdown(target, now = new Date()) {
    const ms = Math.max(0, target.getTime() - now.getTime());
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    return { days, hours, minutes, done: ms <= 0 };
}