import React, { useRef, useEffect } from "react";
import {SIZE, getElementPosition} from "../../../../lib";

interface Props{
  text:string, 
  color:string,
  rowIndex:number, 
  columnIndex:number,
  backgroundColor:string, 
  hovering:boolean,
  resetTilePosOnBoard:(boardCellPos:{x:number, y:number}, _scrollTop:number, tileID:string)=>void,
  tileID?:string
  children:React.ReactNode
  _scrollTop:number
  // x:number,
  // y:number
}

export const BoardSlot : React.FC<Props> = ({
  text, rowIndex, columnIndex, backgroundColor, color, 
  hovering, resetTilePosOnBoard, tileID, children, _scrollTop
})=>{

  const addShadow = hovering ? {boxShadow:"0px 0px 4px 4px rgba(0, 0, 0,1)"} : {};

  const boardCellRef = useRef<HTMLDivElement>(null);
  
  useEffect(()=>{
    if(tileID && boardCellRef.current){
      resetTilePosOnBoard(getElementPosition(boardCellRef.current), _scrollTop, tileID);
    }
  });

  return text === "" ? (
    <div 
      style={{userSelect: "none", ...addShadow}} 
      className="empty-slot"
      ref={tileID ? boardCellRef : null}
    >
      {
        children
      }
    </div>
  ) : (
    <div 
      style={{
        backgroundColor,
        userSelect: "none",
        color,
        lineHeight:"2.3",
        textAlign:"center",
        position:"relative",
        ...addShadow
      }}
      ref={tileID ? boardCellRef : null}
    >
      {
        children ? children : text
      }
      {
        rowIndex === 0 ? (
          null
        ) : (
          <span 
            className="arrow-up" 
            style={{borderBottom: `5px solid ${backgroundColor}`}}
          ></span>
        )
      }
      {
        rowIndex === (SIZE - 1) ? (
          null
        ) : (
          <span 
            className="arrow-down" 
            style={{borderTop: `5px solid ${backgroundColor}`}}
          ></span>
        )
      }
      {
        columnIndex === 0 ? (
          null
        ) : (
          <span 
            className="arrow-left" 
            style={{borderRight: `5px solid ${backgroundColor}`}}
          ></span>
        )
      }
      {
        columnIndex === (SIZE - 1) ? (
          null
        ) : (
          <span 
            className="arrow-right" 
            style={{borderLeft: `5px solid ${backgroundColor}`}}
          ></span>
        )
      }
    </div>
  )
};
