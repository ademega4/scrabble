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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = __importDefault(require("ws"));
var lib_1 = require("./lib");
var enum_1 = require("./lib/enum");
var emitter_1 = __importDefault(require("./emitter"));
var DIRECTION = { LEFT: 0, RIGHT: 1, TOP: 2, BOTTOM: 3 };
var TOTAL_TILE_PER_PLAYER = 7;
var TIMES_TO_SHUFFLE = 1000;
//90 SEC i.e 0 - 89
var CLOCK = 89;
//the center board index, the first player must place a tile on this board cell
var CENTER_BOARD_INDEX = "7|7";
var JOIN_GAME_TIMEOUT = 180;
/**
 * A-9, B-2, C-2, D-4, E-12, F-2, G-3, H-2, I-9, J-1, K-1, L-4, M-2, N-6, O-8, P-2, Q-1, R-6, S-4, T-6, U-4, V-2, W-2, X-1, Y-2, Z-1 and Blanks-2.
 *
 * (1 point)-A, E, I, O, U, L, N, S, T, R
 * (2 points)-D, G
 * (3 points)-B, C, M, P
 * (4 points)-F, H, V, W, Y
 * (5 points)-K
 * (8 points)- J, X
 * (10 points)-Q, Z
 * there suppose to be two empty tile, but i could not get a way to verify it yet,
 * cos it can be use to represent any letter. So I make the A tile 10 instead of 9 and E tile 13
 * instead of 12. I might come up with a way to verify words with blank tile later
 */
var wordDistribution = [
    ["A", 10, 1],
    ["B", 2, 3],
    ["C", 2, 3],
    ["D", 4, 2],
    ["E", 13, 1],
    ["F", 2, 4],
    ["G", 3, 2],
    ["H", 2, 4],
    ["I", 9, 1],
    ["J", 1, 8],
    ["K", 1, 5],
    ["L", 4, 1],
    ["M", 2, 3],
    ["N", 6, 1],
    ["O", 8, 1],
    ["P", 2, 3],
    ["Q", 1, 10],
    ["R", 6, 1],
    ["S", 4, 1],
    ["T", 6, 1],
    ["U", 4, 1],
    ["V", 2, 4],
    ["W", 2, 4],
    ["X", 1, 8],
    ["Y", 2, 4],
    ["Z", 1, 10],
];
//board representation
var scrabbleBoard = [
    ["TW", "", "", "DL", "", "", "", "TW", "", "", "", "DL", "", "", "TW"],
    ["", "DW", "", "", "", "TL", "", "", "", "TL", "", "", "", "DW", ""],
    ["", "", "DW", "", "", "", "DL", "", "DL", "", "", "", "DW", "", ""],
    ["DL", "", "", "DW", "", "", "", "DL", "", "", "", "DW", "", "", "DL"],
    ["", "", "", "", "DW", "", "", "", "", "", "DW", "", "", "", ""],
    ["", "TL", "", "", "", "TL", "", "", "", "TL", "", "", "", "TL", ""],
    ["", "", "DL", "", "", "", "DL", "", "DL", "", "", "", "DL", "", ""],
    ["TW", "", "", "DL", "", "", "", "CE", "", "", "", "DL", "", "", "TW"],
    ["", "", "DL", "", "", "", "DL", "", "DL", "", "", "", "DL", "", ""],
    ["", "TL", "", "", "", "TL", "", "", "", "TL", "", "", "", "TL", ""],
    ["", "", "", "", "DW", "", "", "", "", "", "DW", "", "", "", ""],
    ["DL", "", "", "DW", "", "", "", "DL", "", "", "", "DW", "", "", "DL"],
    ["", "", "DW", "", "", "", "DL", "", "DL", "", "", "", "DW", "", ""],
    ["", "DW", "", "", "", "TL", "", "", "", "TL", "", "", "", "DW", ""],
    ["TW", "", "", "DL", "", "", "", "TW", "", "", "", "DL", "", "", "TW"],
];
var generateRandomNumber = (function (min, max) { return (Math.floor(max * Math.random()) + min); });
function getTileBag() {
    //generate tiles for game
    var counter = 1;
    var id = "";
    var tileBag = {};
    //loop through all word distribution
    for (var i = 0; i < wordDistribution.length; i++) {
        //get let
        var _a = wordDistribution[i], letter = _a[0], freq = _a[1], point = _a[2];
        for (var c = 0; c < freq; c++) {
            id = (counter++).toString();
            //create tile based on frequency
            tileBag[id] = { letter: letter, point: point, id: id };
        } //end inner for loop
    } //end outer for loop
    return tileBag;
} //end function
/**
 * @description determine weather tile was place horizontally from left to right or vertically from top to bottom
 */
function getTilePlacementDirection(playedTileBoardCellPos) {
    //if board cell coordinate is less than 2 return default
    if (playedTileBoardCellPos.length < 2)
        return false;
    //get y axis or row value of the board the first tile was placed on
    var y1 = playedTileBoardCellPos[0].split("|")[0];
    //get y axis or row value of the board the second tile was placed on
    var y2 = playedTileBoardCellPos[1].split("|")[0];
    //if the y axis or row value are the same, the tile are placed horizontally
    return y1 === y2 ? true : false;
}
/**
 *
 * @description check to see if the placement of the tile follow a pattern of left to right or top to bottom
 */
function checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally) {
    //if a single tile was placed on the board return true
    if (playedTileBoardCellPos.length < 2)
        return true;
    //get the coordinate of the first tile
    var _a = playedTileBoardCellPos[0].split("|"), y1 = _a[0], x1 = _a[1];
    //get the coordinate of the second tile
    var _b = playedTileBoardCellPos[1].split("|"), y2 = _b[0], x2 = _b[1];
    //if there are two tile coordinate
    if (playedTileBoardCellPos.length === 2) {
        //if tile is placed horizontally y1 be the same as y2 else if vertically x1 will be the same as x2
        return tilePlacedHorizontally ? y1 === y2 : x1 === x2;
    }
    //loop through tile board coordinates
    for (var i = 2; i < playedTileBoardCellPos.length; i++) {
        //get tile coordinates
        var _c = playedTileBoardCellPos[i].split("|"), y = _c[0], x = _c[1];
        //if horizontally placed, y axis must be the same for all coordinates
        if (tilePlacedHorizontally) {
            if (y1 !== y)
                return false;
        }
        //if vertically placed, x axis must be the same for all coordinates
        else {
            if (x1 !== x)
                return false;
        }
    } //end for loop
    //atlast return true
    return true;
} //end function checkIfTileMoveIsCorrect
/**
 * @description get word from tile as well as tile ID
 * @param {string[]} playedWordTileIDsWithBoardCoord array of tile id with board position or coordinate
 *
 */
function getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord) {
    //store the played word
    var playedWord = [], 
    //store tile ID
    playedWordTileIDs = [];
    //loop through array
    playedWordTileIDsWithBoardCoord.forEach(function (tIDWithBoardCoordItem) {
        //the tIDWithBoardCoordItem is in this format tileID:y|x
        var tID = tIDWithBoardCoordItem.split(":")[0];
        //push letter to array
        playedWord.push(tileBag[tID].letter);
        //push tile id to array
        playedWordTileIDs.push(tID);
    }); //end foreach
    //return word and tile id back to caller
    return { playedWordTileIDs: playedWordTileIDs, playedWord: playedWord.join("") };
}
/**
 *
 * @description convert string in format tileID:y|x to object with tileID as key and board position as value
 */
function getPlayedTileIDAndBoardCoord(playedWordTileIDsWithBoardCoord) {
    //store current value
    var t = null;
    //
    var store = {};
    //loop through array
    for (var i = 0; i < playedWordTileIDsWithBoardCoord.length; i++) {
        //get current value
        t = playedWordTileIDsWithBoardCoord[i];
        //get tile ID and board coordinate
        var _a = t.split(":"), tID = _a[0], boardCoord = _a[1];
        store[tID] = boardCoord.split("|").map(function (axis) { return parseInt(axis.trim(), 10); });
    }
    return store;
} //end function
//const generateAUniqueID :()=>string = Math.random() * 
var tileBag = getTileBag();
var Game = /** @class */ (function (_super) {
    __extends(Game, _super);
    //private switchingPlayer :boolean = true;
    function Game(dictionary, numPlayer, gameSessionID) {
        var _this = _super.call(this) || this;
        _this.dictionary = dictionary;
        //store all players
        _this.players = [];
        //weather the game is in progress or we are still waiting for othe user to join game
        //user cannot join game that's already in progress
        _this.gameInProgress = false;
        //use to determine the next player to play
        _this.currentPlayTurn = 0;
        //store play timeout for each player, any player who does not submit play before
        //timeout elapse will forfeit his/her turn and score 0
        _this.playTimeoutIntervalID = null;
        _this.board = {};
        _this.clock = 0;
        _this.paused = false;
        _this.lastWords = [];
        _this.playedTileBoardCellPos = {};
        _this.isFirstPlay = true;
        _this.pauseToProcess = false;
        _this.timeOutToJoinGameID = setTimeout(function () {
            _this.broadcastToAll(enum_1.EVENT_TYPE.CANCEL_OFFER_TO_PLAY, { m: "Offer to play timeout" });
            //if other player do not join the game within time out
            //the game will be deleted
            Games.deleteGame(gameSessionID);
        }, (JOIN_GAME_TIMEOUT * 1000));
        _this.numPlayer = numPlayer;
        _this.gameSessionID = gameSessionID;
        _this.tileBag = _this.shuffleTiles(Object.values(tileBag));
        _this.addEventHandlerToGame();
        return _this;
    } //end constructor
    Game.prototype.isGameInProgress = function () {
        return this.gameInProgress;
    };
    Game.prototype.broadcastMsgToEveryoneExcept = function (wsID, eventType, payload) {
        //get player(s)
        var players = this.getPlayers();
        var currentWs = null;
        var stringifyPayload = lib_1.stringfyData(eventType, payload);
        for (var i = 0; i < players.length; i++) {
            currentWs = players[i].getWs();
            if (currentWs.id !== wsID && currentWs.OPEN === ws_1.default.OPEN) {
                currentWs.send(stringifyPayload);
            } //end if(currentWs.id !== ws.id)
        } //end for loop
    };
    Game.prototype.broadcastToAll = function (eventType, payload, callback) {
        if (callback === void 0) { callback = function () { }; }
        //get player(s)
        var players = this.getPlayers();
        var stringifyPayload = lib_1.stringfyData(eventType, payload);
        //loop thru all player
        for (var i = 0; i < players.length; i++) {
            var ws = players[i].getWs();
            if (ws.readyState === ws_1.default.OPEN) {
                ws.send(stringifyPayload, callback);
            }
        } //end for loop
    };
    Game.prototype.addPlayer = function (ws) {
        var totalAddedPlayer = this.getPlayers().length;
        if (totalAddedPlayer === this.numPlayer) {
            //delete time out to cancel game if offer were not accepted by other player
            throw getError("Can only add " + this.numPlayer);
        }
        //the id is the username of the player's websokect
        var prevPlayerIDs = this.getIDOfPlayers();
        //add game session to ws
        ws.gameSessionID = this.gameSessionID;
        //add ws to player object
        this.players.push(new Player(ws));
        //if all player accepted the offer, the added number represent the just added player
        if ((totalAddedPlayer + 1) === this.numPlayer) {
            //clear time out to delete game since all player accepted offer
            clearTimeout(this.timeOutToJoinGameID);
            this.startGame();
            //this.broadcastToAll(EVENT_TYPE.START_GAME, {});
        }
        else {
            //payload to be sent to all user who has join game before this user
            this.broadcastMsgToEveryoneExcept(ws.id, enum_1.EVENT_TYPE.JUST_JOINED_GAME, { u: ws.id });
            //send the username of all user who already join game to this new user who just join game
            ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.ALREADY_JOINED_GAME, { u: prevPlayerIDs }));
        }
    }; //end method add player
    Game.prototype.getPlayers = function () {
        return this.players;
    };
    Game.prototype.getIDOfPlayers = function () {
        var playerIDs = [];
        var players = this.getPlayers();
        for (var i = 0; i < players.length; i++) {
            playerIDs.push(players[i].getPlayerID());
        }
        return playerIDs;
    };
    Game.prototype.getPlayerByPlayerID = function (playerID) {
        return !!playerID ? this.players.find(function (p) { return p.getPlayerID() === playerID; }) : undefined;
    };
    Game.prototype.getGameSessionID = function () {
        return this.gameSessionID;
    };
    Game.prototype.getNumPlayers = function () {
        return this.numPlayer;
    };
    Game.prototype.pauseGame = function () {
        //set game pause to true
        this.paused = true;
        //broadcast to all player to pause game
        this.broadcastToAll(enum_1.EVENT_TYPE.PAUSE_GAME, {});
        //stop clock
        this.stopClock();
    };
    Game.prototype.resumeGame = function () {
        //resume game
        this.paused = false;
        //broadcast to all player that game is restarted
        this.broadcastToAll(enum_1.EVENT_TYPE.RESUME_GAME, {});
        //restart clock
        this.startClock();
    };
    Game.prototype.isGamePause = function () {
        return this.paused;
    };
    Game.prototype.destroy = function () {
        this.players.forEach(function (p) {
            p.getWs().gameSessionID = undefined;
        });
        this.removeEventListener(enum_1.EVENT_TYPE.MOVE_TILE, this.moveTile);
        this.removeEventListener(enum_1.EVENT_TYPE.SUBMIT_TILE, this.submitTile);
        this.removeEventListener(enum_1.EVENT_TYPE.PASS, this.onPass);
        this.removeEventListener(enum_1.EVENT_TYPE.SEARCH_DICT, this.onSearchDict);
    };
    Game.prototype.putPlayerBackInGame = function (playerWs, stillOfflinePlayers, callback) {
        var _this = this;
        var _a = this.getPlayerPayload(), genInfo = _a[0], tiles = _a[1], tick = _a[2];
        var boardWithTiles = Object.keys(this.board).reduce(function (pre, key) {
            pre[key] = tileBag[_this.board[key]];
            return pre;
        }, {});
        playerWs.send(lib_1.stringfyData(enum_1.EVENT_TYPE.I_JOIN_GAME_AFTER_DISCONNECT, [[genInfo, tiles[playerWs.id], tick], boardWithTiles, stillOfflinePlayers]), callback);
        if (stillOfflinePlayers.length > 0) {
            this.broadcastMsgToEveryoneExcept(playerWs.id, enum_1.EVENT_TYPE.PLAYER_DISCONNECT_DURING_GAME, stillOfflinePlayers);
        } //end if(stillOfflinePlayers.length > 0)
    };
    Game.prototype.startGame = function () {
        this.gameInProgress = true;
        //randomly pick the first player to start game
        this.currentPlayTurn = generateRandomNumber(0, this.getPlayers().length);
        //send game payload to all players
        //send data to client
        this.sendGamePayloadAndStartTimer(enum_1.EVENT_TYPE.START_GAME);
    };
    Game.prototype.sendGamePayload = function (eventType, callback) {
        var _a = this.getPlayerPayload(), genInfo = _a[0], tiles = _a[1], tick = _a[2];
        this.players.forEach(function (player) {
            var ws = player.getWs();
            if (ws.readyState === ws_1.default.OPEN) {
                ws.send(lib_1.stringfyData(eventType, [genInfo, tiles[ws.id], tick]), 
                //I need to pass callback , cos i want to ensure the message is sent to client
                //before starting game clock or timer
                callback);
            }
        });
    };
    /**
     * Tile can be place on the board from right to left, left to right, top to bottom or bottom to top.
     * It should only form a word from left to right or top to bottom, so I need to sort the board
     * coordinate since top most or left most will have a lower value when added together than the next
     * coordinate after it. It this function that does that.
     *
     * Also since the tile place must also form a word with existing tile on board, this function get all
     * those tile that touches the played tile(s)
     */
    Game.prototype.preparePlayedTileIDAndBoardCoord = function (allBoardTileIDAndCoord, tilePlacedHorizontally, rootTileID, row, column) {
        //store all tiles and their coordinates. This include the tiles played by current player as well 
        //the other existing tiles touched by current tile(s) to form played word.
        var playedWordTileIDsWithBoardCoord = [];
        //if tile is place horizontally i.e from left to right or vertically from top to bottom, 
        //I need to get all tiles on the left and right side of the first tile that player place 
        //on the board in this format tileID:y|x. I have to use this format cos I need to sort and 
        //I was not able to use object to do it
        if (tilePlacedHorizontally) {
            playedWordTileIDsWithBoardCoord = __spreadArrays(this.getTileIDWithBoardCoord(allBoardTileIDAndCoord, row, column, DIRECTION.LEFT), [
                rootTileID + ":" + row + "|" + column
            ], this.getTileIDWithBoardCoord(allBoardTileIDAndCoord, row, column, DIRECTION.RIGHT));
        }
        else {
            playedWordTileIDsWithBoardCoord = __spreadArrays(this.getTileIDWithBoardCoord(allBoardTileIDAndCoord, row, column, DIRECTION.TOP), [
                rootTileID + ":" + row + "|" + column
            ], this.getTileIDWithBoardCoord(allBoardTileIDAndCoord, row, column, DIRECTION.BOTTOM));
        } //end else
        //I need to sort to ensure the tile are placed in the correct order from left to right
        //or top to bottom. left most or top most tile will have lower value
        return playedWordTileIDsWithBoardCoord.sort(function (a, b) {
            //get board cell coordinate of where the tile was placed by user
            //don't need tile ID
            var _a = a.split(":"), coordA = _a[1];
            var _b = b.split(":"), coordB = _b[1];
            //I need to convert from string to number
            var _c = coordA.split("|").map(function (axis) { return parseInt(axis.trim(), 10); }), yA = _c[0], xA = _c[1];
            var _d = coordB.split("|").map(function (axis) { return parseInt(axis.trim(), 10); }), yB = _d[0], xB = _d[1];
            //add coordinate together to sort, board position with lowest value come first
            return (yA + xA) - (yB + xB);
        }); //end array sorting
    };
    /**
     *
     * @param {string[]} playedWordTileIDsWithBoardCoord the currently played tiles
     * @param {PlayedTileBoardCellPos} allBoardTileIDAndCoord all tile that later be on board
     * @param {boolean} tilePlacedHorizontally tile placement direction
     * @returns {boolean} whether the played tile form word with existing tiles on the board
     */
    Game.prototype.checkIfTileFormAWord = function (playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, tilePlacedHorizontally) {
        //convert the played tile to string in this format tileID:y|x because I need to sort it to get
        //the left most or top most tile
        var playedTileIDAndBoardCood = getPlayedTileIDAndBoardCoord(playedWordTileIDsWithBoardCoord);
        //get all the form played word
        var playedTileID = Object.keys(playedTileIDAndBoardCood);
        var tileID = "";
        for (var i = 0; i < playedTileID.length; i++) {
            tileID = playedTileID[i];
            var _a = playedTileIDAndBoardCood[tileID], row = _a[0], column = _a[1];
            var playedWord = getPlayedTileIDsAndWord(this.preparePlayedTileIDAndBoardCoord(allBoardTileIDAndCoord, tilePlacedHorizontally, tileID, row, column)).playedWord;
            if (playedWord.length > 1 && !this.dictionary.exist(playedWord))
                return false;
        } //end for loop
        return true;
    };
    Game.prototype.verifyUserTilesAndGetPlayedWord = function () {
        //get all board location where user place tiles
        var playedTileBoardCellPos = Object.keys(this.playedTileBoardCellPos);
        //get the total number of player's tile(s) 
        var playedTileBoardCellPosLen = playedTileBoardCellPos.length;
        //if empty i.e player did place any tile on the board, return early
        if (playedTileBoardCellPosLen <= 0)
            return { valid: false };
        //convert the first tile placed on board by player from string to number
        //this will act like a point of entry to check user tile input
        var _a = playedTileBoardCellPos[0].split("|").map(function (coord) { return parseInt(coord.trim(), 10); }), row = _a[0], column = _a[1];
        //get the id of the first tile played by user
        var rootTileID = this.playedTileBoardCellPos[playedTileBoardCellPos[0]];
        //if this is the first time submission take's place
        if (this.isFirstPlay) {
            //on first play,u have to play atleast two tiles to form a word
            if (playedTileBoardCellPosLen < 2)
                return { valid: false };
            //ensure player place a tile on the center of the board
            if (playedTileBoardCellPos.indexOf(CENTER_BOARD_INDEX) < 0) {
                return { valid: false };
            }
            //get tile placement direction,weather horizontally from left to right or vertically from 
            //top to bottom
            var tilePlacedHorizontally = getTilePlacementDirection(playedTileBoardCellPos);
            //check if move direction is ok
            //I need to ensure tile placement follow a pattern either horizonatl left to right or
            //vertically top to bottom
            if (checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally)) {
                //get user played tiles, cos its the first play, only get it from tiles played by user
                //the board will be empty. I do not place the played till on board until the tile are validated
                //and the word checked
                var playedWordTileIDsWithBoardCoord = this.preparePlayedTileIDAndBoardCoord(this.playedTileBoardCellPos, tilePlacedHorizontally, rootTileID, row, column);
                //convert the tiles to word as well as get tile id for calculating player score from point and
                //board position
                var _b = getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord), playedWordTileIDs = _b.playedWordTileIDs, playedWord = _b.playedWord;
                //check if the form word from tiles is correct
                var valid = this.dictionary.exist(playedWord);
                //return validity, played word and played tile id
                return { valid: valid, playedWord: playedWord, playedWordTileIDs: playedWordTileIDs };
            } //end if(checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally))
            return { valid: false };
        } //end if
        //I need to join all previously played tiles as well as current tiles being played by player
        var allBoardTileIDAndCoord = __assign(__assign({}, this.board), this.playedTileBoardCellPos);
        /**
         * this is where the bulk of the coding actually take place, cos if player play only one tile
         * from which direction should be tile be read?
         * I follow this step to determine which direction to read played the word from.
         * 1. Read from both direction i.e left to right (horizontally) and top to bottom (vertically).
         * 2. Check which of the word from the direction is valid, if one direction is valid that will be
         *    the accepted word. If both direction are valid move to step 3
         * 3. Check all previous tile on both side that the played join to. If all join words are are valid for one
         *    direction, the played word from that direction is accepted as the played wor. Else if the word from both
         *    directiion are valid, go to step 4
         * 4. Get score for the played tile in both direction, the word from direction with highest score is chosen
         *    as the played word
         */
        if (playedTileBoardCellPosLen === 1) {
            //use to store all neccessary dqata for both direction
            var output = {
                horizontal: { valid: false, playedWord: "", playedWordTileIDs: [] },
                vertical: { valid: false, playedWord: "", playedWordTileIDs: [] }
            };
            //Tile is assumed to be placed horizontally
            var playedWordTileIDsWithBoardCoord = this.preparePlayedTileIDAndBoardCoord(allBoardTileIDAndCoord, true, rootTileID, row, column);
            //if the tile touch other tiles on the board join tile id should be more than the played tiles
            if (playedWordTileIDsWithBoardCoord.length > 1) {
                var _c = getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord), playedWordTileIDs = _c.playedWordTileIDs, playedWord = _c.playedWord;
                output.horizontal = { playedWord: playedWord, playedWordTileIDs: playedWordTileIDs, valid: this.dictionary.exist(playedWord) };
            } //end if(playedTileIDs.length <= playedTileBoardCellPosLen)
            //Tile is assumed to be placed vertically
            playedWordTileIDsWithBoardCoord = this.preparePlayedTileIDAndBoardCoord(allBoardTileIDAndCoord, false, rootTileID, row, column);
            if (playedWordTileIDsWithBoardCoord.length > 1) {
                var _d = getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord), playedWordTileIDs = _d.playedWordTileIDs, playedWord = _d.playedWord;
                output.vertical = { playedWord: playedWord, playedWordTileIDs: playedWordTileIDs, valid: this.dictionary.exist(playedWord) };
            } //end if
            //if both word from all the direction are valid
            if (output.horizontal.valid && output.vertical.valid) {
                //check if tile form a word from both direction, if word is assume to be place horizontally
                //it check all word above and below each tile that form the word that is why i have to pass false
                //as the third argument.
                output.horizontal.valid = this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, false);
                //check if tile form a word from both direction, if word is assume to be place vertically
                //it check all word left side and right side each tile that form the word that is why i have to 
                //pass true as the third argument
                output.vertical.valid = this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, true);
                //if tiles still form a word with previous tile on the board
                //I break the deadlock by calculating the score from the word from both direction
                //and choose the word with highest score
                if (output.horizontal.valid && output.vertical.valid) {
                    //get value of the scrabble board where tile is placed
                    var boardValue = scrabbleBoard[row][column].trim();
                    //get the point for the tile
                    var point = tileBag[rootTileID].point;
                    var wordMultiplier = 1;
                    var score = 0;
                    if (boardValue === "TW") {
                        wordMultiplier = 3;
                    }
                    else if (boardValue === "DW") {
                        wordMultiplier = 2;
                    }
                    else if (boardValue === "DL") {
                        score += point * 2;
                    }
                    else if (boardValue === "TL") {
                        score += point * 3;
                    }
                    var hScore_1 = score, vScore_1 = score;
                    output.horizontal.playedWordTileIDs.forEach(function (tID) {
                        if (tID !== rootTileID) {
                            hScore_1 += tileBag[tID].point;
                        }
                    });
                    output.vertical.playedWordTileIDs.forEach(function (tID) {
                        if (tID !== rootTileID) {
                            vScore_1 += tileBag[tID].point;
                        }
                    });
                    hScore_1 *= wordMultiplier;
                    vScore_1 *= wordMultiplier;
                    return hScore_1 > vScore_1 ? output.horizontal : output.vertical;
                } //end if(output.horizontal.valid && output.vertical.valid)
                else if (output.horizontal.valid)
                    return output.horizontal;
                else if (output.vertical.valid)
                    return output.vertical;
            }
            //if word is placed horizontally and the word exist
            else if (output.horizontal.valid) {
                //check to ensure the other word the tile touches actually form a word
                if (this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, false)) {
                    return output.horizontal;
                } //end if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, false))
            }
            else if (output.vertical.valid) {
                if (this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, true)) {
                    return output.vertical;
                } //end if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, true))
            }
            return { valid: false };
        }
        //I should be able to get direction since user play more than 1 tiles
        else {
            //get tile placement direction
            var tilePlacedHorizontally = getTilePlacementDirection(playedTileBoardCellPos);
            //check if move direction is ok
            if (checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally)) {
                //get all tiles that form the word on boardin this format tileID:y|x
                var playedWordTileIDsWithBoardCoord = this.preparePlayedTileIDAndBoardCoord(allBoardTileIDAndCoord, tilePlacedHorizontally, rootTileID, row, column);
                //if the tile touch other tiles on the board, join tile id should be more than the played tiles
                if (playedWordTileIDsWithBoardCoord.length <= playedTileBoardCellPosLen) {
                    return { valid: false };
                } //end if(playedTileIDs.length <= playedTileBoardCellPosLen)
                var _e = getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord), playedWordTileIDs = _e.playedWordTileIDs, playedWord = _e.playedWord;
                //check if word is valid
                var valid = this.dictionary.exist(playedWord);
                if (!valid)
                    return { valid: valid };
                //ensure played tiles form word with previous tile currently on the board
                if (this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, !tilePlacedHorizontally)) {
                    return { valid: valid, playedWord: playedWord, playedWordTileIDs: playedWordTileIDs };
                } //end if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, !tilePlacedHorizontally))
            } //end if(checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally))
        } //end else
        return { valid: false };
    };
    /**
     * @description get all tile(s) and their board position or coordinate that form player played word
     * @param {PlayedTileBoardCellPos} from - from which object store
     * @param {number} row starting from which row or y-axis
     * @param {number} column starting from which column or x-axis
     * @param {number} direction can be left, right, top or bottom
     * @returns {string[]} return array of tiles and their board position or coordinate in this format tileID:y|x
     */
    Game.prototype.getTileIDWithBoardCoord = function (from, row, column, direction) {
        //store the array of tiles and their board position or coordinate in this format tileID:y|x
        var tileIDWithBoardCoord = [];
        //store current tile ID
        var tID = "";
        //continue looping
        while (true) {
            //get row value
            //if moving to the top from current row value decrement else if bottom increment else default to row
            //value
            row = direction === DIRECTION.TOP ? --row : direction === DIRECTION.BOTTOM ? ++row : row;
            //get column value
            //if moving to the left from current column value decrement else if right increment else default 
            //to column value
            column = direction === DIRECTION.LEFT ? --column : direction === DIRECTION.RIGHT ? ++column : column;
            //if value is within board boundary
            if (row > -1 && column > -1 && row < scrabbleBoard.length && column < scrabbleBoard.length) {
                //get tile ID from board or current played tile value
                tID = from[row + "|" + column];
                //if tile exist and not undefined
                if (tID) {
                    //push to array
                    tileIDWithBoardCoord.push(tID + ":" + row + "|" + column);
                } //end if
                //reach end break out 
                else {
                    break;
                }
            } //end if(row > -1 && column > -1 && row < scrabbleBoard.length && column < scrabbleBoard.length)
            //reach end of board break out
            else {
                break;
            }
        } //end while loop
        //return 
        return tileIDWithBoardCoord;
    };
    Game.prototype.getCurrentPlayer = function () {
        var player = this.players[this.currentPlayTurn];
        if (!player)
            throw new Error("player whose current turn is " + this.currentPlayTurn + " cannot be undefined");
        return player;
    };
    /**
     * Determine if game is over. Game is over when tile bag is empty and players pass twice
     * or a player plays all his or her tiles
     */
    Game.prototype.checkIfGameShouldBeOver = function () {
        //if tile bag is empty
        if (this.tileBag.length <= 0) {
            //get all players
            var players = this.getPlayers();
            //store pass count foreach player
            var passCountForAllPlayer = 0;
            for (var i = 0; i < players.length; i++) {
                if (players[i].getTotalTileInRank() === 0) {
                    return true;
                } //end if
                else if (players[i].getPassCount() === 2) {
                    passCountForAllPlayer += 1;
                } //end else if
            } //end for loop
            if (passCountForAllPlayer === this.numPlayer) {
                return true;
            }
        } //end if
        return false;
    }; //end private function
    /**
     * calculate player final score, by subracting total of player' unplay score from totalscore
     * and adding it to player with empty rack if any.
     */
    Game.prototype.calculateFinalScore = function () {
        //get all players invoved in game
        var players = this.getPlayers();
        //store current player in iteration
        var currentPlayer;
        //store player whose rack is empty when the is over
        var playerWithEmptyRack = null;
        //store the total point of all other players unplay t
        var totalOfAllPlayerUnplayedTilesPoint = 0;
        var _loop_1 = function (i) {
            //store curent player at index i
            currentPlayer = players[i];
            //get total tile in rack when the game is over
            if (currentPlayer.getTotalTileInRank() === 0) {
                //store for later use, cos i need to add all other player unplay tile to
                //this player's point
                playerWithEmptyRack = currentPlayer;
            }
            else {
                //store all player unplay tile point
                var totalUnplayedTilePoint_1 = 0;
                //loop thru player tile
                currentPlayer.getTiles().forEach(function (tile) {
                    //add tile point
                    totalUnplayedTilePoint_1 += tile.point;
                }); //end foreach
                //decrement current player score by total unplay tile point
                currentPlayer.setScore(currentPlayer.getScore() - totalUnplayedTilePoint_1);
                //add previous player unplay tile point
                totalOfAllPlayerUnplayedTilesPoint += totalUnplayedTilePoint_1;
            }
        };
        //loop through all players object
        for (var i = 0; i < players.length; i++) {
            _loop_1(i);
        } //end for loop
        //if there is a player with empty rack when game is over
        if (playerWithEmptyRack) {
            //add total point of the players with unplay tile
            playerWithEmptyRack.setScore(playerWithEmptyRack.getScore() + totalOfAllPlayerUnplayedTilesPoint);
        } //end if
        //return position base on score
        return players
            .map(function (p) { return ({ score: p.getScore(), name: p.getPlayerID() }); })
            .sort(function (p1, p2) { return (p2.score - p1.score); });
    }; //end private method
    Game.prototype.sendGamePayloadAndStartTimer = function (eventType) {
        var _this = this;
        if (this.checkIfGameShouldBeOver()) {
            //I need to destroy game after the game is over
            //I should only do this after the final score as been sent to all player
            //hence the need for this callback
            //keep tab of the number of player to which final score has been sent
            var counter_1 = 0;
            var callback = function () {
                //after the final score has been sent to all players, delete game
                if ((++counter_1) === _this.players.length)
                    Games.deleteGame(_this.gameSessionID);
            };
            this.broadcastToAll(enum_1.EVENT_TYPE.GAME_OVER, { f: this.calculateFinalScore() }, callback);
            //
        }
        else {
            var counter_2 = 0;
            //I need to start clock only after all messag has been sent to client
            var callback = function () {
                if (++counter_2 === _this.players.length) {
                    //start time out for current player
                    _this.startClock();
                } //end if
            };
            this.sendGamePayload(eventType, callback);
        } //end else
    };
    Game.prototype.isCurrentPlayer = function (playerID) {
        return (this.getIDOfPlayers())[this.currentPlayTurn] === playerID;
    };
    Game.prototype.moveTile = function (ws, data) {
        //ensure its the current player that is sending the event
        if (!this.isCurrentPlayer(ws.id) || this.isGamePause() || this.pauseToProcess)
            return;
        //store the new data to be transmitted to other player
        var newData = { prevTileBoardPos: data.prevTileBoardPos };
        //ensure the tile was moved before sending to other players
        var moveTile = true;
        //if tile is being returned to rack all this variable will be null
        //the variable will be defined if tile is being move around from rack to board or around the board
        if (data.tID && Number.isInteger(data.x) && Number.isInteger(data.y)) {
            //ensure the board is not currently occupied by another tile
            if (!(this.playedTileBoardCellPos[data.y + "|" + data.x])
                || (this.playedTileBoardCellPos[data.prevTileBoardPos] === data.tID)) {
                //get tile with tile iD
                var tile = tileBag[data.tID];
                //if till is not undefined
                if (tile) {
                    newData.tile = tile;
                    newData.x = data.x;
                    newData.y = data.y;
                    //set tile id
                    this.playedTileBoardCellPos[data.y + "|" + data.x] = data.tID;
                } //end if(tile)
            } //end if(!(this.playedTileBoardCellPos[`${data.y}|${data.x}`]))
            //tile is already occupied
            else {
                //ensure that we don't transmit to the other side to move tiles
                moveTile = false;
                //notify the player that the cell is already occupied
                ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.BOARD_CELL_OCCUPIED, {}));
            } //end else
        } //end if(data.tID && Number.isInteger(data.x) && Number.isInteger(data.y))
        //send to all position except sender
        if (moveTile) {
            //delete previous position value
            delete this.playedTileBoardCellPos[data.prevTileBoardPos];
            //broadcast to other player
            this.broadcastMsgToEveryoneExcept(ws.id, enum_1.EVENT_TYPE.MOVE_TILE, newData);
        } //end if
    };
    Game.prototype.submitTile = function (ws) {
        //ensure its the current player that is sending the event
        if (!this.isCurrentPlayer(ws.id) || this.isGamePause() || this.pauseToProcess)
            return;
        this.pauseToProcess = true;
        //get current player 
        var player = this.getCurrentPlayer();
        //verify user tile input. Ensure client tile input actually form a word
        var _a = this.verifyUserTilesAndGetPlayedWord(), valid = _a.valid, playedWord = _a.playedWord, playedWordTileIDs = _a.playedWordTileIDs;
        //verify user tiles stored in this.playedTileBoardCellPos
        if (valid && playedWord && playedWordTileIDs) {
            //stop clock
            this.stopClock();
            var score = this.scorePlayerAndStoreWordOnTheBoard(playedWordTileIDs);
            //set score
            player.setScore(player.getScore() + score);
            //we only show last five word of all the player
            if (this.lastWords.length > 4) {
                this.lastWords = this.lastWords.slice(0, 4);
            } //end if
            //put at the front
            this.lastWords.unshift({
                point: score,
                word: playedWord,
                player: player.getPlayerID(),
                score: player.getScore()
            });
            //get current player
            var currentPlayer = this.getCurrentPlayer();
            //remove all played tiles
            currentPlayer.removeTile(Object.values(this.playedTileBoardCellPos));
            //next player
            this.sendGamePayloadAndStartTimer(enum_1.EVENT_TYPE.NEXT_TURN);
        } //end if(this.verifyUserTiles())
        //if error in user tile placement on board
        else {
            var playerWs = player.getWs();
            //notify player that he or she enter invalid tile
            playerWs.send(lib_1.stringfyData(enum_1.EVENT_TYPE.TILE_INPUT_ERROR, {}));
            //remove the played tile from other player(s) board
            this.broadcastMsgToEveryoneExcept(playerWs.id, enum_1.EVENT_TYPE.REMOVE_TILE_FROM_BOARD, Object.keys(this.playedTileBoardCellPos));
            //player is yet to play, so i need to initialize this to empty object
            this.playedTileBoardCellPos = {};
            this.pauseToProcess = false;
        } //end else
    };
    Game.prototype.incrementPassCountIfTileBagIsEmpty = function () {
        //if tile bag is empty and player pass then we need to increment player pass
        //to decide when game is over
        if (this.tileBag.length <= 0) {
            this.getCurrentPlayer().incrementPassCount();
        } //end if
    };
    Game.prototype.onPass = function (ws) {
        //ensure its the current player that is sending the event
        if (!this.isCurrentPlayer(ws.id) || this.isGamePause() || this.pauseToProcess)
            return;
        this.pauseToProcess = true;
        //stop clock
        this.stopClock();
        //need this to determine when game is over
        this.incrementPassCountIfTileBagIsEmpty();
        //const currentPlayerID = this.getCurrentPlayer().getPlayerID();
        //notify other player that this player pass
        this.broadcastToAll(enum_1.EVENT_TYPE.PASS, { msg: this.getCurrentPlayer().getPlayerID() + " passed", b: Object.keys(this.playedTileBoardCellPos) });
        //send payload for next player to start play
        this.sendGamePayloadAndStartTimer(enum_1.EVENT_TYPE.NEXT_TURN);
    };
    Game.prototype.onSearchDict = function (ws, data) {
        //search for all word that match substring
        var wordMatch = this.dictionary.getAllWordThatMatchSubtr(data.w);
        //store the word with the search substr removed, i'll join the word back 
        //on client. Am doing this to reduce the amount of data dat's going to the other side.
        var store = [];
        //loop through match words.I want to remove the search substring to reduce the amount of data
        //that'll be sent across the wire
        var wordAtIndexI = "", searchSubstrLen = data.w.length - 1;
        for (var i = 0; i < wordMatch.length; i++) {
            wordAtIndexI = wordMatch[i];
            store.push(wordAtIndexI.slice(searchSubstrLen));
        }
        //send response back to client
        //I need to send back the search word so client can determine which to use
        //on multiple search
        ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.SEARCH_DICT, { w: data.w, l: store.join(".") }));
    }; //end method
    Game.prototype.addEventHandlerToGame = function () {
        this.addEventListener(enum_1.EVENT_TYPE.MOVE_TILE, this.moveTile);
        this.addEventListener(enum_1.EVENT_TYPE.SUBMIT_TILE, this.submitTile);
        this.addEventListener(enum_1.EVENT_TYPE.PASS, this.onPass);
        this.addEventListener(enum_1.EVENT_TYPE.SEARCH_DICT, this.onSearchDict);
    };
    Game.prototype.scorePlayerAndStoreWordOnTheBoard = function (playedWordTileIDs) {
        var _this = this;
        var score = 0;
        var wordMultiplier = [];
        var tile = null, boardValue = "";
        var tileCounter = 0;
        var tempStore = {};
        Object.keys(this.playedTileBoardCellPos).forEach(function (boardCellCoord) {
            tempStore[_this.playedTileBoardCellPos[boardCellCoord]] = boardCellCoord;
        });
        var boardCellCoord = "";
        playedWordTileIDs.forEach(function (tID) {
            tileCounter += 1;
            boardCellCoord = tempStore[tID];
            //get tile
            tile = tileBag[tID];
            if (boardCellCoord) {
                var _a = boardCellCoord.split("|").map(function (coord) { return parseInt(coord.trim(), 10); }), row = _a[0], column = _a[1];
                //get value of the scrabble board where tile is placed
                boardValue = scrabbleBoard[row][column].trim();
                switch (boardValue) {
                    case "TW":
                        score += tile.point;
                        wordMultiplier.push(3);
                        break;
                    case "DW":
                    case "CE":
                        score += tile.point;
                        wordMultiplier.push(2);
                        break;
                    case "TL":
                        score += tile.point * 3;
                        break;
                    case "DL":
                        score += tile.point * 2;
                        break;
                    default:
                        score += tile.point;
                        break;
                } //end switch
                //position tile permanently on board
                _this.board[boardCellCoord] = tID;
            } //end if(boardCellCoord)
            else {
                score += tile.point;
            } //end else
        }); //end foreach
        wordMultiplier.forEach(function (val) { return (score *= val); });
        //if the player use all 7 the tiles, 50 point bonus is added
        if (tileCounter === TOTAL_TILE_PER_PLAYER) {
            score += 50;
        } //end if(words.length === TOTAL_TILE_PER_PLAYER)
        return score;
    }; //end method
    Game.prototype.stopClock = function () {
        if (this.playTimeoutIntervalID) {
            clearInterval(this.playTimeoutIntervalID);
        }
    };
    Game.prototype.startClock = function () {
        var _this = this;
        this.playTimeoutIntervalID = setInterval(function () {
            _this.clock = _this.clock - 1;
            //determine if player timeout expire
            if (_this.clock < 0) {
                //cancel timeout and score player 0 since player refuse 
                //to play till timeout expire
                if (_this.playTimeoutIntervalID) {
                    clearInterval(_this.playTimeoutIntervalID);
                    _this.playTimeoutIntervalID = null;
                    //needed to determine when game is over
                    _this.incrementPassCountIfTileBagIsEmpty();
                    //notify all other player's that current player passed, cos the player
                    //didn't make a move till the clock expiry
                    _this.broadcastToAll(enum_1.EVENT_TYPE.PASS, {
                        msg: _this.getCurrentPlayer().getPlayerID() + " passed",
                        b: Object.keys(_this.playedTileBoardCellPos)
                    });
                    _this.sendGamePayloadAndStartTimer(enum_1.EVENT_TYPE.NEXT_TURN);
                } //end if
            } //end 
            else {
                //emit interval reduction to all client
                _this.broadcastToAll(enum_1.EVENT_TYPE.CLOCK_TICK, { t: _this.clock });
            }
        }, 1000);
        this.pauseToProcess = false;
    };
    Game.prototype.shuffleTiles = function (tileBag) {
        //shuffle tile here
        var totalTileInBag = tileBag.length;
        //temporarily hold tile till swap complete
        var temp = null;
        //loop 
        for (var d = 0; d < TIMES_TO_SHUFFLE; d++) {
            //get random index between 0 and total in tiles bag
            var indexToSwap = generateRandomNumber(0, totalTileInBag);
            //ensure we do access index beyond length of the array
            var positionToSwap = (d % totalTileInBag);
            //store in temp variable
            temp = tileBag[positionToSwap];
            //replace tile in position with randomly generated tile
            tileBag[positionToSwap] = tileBag[indexToSwap];
            //save temp tile at previous position
            tileBag[indexToSwap] = temp;
        } //end for loop
        return tileBag;
    }; //end private method
    Game.prototype.getNextToPlayPlayerID = function () {
        var playerIDs = this.getIDOfPlayers();
        this.currentPlayTurn += 1;
        if (this.currentPlayTurn === playerIDs.length) {
            this.currentPlayTurn = 0;
        }
        return playerIDs[this.currentPlayTurn];
    };
    Game.prototype.getTilesForPlayer = function (player) {
        //store tile
        var tiles = [];
        for (var i = 0; i < (TOTAL_TILE_PER_PLAYER - player.getTotalTileInRank()); i++) {
            //get tile
            var t = this.tileBag.shift();
            //if bag is not empty tile will not be undefine
            if (t) {
                //push to tile array
                tiles.push(t);
            } //end if
            else {
                break;
            }
        } //end for loop
        //if new tiles is added to players tile
        if (tiles.length > 0) {
            //add the new tiles
            player.setTiles(tiles);
        } //end if
        //return tiles
        return player.getTiles();
    }; //end private method
    Game.prototype.getPlayerPayload = function () {
        //store data that'll be sent to all player
        var players = [];
        //store the current player object
        var currentPlayer = null;
        var tiles = {};
        //loop through player array to gather all neccessary info
        for (var i = 0; i < this.players.length; i++) {
            //get current player
            currentPlayer = this.players[i];
            //get player username
            var username = currentPlayer.getPlayerID();
            //
            players.push({ username: username, score: currentPlayer.getScore() });
            //store tile for this user
            tiles[username] = this.getTilesForPlayer(currentPlayer);
        } //end for loop
        //set clock here
        //if game is not paused and this method is called set to clock else set
        //to current clock
        this.clock = this.paused ? this.clock : CLOCK;
        //initialize to start storing for tiles being played by next player
        this.playedTileBoardCellPos = this.paused ? this.playedTileBoardCellPos : {};
        //if this function is being called for the first time or the first player
        //to play passed the board will be empty. I need to know this to ensure
        //the first player to play place a tile on the centre of the board
        this.isFirstPlay = this.isFirstPlay ? (Object.keys(this.board).length < 1) : this.isFirstPlay;
        //gather all payload to be sent to client
        return [
            {
                currentPlayerID: (this.isGamePause()
                    ? this.getCurrentPlayer().getPlayerID()
                    : this.getNextToPlayPlayerID()),
                lastWords: this.lastWords,
                players: players,
                totalTileInBag: this.tileBag.length,
            },
            tiles,
            //start clock at 59
            this.clock,
        ];
        //start counting
    }; //end method
    /**
     *
     * (1 point)-A, E, I, O, U, L, N, S, T, R
     * (2 points)-D, G
     * (3 points)-B, C, M, P
     * (4 points)-F, H, V, W, Y
     * (5 points)-K
     * (8 points)- J, X
     * (10 points)-Q, Z
     */
    Game.prototype.getPoint = function (tileLetter) {
        switch (tileLetter.toLocaleUpperCase()) {
            case "A":
            case "E":
            case "I":
            case "O":
            case "U":
            case "L":
            case "N":
            case "S":
            case "T":
            case "R":
                return 1;
            case "D":
            case "G":
                return 2;
            case "B":
            case "C":
            case "M":
            case "P":
                return 3;
            case "F":
            case "H":
            case "V":
            case "W":
            case "Y":
                return 4;
            case "K":
                return 5;
            case "J":
            case "X":
                return 8;
            case "Q":
            case "Z":
                return 10;
            default:
                return 0;
        }
        ;
    }; //end method
    return Game;
}(emitter_1.default)); //end class game
var Player = /** @class */ (function () {
    function Player(ws) {
        this.score = 0;
        this.tiles = [];
        this.passCount = 0;
        this.ws = ws;
    }
    Player.prototype.getTiles = function () {
        return this.tiles;
    };
    Player.prototype.setTiles = function (newTiles) {
        this.tiles = this.tiles.concat(newTiles);
    }; //end
    Player.prototype.removeTile = function (tileID) {
        if (Array.isArray(tileID)) {
            this.tiles = this.tiles.filter(function (t) { return tileID.indexOf(t.id) < 0; });
        }
        else {
            this.tiles = this.tiles.filter(function (t) { return t.id !== tileID; });
        }
    };
    Player.prototype.addTile = function (tile) {
        this.tiles.push(tile);
    };
    Player.prototype.replaceWs = function (ws) {
        this.ws = ws;
    };
    Player.prototype.getWs = function () {
        return this.ws;
    };
    Player.prototype.incrementScore = function (increment) {
        this.score += increment;
    };
    Player.prototype.getScore = function () {
        return this.score;
    };
    Player.prototype.setScore = function (score) {
        this.score = score;
    };
    Player.prototype.getTotalTileInRank = function () {
        return this.tiles.length;
    };
    Player.prototype.getPlayerID = function () {
        return this.ws.id;
    };
    Player.prototype.incrementPassCount = function () {
        this.passCount++;
    };
    Player.prototype.getPassCount = function () {
        return this.passCount;
    };
    return Player;
}());
var getError = function (msg) {
    var error = new Error("Player cannot not be involved in two game at onces");
    error.name = lib_1.CUSTOM_ERROR;
    return error;
};
var Games = /** @class */ (function () {
    function Games() {
    }
    Games.init = function (dict, emitter) {
        //initialize dict
        Games.dict = dict;
        //add event to ws close
        emitter.addEventListener("close", function onClose(ws) {
            //if ws as game session id then, the player is either waiting for other player to join game
            //or is already playing game
            var gameSessionID = ws.gameSessionID;
            var playerID = ws.id;
            if (gameSessionID) {
                var game = Games.getGameByGameSessionID(gameSessionID);
                if (game) {
                    if (game.isGameInProgress()) {
                        //store player id in disconnect store 
                        Games.addPlayerIDToDisconnectGameStore(gameSessionID, playerID);
                        //notify all player except player with this ws that a particular player just disconnect and waiting for
                        //the client to come back online
                        game.broadcastMsgToEveryoneExcept(ws.id, enum_1.EVENT_TYPE.PLAYER_DISCONNECT_DURING_GAME, Games.getDisconnectedPlayerIDByGameSessionID(gameSessionID));
                        //pause game
                        game.pauseGame();
                    }
                    else {
                        //notify other user that this user just loose connection so game cannot continue
                        //Games.gameStore[ws.gameSessionID] = null;
                        game.broadcastMsgToEveryoneExcept(ws.id, enum_1.EVENT_TYPE.PLAYER_DISCONNECT_BEFORE_START, playerID);
                        Games.deleteGame(gameSessionID);
                    }
                } //end if
            }
        });
        emitter.addEventListener("open", function (ws) {
            //get player id
            var playerID = ws.id;
            //get game session ID base on playerID
            var gameSessionID = Games.getGameSessionIDFromDisconnectStoreUsingPlayerID(playerID);
            //if game session id exist i.e player is already playing a game
            if (gameSessionID) {
                //get the game by game session id
                var game_1 = Games.getGameByGameSessionID(gameSessionID);
                //if game exist
                if (game_1) {
                    //get player from game using player ID
                    var player = game_1.getPlayerByPlayerID(playerID);
                    //remove player ID from disconnect store since player is back online
                    Games.removePlayerIDFromDisconnectGameStore(gameSessionID, playerID);
                    //if player was found
                    if (player) {
                        //add game session ID to player websocket
                        ws.gameSessionID = gameSessionID;
                        //replace player's disconnected websocket with newly connected socket object
                        player.replaceWs(ws);
                        //put player back to game
                        game_1.putPlayerBackInGame(player.getWs(), Games.getDisconnectedPlayerIDByGameSessionID(gameSessionID), 
                        //only resume game after player who was previously offline game's state has been restored
                        function () {
                            //if all disconnected player are back online resume game
                            if (Games.noMorePlayerOffline(gameSessionID))
                                game_1.resumeGame();
                        }); //end game.putPlayerBackInGame
                    } //end if(player)
                } //end if(game)
            } //end if
        }); //end add eventlisterner
    }; //end static init
    Games.emitEventToGame = function (eventType, ws, data) {
        if (data === void 0) { data = {}; }
        //get game session id
        var gameSessionID = ws.gameSessionID;
        //if game session is not undefined
        if (gameSessionID) {
            //get game from store
            var game = Games.getGameByGameSessionID(gameSessionID);
            //if game exists
            if (game) {
                //get emitter for game
                game.emit(eventType, ws, data);
            } //end if(gamee)
        } //end if
    };
    Games.generateGame = function (firstPlayerWs, numPlayer) {
        //first check if player is already involved in another game
        if (Games.gameStore[firstPlayerWs.id]) {
            throw getError("Player cannot not be involved in two game at onces");
        }
        else if (numPlayer < 2) {
            throw getError("Minimum of two players is required");
        }
        else if (numPlayer > 4) {
            throw getError("Maximum of two players is required");
        }
        //get game
        var game = Games.addGame(firstPlayerWs.id, numPlayer);
        //add player to game
        game.addPlayer(firstPlayerWs);
        //the game initiator id will server as game session id
        return firstPlayerWs.id;
    };
    Games.addGame = function (gameSessionID, numPlayer) {
        if (Games.gameStore[gameSessionID]) {
            throw new Error("Game with this session " + gameSessionID + " id already exists");
        }
        var game = new Game(Games.dict, numPlayer, gameSessionID);
        Games.gameStore[gameSessionID] = game;
        return game;
    };
    Games.getGameByGameSessionID = function (gameSessionID) {
        return !!gameSessionID ? Games.gameStore[gameSessionID] : undefined;
    };
    Games.deleteGame = function (gameSessionID) {
        var game = Games.gameStore[gameSessionID];
        if (game) {
            game.destroy();
            delete Games.gameStore[gameSessionID];
            delete Games.disconnectUserStore[gameSessionID];
        }
    };
    Games.addPlayerIDToDisconnectGameStore = function (gameSessionID, playerID) {
        var playerIDList = Games.disconnectUserStore[gameSessionID];
        if (playerIDList) {
            playerIDList.push(playerID);
        }
        else {
            Games.disconnectUserStore[gameSessionID] = [playerID];
        }
    };
    Games.removePlayerIDFromDisconnectGameStore = function (gameSessionID, playerID) {
        var playerIDList = Games.disconnectUserStore[gameSessionID];
        if (playerIDList) {
            Games.disconnectUserStore[gameSessionID] = playerIDList.filter(function (pID) { return pID !== playerID; });
        } //end if
    };
    Games.noMorePlayerOffline = function (gameSessionID) {
        return Games.getDisconnectedPlayerIDByGameSessionID(gameSessionID).length < 1;
    };
    Games.getGameSessionIDFromDisconnectStoreUsingPlayerID = function (playerID) {
        var playerIDList = null;
        var gameSessionIDKeys = Object.keys(Games.disconnectUserStore);
        var gameSessionID = undefined;
        for (var i = 0; i < gameSessionIDKeys.length; i++) {
            gameSessionID = gameSessionIDKeys[i];
            playerIDList = Games.disconnectUserStore[gameSessionID];
            if (playerIDList.indexOf(playerID) > -1)
                return gameSessionID;
        } //end for loop
        return undefined;
    }; //end 
    Games.getDisconnectedPlayerIDByGameSessionID = function (gameSessionID) {
        var playerIDList = Games.disconnectUserStore[gameSessionID];
        return Array.isArray(playerIDList) ? playerIDList : [];
    };
    Games.gameStore = {};
    Games.disconnectUserStore = {};
    return Games;
}()); //end class Games
exports.default = Games;
