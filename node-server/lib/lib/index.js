"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function stringfyData(eventType, payload) {
    return JSON.stringify([eventType, payload]);
}
exports.stringfyData = stringfyData;
function generateRandomNumber(len) {
    var code = (Math.random() * Math.random() * Math.random()).toString(32).replace(".", "");
    var codeLen = code.length;
    return (codeLen >= len ? (code.slice((codeLen - len), codeLen)) : (code + generateRandomNumber(len - codeLen)));
}
exports.generateRandomNumber = generateRandomNumber;
function getTokenFromHeader(req, key) {
    var token = "";
    if (req.cookies) {
        token = req.cookies[key];
    }
    else if (req.query) {
        token = req.query[key];
    }
    else if (req.body) {
        token = req.body[key];
    }
    else if (req.headers.cookie) {
        token = req.headers.cookie;
    }
    if (typeof (token) === "string") {
        token = token.trim();
    }
    return !!token ? token : "";
}
exports.getTokenFromHeader = getTokenFromHeader;
exports.CUSTOM_ERROR = "custom_error";
function randomNumber(min, max) {
    return Math.floor(max * Math.random()) + min;
}
exports.randomNumber = randomNumber;
