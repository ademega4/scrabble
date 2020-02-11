export default class Socket{
  public ws:WebSocket;
  public username:string;
  constructor(ws:WebSocket, username:string){
    this.ws = ws;
    this.username = username
  }
}