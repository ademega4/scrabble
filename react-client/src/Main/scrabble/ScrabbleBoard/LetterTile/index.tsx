import React from "react";
import { TileType, SelectedTileType, Coordinate } from "../../../../declaration";

interface Props{
  tile:TileType, 
  pos:Coordinate,
  zIndex:number,
  //boundary:{x1:number, x2:number, y1:number, y2:number}
  handleSetSelectedTile:(selectedTile:SelectedTileType, boardCellPos:Coordinate, prevPos:Coordinate)=>void,
  boardCellPos:Coordinate,
  justPlayedTile:boolean,
}

export const MovableLetterTile:React.FC<Props> = (
  {tile, pos:{x, y}, handleSetSelectedTile, zIndex, boardCellPos, justPlayedTile})=>{
    
  const onMouseDown = (event: React.MouseEvent<HTMLDivElement, MouseEvent>)=>{
    handleSetSelectedTile(
      {id:tile.id, diff:{x:(event.clientX - x), y:(event.clientY - y)}},
      boardCellPos,
      {x, y}
    );
  };

  const boxShadow = justPlayedTile ? {boxShadow:"1px 1px 0px 1px rgba(0, 0, 0, 0.9), -1px -1px 0px 1px rgba(0, 0, 0, 0.9)"} : {};
  
  return (
    <div 
      className="ScrabbleBlock" 
      style={{left:x, top:y, zIndex, ...boxShadow}} 
      onMouseDown={onMouseDown} 
    >
      <span className="ScrabbleLetter" style={{marginRight:1}}>{tile.letter}</span>
      {
        tile.point === 0 
        ? null 
        : <span className="ScrabbleNumber">{tile.point}</span>
      }
    </div>
  )
}


export const UnMovableLetterTile:React.FC<{tile:TileType}> = ({tile})=>{
  return (
    <div 
      className="ScrabbleBlock" 
      style={{position:"relative", zIndex:1000, top:-1}}  
    >
      <span className="ScrabbleLetter" style={{marginRight:1}}>{tile.letter}</span>
      {
        tile.point === 0 
        ? null 
        : <span className="ScrabbleNumber">{tile.point}</span>
      }
    </div>
  )
}