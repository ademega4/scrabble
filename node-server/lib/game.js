"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lib_1 = require("./lib");
var joinGameTimeout = process.__config.joinGameTimeout;
var Game = /** @class */ (function () {
    function Game(numPlayer, gameSessionID, deleteGame) {
        this.players = {};
        this.timeOutToJoinGame = setTimeout(function () {
            //if other player do not join the game within time out
            //the game will be deleted
            deleteGame(gameSessionID);
        }, joinGameTimeout);
        this.numPlayer = numPlayer;
    } //end constructor
    Game.prototype.addPlayer = function (ws) {
        var totalAddedPlayer = Object.keys(this.players.length).length;
        if (totalAddedPlayer !== this.numPlayer) {
            //delete time out to cancel game if offer were not accepted by other player
            this.players[ws.id] = new Player(ws);
        }
        //all player accepted the offer
        if ((totalAddedPlayer + 1) === this.numPlayer) {
            //clear time out to delete game since all player accepted offer
            clearTimeout(this.timeOutToJoinGame);
            //start game
        }
        //keep waiting for other to accept game offer
        //or delete game if time to accept is expired
        //end else
    }; //end method add player
    return Game;
}()); //end class game
var Player = /** @class */ (function () {
    function Player(ws) {
        this.ws = ws;
    }
    return Player;
}());
var Games = /** @class */ (function () {
    function Games() {
        this.gameStore = {};
    }
    Games.prototype.generateGameSessionID = function () {
        var sessionID = "";
        do {
            //generate game session id
            sessionID = lib_1.generateRandomNumber(8);
            //while session id is already in existence
            //generate new one
        } while (this.gameStore[sessionID]);
        return sessionID;
    };
    Games.prototype.addGame = function (gameSessionID, numPlayer) {
        var game = new Game(numPlayer, gameSessionID, this.deleteGame);
        this.gameStore[gameSessionID] = game;
        return game;
    };
    Games.prototype.getGame = function (gameSessionID) {
        return this.gameStore[gameSessionID];
    };
    Games.prototype.deleteGame = function (gameSessionID) {
        delete this.gameStore[gameSessionID];
    };
    return Games;
}());
exports.default = Games;
