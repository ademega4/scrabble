import React, { CSSProperties } from "react";
import { LastWord } from "../../../declaration";

interface Props{
  playerInputTracker:LastWord[]
};

const st:CSSProperties = {
  textAlign:"center",
  flex:1
};

const ScoreBoard :React.FC<Props>= ({playerInputTracker})=>{
  return (
    <div
        style={{
          borderRadius:5, 
          backgroundColor: "#6ba2b7", 
          width:250, 
          color:"#fff",
          height:200
        }}
      >
        <div
          style={{
            boxShadow:"0px 2px 1px 0px rgba(0, 0, 0, 0.5)",
            display:"flex", padding:5
          }}
        >
          <div style={st}>Player</div>
          <div style={st}>Word</div>
          <div style={st}>Points</div>
          <div style={st}>Total</div>
        </div>
        {
          playerInputTracker.map(({player, point, word, score}, index)=>(
            <div 
              style={{display:"flex", marginTop:5}}
              key={`${word}${index}`}
            >
              <div className="word-wrap-up" style={st}>{player}</div>
              <div style={st}>{word}</div>
              <div style={st}>{point}</div>
              <div style={st}>{score}</div>
            </div>
          ))
        }
      </div>
  );
}

export default ScoreBoard;
