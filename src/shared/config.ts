export const minimumTemperature = -20;
export const maximumTemperature = 79;

export const METERS_TO_PIXELS = 200.0;
export const PIXELS_TO_METERS = 1 / METERS_TO_PIXELS;

export function toMeters(pixels: number) { return pixels * PIXELS_TO_METERS; }
export function toPixels(meters: number) { return meters * METERS_TO_PIXELS; }

export const ENTITY_INFO = {
    NEAR_FIRE: 1,
    NEAR_WORKBENCH: 2,
    WATER: 4,
    CAVE: 8,
}