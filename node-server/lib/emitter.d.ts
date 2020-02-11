export default class Emitter {
    private handlerContainers;
    constructor();
    addEventListener(eventType: string, handler: Function): this;
    emit(eventType: string, ...args: any[]): void;
    removeEventListener(eventType: string, handler: Function): this;
}
