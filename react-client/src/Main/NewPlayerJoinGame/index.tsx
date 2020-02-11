import React from 'react';
import "./index.css";

interface Props {
  joinPlayer:string[]
}

export const NewUserJoinGame :React.FC<Props> = ({joinPlayer}) => {
  return (
    <ul>
      {
        joinPlayer.map(
          p=>(
          <li key={p} className="player">&#9977; {`${p} join game`}</li>
        ))
      }
    </ul>
  );
}