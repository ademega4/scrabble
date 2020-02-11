import Emitter from "./emitter";

export default class WebSocketWrapper extends Emitter{

  static readonly READY_STATE :{
    CONNECTING:number, OPEN:number, CLOSING:number, CLOSED:number
  } = {
    CONNECTING:0,
    OPEN:1,
    CLOSING:2,
    CLOSED:3
  };

  // static readonly TYPE :{[index:string]:string} = {
  //   CLOSE:"close",
  //   ERROR:"error"
  // };

  static readonly EVENT_TYPE :{
    OPEN:string, CLOSE:string, ERROR:string,MESSAGE:string,
    MSG_ERROR:string
  } = {
    OPEN:"open",
    CLOSE:"close",
    ERROR:"error",
    MESSAGE:"message",
    MSG_ERROR:"0"
  }

  public closed:boolean = false;
  private connection:WebSocket|null = null;
  private timeout:any = null;
  private totalReconnectionAttempt: number = 0;

  constructor(){
    super();
  }

  connect(url:string, retryConnectionTimeoutInSecs :number=0, reConnectionAttempt :number=5, secure :boolean=false){
    url = (
      url && url !== "" 
      ? url 
      : (`${secure ? "wss":"ws"}://${window.location.hostname}:${window.location.port}`)
    );

    this.connection = new WebSocket(url);
    
    this.connection.addEventListener(WebSocketWrapper.EVENT_TYPE.OPEN, (event)=>{
      //if currently set, it means client try to reconnect after disconnect from server
      if(this.timeout){
        //no need to retry again
        clearTimeout(this.timeout);
      }
      //number of time client try to reconnect to the server
      this.totalReconnectionAttempt = 0;
      //connection.send(msg.value);
      this.emit(WebSocketWrapper.EVENT_TYPE.OPEN, event);
    });

    this.connection.addEventListener(WebSocketWrapper.EVENT_TYPE.CLOSE, (event)=>{
      this.emit(WebSocketWrapper.EVENT_TYPE.CLOSE, event);
      
      //if connection was lost and client didn't log him or her self out 
      //try to reconnect again
      if(retryConnectionTimeoutInSecs > 0 && !this.closed && (reConnectionAttempt > 0 || reConnectionAttempt === -1) && !this.timeout){
        //increment number of time client try to reconnect
        this.totalReconnectionAttempt++;
        //console.info("trying to reconnect...");
        this.timeout = setTimeout(()=>{
          this.connect(
            url, 
            retryConnectionTimeoutInSecs, 
            (reConnectionAttempt === -1 ? (reConnectionAttempt) : (reConnectionAttempt > 0 ? (reConnectionAttempt - 1) : 0))
          );
          this.timeout = null;
        }, (retryConnectionTimeoutInSecs * 1000))
      }
      this.connection = null;
    });

    this.connection.addEventListener(WebSocketWrapper.EVENT_TYPE.ERROR, (error)=>{
      this.emit(WebSocketWrapper.EVENT_TYPE.ERROR, error);
    });
    //when message is sent from the server
    this.connection.addEventListener(WebSocketWrapper.EVENT_TYPE.MESSAGE, (event:any)=>{
      let payload = null;
      let error = null;
      try{
        payload = JSON.parse(event.data);
      }
      catch(e){
        error = e
      }
      if(error){
        this.emit(WebSocketWrapper.EVENT_TYPE.MSG_ERROR, error);
      }
      else if(payload){  
        //the event type is at index 0 of payload array
        //the actuall data is at index 1
        this.emit(payload[0], payload[1]);
      }
    });
    return this;
  }//end function connect
  
  close(code=1000, reason=""){ 
    //if in the process of reconnecting
    if(this.timeout){
      //stop reconnecting cos client decided to log out
      clearTimeout(this.timeout);
      //set to null
      this.timeout = null;
    }
    if(this.connection){
      this.connection.close(code, reason);
      this.connection = null;
    }
    //don't attempt to reconnect
    this.closed = true;
  }//end close method

  send<T>(eventType:string, data:T, receivers:string[]){
    //if connection is still active
    if(this.connection && this.connection.readyState === WebSocket.OPEN){
      //stringify message to send to server
      const payload = JSON.stringify([eventType, data, receivers]);
      //debug
      //send payload to server to be sent to receiver
      this.connection.send(payload);
    }//end if
    //if connection is closed throw error to caller
    else{
      throw new Error("Connection is closed");
    }
  }

  /**
   * @description return true if websocket connection is closed else return true
   */
  isClosed() :boolean{
    return this.connection && this.connection.readyState === WebSocket.OPEN ? false : true;
  }

  /**
   * @description get the number of time ws try to reconnect to the server
   */
  getTotalReconnectionAttempt() :number{
    return this.totalReconnectionAttempt;
  }
}//end class