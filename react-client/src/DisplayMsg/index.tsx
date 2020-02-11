import React from 'react'
import "./index.css";
import {MsgType} from "../declaration";

interface Props {
  msg:string,
  type:MsgType,
}


export const DisplayMsg : React.FC<Props> = ({msg, type}) => {

  let color = "#f44949";

  if(type === "INFO"){
    color = "#b8f7ee";
  }
  else if(type === "WARNING"){
    color = "#ff9900";
  }

  return (
    <div 
      className="error" 
      style={{backgroundColor : color}}
    >
      {
        msg
      }
    </div>
  );
}