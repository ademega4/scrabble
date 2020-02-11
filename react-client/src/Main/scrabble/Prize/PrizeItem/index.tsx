import React from 'react';
import { MEDAL_TYPE } from '../../../../declaration';

interface Props {
  prizeAvatarUrl:string,
  name:string,
  score:number,
  avatarAlt:string,
  medalType:MEDAL_TYPE
}

export const PrizeItem : React.FC<Props> = ({prizeAvatarUrl, name, score, avatarAlt, medalType}) => {
  
  const style :{left:number, top:number, height:number}  = (
    medalType === MEDAL_TYPE.GOLD 
    ? {left:140, top:0, height:248} 
    : medalType === MEDAL_TYPE.SILVER 
    ? {left:0, top:10, height:238} 
    : {left:280, top:20, height:228}
  );
  
  return (
    <div 
      style={{
        borderRadius: 10,
        boxShadow: "1px 1px 6px 1px rgba(0, 0, 0, 0.9)",
        position:"absolute",
        left:style.left,
        top:style.top,
        width:122,
        height:style.height
      }}>
      <p
        style={{
          textAlign:"center", 
          color: "#fff",
          fontFamily: "cursive",
          padding:4,
        }}
      >
        {name}
      </p>
      <img src={prizeAvatarUrl} alt={avatarAlt} style={{width:"inherit"}}/>     
      <p
        style={{
          padding: 5,
          textAlign: "center",
          margin: 5,
          backgroundColor: "#060607",
          borderRadius:10,
          color:"#64edcb",
          fontFamily:"cursive",
        }}
      >{score}</p>
    </div>
  );
}