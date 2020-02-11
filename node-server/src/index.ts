import {existsSync, createReadStream} from "fs";
import {join} from "path";
import express, { Request } from "express";
import http, { IncomingMessage } from "http";
import WebSocket from "ws";
import { stringfyData, getTokenFromHeader, CUSTOM_ERROR } from "./lib";
import bodyParser from 'body-parser';
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

import "../src/lib/config";
import webToken from "./lib/web-token";
import {EVENT_TYPE} from "./lib/enum";
import Trie from "./lib/trie";

import Games from "./game-lib";

import Emitter from "./emitter";

class ErrorWithStatus{
  constructor(public error:Error, public status:number){
  }
}

const {
  env,
  server:{port},
  cookie: {
    name,
    path,
    httpOnly,
    expiresIn
  },
  path:{
    dictPath, pathToIndexHtml
  }
} = process.__config;



//path to dictionary
const pathToDict = join(__dirname, dictPath)
//dictionary,trie data structure, thanks freecode camp
const dict = new Trie();
//I need this to pass message from index to games especially
//when client loose connection while game is still on
const emitter = new Emitter();
//if path to dict exits
if(existsSync(pathToDict)){
  //show progress to client
  console.log("loading up dictionary...");
  //create a read stream
  createReadStream(pathToDict, {encoding:"utf8"})
  .on("data", function readData(data:string){
    //split string using newline as delimiter
    const splitData = data.split("\n");
    //loop thru split data
    splitData.forEach(d=>{
      //remove spaces and convert lowercase and then add to dictionary
      dict.add(d.trim().toLocaleLowerCase());
    });
  })
  .once("error", function readError(){
    //if error occur exit dtart up
    console.error("Error occur while trying to upload dictionary");
    process.exit(1);
  })
  .once("end", function readEnd(){
    //after loading dictionary
    console.log("starting up the app...");
    //initialize game with dictionary and emitter
    Games.init(dict, emitter);
    //start the ret of the app
    startApp();
  })
}else{
  console.error("unable to find path to dictionary");
  process.exit(1);
}

const htmlPath = join(__dirname, pathToIndexHtml);

function startApp(){
  const app = express();

  //cors : (env === "development" ? {origin: `http://${hostname}:3000`, credentials: true} : false)
  app.use(cors(
    env === "development" ? {
      origin: 'http://localhost:3000',
      credentials: true
    } : {}
  ));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(cookieParser());
  app.use(helmet());

  if(env === "production"){
    if(!existsSync(htmlPath)){
      console.error("index html cannot be found");
      process.exit(1);
    }

    app.use(
      "/build/",
      express.static(join(__dirname, "../build"))
    );
    app.use(
      "/",
      express.static(join(__dirname, "../build"))
    );
  }

  app.post("/login", async (req, res, next)=>{
    //get username from body
    const username :string = req.body.username;
    //validate username
    let errorMsg = "";
    if(username === ""){
      errorMsg = "Username is required"
    }
    else if(username.length < 3){
      errorMsg = "Username should be atleast 3 character long";
    }
    else if(username.length > 20){
      errorMsg = "Username should not be more than 20 character long"
    }

    else if(!(/[a-zA-Z\d]/gi.test(username))){
      errorMsg = "Invalid username, Username can only contain alphabelt or number";
    }
    
    else if(getWebsocketByID(username)){
      errorMsg = "Username is being used by another user, choose another";
    }

    if(errorMsg){
      return res.send({success:false, msg:errorMsg}); 
    }

    const token = await webToken.createToken(username)
    
    //get cookie data
    const cookieData = `${name}=${token};expires=${expiresIn};path=${path};HttpOnly=${httpOnly}`;
    //set cookie in header
    res.append("Set-Cookie", cookieData);
    
    res.send({success:true, username:req.body.username})
  });

  app.get("/viewer", (req, res, next)=>{
    const token = getTokenFromHeader(req, name);
    
    if(!token){
      return res.status(200).send({success:false, msg:"Not logged in"});
    }
    webToken.verify(token)
    .then(payload=>{
      
      res.status(200).send({success:true, username:payload.sub});
    })
    .catch(e=>{
      console.error(e);
      res.status(500).send({success:false,msg:"internal server error"});
    })
  });

  app.get("/log-out", (req, res)=>{
    const response = {success:true, message:"You are logged Out"};
    //set date to 3 days back
    const ex = new Date(Date.now() - (3 * 24 *60 *60 * 1000 )).toUTCString()
    //log client out
    const cookieData = `${name}=${""};expires=${ex};path=${path};HttpOnly=${httpOnly}`;
    
    //set cookie in header
    res.append("Set-Cookie", cookieData);
    res.status(200).send(response);
  });

  

  app.get("/", (req, res, next)=>{
    const readStream = createReadStream(htmlPath, {encoding:"utf8"})
    .once("open", function(){
      res.writeHead(200, {"Content-Type":"text/html"});
      readStream.pipe(res, {end:true});
    });
  });

  app.use(function(error:Error, req:IncomingMessage, res:any, next:(error?:Error)=>void){
    
    if(error) return next(error);
    error = new Error("Not Found");
    //error.status = 404;
    next(new ErrorWithStatus(new Error("Not Found"), 404) as any);
  });

  app.use(function(error:Error, req:express.Request, res:express.Response, next:(error?:any)=>void){
    
    //const newError:ErrorWithStatus;
    let errMsg = "", status = 0;
    if(error && error instanceof ErrorWithStatus){
      errMsg = error.error.message;
      status = error.status || 500;
    }
    else{
      //error = new ErrorWithStatus(new Error("Internal Server Error"), 500) as any;
      errMsg = "Internal Server Error";
      status = 500;  
    }
    
    res.status(status);
    res.send({success:false, msg:errMsg});
  });


  const server = http.createServer(app).listen(port, ()=>console.log(`listening on port ${port}`));

  const wss = new WebSocket.Server({ noServer:true });
  
  wss.on('connection', function connection(ws:WebSocket) {
    /** 
     * I need to notify the game class a user just logged in cos, user might have 
     * disconnect due network failure and client is playing a game before discnnection from server
     * 
    */
    emitter.emit("open", ws);

    ws.on('message', function incoming(message:string) {
      //parse from string to object
      let payload :[string, any, string[]] | null = null;

      try{
        payload = JSON.parse(message);
      }
      catch(e){
        ws.send(stringfyData(EVENT_TYPE.MSG_ERROR, {}))
      }
      //if no error
      if(payload){
        respondToWebSocketMessage(ws, ...payload);
      }//end if(payload)
    });

    ws.on("close", function(code:number, reason:string){
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

  function parseCookie(cookies:string) :{[x:string]:string}{
    //check if type of cookie is string if not throw error
    if(typeof(cookies) !== "string"){
      throw new Error("Cookie should of type string");
    }
    //store all cookie after parsing it
    const cookieStore :{[x:string]:string} = {};
    //split and convert to key value pair to be store in cookie store variable
    cookies.split(";").forEach(cookie=>{
      //split
      const [key, value] = cookie.split("=");
      if(key && value){
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
    authenticate(request, (err, username?:string) => {
      //if error occur, i.e client is not yet logged in
      if (err || !username) {
        //destroy socket
        socket.destroy();
        //prevent execution to continue
        return;
      }//end if
  
      wss.handleUpgrade(request, socket, head, function done(ws:any) {
        //get client
        const client = getWebsocketByID(username);
        //if client is not null
        if(client !== null){
          //remove 
          //notify client we'll disconnect previous socket
          client.send(stringfyData(EVENT_TYPE.ALREADY_CONNECTED, {}));
          //close the socket
          client.close();
        }//end if

        //add the username 
        ws.id = username;
        //process the request
        wss.emit('connection', ws, request);
      });//end handleUpgrade
    });//end function authenticate function
  });//end function upgrade

  function authenticate(req:Request, callback:(error:Error|null, username?:string)=>void){
    //get cookie from headers
    const cookie = req.headers["cookie"];
    //if cookie is undefined or null or cookie is empty return false
    if(!cookie || cookie === "") return callback(new Error("invalid authentication data"));
    //parse cookie
    const parsedCookie = parseCookie(cookie);
    
    //if token in sent cookie by client
    if(!parsedCookie[name]) return callback(new Error("invalid authentication data"));
    //return promise back to caller
    webToken.verify(parsedCookie[name])
    .then(payload=>{
      //authentication successful
      callback(null, payload.sub.toString());
    })
    .catch(e=>{
      callback(new Error("authentication error"));
    });
  }
  
  function respondToWebSocketMessage(ws:WebSocket, eventType:string, data:any, receivers:string[]) :void{
    
    switch(eventType){
      //client is trying to start a game
      case EVENT_TYPE.GENERATE_GAME_SESSION_OFFER_ID:{
        let sessionID = "", msg="";
        try{
          //generate a game session id based on the number of player that i'll be involved
          sessionID = Games.generateGame(ws, data.n);
          //send game id and time out to client to give all other players
        }
        catch(error){
          
          if(error.name === CUSTOM_ERROR){
            msg = error.message;
          }
          else{
            msg = "Internal Server Error";
          }
        }
        
        ws.send(stringfyData(
          EVENT_TYPE.GENERATE_GAME_SESSION_OFFER_ID, 
          (sessionID ? {s:sessionID} : {msg})
        ));
      }//end case
      break;
  
      //while waiting for the other to join game, the game initiator can cancel game
      case EVENT_TYPE.CANCEL_OFFER_TO_PLAY:{
        //notify all player that the game has been cancelled
        //then delete game
        //get game by this player id
        const g = Games.getGameByGameSessionID(ws.gameSessionID || "");
        //notify all the other player(s) the game was cancelled
        if(g){
          g.broadcastMsgToEveryoneExcept(
            ws.id, EVENT_TYPE.CANCEL_OFFER_TO_PLAY, {m:`Offer to play was cancel by ${ws.id}`}
          );
          //delete game
          Games.deleteGame(g.getGameSessionID());
        }//end if
      }//end case
      break;
  
      case EVENT_TYPE.JOIN_GAME:{
        if(ws.gameSessionID){
          ws.send(stringfyData(
            EVENT_TYPE.JOIN_GAME_RESPONSE, 
            {m:`You can't play two game at onces`}
          ));
          return;
        }//end if
  
        const gameSessionID = data.g;
        //get game by game session
        const g = Games.getGameByGameSessionID(gameSessionID);
        //if game exists and not already in session
        if(g){
          //g.
          //if game is already in progress
          if(g.isGameInProgress()){
            //send appropriate message to client
            ws.send(stringfyData(
              EVENT_TYPE.JOIN_GAME_RESPONSE, 
              {m:`You cannot join a game that is already in progress`}
            ));
          }
          else{
            //clients are still waiting for other to join
            //the added 1 is the counter for the present player that's joining
            try{
              //add player to game
              g.addPlayer(ws);
            }
            catch(e){
              let m = e.name === CUSTOM_ERROR ? e.message : "Internal server error.";
              ws.send(stringfyData(EVENT_TYPE.JOIN_GAME_RESPONSE, {m}));
            }
          }//end else
        }else{
          ws.send(stringfyData(
            EVENT_TYPE.JOIN_GAME_RESPONSE, 
            {m:`Game with session ID ${gameSessionID} cannot be found`}
          ));
        }
      }
      break;

      case EVENT_TYPE.NEXT_TURN:
      case EVENT_TYPE.MOVE_TILE:
      case EVENT_TYPE.SUBMIT_TILE:
      case EVENT_TYPE.PASS:
      case EVENT_TYPE.SEARCH_DICT:
        Games.emitEventToGame(eventType, ws, data);
      //end case
      break;
    }//end switch
  }//end function
  
  function getWebsocketByID (id:string):WebSocket | null{
    //get all client values
    const clientValues = wss.clients.values();
    //get iterator
    let iterator = clientValues.next();
    //while not done
    while(!iterator.done){
      //if user already connected before remove
      if(iterator.value.id === id){
        //
        return iterator.value;
      }//end if
      //go to the next iterator
      iterator = clientValues.next();
    }//end while
    return null;
  }
}


