import React, { useState, useEffect, useRef } from 'react'
import { ROUTES } from '../../lib/enum';
import {EVENT_TYPE} from "../../lib/enum";
import WebSocketWrapper from '../../lib/client-websocket-wrapper';
import { NewUserJoinGame } from '../NewPlayerJoinGame';


interface Props {
  changeRoute:(route:string, data:any)=>void
  ws:WebSocketWrapper
}

export const JoinGame:React.FC<Props> = ({changeRoute, ws}) => {
  const [joinGameList, setJoinGameList] = useState<string[]>([]);
  const [gameSessionID, setGameSessionID] = useState("");
  const [errored, setErrored] = useState(false);
  const joinGameRef = useRef(false);

  useEffect(()=>{
    /*eslint-disable react-hooks/exhaustive-deps*/
    const joinGameResponse :(payload :{m:string})=>void = ({m:msg})=>{
      changeRoute(ROUTES.HOME, {msg})
    }
    ws.addEventListener(EVENT_TYPE.JOIN_GAME_RESPONSE, joinGameResponse);

    const alreadyJoinList :(payload :{u:string[]})=>void = ({u:joinList})=>{
      joinGameRef.current = true;
      setJoinGameList(joinList);
    }
    ws.addEventListener(EVENT_TYPE.ALREADY_JOINED_GAME, alreadyJoinList);

    const newUserJoinGame :(payload:{u:string})=>void = ({u:justJoined})=>{
      setJoinGameList((prevJoinList)=>(
        prevJoinList.indexOf(justJoined) < 0 
        ? prevJoinList.concat(justJoined) 
        : prevJoinList
      ));
    };
    ws.addEventListener(EVENT_TYPE.JUST_JOINED_GAME, newUserJoinGame);

    const onCancelOfferToPlay: ()=>void = ()=>{
      changeRoute(ROUTES.HOME, {msg:"Offer to play was cancelled"});
    };
    ws.addEventListener(EVENT_TYPE.CANCEL_OFFER_TO_PLAY, onCancelOfferToPlay);

    const onPlayerDisconnectBeforeGameStart :(playerID:string)=>void = (playerID)=>{
      changeRoute(ROUTES.HOME, {msg:`Game cancelled cos ${playerID} went offline.`});
    };
    ws.addEventListener(EVENT_TYPE.PLAYER_DISCONNECT_BEFORE_START, onPlayerDisconnectBeforeGameStart);

    return ()=>{
      ws.removeEventListener(EVENT_TYPE.JOIN_GAME_RESPONSE, joinGameResponse);
      ws.removeEventListener(EVENT_TYPE.ALREADY_JOINED_GAME, alreadyJoinList);
      ws.removeEventListener(EVENT_TYPE.JUST_JOINED_GAME, newUserJoinGame);
      ws.removeEventListener(EVENT_TYPE.CANCEL_OFFER_TO_PLAY, onCancelOfferToPlay);
      ws.removeEventListener(EVENT_TYPE.PLAYER_DISCONNECT_BEFORE_START, onPlayerDisconnectBeforeGameStart);
    };
  }, []);

  

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>)=>{
    
    //prevent
    event.preventDefault();
    //if invalid input
    if(gameSessionID.length > 2){
      //send request to server to generate new game session ID
      ws.send(EVENT_TYPE.JOIN_GAME, {g:gameSessionID.trim()}, [])
    }
    else{
      //color instruction to red to draw attention to invalid input
      setErrored(true)
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>)=>{
    setGameSessionID(event.target.value);
    setErrored(false);
  }

  const cancelJoinOffer = () => {
    //if already join but decided to cancel
    if(joinGameRef.current){
      ws.send(EVENT_TYPE.CANCEL_OFFER_TO_PLAY, {}, []);
    }
    changeRoute(ROUTES.HOME, {});
  };

  return (
    <form className="start-game" onSubmit={handleSubmit}>
      <NewUserJoinGame joinPlayer={joinGameList}/>
      <p style={{marginBottom: 10, color:errored ? "red" : "#000"}}>
        Enter the game session id to join game.
      </p>
      <p>
        {
          joinGameRef.current ? (null) : (
            <>
              <label htmlFor="playerNumber">Game Session ID </label>
              <input type="text" onChange={handleChange} value={gameSessionID}/><br/>
              <label htmlFor=""style={{width: 114, display: "inline-block"}}>&nbsp;</label>
              <input type="submit" value="submit" style={{marginTop:10}}/>
            </>
          )
        }
        <button onClick={cancelJoinOffer} type="button">Cancel</button>
      </p>
    </form>
  );
}