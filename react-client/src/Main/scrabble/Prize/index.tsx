import React from 'react'
import { PrizeItem } from './PrizeItem';
import { MEDAL_TYPE, PlayerPosition } from '../../../declaration';

interface MedalTypes {
  prizeAvatarUrl:string,
  avatarAlt:string,
  medalType:MEDAL_TYPE
};

interface Props {
  players:PlayerPosition[],
  goBackToHomePage:()=>void,
};

const Medals :MedalTypes[] = [
  {prizeAvatarUrl:"./img/1st-pos.jpg", avatarAlt:"gold medal", medalType:MEDAL_TYPE.GOLD},
  {prizeAvatarUrl:"./img/2nd-pos.jpg", avatarAlt:"silver medal", medalType:MEDAL_TYPE.SILVER},
  {prizeAvatarUrl:"./img/3rd-pos.jpg", avatarAlt:"bronze medal", medalType:MEDAL_TYPE.BRONZE},
]

export const Prize:React.FC<Props> = ({players, goBackToHomePage}) => {
  //ensure player is not more than
  players = players.length > 3 ? players.slice(0, 3) : players;
  
  let index  = -1;
  const medalStore : JSX.Element[]= [];
  let player = null;

  /**
   * since the result already sorted according to player's score
   * the player who got first will be the first item at index 0 
   * but i want the player who got second who is at index 1 to be 
   * display first following the olympic style of awarding medal to participant
   */
  for(let i = 0; i < players.length; i++){
    //let the silver medal position be display first followed by gold
    //and then bronze
    index = i === 0 ? 1 : i === 1 ? 0 : i;
    //get player at index
    player = players[index];
    //push to array
    medalStore.push(
      <PrizeItem key={player.name} {...Medals[index]} {...player}/>
    );
  }

  const twoPlayerWidth = players.length < 3 ? {width:330} : {};

  return (
    <div className="open-modal">
      <div className="modal-content" style={{height:320, ...twoPlayerWidth}}>
        <div className="header" style={{position:"relative"}}>
          Prize <span className="close" onClick={goBackToHomePage}>&#x2613;</span>
        </div>
        <div className="body"style={{position:"relative"}}>
          {
            medalStore
          }
        </div>
      </div>
    </div>
  );
}