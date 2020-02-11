import Emitter from "./emitter";
export default class WebSocketWrapper extends Emitter {
    static readonly READY_STATE: {
        CONNECTING: number;
        OPEN: number;
        CLOSING: number;
        CLOSED: number;
    };
    static readonly EVENT_TYPE: {
        OPEN: string;
        CLOSE: string;
        ERROR: string;
        MESSAGE: string;
        MSG_ERROR: string;
    };
    closed: boolean;
    private connection;
    private timeout;
    private totalReconnectionAttempt;
    constructor();
    connect(url: string, retryConnectionTimeoutInSecs?: number, reConnectionAttempt?: number, secure?: boolean): this;
    close(code?: number, reason?: string): void;
    send<T>(eventType: string, data: T, receivers: string[]): void;
    /**
     * @description return true if websocket connection is closed else return true
     */
    isClosed(): boolean;
    /**
     * @description get the number of time ws try to reconnect to the server
     */
    getTotalReconnectionAttempt(): number;
}
