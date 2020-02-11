export enum MEDAL_TYPE  {
  GOLD,
  SILVER,
  BRONZE,
};

export interface PlayerPosition{
  name:string,
  score:number,
}

export type Coordinate = {x:number, y:number};

export type MsgType = "ERROR" | "INFO" | "WARNING";

export type ClientPlayer = {username:string, score:number};

export type LastWord = {word:string, point:number, score:number, player:string}

export type GeneralInfo = {
  currentPlayerID:string, 
  totalTileInBag:number,
  players:ClientPlayer[],
  lastWords:LastWord[],
};

export type TileBoardCellPos = {[key:string]:TileType};

export type PlayedTileBoardCellPos = {[key:string]:string}

export type GamePayload = [GeneralInfo, TileType[], number];

export interface SelectedTileType{
  id:string, diff:{y:number, x:number}
};

export type TileType = {
  letter:string,
  point:number,
  id:string,
};

export interface QueryResponse{
  loading:boolean,
  data:any,
  error:Error|null,
  reQuery:(uri:string, option?:RequestOption)=>void
};


export interface MutationResponse{
  loading:boolean,
  data:any,
  error:Error|null
};

export type METHOD = "POST" | "GET" | "PUT" | "DELETE";
export type MODE = "no-cors" | "cors" | "same-origin";
export type CACHE = "default" | "no-cache" | "reload" | "force-cache";
export type CREDENTIALS = "omit" | "same-origin" | "include";
export type HEADERS = {"Content-type":"application/json"|"application/x-www-form-urlencoded"};

export interface RequestOption {
  method?:METHOD,
  mode?:MODE
  cache?:CACHE,
  credentials?:CREDENTIALS,
  headers?:HEADERS,
  body?:string
};

export type DoQuery = (
  uri:string, 
  option:RequestOption, 
  setResponse:(response:QueryResponse)=>void, 
  ignoreResult:React.MutableRefObject<boolean>,
  reQuery:(uri:string, option?:RequestOption)=>void,
)=>void;

export type DoMutation = (
  uri:string,

)=>void