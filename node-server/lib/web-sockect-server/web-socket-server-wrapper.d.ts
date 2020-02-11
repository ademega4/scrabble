/// <reference types="node" />
declare const EventEmitter: any;
declare const http: any;
declare const crypto: any;
declare const util: any;
declare const debug: any;
declare const generateRandomNumber: any;
declare const opcodes: {
    TEXT: number;
    BINARY: number;
    CLOSE: number;
    PING: number;
    PONG: number;
};
declare class WebSocketConnection extends EventEmitter {
    constructor(req: any, socket: any, upgradeHead: any);
    send(obj: any): void;
    close(code: any, reason: any): void;
    _keepConnectionAlive(): void;
    _processBuffer(): boolean;
    _handleFrame(opcode: any, buffer: any): void;
    _doSend(opcode: any, payload: any): void;
}
declare const KEY_SUFFIX = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
declare function hashWebSocketKey(key: any): any;
declare function unmask(maskBytes: any, data: any): Buffer;
declare function encodeMessage(opcode: any, payload: any): Buffer;
