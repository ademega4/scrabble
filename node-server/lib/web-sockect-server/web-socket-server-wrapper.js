"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
// The Definitive Guide to HTML5 WebSocket
// Example WebSocket server
// See The WebSocket Protocol for the official specification
// http://tools.ietf.org/html/rfc6455
var EventEmitter = require("events").EventEmitter;
var http = require("http");
var crypto = require("crypto");
var util = require("util");
var debug = require("debug")("websocket");
var generateRandomNumber = require("./utility").generateRandomNumber;
// opcodes for WebSocket frames
// http://tools.ietf.org/html/rfc6455#section-5.2
var opcodes = { TEXT: 1, BINARY: 2, CLOSE: 8, PING: 9, PONG: 10 };
var WebSocketConnection = /** @class */ (function (_super) {
    __extends(WebSocketConnection, _super);
    function WebSocketConnection(req, socket, upgradeHead) {
        var _this = _super.call(this) || this;
        var key = hashWebSocketKey(req.headers["sec-websocket-key"]);
        // handshake response
        // http://tools.ietf.org/html/rfc6455#section-4.2.2
        socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
            'Upgrade: WebSocket\r\n' +
            'Connection: Upgrade\r\n' +
            'sec-websocket-accept: ' + key +
            '\r\n\r\n');
        socket.on("data", function (buf) {
            _this.buffer = Buffer.concat([_this.buffer, buf]);
            while (_this._processBuffer()) {
                // process buffer while it contains complete frames
            }
        });
        socket.on("close", function (had_error) {
            console.log(_this._id, had_error);
            //
            clearInterval(_this.interval);
            _this.interval = null;
            _this.emit("close", 1006);
            _this.closed = true;
        });
        socket.on("error", function (error) {
            //if error occur and connection is not yet closed
            // if(!this.closed && this.interval){
            //   clearInterval(this.interval);
            // }
            _this.emit("error", error);
        });
        // initialize connection state
        _this.socket = socket;
        _this.buffer = new Buffer(0);
        _this.closed = false;
        //generate random number for debugging and use by client
        _this._id = generateRandomNumber(12);
        //keep connection alive
        _this._keepConnectionAlive();
        return _this;
    } //end constructor
    // Send a text or binary message on the WebSocket connection
    WebSocketConnection.prototype.send = function (obj) {
        if (this.closed) {
            throw new Error("Connection is closed");
        }
        var opcode;
        var payload;
        if (Buffer.isBuffer(obj)) {
            opcode = opcodes.BINARY;
            payload = obj;
        }
        else if (typeof obj == "string") {
            opcode = opcodes.TEXT;
            // create a new buffer containing the UTF-8 encoded string
            payload = new Buffer(obj, "utf8");
        }
        else {
            throw new Error("Cannot send object. Must be string or Buffer");
        }
        this._doSend(opcode, payload);
    }; //end send method
    // Close the WebSocket connection
    WebSocketConnection.prototype.close = function (code, reason) {
        //if already closed return
        if (this.closed)
            return;
        //stop sending heartbeat(keep alive ping)
        clearInterval(this.interval);
        //set to null
        this.interval = null;
        var opcode = opcodes.CLOSE;
        var buffer;
        // Encode close and reason
        if (code) {
            buffer = new Buffer(Buffer.byteLength(reason) + 2);
            buffer.writeUInt16BE(code, 0);
            buffer.write(reason, 2);
        }
        else {
            buffer = new Buffer(0);
        }
        this._doSend(opcode, buffer);
        this.closed = true;
    }; //end close function
    //keep client connection alive
    WebSocketConnection.prototype._keepConnectionAlive = function () {
        var _this = this;
        this.interval = setInterval(function () {
            if (_this.closed) {
                clearInterval(_this.interval);
                return;
            }
            debug("ping sent to client:" + _this._id + " for keep alive");
            _this._doSend(opcodes.PING, Buffer.from("keep alive"));
        }, (50 * 1000)); //prevoius value is 90 secs
    }; //end _keepConnectionAlive
    // Process incoming bytes
    WebSocketConnection.prototype._processBuffer = function () {
        var buf = this.buffer;
        if (buf.length < 2) {
            // insufficient data read
            return false;
        }
        var idx = 2;
        var b1 = buf.readUInt8(0);
        var fin = b1 & 0x80;
        var opcode = b1 & 0x0f; // low four bits
        var b2 = buf.readUInt8(1);
        var mask = b2 & 0x80;
        var length = b2 & 0x7f; // low 7 bits
        if (length > 125) {
            if (buf.length < 8) {
                // insufficient data read
                return false;
            }
            if (length == 126) {
                length = buf.readUInt16BE(2);
                idx += 2;
            }
            else if (length == 127) {
                // discard high 4 bits because this server cannot handle huge lengths
                var highBits = buf.readUInt32BE(2);
                if (highBits != 0) {
                    this.close(1009, "");
                }
                length = buf.readUInt32BE(6);
                idx += 8;
            }
        } //end if
        if (buf.length < (idx + 4 + length)) {
            // insufficient data read
            return false;
        }
        var maskBytes = buf.slice(idx, idx + 4);
        idx += 4;
        var payload = buf.slice(idx, idx + length);
        payload = unmask(maskBytes, payload);
        this._handleFrame(opcode, payload);
        this.buffer = buf.slice(idx + length);
        return true;
    }; //end method _processBuffer
    WebSocketConnection.prototype._handleFrame = function (opcode, buffer) {
        var payload = null;
        switch (opcode) {
            case opcodes.TEXT:
                payload = buffer.toString("utf8");
                this.emit("data", opcode, payload);
                break;
            case opcodes.BINARY:
                payload = buffer;
                this.emit("data", opcode, payload);
                break;
            case opcodes.PING:
                // Respond to pings with pongs
                this._doSend(opcodes.PONG, buffer);
                break;
            case opcodes.PONG:
                debug(buffer.toString());
                debug("received pong back from client :" + this._id);
                // Ignore pongs
                break;
            case opcodes.CLOSE:
                // Parse close and reason
                var code = void 0, reason = void 0;
                if (buffer.length >= 2) {
                    code = buffer.readUInt16BE(0);
                    reason = buffer.toString("utf8", 2);
                }
                this.close(code, reason);
                this.emit("close", code, reason);
                break;
            default:
                this.close(1002, "unknown opcode");
        } //end switch
    }; //end method _handleFrame
    WebSocketConnection.prototype._doSend = function (opcode, payload) {
        this.socket.write(encodeMessage(opcode, payload));
    }; //end method _doSend
    return WebSocketConnection;
}(EventEmitter)); //end class
var KEY_SUFFIX = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
function hashWebSocketKey(key) {
    var sha1 = crypto.createHash("sha1");
    sha1.update(key + KEY_SUFFIX, "ascii");
    return sha1.digest("base64");
}
function unmask(maskBytes, data) {
    var payload = new Buffer(data.length);
    for (var i = 0; i < data.length; i++) {
        payload[i] = maskBytes[i % 4] ^ data[i];
    }
    return payload;
}
function encodeMessage(opcode, payload) {
    var buf;
    // first byte: fin and opcode
    var b1 = 0x80 | opcode;
    // always send message as one frame (fin)
    // Second byte: mask and length part 1
    // Followed by 0, 2, or 8 additional bytes of continued length
    var b2 = 0; // server does not mask frames
    var length = payload.length;
    if (length < 126) {
        buf = new Buffer(payload.length + 2 + 0);
        // zero extra bytes
        b2 |= length;
        buf.writeUInt8(b1, 0);
        buf.writeUInt8(b2, 1);
        payload.copy(buf, 2);
    }
    else if (length < (1 << 16)) {
        buf = new Buffer(payload.length + 2 + 2);
        // two bytes extra
        b2 |= 126;
        buf.writeUInt8(b1, 0);
        buf.writeUInt8(b2, 1);
        // add two byte length
        buf.writeUInt16BE(length, 2);
        payload.copy(buf, 4);
    }
    else {
        buf = new Buffer(payload.length + 2 + 8);
        // eight bytes extra
        b2 |= 127;
        buf.writeUInt8(b1, 0);
        buf.writeUInt8(b2, 1);
        // add eight byte length
        // note: this implementation cannot handle lengths greater than 2^32
        // the 32 bit length is prefixed with 0x0000
        buf.writeUInt32BE(0, 2);
        buf.writeUInt32BE(length, 6);
        payload.copy(buf, 10);
    }
    return buf;
}
module.exports = function (server, connectionHandler, authenticationHandler) {
    if (authenticationHandler === void 0) { authenticationHandler = function (req) { return Promise.resolve({ success: true }); }; }
    server.on('upgrade', function (req, socket, upgradeHead) {
        //connectionHandler(ws, payload);
        //authenticate client
        authenticationHandler(req)
            .then(function (_a) {
            var success = _a.success, payload = _a.payload;
            debug(success, payload);
            //if authetication is successful
            if (success) {
                //connect 
                var ws = new WebSocketConnection(req, socket, upgradeHead);
                //call connection handler with web socket object
                connectionHandler(ws, payload);
            }
            else {
                //I don't know what code to send for failed authentication
                //i decided to use 1002 which is code for Protocol Error
                socket.statusCode = 401;
                socket.end();
            } //end else
        })
            .catch(function (error) {
            debug("authentication error", error);
            //just close with 1006 code, I don't know what code to use this
            //ws.close(1006);
            socket.statusCode = 501;
            socket.end("Server error");
        }); //end catch
    });
};
