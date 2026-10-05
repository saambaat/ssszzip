export const videoUrl = (id: string): string => `https://i.imgur.com/${id}.mp4`;

export const posterUrl = (id: string): string => `https://i.imgur.com/${id}.jpg`;

const thumbSuffix = 'm';

export const thumbUrl = (id: string): string => `https://i.imgur.com/${id}${thumbSuffix}.jpg`;

export const pageUrl = (id: string): string => `https://imgur.com/${id}`;
