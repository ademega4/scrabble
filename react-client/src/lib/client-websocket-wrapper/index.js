
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var emitter_1 = __importDefault(require("./emitter"));
var WebSocketWrapper = /** @class */ (function (_super) {
    __extends(WebSocketWrapper, _super);
    function WebSocketWrapper() {
        var _this = _super.call(this) || this;
        _this.closed = false;
        _this.connection = null;
        _this.timeout = null;
        _this.totalReconnectionAttempt = 0;
        return _this;
    }
    WebSocketWrapper.prototype.connect = function (url, retryConnectionTimeoutInSecs, reConnectionAttempt, secure) {
        var _this = this;
        if (retryConnectionTimeoutInSecs === void 0) { retryConnectionTimeoutInSecs = 0; }
        if (reConnectionAttempt === void 0) { reConnectionAttempt = 5; }
        if (secure === void 0) { secure = false; }
        url = (url && url !== ""
            ? url
            : ((secure ? "wss" : "ws") + "://" + window.location.hostname + ":" + window.location.port));
        this.connection = new WebSocket(url);
        this.connection.addEventListener(WebSocketWrapper.EVENT_TYPE.OPEN, function (event) {
            //if currently set, it means client try to reconnect after disconnect from server
            if (_this.timeout) {
                //no need to retry again
                clearTimeout(_this.timeout);
            }
            //number of time client try to reconnect to the server
            _this.totalReconnectionAttempt = 0;
            //connection.send(msg.value);
            _this.emit(WebSocketWrapper.EVENT_TYPE.OPEN, event);
        });
        this.connection.addEventListener(WebSocketWrapper.EVENT_TYPE.CLOSE, function (event) {
            _this.emit(WebSocketWrapper.EVENT_TYPE.CLOSE, event);
            //if connection was lost and client didn't log him or her self out 
            //try to reconnect again
            if (retryConnectionTimeoutInSecs > 0 && !_this.closed && (reConnectionAttempt > 0 || reConnectionAttempt === -1) && !_this.timeout) {
                //increment number of time client try to reconnect
                _this.totalReconnectionAttempt++;
                //console.info("trying to reconnect...");
                _this.timeout = setTimeout(function () {
                    _this.connect(url, retryConnectionTimeoutInSecs, (reConnectionAttempt === -1 ? (reConnectionAttempt) : (reConnectionAttempt > 0 ? (reConnectionAttempt - 1) : 0)));
                    _this.timeout = null;
                }, (retryConnectionTimeoutInSecs * 1000));
            }
            _this.connection = null;
        });
        this.connection.addEventListener(WebSocketWrapper.EVENT_TYPE.ERROR, function (error) {
            _this.emit(WebSocketWrapper.EVENT_TYPE.ERROR, error);
        });
        //when message is sent from the server
        this.connection.addEventListener(WebSocketWrapper.EVENT_TYPE.MESSAGE, function (event) {
            var payload = null;
            var error = null;
            try {
                payload = JSON.parse(event.data);
            }
            catch (e) {
                error = e;
            }
            if (error) {
                _this.emit(WebSocketWrapper.EVENT_TYPE.MSG_ERROR, error);
            }
            else if (payload) {
                //the event type is at index 0 of payload array
                //the actuall data is at index 1
                _this.emit(payload[0], payload[1]);
            }
        });
        return this;
    }; //end function connect
    WebSocketWrapper.prototype.close = function (code, reason) {
        if (code === void 0) { code = 1000; }
        if (reason === void 0) { reason = ""; }
        //if in the process of reconnecting
        if (this.timeout) {
            //stop reconnecting cos client decided to log out
            clearTimeout(this.timeout);
            //set to null
            this.timeout = null;
        }
        if (this.connection) {
            this.connection.close(code, reason);
            this.connection = null;
        }
        //don't attempt to reconnect
        this.closed = true;
    }; //end close method
    WebSocketWrapper.prototype.send = function (eventType, data, receivers) {
        //if connection is still active
        if (this.connection && this.connection.readyState === WebSocket.OPEN) {
            //stringify message to send to server
            var payload = JSON.stringify([eventType, data, receivers]);
            //debug
            //send payload to server to be sent to receiver
            this.connection.send(payload);
        } //end if
        //if connection is closed throw error to caller
        else {
            throw new Error("Connection is closed");
        }
    };
    /**
     * @description return true if websocket connection is closed else return true
     */
    WebSocketWrapper.prototype.isClosed = function () {
        return this.connection && this.connection.readyState === WebSocket.OPEN ? false : true;
    };
    /**
     * @description get the number of time ws try to reconnect to the server
     */
    WebSocketWrapper.prototype.getTotalReconnectionAttempt = function () {
        return this.totalReconnectionAttempt;
    };
    WebSocketWrapper.READY_STATE = {
        CONNECTING: 0,
        OPEN: 1,
        CLOSING: 2,
        CLOSED: 3
    };
    // static readonly TYPE :{[index:string]:string} = {
    //   CLOSE:"close",
    //   ERROR:"error"
    // };
    WebSocketWrapper.EVENT_TYPE = {
        OPEN: "open",
        CLOSE: "close",
        ERROR: "error",
        MESSAGE: "message",
        MSG_ERROR: "0"
    };
    return WebSocketWrapper;
}(emitter_1.default)); //end class
exports.default = WebSocketWrapper;
