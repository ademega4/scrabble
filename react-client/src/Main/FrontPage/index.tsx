import React, { useEffect, useState } from 'react'

import { ROUTES } from '../../lib/enum';

interface Props {
  changeRoute:(route:string)=>void,
  msg:string
}

export const FrontPage:React.FC<Props> = ({changeRoute, msg}) => {
  const [stateMsg, setStateMsg] = useState(msg)
  
  useEffect(()=>{
    const timeout = setTimeout(()=>{
      setStateMsg("");
    }, 3000);

    return ()=>{
      clearTimeout(timeout);
    }
  }, []);

  return (
    <div className="front-page">
      {
        stateMsg ? <p style={{marginBottom: 10,fontFamily:"cursive"}}>{stateMsg}</p> : null
      }
      <button onClick = {()=>changeRoute(ROUTES.START_NEW_GAME)}>Start A Game</button>
      <button onClick={()=>changeRoute(ROUTES.JOIN_GAME)}>Join A Game</button>
    </div>
  );
}