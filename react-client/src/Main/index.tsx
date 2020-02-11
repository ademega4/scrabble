import React, {useRef, useEffect, useState, useCallback} from 'react';

import { createBrowserHistory } from 'history';

import WebSocketWrapper from '../lib/client-websocket-wrapper';

import {DisplayMsg} from "../DisplayMsg";

import Scrabble from "./scrabble" ;
import {FrontPage} from "./FrontPage";

import {wsUrl} from "../lib";
import { EVENT_TYPE, ROUTES } from '../lib/enum';
import { StartNewGame } from './StartNewGame';
import { JoinGameTimeout } from './JoinGameTimeout';
import { JoinGame } from './JoinGame';
import { MsgType, GamePayload, TileBoardCellPos} from '../declaration';

interface ThisRef{
  ws:WebSocketWrapper|null,
  alreadyConnectedAndLoggedOut:boolean,
};

interface Props {
  setIsOnline:React.Dispatch<React.SetStateAction<boolean>>,
  handleLogOut:()=>void,
  isOnline:boolean,
  myUsername:string,
}


const history = createBrowserHistory();

export const Main:React.FC<Props> = ({setIsOnline, handleLogOut, isOnline, myUsername}) => {
  
  const [route, setRoute] = useState<{
    path:string, 
    data:any
  }>({path:ROUTES.HOME, data:{}});

  const [msgDialog, setMsgDialog] = useState<{msg:string, type:MsgType} | null>(null);
  //hold all object on ref
  const thisRef = useRef<ThisRef>({
    ws:null, 
    alreadyConnectedAndLoggedOut:false, 
  });
  //useQuery()
  //get websocket object
  useEffect(()=>{
    /**
     * websocket start here
     */
    //get websocket object
    const ws = new WebSocketWrapper();
    //add event handler to open
    ws.addEventListener(WebSocketWrapper.EVENT_TYPE.OPEN, (event: any)=>{
      //log for debugging
      //show that this user is now online
      setIsOnline(true);
    });

    //add event to close
    ws.addEventListener(WebSocketWrapper.EVENT_TYPE.CLOSE, (event:any)=>{
      //if playing game and the client disconnect and reconnect
      //if the game has not been deleted by server
      //event will be manually sent to client to continue game
      goBackToHomePage();
      //indicate that user is currently offline
      setIsOnline(false);
    });

    ws.addEventListener(WebSocketWrapper.EVENT_TYPE.ERROR, (event:any)=>{
      //if online set to false, automatically react will not re-render
      //if its already false
      setIsOnline(false);
      /**
      * I don't want to set error message when reconnection attempt take place
      */
      if(ws.getTotalReconnectionAttempt() === 0 && ws.isClosed()){
        setMsgDialog({msg:"Unable to connect to the realtime server", type:"ERROR"});
      }
    });

    ws.addEventListener(WebSocketWrapper.EVENT_TYPE.MSG_ERROR, (event:any)=>{
      console.error(event);
    });

    //user defined event
    //user already connected with this ws but connect with another
    //only need one ws for each client, will transfer to new ws
    ws.addEventListener(EVENT_TYPE.ALREADY_CONNECTED, ()=>{
      thisRef.current.alreadyConnectedAndLoggedOut = true;
      ws.closed = true;
      //log user out
      handleLogOut();
    });
    
    ws.addEventListener(EVENT_TYPE.START_GAME, function startGame(data:GamePayload){
      history.replace(ROUTES.GAME, {
        genInfo:data[0], 
        tiles:data[1], 
        tick:data[2], 
        defTileBoardCellPos:{},
        offlinePlayers:[],
      });
    });

    ws.addEventListener(EVENT_TYPE.I_JOIN_GAME_AFTER_DISCONNECT, (payload:[GamePayload, TileBoardCellPos, string[]])=>{
      history.replace(ROUTES.GAME, {
        genInfo:payload[0][0], 
        tiles:payload[0][1], 
        tick:payload[0][2], 
        defTileBoardCellPos:payload[1],
        offlinePlayers:payload[2]
      });
    })

    //try to connect to the server websocket server
    ws.connect(wsUrl, 1, 10, false);
    
    //save ws in ref for later use
    thisRef.current.ws = ws;
    
    /**
     * websocket end here
     */

    /**
     * Routing start here
     */
    
    //no need to check if the route and pathname are the same or not
    //if they are the same set state will not re render
    //setRoute(pathname);
    
    // Listen for changes to the current location.
    const unlisten = history.listen((location, action) => {
      //get pathname
      const {pathname, state} = location;
      // location is an object like window.location
      //no need to check if the route and pathname are the same or not
      //if they are the same set state will not re render
      setRoute({path:pathname, data:state});
    });
    // Get the current location pathname.
    const { pathname }= history.location;
    //debug
    //if there is a refresh of page while waiting for other player 
    //to join game, the game will be terminated anyway, return client
    //to home page
    if(pathname === ROUTES.WAITING_FOR_ACCEPTANCE_OFFER || pathname === ROUTES.GAME){
      history.replace(ROUTES.HOME, {});
    }else{
      history.replace(pathname, {});
    }
    
    //history.replace(ROUTES.GAME, {});

    /**
     * Routing ends here
     */

    /*eslint-disable react-hooks/exhaustive-deps*/
    //when unmounting close connection to server
    return ()=>{
      //only close web
      if(!thisRef.current.alreadyConnectedAndLoggedOut){
        ws.close();
      }
      unlisten();
    };
  }, []);


  const changeRoute = (route:string, data:any={}) :void=> {
    history.replace(route, data);
  }

  const goBackToHomePage = useCallback(()=>{
    changeRoute(ROUTES.HOME, {});
  }, [changeRoute]);

  let stump = null;

  if(thisRef.current.ws && !thisRef.current.ws.isClosed()){

    const {path} = route;
    if (path === ROUTES.HOME){
      const {data} = route;
      stump = (
        <FrontPage changeRoute={changeRoute} msg={data.msg ? data.msg : ""}/>
      );
    } 
  
    else if(path === ROUTES.GAME){
      const {genInfo, tiles, tick, defTileBoardCellPos, offlinePlayers} = route.data;
      //stump = null;
      stump = (
        <Scrabble 
          ws={thisRef.current.ws} 
          defGenInfo={genInfo} 
          defTiles={tiles}
          defTick={tick}
          myUsername = {myUsername}
          goBackToHomePage={goBackToHomePage}
          defTileBoardCellPos={defTileBoardCellPos}
          offlinePlayers={offlinePlayers}
        />
      );
    }
  
    else if(path === ROUTES.START_NEW_GAME){
      stump = (
        <StartNewGame 
          changeRoute={changeRoute} 
          ws = {thisRef.current.ws}
        />
      )
    }
  
    else if(path === ROUTES.WAITING_FOR_ACCEPTANCE_OFFER){
      const {gameSessionID} = route.data;
      stump = (
        <JoinGameTimeout 
          changeRoute={changeRoute}
          ws = {thisRef.current.ws}
          gameSessionID={gameSessionID}
        />
      )
    }//end else if(route === ROUTES.WAITING_FOR_ACCEPTANCE_OFFER)
  
    else if(path === ROUTES.JOIN_GAME){
      stump = (
        <JoinGame 
          changeRoute={changeRoute} 
          ws = {thisRef.current.ws}
        />
      )
    }//end if(route === ROUTES.JOIN_GAME)

    else{
      stump = (
        <div>Not Found</div>
      );
    }//end else
  }
  
  else if(msgDialog){
    stump = (
      <DisplayMsg msg={msgDialog.msg} type={msgDialog.type}/>
    )
  }

  else if(!isOnline){
    return <DisplayMsg msg = "You are currently Offline." type="WARNING"/>
  }

  return stump;
}