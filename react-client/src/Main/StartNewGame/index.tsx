import React, { useState, useEffect } from 'react'
import { ROUTES, EVENT_TYPE } from '../../lib/enum';
import WebSocketWrapper from '../../lib/client-websocket-wrapper';


interface Props {
  changeRoute:(route:string, data?:any)=>void
  ws:WebSocketWrapper
}

export const StartNewGame:React.FC<Props> = ({changeRoute, ws}) => {
  
  const [numPlayer, setNumPlayer] = useState<string>("");
  //const [serverResponse, setServerResponse] = useState<>
  const [errored, setErrored] = useState(false);
  
  
  useEffect(()=>{
    const onGenerateGameSessionOffer :(payload:{s?:string, msg?:string})=>void = ({s:gameSessionID, msg})=>{
      if(gameSessionID){
        changeRoute(ROUTES.WAITING_FOR_ACCEPTANCE_OFFER, {gameSessionID});
      }
      else{
        changeRoute(ROUTES.HOME, {msg});
      }
    };

    ws.addEventListener(EVENT_TYPE.GENERATE_GAME_SESSION_OFFER_ID, onGenerateGameSessionOffer);

    return ()=>{
      ws.removeEventListener(EVENT_TYPE.GENERATE_GAME_SESSION_OFFER_ID, onGenerateGameSessionOffer);
    }
    
  }, [changeRoute, ws]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>)=>{
    //prevent
    event.preventDefault();
    //convert string to number
    const n = parseInt(numPlayer);
    //if invalid input
    if(Number.isInteger(n) && n > 1 && n < 5){
      
      //send request to server to generate new game session ID
      ws.send(EVENT_TYPE.GENERATE_GAME_SESSION_OFFER_ID, {n}, []);
    }
    else{
      //color instruction to red to draw attention to invalid input
      setErrored(true)
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>)=>{
    setNumPlayer(event.target.value);
    setErrored(false);
  }

  
  return (
    <form className="start-game" onSubmit={handleSubmit}>
      <p style={{marginBottom: 10, color:errored ? "red" : "#000"}}>
        Enter the number of player(s) that'll be involved in the game. 
        Must be minimum of 2 and maximum of 4
      </p>
      <p>
        <label htmlFor="playerNumber">Number of Player(s)</label>
        <input type="text" onChange={handleChange} value={numPlayer}/>
        <br/>
        <label htmlFor=""style={{width: 114, display: "inline-block"}}>&nbsp;</label>
        <input type="submit" value="submit" style={{marginTop:10}}/>
        <button onClick={()=>changeRoute(ROUTES.HOME)} type="button">Cancel</button>
      </p>
    </form>
  );
}