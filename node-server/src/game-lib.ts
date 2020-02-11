import WebSocket from "ws";
import { stringfyData, CUSTOM_ERROR} from "./lib";
import { EVENT_TYPE } from "./lib/enum";
import Trie from "./lib/trie";
import Emitter from "./emitter";

type ClientPlayer = {username:string, score:number};

type LastWord = {word:string, point:number, score:number, player:string}

type GeneralInfo = {
  currentPlayerID:string, 
  totalTileInBag:number,
  players:ClientPlayer[],
  lastWords:LastWord[],
};

type TileType = {
  letter:string,
  point:number,
  id:string,
};
//game general info at index 0
//tiles at index 1
//tick or timer info at index 2 
type GamePayload = [GeneralInfo, {[key:string]:TileType[]}, number];

type PlayedTileBoardCellPos = {[key:string]:string}

// type TilePosOnBoard = {
//   tileLetter:string,
//   pos:[number, number]
// };

type ScrabbleWordDistribution = [string, number, number];

interface MoveTileBoardPos{
  x:number,
  y:number,
  prevTileBoardPos:string,
  tID:string,
}

type PermTileBoardPos = {[key:string]:TileType};

const DIRECTION :{
  readonly LEFT:number, 
  readonly RIGHT:number,
  readonly TOP:number, 
  readonly BOTTOM:number
} = {LEFT:0, RIGHT:1, TOP:2, BOTTOM:3};

const TOTAL_TILE_PER_PLAYER = 7;
const TIMES_TO_SHUFFLE = 1000;

//90 SEC i.e 0 - 89
const CLOCK = 89;

//the center board index, the first player must place a tile on this board cell
const CENTER_BOARD_INDEX = "7|7";

const JOIN_GAME_TIMEOUT = 180;


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
const wordDistribution: ScrabbleWordDistribution[] = [
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
  //["", 2, 0],
];

//board representation
const scrabbleBoard: string[][] = [
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

const generateRandomNumber :(min :number, max :number)=>number = (
  (min, max)=>(Math.floor(max * Math.random()) + min)
);

function getTileBag() :{[key:string] : TileType}{
  //generate tiles for game
  let counter  = 1;
  let id = "";
  const tileBag:{[key:string] : TileType} = {};
  //loop through all word distribution
  for(let i = 0; i < wordDistribution.length; i++){
    //get let
    const [letter, freq, point] :ScrabbleWordDistribution = wordDistribution[i];
    for(let c = 0; c < freq; c++){
      id = (counter++).toString();
      //create tile based on frequency
      tileBag[id] = {letter, point, id}
    }//end inner for loop
  }//end outer for loop
  return tileBag;
}//end function

/**
 * @description determine weather tile was place horizontally from left to right or vertically from top to bottom
 */
function getTilePlacementDirection(playedTileBoardCellPos:string[]) :boolean{
  //if board cell coordinate is less than 2 return default
  if(playedTileBoardCellPos.length < 2) return false;
  //get y axis or row value of the board the first tile was placed on
  const [y1] = playedTileBoardCellPos[0].split("|");
  //get y axis or row value of the board the second tile was placed on
  const [y2] = playedTileBoardCellPos[1].split("|");
  //if the y axis or row value are the same, the tile are placed horizontally
  return y1 === y2 ? true : false;
}

/**
 * 
 * @description check to see if the placement of the tile follow a pattern of left to right or top to bottom
 */
function checkIfTileMoveIsCorrect(playedTileBoardCellPos:string[], tilePlacedHorizontally:boolean):boolean{
  //if a single tile was placed on the board return true
  if(playedTileBoardCellPos.length < 2) return true;
  //get the coordinate of the first tile
  const [y1, x1] = playedTileBoardCellPos[0].split("|");
  //get the coordinate of the second tile
  const [y2, x2] = playedTileBoardCellPos[1].split("|");
  //if there are two tile coordinate
  if(playedTileBoardCellPos.length === 2){
    //if tile is placed horizontally y1 be the same as y2 else if vertically x1 will be the same as x2
    return tilePlacedHorizontally ? y1 === y2 : x1 === x2;
  }
  
  //loop through tile board coordinates
  for(let i = 2; i < playedTileBoardCellPos.length; i++){
    //get tile coordinates
    const [y, x] = playedTileBoardCellPos[i].split("|");
    //if horizontally placed, y axis must be the same for all coordinates
    if(tilePlacedHorizontally){
      if(y1 !== y) return false;
    }
    //if vertically placed, x axis must be the same for all coordinates
    else{
      if(x1 !== x) return false;
    }
  }//end for loop
  //atlast return true
  return true;
}//end function checkIfTileMoveIsCorrect

/**
 * @description get word from tile as well as tile ID
 * @param {string[]} playedWordTileIDsWithBoardCoord array of tile id with board position or coordinate
 * 
 */
function getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord: string[]) :{playedWordTileIDs:string[], playedWord:string}{
  //store the played word
  const playedWord :string[] = [], 
        //store tile ID
        playedWordTileIDs :string[]= [];
  //loop through array
  playedWordTileIDsWithBoardCoord.forEach(tIDWithBoardCoordItem=>{
    //the tIDWithBoardCoordItem is in this format tileID:y|x
    const [tID] = tIDWithBoardCoordItem.split(":");
    //push letter to array
    playedWord.push(tileBag[tID].letter);
    //push tile id to array
    playedWordTileIDs.push(tID);
  });//end foreach
  //return word and tile id back to caller
  return {playedWordTileIDs, playedWord:playedWord.join("")};
}

/**
 * 
 * @description convert string in format tileID:y|x to object with tileID as key and board position as value
 */
function getPlayedTileIDAndBoardCoord(playedWordTileIDsWithBoardCoord :string[]) :{[key:string]:number[]}{
  //store current value
  let t = null;
  //
  let store :{[key:string]:number[]} = {};
  //loop through array
  for(let i = 0; i < playedWordTileIDsWithBoardCoord.length; i++){
    //get current value
    t = playedWordTileIDsWithBoardCoord[i];
    //get tile ID and board coordinate
    const [tID, boardCoord] = t.split(":");
    store[tID] = boardCoord.split("|").map(axis=>parseInt(axis.trim(), 10));
  }
  return store;
}//end function

//const generateAUniqueID :()=>string = Math.random() * 
const tileBag = getTileBag();

class Game extends Emitter{
  //I store join game timeout in in the constructor
  private timeOutToJoinGameID: NodeJS.Timeout;
  //store all players
  private players: Player[] = [];
  //store the number of player expected to join game
  private numPlayer:number;
  //game session id
  private gameSessionID:string;
  //weather the game is in progress or we are still waiting for othe user to join game
  //user cannot join game that's already in progress
  private gameInProgress:boolean = false;
  //use to determine the next player to play
  private currentPlayTurn:number = 0;
  //store play timeout for each player, any player who does not submit play before
  //timeout elapse will forfeit his/her turn and score 0
  private playTimeoutIntervalID :NodeJS.Timeout | null = null;

  private tileBag :TileType[];

  private board :PlayedTileBoardCellPos = {};

  private clock :number = 0;

  private paused :boolean = false;
  
  private lastWords:LastWord[] = [];

  private playedTileBoardCellPos :PlayedTileBoardCellPos = {};

  private isFirstPlay :boolean = true;

  private pauseToProcess:boolean = false;

  //private switchingPlayer :boolean = true;

  constructor(private dictionary:Trie, numPlayer:number, gameSessionID:string){

    super();

    this.timeOutToJoinGameID = setTimeout(()=>{
      this.broadcastToAll(
        EVENT_TYPE.CANCEL_OFFER_TO_PLAY, 
        {m:"Offer to play timeout"}
      );
      //if other player do not join the game within time out
      //the game will be deleted
      Games.deleteGame(gameSessionID);
    }, (JOIN_GAME_TIMEOUT * 1000));
    
    this.numPlayer = numPlayer;

    this.gameSessionID = gameSessionID;

    this.tileBag = this.shuffleTiles(Object.values(tileBag));

    this.addEventHandlerToGame();
  }//end constructor

  isGameInProgress() :boolean{
    return this.gameInProgress;
  }

  broadcastMsgToEveryoneExcept(wsID:string, eventType:string, payload:any) :void{
    //get player(s)
    const players = this.getPlayers();
    let currentWs = null;
    const stringifyPayload = stringfyData(eventType, payload);
    for(let i = 0; i < players.length; i++){
      currentWs = players[i].getWs();
      if(currentWs.id !== wsID && currentWs.OPEN === WebSocket.OPEN){
        currentWs.send(stringifyPayload);
      }//end if(currentWs.id !== ws.id)
    }//end for loop
  }

  broadcastToAll(eventType:string, payload:any, callback :()=>void = ()=>{}) :void{
    //get player(s)
    const players = this.getPlayers();
    const stringifyPayload = stringfyData(eventType, payload);
    //loop thru all player
    for(let i = 0; i < players.length; i++){
      const ws = players[i].getWs();
      if(ws.readyState === WebSocket.OPEN){
        ws.send(stringifyPayload, callback);
      }
    }//end for loop
  }

  addPlayer(ws:WebSocket){

    const totalAddedPlayer = this.getPlayers().length;

    if(totalAddedPlayer === this.numPlayer){
      //delete time out to cancel game if offer were not accepted by other player
      throw getError(`Can only add ${this.numPlayer}`);
    }

    //the id is the username of the player's websokect
    const prevPlayerIDs = this.getIDOfPlayers();
    
    //add game session to ws
    ws.gameSessionID = this.gameSessionID;
    //add ws to player object
    this.players.push(new Player(ws));

    //if all player accepted the offer, the added number represent the just added player
    if((totalAddedPlayer + 1) === this.numPlayer){
      //clear time out to delete game since all player accepted offer
      clearTimeout(this.timeOutToJoinGameID);
      this.startGame();
      //this.broadcastToAll(EVENT_TYPE.START_GAME, {});
    }
    else{
      //payload to be sent to all user who has join game before this user
      this.broadcastMsgToEveryoneExcept(ws.id, EVENT_TYPE.JUST_JOINED_GAME, {u:ws.id});
      //send the username of all user who already join game to this new user who just join game
      ws.send(stringfyData(EVENT_TYPE.ALREADY_JOINED_GAME, {u:prevPlayerIDs}));
    }
  }//end method add player

  getPlayers() :Player[]{
    return this.players;
  }

  getIDOfPlayers() :string[]{
    const playerIDs :string[] = [];
    const players = this.getPlayers();
    for(let i = 0; i < players.length; i++){
      playerIDs.push(players[i].getPlayerID());
    }
    return playerIDs;
  }

  getPlayerByPlayerID(playerID:string) :Player|undefined{
    return !!playerID ? this.players.find(p=>p.getPlayerID() === playerID) : undefined;
  }

  getGameSessionID() :string{
    return this.gameSessionID;
  }

  getNumPlayers() :number{
    return this.numPlayer;
  }

  pauseGame(){
    //set game pause to true
    this.paused = true;
    //broadcast to all player to pause game
    this.broadcastToAll(EVENT_TYPE.PAUSE_GAME, {});
    //stop clock
    this.stopClock();
  }

  resumeGame(){
    //resume game
    this.paused = false;
    //broadcast to all player that game is restarted
    this.broadcastToAll(EVENT_TYPE.RESUME_GAME, {});
    //restart clock
    this.startClock();
  }

  isGamePause() :boolean{
    return this.paused;
  }

  destroy(){
    this.players.forEach(p=>{
      p.getWs().gameSessionID = undefined;
    });
    this.removeEventListener(EVENT_TYPE.MOVE_TILE, this.moveTile);

    this.removeEventListener(EVENT_TYPE.SUBMIT_TILE, this.submitTile);

    this.removeEventListener(EVENT_TYPE.PASS, this.onPass);

    this.removeEventListener(EVENT_TYPE.SEARCH_DICT, this.onSearchDict);
  }

  putPlayerBackInGame(playerWs:WebSocket, stillOfflinePlayers:string[], callback:()=>void) :void{
    const [genInfo, tiles, tick] = this.getPlayerPayload();

    const boardWithTiles :PermTileBoardPos = Object.keys(this.board).reduce<PermTileBoardPos>((
      pre:PermTileBoardPos, key:string
    )=>{
      pre[key] = tileBag[this.board[key]];
      return pre;
    }, {});

    playerWs.send(stringfyData(
      EVENT_TYPE.I_JOIN_GAME_AFTER_DISCONNECT, 
      [[genInfo, tiles[playerWs.id], tick], boardWithTiles, stillOfflinePlayers]
    ), callback);

    if(stillOfflinePlayers.length > 0){
      this.broadcastMsgToEveryoneExcept(
        playerWs.id, 
        EVENT_TYPE.PLAYER_DISCONNECT_DURING_GAME, 
        stillOfflinePlayers
      );
    }//end if(stillOfflinePlayers.length > 0)
  }

  private startGame(){
    this.gameInProgress = true;
    //randomly pick the first player to start game
    this.currentPlayTurn = generateRandomNumber(0, this.getPlayers().length);
    //send game payload to all players
    //send data to client
    this.sendGamePayloadAndStartTimer(EVENT_TYPE.START_GAME);
  }

  private sendGamePayload(eventType:string, callback:()=>void){
    const [genInfo, tiles, tick] = this.getPlayerPayload();

    this.players.forEach(player=>{
      const ws = player.getWs();
      if(ws.readyState === WebSocket.OPEN){
        ws.send(
          stringfyData(eventType, [genInfo, tiles[ws.id], tick]),
          //I need to pass callback , cos i want to ensure the message is sent to client
          //before starting game clock or timer
          callback 
        );
      }
    });
  }

  /**
   * Tile can be place on the board from right to left, left to right, top to bottom or bottom to top.
   * It should only form a word from left to right or top to bottom, so I need to sort the board 
   * coordinate since top most or left most will have a lower value when added together than the next
   * coordinate after it. It this function that does that.
   * 
   * Also since the tile place must also form a word with existing tile on board, this function get all
   * those tile that touches the played tile(s)
   */
  private preparePlayedTileIDAndBoardCoord(allBoardTileIDAndCoord:PlayedTileBoardCellPos, tilePlacedHorizontally:boolean, rootTileID:string, row:number, column:number) :string[]{
    //store all tiles and their coordinates. This include the tiles played by current player as well 
    //the other existing tiles touched by current tile(s) to form played word.
    let playedWordTileIDsWithBoardCoord :string[] = [];
    //if tile is place horizontally i.e from left to right or vertically from top to bottom, 
    //I need to get all tiles on the left and right side of the first tile that player place 
    //on the board in this format tileID:y|x. I have to use this format cos I need to sort and 
    //I was not able to use object to do it
    if(tilePlacedHorizontally){
      playedWordTileIDsWithBoardCoord = [
        ...this.getTileIDWithBoardCoord(allBoardTileIDAndCoord, row, column, DIRECTION.LEFT),
        `${rootTileID}:${row}|${column}`,
        ...this.getTileIDWithBoardCoord(allBoardTileIDAndCoord, row, column, DIRECTION.RIGHT)
      ];
    }else{
      playedWordTileIDsWithBoardCoord = [
        ...this.getTileIDWithBoardCoord(allBoardTileIDAndCoord, row, column, DIRECTION.TOP),
        `${rootTileID}:${row}|${column}`,
        ...this.getTileIDWithBoardCoord(allBoardTileIDAndCoord, row, column, DIRECTION.BOTTOM)
      ];
    }//end else
    //I need to sort to ensure the tile are placed in the correct order from left to right
    //or top to bottom. left most or top most tile will have lower value
    return playedWordTileIDsWithBoardCoord.sort((a:string, b:string)=>{
      //get board cell coordinate of where the tile was placed by user
      //don't need tile ID
      const [, coordA] = a.split(":");
      const [, coordB] = b.split(":");
      //I need to convert from string to number
      const [yA, xA] = coordA.split("|").map(axis=>parseInt(axis.trim(), 10));
      const [yB, xB] = coordB.split("|").map(axis=>parseInt(axis.trim(), 10));
      //add coordinate together to sort, board position with lowest value come first
      return (yA + xA) - (yB + xB);
    });//end array sorting
  }
  /**
   * 
   * @param {string[]} playedWordTileIDsWithBoardCoord the currently played tiles
   * @param {PlayedTileBoardCellPos} allBoardTileIDAndCoord all tile that later be on board
   * @param {boolean} tilePlacedHorizontally tile placement direction
   * @returns {boolean} whether the played tile form word with existing tiles on the board
   */
  private checkIfTileFormAWord(playedWordTileIDsWithBoardCoord:string[], allBoardTileIDAndCoord:PlayedTileBoardCellPos, tilePlacedHorizontally:boolean) :boolean{
    //convert the played tile to string in this format tileID:y|x because I need to sort it to get
    //the left most or top most tile
    const playedTileIDAndBoardCood = getPlayedTileIDAndBoardCoord(playedWordTileIDsWithBoardCoord);
    //get all the form played word
    const playedTileID = Object.keys(playedTileIDAndBoardCood);
    let tileID = "";
    
    for(let i = 0; i < playedTileID.length; i++){
      tileID = playedTileID[i];
      const [row, column] = playedTileIDAndBoardCood[tileID];
      const {playedWord} = getPlayedTileIDsAndWord(
        this.preparePlayedTileIDAndBoardCoord(
          allBoardTileIDAndCoord, tilePlacedHorizontally, tileID, row, column
        )
      );
      if(playedWord.length > 1 && !this.dictionary.exist(playedWord)) return false;
    }//end for loop
    return true;
  }

  private verifyUserTilesAndGetPlayedWord() :{valid:boolean, playedWord?:string, playedWordTileIDs?:string[]}{
    //get all board location where user place tiles
    const playedTileBoardCellPos = Object.keys(this.playedTileBoardCellPos);
    //get the total number of player's tile(s) 
    const playedTileBoardCellPosLen = playedTileBoardCellPos.length;
    //if empty i.e player did place any tile on the board, return early
    if(playedTileBoardCellPosLen <= 0) return {valid:false};
    //convert the first tile placed on board by player from string to number
    //this will act like a point of entry to check user tile input
    const [row, column] = playedTileBoardCellPos[0].split("|").map(coord=>parseInt(coord.trim(), 10));
    //get the id of the first tile played by user
    const rootTileID = this.playedTileBoardCellPos[playedTileBoardCellPos[0]];
    
    //if this is the first time submission take's place
    if(this.isFirstPlay){
      //on first play,u have to play atleast two tiles to form a word
      if(playedTileBoardCellPosLen < 2) return {valid:false};
      //ensure player place a tile on the center of the board
      if(playedTileBoardCellPos.indexOf(CENTER_BOARD_INDEX) < 0){
        return {valid:false};
      }
      //get tile placement direction,weather horizontally from left to right or vertically from 
      //top to bottom
      const tilePlacedHorizontally = getTilePlacementDirection(playedTileBoardCellPos);
      //check if move direction is ok
      //I need to ensure tile placement follow a pattern either horizonatl left to right or
      //vertically top to bottom
      if(checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally)){
        //get user played tiles, cos its the first play, only get it from tiles played by user
        //the board will be empty. I do not place the played till on board until the tile are validated
        //and the word checked
        let playedWordTileIDsWithBoardCoord :string[] = this.preparePlayedTileIDAndBoardCoord(
          this.playedTileBoardCellPos, tilePlacedHorizontally, rootTileID, row, column
        );
        //convert the tiles to word as well as get tile id for calculating player score from point and
        //board position
        const {playedWordTileIDs, playedWord} = getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord);
        //check if the form word from tiles is correct
        const valid = this.dictionary.exist(playedWord);
        //return validity, played word and played tile id
        return {valid, playedWord, playedWordTileIDs};
      }//end if(checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally))
      return {valid:false};
    }//end if
    //I need to join all previously played tiles as well as current tiles being played by player
    const allBoardTileIDAndCoord = {...this.board, ...this.playedTileBoardCellPos};

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
    if(playedTileBoardCellPosLen === 1){
      //use to store all neccessary dqata for both direction
      const output :{
        horizontal:{valid:boolean, playedWordTileIDs:string[], playedWord:string}, 
        vertical:{valid:boolean, playedWordTileIDs:string[], playedWord:string}
      } = {
        horizontal:{valid:false, playedWord:"", playedWordTileIDs:[]},
        vertical:{valid:false, playedWord:"", playedWordTileIDs:[]}
      };
       
      //Tile is assumed to be placed horizontally
      let playedWordTileIDsWithBoardCoord :string[] = this.preparePlayedTileIDAndBoardCoord(
        allBoardTileIDAndCoord, true, rootTileID, row, column
      );
      //if the tile touch other tiles on the board join tile id should be more than the played tiles
      if(playedWordTileIDsWithBoardCoord.length > 1){
        const {playedWordTileIDs, playedWord} = getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord);
        output.horizontal = {playedWord, playedWordTileIDs, valid:this.dictionary.exist(playedWord)};
      }//end if(playedTileIDs.length <= playedTileBoardCellPosLen)
      
      //Tile is assumed to be placed vertically
      playedWordTileIDsWithBoardCoord  = this.preparePlayedTileIDAndBoardCoord(
        allBoardTileIDAndCoord, false, rootTileID, row, column
      );

      if(playedWordTileIDsWithBoardCoord.length > 1){
        const {playedWordTileIDs, playedWord} = getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord);
        output.vertical = {playedWord, playedWordTileIDs, valid:this.dictionary.exist(playedWord)};
      }//end if
      
      //if both word from all the direction are valid
      if(output.horizontal.valid && output.vertical.valid){
        //check if tile form a word from both direction, if word is assume to be place horizontally
        //it check all word above and below each tile that form the word that is why i have to pass false
        //as the third argument.
        output.horizontal.valid = this.checkIfTileFormAWord(
          playedWordTileIDsWithBoardCoord, 
          allBoardTileIDAndCoord, 
          false
        );
        //check if tile form a word from both direction, if word is assume to be place vertically
        //it check all word left side and right side each tile that form the word that is why i have to 
        //pass true as the third argument
        output.vertical.valid = this.checkIfTileFormAWord(
          playedWordTileIDsWithBoardCoord, 
          allBoardTileIDAndCoord, 
          true
        );
        //if tiles still form a word with previous tile on the board
        //I break the deadlock by calculating the score from the word from both direction
        //and choose the word with highest score
        if(output.horizontal.valid && output.vertical.valid){
          //get value of the scrabble board where tile is placed
          const boardValue = scrabbleBoard[row][column].trim();
          //get the point for the tile
          let {point} = tileBag[rootTileID];

          let wordMultiplier = 1;
          let score = 0;

          if(boardValue === "TW"){
            wordMultiplier = 3;
          }
          else if(boardValue === "DW"){
            wordMultiplier = 2;
          }
          else if(boardValue === "DL"){
            score += point * 2;
          }
          else if(boardValue === "TL"){
            score += point * 3;
          }

          let hScore = score, vScore = score;

          output.horizontal.playedWordTileIDs.forEach((tID)=>{
            if(tID !== rootTileID){
              hScore += tileBag[tID].point;
            }
          });

          output.vertical.playedWordTileIDs.forEach((tID)=>{
            if(tID !== rootTileID){
              vScore += tileBag[tID].point;
            }
          });
          
          hScore *= wordMultiplier;
          vScore *= wordMultiplier;

          return hScore > vScore ? output.horizontal : output.vertical;
        }//end if(output.horizontal.valid && output.vertical.valid)

        else if(output.horizontal.valid) return output.horizontal;
        else if(output.vertical.valid) return output.vertical;
      }
      //if word is placed horizontally and the word exist
      else if(output.horizontal.valid){
        //check to ensure the other word the tile touches actually form a word
        if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, false)){
          return output.horizontal;
        }//end if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, false))
      }
      else if(output.vertical.valid){
        if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, true)){
          return output.vertical;
        }//end if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, true))
      }
      return {valid:false};
    }
    //I should be able to get direction since user play more than 1 tiles
    else{
      //get tile placement direction
      const tilePlacedHorizontally = getTilePlacementDirection(playedTileBoardCellPos);
      //check if move direction is ok
      if(checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally)){
        //get all tiles that form the word on boardin this format tileID:y|x
        let playedWordTileIDsWithBoardCoord :string[] = this.preparePlayedTileIDAndBoardCoord(
          allBoardTileIDAndCoord, tilePlacedHorizontally, rootTileID, row, column
        );
        //if the tile touch other tiles on the board, join tile id should be more than the played tiles
        if(playedWordTileIDsWithBoardCoord.length <= playedTileBoardCellPosLen){
          return {valid:false};
        }//end if(playedTileIDs.length <= playedTileBoardCellPosLen)

        const {playedWordTileIDs, playedWord} = getPlayedTileIDsAndWord(playedWordTileIDsWithBoardCoord);
        //check if word is valid
        const valid = this.dictionary.exist(playedWord);
        if(!valid) return {valid};
        //ensure played tiles form word with previous tile currently on the board
        if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, !tilePlacedHorizontally)){
          return {valid, playedWord, playedWordTileIDs};
        }//end if(this.checkIfTileFormAWord(playedWordTileIDsWithBoardCoord, allBoardTileIDAndCoord, !tilePlacedHorizontally))
      }//end if(checkIfTileMoveIsCorrect(playedTileBoardCellPos, tilePlacedHorizontally))
    }//end else
    return {valid:false};
  }
  /**
   * @description get all tile(s) and their board position or coordinate that form player played word
   * @param {PlayedTileBoardCellPos} from - from which object store
   * @param {number} row starting from which row or y-axis
   * @param {number} column starting from which column or x-axis
   * @param {number} direction can be left, right, top or bottom
   * @returns {string[]} return array of tiles and their board position or coordinate in this format tileID:y|x
   */
  private getTileIDWithBoardCoord(from:PlayedTileBoardCellPos, row:number, column:number, direction:number) :string[]{
    //store the array of tiles and their board position or coordinate in this format tileID:y|x
    const tileIDWithBoardCoord :string[]= [];
    //store current tile ID
    let tID = "";
    //continue looping
    while(true){
      //get row value
      //if moving to the top from current row value decrement else if bottom increment else default to row
      //value
      row = direction === DIRECTION.TOP ? --row : direction === DIRECTION.BOTTOM ? ++row : row;
      //get column value
      //if moving to the left from current column value decrement else if right increment else default 
      //to column value
      column = direction === DIRECTION.LEFT ? --column : direction === DIRECTION.RIGHT ? ++column : column;
      //if value is within board boundary
      if(row > -1 && column > -1 && row < scrabbleBoard.length && column < scrabbleBoard.length){
        //get tile ID from board or current played tile value
        tID = from[`${row}|${column}`];
        //if tile exist and not undefined
        if(tID){  
          //push to array
          tileIDWithBoardCoord.push(`${tID}:${row}|${column}`);
        }//end if
        //reach end break out 
        else{
          break;
        }
      }//end if(row > -1 && column > -1 && row < scrabbleBoard.length && column < scrabbleBoard.length)
      //reach end of board break out
      else{
        break;
      }
    }//end while loop
    //return 
    return tileIDWithBoardCoord;
  }

  private getCurrentPlayer() :Player{
    const player = this.players[this.currentPlayTurn];
    if(!player) throw new Error(`player whose current turn is ${this.currentPlayTurn} cannot be undefined`);
    return player;
  }

  /**
   * Determine if game is over. Game is over when tile bag is empty and players pass twice
   * or a player plays all his or her tiles
   */
  private checkIfGameShouldBeOver() :boolean{
    //if tile bag is empty
    if(this.tileBag.length <= 0){
      //get all players
      const players = this.getPlayers();
      //store pass count foreach player
      let passCountForAllPlayer = 0;

      for(let i = 0; i < players.length; i++){
        if(players[i].getTotalTileInRank() === 0){
          return true;
        }//end if
        else if(players[i].getPassCount() === 2){
          passCountForAllPlayer += 1;
        }//end else if
      }//end for loop
      
      if(passCountForAllPlayer === this.numPlayer){
        return true;
      }
    }//end if
    return false;
  }//end private function

  /**
   * calculate player final score, by subracting total of player' unplay score from totalscore
   * and adding it to player with empty rack if any. 
   */
  private calculateFinalScore() :{score:number, name:string}[]{
    //get all players invoved in game
    const players = this.getPlayers();
    //store current player in iteration
    let currentPlayer :Player;
    //store player whose rack is empty when the is over
    let playerWithEmptyRack :Player | null = null;
    //store the total point of all other players unplay t
    let totalOfAllPlayerUnplayedTilesPoint = 0;
    //loop through all players object
    for(let i = 0; i < players.length; i++){
      //store curent player at index i
      currentPlayer = players[i];
      //get total tile in rack when the game is over
      if(currentPlayer.getTotalTileInRank() === 0){
        //store for later use, cos i need to add all other player unplay tile to
        //this player's point
        playerWithEmptyRack = currentPlayer;
      }
      else{
        //store all player unplay tile point
        let totalUnplayedTilePoint = 0;
        //loop thru player tile
        currentPlayer.getTiles().forEach(tile=>{
          //add tile point
          totalUnplayedTilePoint += tile.point
        });//end foreach
        //decrement current player score by total unplay tile point
        currentPlayer.setScore(currentPlayer.getScore() - totalUnplayedTilePoint);
        //add previous player unplay tile point
        totalOfAllPlayerUnplayedTilesPoint += totalUnplayedTilePoint;
      }
    }//end for loop
    //if there is a player with empty rack when game is over
    if(playerWithEmptyRack){
      //add total point of the players with unplay tile
      playerWithEmptyRack.setScore(playerWithEmptyRack.getScore() + totalOfAllPlayerUnplayedTilesPoint);
    }//end if
    //return position base on score
    return players
      .map(p=>({score:p.getScore(), name:p.getPlayerID()}))
      .sort((p1, p2)=>(p2.score - p1.score));
  }//end private method

  private sendGamePayloadAndStartTimer(eventType:string){
    
    if(this.checkIfGameShouldBeOver()){
      //I need to destroy game after the game is over
      //I should only do this after the final score as been sent to all player
      //hence the need for this callback
      
      //keep tab of the number of player to which final score has been sent
      let counter = 0;
      
      const callback = ()=>{
        //after the final score has been sent to all players, delete game
        if((++counter) === this.players.length) Games.deleteGame(this.gameSessionID);
      };
      this.broadcastToAll(EVENT_TYPE.GAME_OVER, {f:this.calculateFinalScore()}, callback);
      //
    }
    else{
      let counter = 0;
      //I need to start clock only after all messag has been sent to client
      const callback = ()=>{
        if(++counter === this.players.length){
          //start time out for current player
          this.startClock();
        }//end if
      }
      this.sendGamePayload(eventType, callback);
    }//end else
  }

  private isCurrentPlayer(playerID:string) :boolean{
    return (this.getIDOfPlayers())[this.currentPlayTurn] === playerID;
  }

  private moveTile(ws:WebSocket, data:MoveTileBoardPos){
    //ensure its the current player that is sending the event
    if(!this.isCurrentPlayer(ws.id) || this.isGamePause() || this.pauseToProcess) return;
    //store the new data to be transmitted to other player
    const newData:{
      x?:number,
      y?:number,
      tile?:TileType,
      prevTileBoardPos:string
    } = {prevTileBoardPos:data.prevTileBoardPos};

    //ensure the tile was moved before sending to other players
    let moveTile = true;
    //if tile is being returned to rack all this variable will be null
    //the variable will be defined if tile is being move around from rack to board or around the board
    if(data.tID && Number.isInteger(data.x) && Number.isInteger(data.y)){
      //ensure the board is not currently occupied by another tile
      if(
        !(this.playedTileBoardCellPos[`${data.y}|${data.x}`]) 
        || (this.playedTileBoardCellPos[data.prevTileBoardPos] === data.tID)
      ){
        //get tile with tile iD
        const tile = tileBag[data.tID];
        //if till is not undefined
        if(tile){
          newData.tile = tile;
          newData.x = data.x;
          newData.y = data.y;
          //set tile id
          this.playedTileBoardCellPos[`${data.y}|${data.x}`] = data.tID;
        }//end if(tile)
      }//end if(!(this.playedTileBoardCellPos[`${data.y}|${data.x}`]))
      //tile is already occupied
      else{
        //ensure that we don't transmit to the other side to move tiles
        moveTile = false;
        //notify the player that the cell is already occupied
        ws.send(stringfyData(EVENT_TYPE.BOARD_CELL_OCCUPIED, {}));
      }//end else
    }//end if(data.tID && Number.isInteger(data.x) && Number.isInteger(data.y))
    //send to all position except sender
    if(moveTile){
      //delete previous position value
      delete this.playedTileBoardCellPos[data.prevTileBoardPos];
      //broadcast to other player
      this.broadcastMsgToEveryoneExcept(ws.id, EVENT_TYPE.MOVE_TILE, newData)
    }//end if
  }

  private submitTile(ws:WebSocket){
    //ensure its the current player that is sending the event
    if(!this.isCurrentPlayer(ws.id) || this.isGamePause() || this.pauseToProcess) return;
    this.pauseToProcess = true;
    //get current player 
    const player = this.getCurrentPlayer();
    //verify user tile input. Ensure client tile input actually form a word
    const {valid, playedWord, playedWordTileIDs} = this.verifyUserTilesAndGetPlayedWord();
    //verify user tiles stored in this.playedTileBoardCellPos
    if(valid && playedWord && playedWordTileIDs){
      //stop clock
      this.stopClock();
      const score = this.scorePlayerAndStoreWordOnTheBoard(playedWordTileIDs);
      //set score
      player.setScore(player.getScore() + score);
      //we only show last five word of all the player
      if(this.lastWords.length > 4){
        this.lastWords = this.lastWords.slice(0, 4);
      }//end if
      
      //put at the front
      this.lastWords.unshift({
        point:score, 
        word:playedWord, 
        player:player.getPlayerID(), 
        score:player.getScore()
      });
      //get current player
      const currentPlayer = this.getCurrentPlayer();
      //remove all played tiles
      currentPlayer.removeTile(Object.values(this.playedTileBoardCellPos));
      //next player
      this.sendGamePayloadAndStartTimer(EVENT_TYPE.NEXT_TURN);
    }//end if(this.verifyUserTiles())
    //if error in user tile placement on board
    else{
      const playerWs = player.getWs();
      //notify player that he or she enter invalid tile
      playerWs.send(stringfyData(EVENT_TYPE.TILE_INPUT_ERROR, {}));
      //remove the played tile from other player(s) board
      this.broadcastMsgToEveryoneExcept(
        playerWs.id, 
        EVENT_TYPE.REMOVE_TILE_FROM_BOARD, 
        Object.keys(this.playedTileBoardCellPos)
      );
      //player is yet to play, so i need to initialize this to empty object
      this.playedTileBoardCellPos = {};
      
      this.pauseToProcess = false;
    }//end else
  }

  private incrementPassCountIfTileBagIsEmpty(){
    //if tile bag is empty and player pass then we need to increment player pass
    //to decide when game is over
    if(this.tileBag.length <= 0){
      this.getCurrentPlayer().incrementPassCount();
    }//end if
  }

  private onPass(ws:WebSocket){
    
    //ensure its the current player that is sending the event
    if(!this.isCurrentPlayer(ws.id) || this.isGamePause() || this.pauseToProcess) return;

    this.pauseToProcess = true;
    //stop clock
    this.stopClock();
    //need this to determine when game is over
    this.incrementPassCountIfTileBagIsEmpty();

    //const currentPlayerID = this.getCurrentPlayer().getPlayerID();
    //notify other player that this player pass
    this.broadcastToAll(
      EVENT_TYPE.PASS,
      {msg:`${this.getCurrentPlayer().getPlayerID()} passed`, b:Object.keys(this.playedTileBoardCellPos)}
    );
    //send payload for next player to start play
    this.sendGamePayloadAndStartTimer(EVENT_TYPE.NEXT_TURN);
  }
  
  private onSearchDict(ws:WebSocket, data:{w:string}){
    //search for all word that match substring
    const wordMatch = this.dictionary.getAllWordThatMatchSubtr(data.w);
    //store the word with the search substr removed, i'll join the word back 
    //on client. Am doing this to reduce the amount of data dat's going to the other side.
    const store :string[] = [];
    //loop through match words.I want to remove the search substring to reduce the amount of data
    //that'll be sent across the wire
    let wordAtIndexI = "", searchSubstrLen = data.w.length - 1;
    for(let i = 0; i < wordMatch.length; i++){
      wordAtIndexI = wordMatch[i];
      store.push(wordAtIndexI.slice(searchSubstrLen));
    }
    //send response back to client
    //I need to send back the search word so client can determine which to use
    //on multiple search
    ws.send(stringfyData(EVENT_TYPE.SEARCH_DICT, {w:data.w, l:store.join(".")}));
  }//end method

  private addEventHandlerToGame(){
    this.addEventListener(EVENT_TYPE.MOVE_TILE, this.moveTile);

    this.addEventListener(EVENT_TYPE.SUBMIT_TILE, this.submitTile);

    this.addEventListener(EVENT_TYPE.PASS, this.onPass);

    this.addEventListener(EVENT_TYPE.SEARCH_DICT, this.onSearchDict);
  }

  private scorePlayerAndStoreWordOnTheBoard(playedWordTileIDs:string[]) :number{
    let score = 0;
    
    let wordMultiplier :number[] = [];
    let tile = null, boardValue="";
    let tileCounter = 0;

    const tempStore :{[key:string]:string}= {};

    Object.keys(this.playedTileBoardCellPos).forEach(boardCellCoord=>{
      tempStore[this.playedTileBoardCellPos[boardCellCoord]] = boardCellCoord;
    });

    let boardCellCoord = "";
    playedWordTileIDs.forEach(tID=>{
      tileCounter += 1;
      boardCellCoord = tempStore[tID];
      //get tile
      tile = tileBag[tID];

      if(boardCellCoord){  
        const [row, column] = boardCellCoord.split("|").map(coord=>parseInt(coord.trim(), 10));
        //get value of the scrabble board where tile is placed
        boardValue = scrabbleBoard[row][column].trim();
        switch(boardValue){
          case "TW":
            score += tile.point;
            wordMultiplier.push(3);
          break;
          case "DW":
          case "CE":
            score +=tile.point;
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
        }//end switch
        //position tile permanently on board
        this.board[boardCellCoord] = tID;
      }//end if(boardCellCoord)
      else{
        score += tile.point;
      }//end else
    });//end foreach
    wordMultiplier.forEach(val=>(score *= val));
    //if the player use all 7 the tiles, 50 point bonus is added
    if(tileCounter === TOTAL_TILE_PER_PLAYER){
      score += 50;
    }//end if(words.length === TOTAL_TILE_PER_PLAYER)
    return score;
  }//end method

  private stopClock(){
    if(this.playTimeoutIntervalID){
      clearInterval(this.playTimeoutIntervalID);
    }
  }

  private startClock(){
    this.playTimeoutIntervalID = setInterval(()=>{
      this.clock = this.clock - 1;
      //determine if player timeout expire
      if(this.clock < 0){
        //cancel timeout and score player 0 since player refuse 
        //to play till timeout expire
        if(this.playTimeoutIntervalID){
          clearInterval(this.playTimeoutIntervalID);
          this.playTimeoutIntervalID = null;
          //needed to determine when game is over
          this.incrementPassCountIfTileBagIsEmpty();
          //notify all other player's that current player passed, cos the player
          //didn't make a move till the clock expiry
          this.broadcastToAll(
            EVENT_TYPE.PASS, 
            {
              msg:`${this.getCurrentPlayer().getPlayerID()} passed`, 
              b:Object.keys(this.playedTileBoardCellPos)
            },
          );
          this.sendGamePayloadAndStartTimer(EVENT_TYPE.NEXT_TURN);
        }//end if
      }//end 
      else{
        //emit interval reduction to all client
        this.broadcastToAll(EVENT_TYPE.CLOCK_TICK, {t:this.clock})
      }
    }, 1000);
    this.pauseToProcess = false;
  }

  private shuffleTiles(tileBag:TileType[]) :TileType[]{
    //shuffle tile here
    const totalTileInBag = tileBag.length;
    //temporarily hold tile till swap complete
    let temp = null;
    //loop 
    for(let  d = 0; d < TIMES_TO_SHUFFLE; d++){
      //get random index between 0 and total in tiles bag
      const indexToSwap = generateRandomNumber(0, totalTileInBag);
      //ensure we do access index beyond length of the array
      const positionToSwap = (d % totalTileInBag);
      //store in temp variable
      temp = tileBag[positionToSwap];
      //replace tile in position with randomly generated tile
      tileBag[positionToSwap] = tileBag[indexToSwap];
      //save temp tile at previous position
      tileBag[indexToSwap] = temp;
    }//end for loop
    return tileBag;
  }//end private method

  private getNextToPlayPlayerID() :string{
    const playerIDs = this.getIDOfPlayers();
    
    this.currentPlayTurn += 1;

    if(this.currentPlayTurn === playerIDs.length){
      this.currentPlayTurn = 0;
    }
    return playerIDs[this.currentPlayTurn];
  }

  private getTilesForPlayer(player :Player) :TileType[]{
    //store tile
    const tiles :TileType[] = [];

    for(let i = 0; i < (TOTAL_TILE_PER_PLAYER - player.getTotalTileInRank()); i++){
      //get tile
      const t = this.tileBag.shift();
      //if bag is not empty tile will not be undefine
      if(t){
        //push to tile array
        tiles.push(t);
      }//end if
      else{
        break;
      }
    }//end for loop
    //if new tiles is added to players tile
    if(tiles.length > 0){
      //add the new tiles
      player.setTiles(tiles);
    }//end if
    //return tiles
    return player.getTiles();
  }//end private method

  private getPlayerPayload() :GamePayload{
    //store data that'll be sent to all player
    const players :ClientPlayer[]= [];
    //store the current player object
    let currentPlayer = null;

    const tiles :{[key:string] : TileType[]} = {};

    //loop through player array to gather all neccessary info
    for(let i = 0; i < this.players.length; i++){
      
      //get current player
      currentPlayer = this.players[i];
      //get player username
      const username = currentPlayer.getPlayerID();
      //
      players.push({username, score:currentPlayer.getScore()});
      //store tile for this user
      tiles[username] = this.getTilesForPlayer(currentPlayer)
    }//end for loop

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
        currentPlayerID:(
          this.isGamePause() 
          ? this.getCurrentPlayer().getPlayerID() 
          : this.getNextToPlayPlayerID()
        ),
        lastWords:this.lastWords,
        players,
        totalTileInBag:this.tileBag.length,
      },
      tiles,
      //start clock at 59
      this.clock,
    ];
    //start counting
  }//end method

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
  private getPoint (tileLetter:string) :number{
    switch(tileLetter.toLocaleUpperCase()){
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
        return 0
    };
  }//end method
}//end class game

class Player{
  private ws:WebSocket;
  private score:number = 0;
  private tiles:TileType[] = [];
  private passCount :number = 0;
  constructor(ws:WebSocket){
    this.ws = ws;
  }

  getTiles() :TileType[]{
    return this.tiles;
  }

  setTiles(newTiles:TileType[]){
    this.tiles = this.tiles.concat(newTiles);
  }//end
  
  removeTile(tileID :string|string[]){
    if(Array.isArray(tileID)){
      this.tiles = this.tiles.filter(t=>tileID.indexOf(t.id) < 0);
    }
    else{
      this.tiles = this.tiles.filter(t=>t.id !== tileID);
    }
  }

  addTile(tile :TileType){
    this.tiles.push(tile);
  }

  replaceWs(ws:WebSocket){
    this.ws = ws;
  }

  getWs() :WebSocket{
    return this.ws;
  }

  incrementScore(increment :number) :void{
    this.score += increment;
  }

  getScore() :number{
    return this.score;
  }

  setScore(score :number){
    this.score = score;
  }

  getTotalTileInRank() :number{
    return this.tiles.length;
  }

  getPlayerID() :string{
    return this.ws.id;
  }

  incrementPassCount(){
    this.passCount++;
  }

  getPassCount() :number{
    return this.passCount;
  }
}

const getError :(msg:string)=>Error = (msg) => {
  const error = new Error("Player cannot not be involved in two game at onces");
  error.name = CUSTOM_ERROR;
  return error;
}

export default class Games{
  private static gameStore :{[key:string]:Game} = {};
  private static dict:Trie;
  private static disconnectUserStore : {[key:string]:string[]} = {};
  

  static init(dict:Trie, emitter:Emitter) :void{
    //initialize dict
    Games.dict = dict;
    //add event to ws close
    emitter.addEventListener("close", function onClose(ws:WebSocket){
      //if ws as game session id then, the player is either waiting for other player to join game
      //or is already playing game
      const gameSessionID = ws.gameSessionID;
      const playerID = ws.id;
      
      if(gameSessionID){
        const game = Games.getGameByGameSessionID(gameSessionID);
        if(game){
          if(game.isGameInProgress()){
            //store player id in disconnect store 
            Games.addPlayerIDToDisconnectGameStore(gameSessionID, playerID)
            //notify all player except player with this ws that a particular player just disconnect and waiting for
            //the client to come back online
            game.broadcastMsgToEveryoneExcept(
              ws.id, 
              EVENT_TYPE.PLAYER_DISCONNECT_DURING_GAME, 
              Games.getDisconnectedPlayerIDByGameSessionID(gameSessionID)
            );
            //pause game
            game.pauseGame();
          }else{
            //notify other user that this user just loose connection so game cannot continue
            //Games.gameStore[ws.gameSessionID] = null;
            game.broadcastMsgToEveryoneExcept(ws.id, EVENT_TYPE.PLAYER_DISCONNECT_BEFORE_START, playerID);
            Games.deleteGame(gameSessionID);
          }
        }//end if
      }
    });

    emitter.addEventListener("open", function(ws:WebSocket){
      //get player id
      const playerID = ws.id;
      //get game session ID base on playerID
      const gameSessionID = Games.getGameSessionIDFromDisconnectStoreUsingPlayerID(playerID);
      //if game session id exist i.e player is already playing a game
      if(gameSessionID){
        //get the game by game session id
        const game = Games.getGameByGameSessionID(gameSessionID);
        //if game exist
        if(game){
          //get player from game using player ID
          const player = game.getPlayerByPlayerID(playerID);
          //remove player ID from disconnect store since player is back online
          Games.removePlayerIDFromDisconnectGameStore(gameSessionID, playerID);
          //if player was found
          if(player){
            //add game session ID to player websocket
            ws.gameSessionID = gameSessionID;
            //replace player's disconnected websocket with newly connected socket object
            player.replaceWs(ws);
            //put player back to game
            game.putPlayerBackInGame(
              player.getWs(), 
              Games.getDisconnectedPlayerIDByGameSessionID(gameSessionID),
              //only resume game after player who was previously offline game's state has been restored
              ()=>{
                 //if all disconnected player are back online resume game
                if(Games.noMorePlayerOffline(gameSessionID)) game.resumeGame();
              }
            );//end game.putPlayerBackInGame
          }//end if(player)
        }//end if(game)
      }//end if
    });//end add eventlisterner
  }//end static init

  static emitEventToGame(eventType:string, ws:WebSocket, data:any={}){
    //get game session id
    const gameSessionID = ws.gameSessionID;
    //if game session is not undefined
    if(gameSessionID){
      //get game from store
      const game = Games.getGameByGameSessionID(gameSessionID);
      //if game exists
      if(game){
        //get emitter for game
        game.emit(eventType, ws, data);
      }//end if(gamee)
    }//end if
  }

  static generateGame(firstPlayerWs:WebSocket, numPlayer:number) :string{
    //first check if player is already involved in another game
    if(Games.gameStore[firstPlayerWs.id]){
      throw getError("Player cannot not be involved in two game at onces");
    }

    else if(numPlayer < 2){
      throw getError("Minimum of two players is required");
    }

    else if(numPlayer > 4){
      throw getError("Maximum of two players is required");
    }
    //get game
    const game = Games.addGame(firstPlayerWs.id, numPlayer);
    //add player to game
    game.addPlayer(firstPlayerWs);
    //the game initiator id will server as game session id
    return firstPlayerWs.id;
  }

  private static addGame(gameSessionID:string, numPlayer:number) :Game{

    if(Games.gameStore[gameSessionID]){
      throw new Error(`Game with this session ${gameSessionID} id already exists`);
    }

    const game:Game = new Game(Games.dict, numPlayer, gameSessionID);

    Games.gameStore[gameSessionID] = game;
    return game;
  }

  static getGameByGameSessionID(gameSessionID:string) :Game|undefined{
    return !!gameSessionID ? Games.gameStore[gameSessionID] : undefined;
  }

  static deleteGame(gameSessionID:string) :void{
    const game = Games.gameStore[gameSessionID];
    if(game){
      game.destroy();
      delete Games.gameStore[gameSessionID];
      delete Games.disconnectUserStore[gameSessionID];
    }
  }

  static addPlayerIDToDisconnectGameStore(gameSessionID:string, playerID:string){
    const playerIDList = Games.disconnectUserStore[gameSessionID];
    if(playerIDList){
      playerIDList.push(playerID);
    }else{
      Games.disconnectUserStore[gameSessionID] = [playerID];
    }
  }

  static removePlayerIDFromDisconnectGameStore(gameSessionID:string, playerID:string){
    const playerIDList = Games.disconnectUserStore[gameSessionID];
    if(playerIDList){
      Games.disconnectUserStore[gameSessionID] = playerIDList.filter(pID=>pID !== playerID);
    }//end if
  }

  static noMorePlayerOffline(gameSessionID :string): boolean{
    return Games.getDisconnectedPlayerIDByGameSessionID(gameSessionID).length < 1;
  }

  static getGameSessionIDFromDisconnectStoreUsingPlayerID(playerID:string) :string|undefined{
    let playerIDList = null;
    const gameSessionIDKeys = Object.keys(Games.disconnectUserStore);
    let gameSessionID = undefined;

    for(let i = 0; i < gameSessionIDKeys.length; i++){
      gameSessionID = gameSessionIDKeys[i];
      playerIDList = Games.disconnectUserStore[gameSessionID];
      if(playerIDList.indexOf(playerID) > -1) return gameSessionID;
    }//end for loop
    return undefined;
  }//end 

  static getDisconnectedPlayerIDByGameSessionID(gameSessionID:string) :string[]{
    const playerIDList = Games.disconnectUserStore[gameSessionID];
    return Array.isArray(playerIDList) ? playerIDList : [];
  }
}//end class Games
