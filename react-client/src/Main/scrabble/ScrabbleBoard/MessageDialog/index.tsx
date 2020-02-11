import React, {useEffect} from 'react'
import { MsgType } from '../../../../declaration';

interface Props {
  msg:string,
  type:MsgType,
  handleHideDialog:(id:string)=>void,
  top:number,
  id:string,
  hide:boolean
};
//30 secs
const DIALOG_TIMEOUT = 1000 * 2;

export const MessageDialog:React.FC<Props> = ({type, msg, handleHideDialog, top, id, hide}) => {

  useEffect(()=>{
    if(hide){
      const timeoutID = setTimeout(()=>{
        handleHideDialog(id);
      }, DIALOG_TIMEOUT);
  
      return ()=>{
        clearTimeout(timeoutID);
      }
    }
    /*eslint-disable react-hooks/exhaustive-deps*/
  }, [hide]);

  let color = "#f44949";

  if(type === "INFO"){
    color = "#b8f7ee"
  }

  else if(type === "WARNING"){
    color = "#ff9900";
  }

  return (
    <div 
      style={{
        position:"absolute", 
        textAlign:"center",
        width: "100%",
        zIndex:1002,
        backgroundColor:color,
        boxShadow:"1px 1px 2px 1px rgba(0, 0, 0, 0.6), -1px -1px 2px 1px rgba(0, 0, 0, 0.6)",
        fontFamily:"cursive",
        height:25,
        paddingTop:4,
        boxSizing: "border-box",
        top
      }}
    >
      {msg}
    </div>
  );
}