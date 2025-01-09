declare module 'colorthief' {
    export default class ColorThief {
        static getColor(image: string | HTMLImageElement): Promise<number[]>;
        static getPalette(image: string | HTMLImageElement, colorCount?: number): Promise<number[][]>;
    }
} 