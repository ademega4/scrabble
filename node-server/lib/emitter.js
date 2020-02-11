"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Emitter = /** @class */ (function () {
    function Emitter() {
        this.handlerContainers = {};
    }
    Emitter.prototype.addEventListener = function (eventType, handler) {
        if (this.handlerContainers[eventType]) {
            this.handlerContainers[eventType].push(handler);
        }
        else {
            this.handlerContainers[eventType] = [handler];
        }
        return this;
    };
    Emitter.prototype.emit = function (eventType) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (Array.isArray(this.handlerContainers[eventType])) {
            for (var i = 0; i < this.handlerContainers[eventType].length; i++) {
                (this.handlerContainers[eventType][i]).apply(this, args);
            }
        }
    };
    Emitter.prototype.removeEventListener = function (eventType, handler) {
        if (Array.isArray(this.handlerContainers[eventType])) {
            this.handlerContainers[eventType] = this.handlerContainers[eventType].filter(function (h) { return h !== handler; });
        }
        return this;
    }; //end method removeEventListener
    return Emitter;
}());
exports.default = Emitter;
