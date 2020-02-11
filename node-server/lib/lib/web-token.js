"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jwt = require("jsonwebtoken");
var generateRandomNumber = require("./index").generateRandomNumber;
var _a = process.__config, _b = _a.session, sessSecret = _b.sessSecret, authTokenExpiresIn = _b.authTokenExpiresIn, name = _a.server.name;
exports.default = {
    sign: function (payload, option) {
        if (option === void 0) { option = {}; }
        return new Promise(function (resolve, reject) {
            jwt.sign(payload, sessSecret, option, function (error, token) {
                if (error)
                    return reject(error);
                resolve(token);
            });
        });
    },
    verify: function (token, option) {
        if (option === void 0) { option = { ignoreExpiration: true }; }
        return new Promise(function (resolve, reject) {
            jwt.verify(token, sessSecret, option, function (error, payload) {
                if (error)
                    return reject(error);
                resolve(payload);
            });
        });
    },
    /**
     *
     * @param {number} sub user account id
     * @returns {string}
     */
    createToken: function (sub) {
        //create a new token for logged in user
        return this.sign({
            sub: sub,
            data: { csrf: generateRandomNumber(12) },
            iat: Math.floor(Date.now() / 1000),
            iss: name
        });
    },
    createAuthToken: function (sub, data) {
        return this.sign({
            sub: sub,
            data: data,
            iat: Math.floor(Date.now() / 1000),
            iss: name,
        }, { expiresIn: authTokenExpiresIn });
    }
};
