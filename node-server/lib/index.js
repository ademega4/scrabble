"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
var fs_1 = require("fs");
var path_1 = require("path");
var express_1 = __importDefault(require("express"));
var http_1 = __importDefault(require("http"));
var ws_1 = __importDefault(require("ws"));
var lib_1 = require("./lib");
var body_parser_1 = __importDefault(require("body-parser"));
var cookie_parser_1 = __importDefault(require("cookie-parser"));
var helmet_1 = __importDefault(require("helmet"));
var cors_1 = __importDefault(require("cors"));
require("../src/lib/config");
var web_token_1 = __importDefault(require("./lib/web-token"));
var enum_1 = require("./lib/enum");
var trie_1 = __importDefault(require("./lib/trie"));
var game_lib_1 = __importDefault(require("./game-lib"));
var emitter_1 = __importDefault(require("./emitter"));
var ErrorWithStatus = /** @class */ (function () {
    function ErrorWithStatus(error, status) {
        this.error = error;
        this.status = status;
    }
    return ErrorWithStatus;
}());
var _a = process.__config, env = _a.env, port = _a.server.port, _b = _a.cookie, name = _b.name, path = _b.path, httpOnly = _b.httpOnly, expiresIn = _b.expiresIn, _c = _a.path, dictPath = _c.dictPath, pathToIndexHtml = _c.pathToIndexHtml;
//path to dictionary
var pathToDict = path_1.join(__dirname, dictPath);
//dictionary,trie data structure, thanks freecode camp
var dict = new trie_1.default();
//I need this to pass message from index to games especially
//when client loose connection while game is still on
var emitter = new emitter_1.default();
//if path to dict exits
if (fs_1.existsSync(pathToDict)) {
    //show progress to client
    console.log("loading up dictionary...");
    //create a read stream
    fs_1.createReadStream(pathToDict, { encoding: "utf8" })
        .on("data", function readData(data) {
        //split string using newline as delimiter
        var splitData = data.split("\n");
        //loop thru split data
        splitData.forEach(function (d) {
            //remove spaces and convert lowercase and then add to dictionary
            dict.add(d.trim().toLocaleLowerCase());
        });
    })
        .once("error", function readError() {
        //if error occur exit dtart up
        console.error("Error occur while trying to upload dictionary");
        process.exit(1);
    })
        .once("end", function readEnd() {
        //after loading dictionary
        console.log("starting up the app...");
        //initialize game with dictionary and emitter
        game_lib_1.default.init(dict, emitter);
        //start the ret of the app
        startApp();
    });
}
else {
    console.error("unable to find path to dictionary");
    process.exit(1);
}
var htmlPath = path_1.join(__dirname, pathToIndexHtml);
function startApp() {
    var _this = this;
    var app = express_1.default();
    //cors : (env === "development" ? {origin: `http://${hostname}:3000`, credentials: true} : false)
    app.use(cors_1.default(env === "development" ? {
        origin: 'http://localhost:3000',
        credentials: true
    } : {}));
    app.use(body_parser_1.default.json());
    app.use(body_parser_1.default.urlencoded({ extended: false }));
    app.use(cookie_parser_1.default());
    app.use(helmet_1.default());
    if (env === "production") {
        if (!fs_1.existsSync(htmlPath)) {
            console.error("index html cannot be found");
            process.exit(1);
        }
        app.use("/build/", express_1.default.static(path_1.join(__dirname, "../build")));
        app.use("/", express_1.default.static(path_1.join(__dirname, "../build")));
    }
    app.post("/login", function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var username, errorMsg, token, cookieData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    username = req.body.username;
                    errorMsg = "";
                    if (username === "") {
                        errorMsg = "Username is required";
                    }
                    else if (username.length < 3) {
                        errorMsg = "Username should be atleast 3 character long";
                    }
                    else if (username.length > 20) {
                        errorMsg = "Username should not be more than 20 character long";
                    }
                    else if (!(/[a-zA-Z\d]/gi.test(username))) {
                        errorMsg = "Invalid username, Username can only contain alphabelt or number";
                    }
                    else if (getWebsocketByID(username)) {
                        errorMsg = "Username is being used by another user, choose another";
                    }
                    if (errorMsg) {
                        return [2 /*return*/, res.send({ success: false, msg: errorMsg })];
                    }
                    return [4 /*yield*/, web_token_1.default.createToken(username)
                        //get cookie data
                    ];
                case 1:
                    token = _a.sent();
                    cookieData = name + "=" + token + ";expires=" + expiresIn + ";path=" + path + ";HttpOnly=" + httpOnly;
                    //set cookie in header
                    res.append("Set-Cookie", cookieData);
                    res.send({ success: true, username: req.body.username });
                    return [2 /*return*/];
            }
        });
    }); });
    app.get("/viewer", function (req, res, next) {
        var token = lib_1.getTokenFromHeader(req, name);
        if (!token) {
            return res.status(200).send({ success: false, msg: "Not logged in" });
        }
        web_token_1.default.verify(token)
            .then(function (payload) {
            res.status(200).send({ success: true, username: payload.sub });
        })
            .catch(function (e) {
            console.error(e);
            res.status(500).send({ success: false, msg: "internal server error" });
        });
    });
    app.get("/log-out", function (req, res) {
        var response = { success: true, message: "You are logged Out" };
        //set date to 3 days back
        var ex = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)).toUTCString();
        //log client out
        var cookieData = name + "=" + "" + ";expires=" + ex + ";path=" + path + ";HttpOnly=" + httpOnly;
        //set cookie in header
        res.append("Set-Cookie", cookieData);
        res.status(200).send(response);
    });
    app.get("/", function (req, res, next) {
        var readStream = fs_1.createReadStream(htmlPath, { encoding: "utf8" })
            .once("open", function () {
            res.writeHead(200, { "Content-Type": "text/html" });
            readStream.pipe(res, { end: true });
        });
    });
    app.use(function (error, req, res, next) {
        if (error)
            return next(error);
        error = new Error("Not Found");
        //error.status = 404;
        next(new ErrorWithStatus(new Error("Not Found"), 404));
    });
    app.use(function (error, req, res, next) {
        //const newError:ErrorWithStatus;
        var errMsg = "", status = 0;
        if (error && error instanceof ErrorWithStatus) {
            errMsg = error.error.message;
            status = error.status || 500;
        }
        else {
            //error = new ErrorWithStatus(new Error("Internal Server Error"), 500) as any;
            errMsg = "Internal Server Error";
            status = 500;
        }
        res.status(status);
        res.send({ success: false, msg: errMsg });
    });
    var server = http_1.default.createServer(app).listen(port, function () { return console.log("listening on port " + port); });
    var wss = new ws_1.default.Server({ noServer: true });
    wss.on('connection', function connection(ws) {
        /**
         * I need to notify the game class a user just logged in cos, user might have
         * disconnect due network failure and client is playing a game before discnnection from server
         *
        */
        emitter.emit("open", ws);
        ws.on('message', function incoming(message) {
            //parse from string to object
            var payload = null;
            try {
                payload = JSON.parse(message);
            }
            catch (e) {
                ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.MSG_ERROR, {}));
            }
            //if no error
            if (payload) {
                respondToWebSocketMessage.apply(void 0, __spreadArrays([ws], payload));
            } //end if(payload)
        });
        ws.on("close", function (code, reason) {
            /**
             * need to notify game that a particular client just disconnect cos client might be playing
             * game before disconnection from server
             */
            emitter.emit("close", ws);
        });
        ws.on("ping", console.log);
        ws.on("pong", console.log);
        //ws.send(stringfyData("test", {id:1}));
    });
    function parseCookie(cookies) {
        //check if type of cookie is string if not throw error
        if (typeof (cookies) !== "string") {
            throw new Error("Cookie should of type string");
        }
        //store all cookie after parsing it
        var cookieStore = {};
        //split and convert to key value pair to be store in cookie store variable
        cookies.split(";").forEach(function (cookie) {
            //split
            var _a = cookie.split("="), key = _a[0], value = _a[1];
            if (key && value) {
                //store
                cookieStore[key.trim()] = value.trim();
            }
        });
        //return object back to caller
        return cookieStore;
    }
    server.on('upgrade', function upgrade(request, socket, head) {
        //authenticate user client connectiion, ensure client is logged in before they can
        //connect
        authenticate(request, function (err, username) {
            //if error occur, i.e client is not yet logged in
            if (err || !username) {
                //destroy socket
                socket.destroy();
                //prevent execution to continue
                return;
            } //end if
            wss.handleUpgrade(request, socket, head, function done(ws) {
                //get client
                var client = getWebsocketByID(username);
                //if client is not null
                if (client !== null) {
                    //remove 
                    //notify client we'll disconnect previous socket
                    client.send(lib_1.stringfyData(enum_1.EVENT_TYPE.ALREADY_CONNECTED, {}));
                    //close the socket
                    client.close();
                } //end if
                //add the username 
                ws.id = username;
                //process the request
                wss.emit('connection', ws, request);
            }); //end handleUpgrade
        }); //end function authenticate function
    }); //end function upgrade
    function authenticate(req, callback) {
        //get cookie from headers
        var cookie = req.headers["cookie"];
        //if cookie is undefined or null or cookie is empty return false
        if (!cookie || cookie === "")
            return callback(new Error("invalid authentication data"));
        //parse cookie
        var parsedCookie = parseCookie(cookie);
        //if token in sent cookie by client
        if (!parsedCookie[name])
            return callback(new Error("invalid authentication data"));
        //return promise back to caller
        web_token_1.default.verify(parsedCookie[name])
            .then(function (payload) {
            //authentication successful
            callback(null, payload.sub.toString());
        })
            .catch(function (e) {
            callback(new Error("authentication error"));
        });
    }
    function respondToWebSocketMessage(ws, eventType, data, receivers) {
        switch (eventType) {
            //client is trying to start a game
            case enum_1.EVENT_TYPE.GENERATE_GAME_SESSION_OFFER_ID:
                {
                    var sessionID = "", msg = "";
                    try {
                        //generate a game session id based on the number of player that i'll be involved
                        sessionID = game_lib_1.default.generateGame(ws, data.n);
                        //send game id and time out to client to give all other players
                    }
                    catch (error) {
                        if (error.name === lib_1.CUSTOM_ERROR) {
                            msg = error.message;
                        }
                        else {
                            msg = "Internal Server Error";
                        }
                    }
                    ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.GENERATE_GAME_SESSION_OFFER_ID, (sessionID ? { s: sessionID } : { msg: msg })));
                } //end case
                break;
            //while waiting for the other to join game, the game initiator can cancel game
            case enum_1.EVENT_TYPE.CANCEL_OFFER_TO_PLAY:
                {
                    //notify all player that the game has been cancelled
                    //then delete game
                    //get game by this player id
                    var g = game_lib_1.default.getGameByGameSessionID(ws.gameSessionID || "");
                    //notify all the other player(s) the game was cancelled
                    if (g) {
                        g.broadcastMsgToEveryoneExcept(ws.id, enum_1.EVENT_TYPE.CANCEL_OFFER_TO_PLAY, { m: "Offer to play was cancel by " + ws.id });
                        //delete game
                        game_lib_1.default.deleteGame(g.getGameSessionID());
                    } //end if
                } //end case
                break;
            case enum_1.EVENT_TYPE.JOIN_GAME:
                {
                    if (ws.gameSessionID) {
                        ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.JOIN_GAME_RESPONSE, { m: "You can't play two game at onces" }));
                        return;
                    } //end if
                    var gameSessionID = data.g;
                    //get game by game session
                    var g = game_lib_1.default.getGameByGameSessionID(gameSessionID);
                    //if game exists and not already in session
                    if (g) {
                        //g.
                        //if game is already in progress
                        if (g.isGameInProgress()) {
                            //send appropriate message to client
                            ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.JOIN_GAME_RESPONSE, { m: "You cannot join a game that is already in progress" }));
                        }
                        else {
                            //clients are still waiting for other to join
                            //the added 1 is the counter for the present player that's joining
                            try {
                                //add player to game
                                g.addPlayer(ws);
                            }
                            catch (e) {
                                var m = e.name === lib_1.CUSTOM_ERROR ? e.message : "Internal server error.";
                                ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.JOIN_GAME_RESPONSE, { m: m }));
                            }
                        } //end else
                    }
                    else {
                        ws.send(lib_1.stringfyData(enum_1.EVENT_TYPE.JOIN_GAME_RESPONSE, { m: "Game with session ID " + gameSessionID + " cannot be found" }));
                    }
                }
                break;
            case enum_1.EVENT_TYPE.NEXT_TURN:
            case enum_1.EVENT_TYPE.MOVE_TILE:
            case enum_1.EVENT_TYPE.SUBMIT_TILE:
            case enum_1.EVENT_TYPE.PASS:
            case enum_1.EVENT_TYPE.SEARCH_DICT:
                game_lib_1.default.emitEventToGame(eventType, ws, data);
                //end case
                break;
        } //end switch
    } //end function
    function getWebsocketByID(id) {
        //get all client values
        var clientValues = wss.clients.values();
        //get iterator
        var iterator = clientValues.next();
        //while not done
        while (!iterator.done) {
            //if user already connected before remove
            if (iterator.value.id === id) {
                //
                return iterator.value;
            } //end if
            //go to the next iterator
            iterator = clientValues.next();
        } //end while
        return null;
    }
}
