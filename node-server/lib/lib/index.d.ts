import { Request } from 'express';
export declare function stringfyData<T>(eventType: string, payload: T): string;
export declare function generateRandomNumber(len: number): string;
export declare function getTokenFromHeader(req: Request, key: string): string;
export declare const CUSTOM_ERROR = "custom_error";
export declare function randomNumber(min: number, max: number): number;
