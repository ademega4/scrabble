import React, { useRef, useEffect } from "react";

interface Props {
  maxWidth:number,
  children:React.ReactChild[] | React.ReactChild,
  handleSubmitTile:()=>void,
  handlePass:()=>void,
  disableBtn:boolean,
}

const ScrabbleActionButton : React.FC<Props> = ({maxWidth, children, handleSubmitTile, handlePass, disableBtn})=>{
  const submitTileRef = useRef<HTMLButtonElement>(null);
  const passRef = useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    const id = setTimeout(()=>{
      if(submitTileRef.current) submitTileRef.current.blur();
      if(passRef.current) passRef.current.blur();
    }, 600);

    return ()=>{
      clearTimeout(id);
    }
  })
  return (
    <div className="action-btn-cont" style={{maxWidth, marginBottom:10}}>
      <button 
        ref={passRef}
        className="action-btn" 
        style={{backgroundColor:disableBtn ? "grey" : "red"}}
        onClick={handlePass}
        disabled={disableBtn}
      >
      </button>
      <button 
        className="action-btn" 
        style={{backgroundColor:disableBtn ? "grey" : "#35bd35", float:"right"}}
        onClick={handleSubmitTile}
        ref={submitTileRef}
        disabled={disableBtn}
      >
      </button>
      {
        children
      }
    </div>
  );
}

export default ScrabbleActionButton;