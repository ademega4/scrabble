import React, { useEffect, useState } from 'react'
import { EVENT_TYPE, ROUTES } from '../../lib/enum';
import WebSocketWrapper from '../../lib/client-websocket-wrapper';
import { NewUserJoinGame } from '../NewPlayerJoinGame';

interface Props {
  gameSessionID:string,
  ws:WebSocketWrapper
  changeRoute:(route:string, data?:any)=>void
}

export const JoinGameTimeout:React.FC<Props> = ({ws, gameSessionID, changeRoute}) => {

  const [joinGameList, setJoinGameList] = useState<string[]>([]);

  useEffect(()=>{
    /*eslint-disable react-hooks/exhaustive-deps*/
    const newUserJoinGame :(payload:{u:string})=>void = ({u:justJoined})=>{
      setJoinGameList((prevJoinList)=>(
        prevJoinList.indexOf(justJoined) < 0 
        ? prevJoinList.concat(justJoined) 
        : prevJoinList
      ));
    };

    ws.addEventListener(EVENT_TYPE.JUST_JOINED_GAME, newUserJoinGame);

    const onPlayGameRejection :()=>void = ()=>{
      changeRoute(ROUTES.HOME, {msg:"Offer to play rejected."});
    };

    ws.addEventListener(EVENT_TYPE.CANCEL_OFFER_TO_PLAY, onPlayGameRejection);

    const onPlayerDisconnectBeforeGameStart :(playerID:string)=>void = (playerID)=>{
      changeRoute(ROUTES.HOME, {msg:`Game cancelled cos ${playerID} went offline.`});
    };
    ws.addEventListener(EVENT_TYPE.PLAYER_DISCONNECT_BEFORE_START, onPlayerDisconnectBeforeGameStart);

    return ()=>{
      ws.removeEventListener(EVENT_TYPE.JUST_JOINED_GAME, newUserJoinGame);
      ws.removeEventListener(EVENT_TYPE.CANCEL_OFFER_TO_PLAY, onPlayGameRejection);
      ws.removeEventListener(EVENT_TYPE.PLAYER_DISCONNECT_BEFORE_START, onPlayerDisconnectBeforeGameStart);
    }
  }, [])

  const cancelPlayOffer = ()=>{
    ws.send(EVENT_TYPE.CANCEL_OFFER_TO_PLAY, {s:gameSessionID}, []);  
    changeRoute(ROUTES.HOME);
  };
  
  return (
    <div className="front-page" style={{width:500}}>
      <p className="instruction" style={{marginBottom:10}}>
        Give the other player(s) game session ID
        <strong className="game-session-id">{` ${gameSessionID} `}</strong> 
        to join game.
      </p>
      <p className="instruction" style={{marginBottom:10}}>
        waiting for other player(s) to join game...
      </p>  
      <NewUserJoinGame joinPlayer={joinGameList}/>
      <button style={{marginRight:0}} onClick={cancelPlayOffer}>Cancel</button>
    </div>
  );
}
