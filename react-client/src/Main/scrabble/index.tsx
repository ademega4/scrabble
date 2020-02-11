import React, { useEffect, useState, useCallback, useRef } from "react";
import Player from "./Player";
import ScoreBoard from "./ScoreBoard";
import ScrabbleBoard from "./ScrabbleBoard";
import ScrabbleBag from "./ScrabbleBag";
import WebSocketWrapper from "../../lib/client-websocket-wrapper";
import { EVENT_TYPE } from "../../lib/enum";
import { GeneralInfo, TileType, GamePayload, PlayerPosition, TileBoardCellPos } from "../../declaration";
import {Dictionary } from "./Dictionary";
import {Modal} from "../Modal";
import { Prize } from "./Prize";
import { getPlayerOfflineMsg } from "../../lib";

interface Props{
  ws:WebSocketWrapper,
  defTiles:TileType[],
  defGenInfo:GeneralInfo
  defTick:number,
  myUsername:string,
  goBackToHomePage:()=>void,
  defTileBoardCellPos:TileBoardCellPos,
  offlinePlayers:string[]
};

const Scrabble: React.FC<Props> = ({ws, defTick, defTiles, defGenInfo, myUsername, goBackToHomePage, defTileBoardCellPos, offlinePlayers})=>{
  const [tick, setTick] = useState(defTick);
  const [genInfoAndTiles, setGenInfoAndTiles] = useState<{tiles:TileType[], genInfo:GeneralInfo}>({
    tiles:defTiles, genInfo:defGenInfo
  });

  const [toggleDict, setToggleDict] = useState(false);

  const [playerPosition, setPlayerPosition] = useState<PlayerPosition[]>([]);

  const showMsgRef = useRef<boolean>(true);

  // const updateShowMsgRef = useCallback(()=>{
  //   showMsgRef.current = false;
  // }, []);
  
  useEffect(()=>{
    //onTimer

    const onClockTick: (payload:{t:number})=>void = ({t:tick})=>{
      //console.log(tick);
      setTick(tick);
    };
    ws.addEventListener(EVENT_TYPE.CLOCK_TICK, onClockTick);

    const onNextTurn :(gamePayload:GamePayload)=>void = (gamePayload)=>{
      //console.log(gamePayload);
      const [genInfo, tiles, tick] = gamePayload;
      setTick(tick);
      
      showMsgRef.current = true;
      console.log({showMsg:showMsgRef.current});
      setGenInfoAndTiles({genInfo, tiles});
    };
    ws.addEventListener(EVENT_TYPE.NEXT_TURN, onNextTurn);

    const onGameOver:(data:{f:PlayerPosition[]})=>void = ({f:playerPosition})=>{
      setPlayerPosition(playerPosition);
    };
    ws.addEventListener(EVENT_TYPE.GAME_OVER, onGameOver);

    return ()=>{
      ws.removeEventListener(EVENT_TYPE.CLOCK_TICK, onClockTick);
      ws.removeEventListener(EVENT_TYPE.NEXT_TURN, onNextTurn);
      ws.removeEventListener(EVENT_TYPE.GAME_OVER, onGameOver);
    };
    /*eslint-disable react-hooks/exhaustive-deps*/
  }, []);

  const {genInfo, tiles} = genInfoAndTiles
  //on
  const isCurrentPlayer = myUsername === genInfo.currentPlayerID;

  const handleToggleDict = useCallback(
    ()=>setToggleDict(prevToggleDict=>!prevToggleDict), 
    [setToggleDict]
  );

  const arePlayerOffline = offlinePlayers.length > 0;
  
  return(
    <section className="wrapper">
      <div className="score-board">
        {
          genInfo.players.map(p=>(
            <Player 
              key={p.username} 
              score={p.score} 
              isCurrentPlayer={p.username === genInfo.currentPlayerID}
              tick={tick}
              username={p.username}
            />
          ))
        }
        <ScoreBoard playerInputTracker={genInfo.lastWords}/>
        <div style={{textAlign:"center", paddingTop:10}}>
          <ScrabbleBag totalTileInBag={genInfo.totalTileInBag}/>
          <img 
            src="./img/dictionary.jpg" 
            alt="dict" style={{width:50, cursor:"pointer"}} 
            onClick = {handleToggleDict}
          />
        </div>
      </div>
      <ScrabbleBoard 
        tiles={tiles} 
        ws={ws}
        isCurrentPlayer={isCurrentPlayer}
        msg={(
          arePlayerOffline 
          ? getPlayerOfflineMsg(offlinePlayers) 
          : (
            isCurrentPlayer ? "Its your turn to play." : `${genInfo.currentPlayerID} is on turn to play.`
          )
        )}
        arePlayerOffline={arePlayerOffline}
        passed={isCurrentPlayer && ((tick - 1) < 0)}
        defTileBoardCellPos={defTileBoardCellPos}
        //showMsg={showMsgRef.current}
        currentPlayerID={genInfo.currentPlayerID}
        //updateShowMsgRef={updateShowMsgRef}
      />
      {
        toggleDict ? (
          <Modal>
            <Dictionary handleToggleDict={handleToggleDict} ws={ws}/>
          </Modal>
        ) : null
      }
      {
        playerPosition.length > 0 ? (
          <Modal>
            <Prize 
              players={playerPosition}
              goBackToHomePage={goBackToHomePage}
            />
          </Modal>
        ) : null
      }
    </section>
  );
}

export default Scrabble;