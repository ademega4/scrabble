"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Socket = /** @class */ (function () {
    function Socket(ws, username) {
        this.ws = ws;
        this.username = username;
    }
    return Socket;
}());
exports.default = Socket;
