import React from "react";

interface Props{
  username:string,
  score:number
  isCurrentPlayer:boolean
  tick:number
};

const  Player :React.FC<Props> = ({username, score, isCurrentPlayer, tick})=>{
  return (
    <div 
      style={{
        display:"flex",
        backgroundColor: "#6ba2b7",
        width:250,
        borderRadius:5,
        padding:5,
        color:"#fff",
        marginBottom:"20px",
        border:(isCurrentPlayer ? "solid 2px green" : "none")
      }}
    >
      <img 
        style={{width:50,flexBasis:50,  borderRadius:"50%"}} 
        src="./img/avatar/default-avatar.jpg"
        alt=""
      />
      <div style={{
        flexBasis:100,
        marginLeft: 10,
        }} className="word-wrap-up">
        <span
          style={{
            width: 10,
            backgroundColor: "green",
            display: "inline-block",
            borderRadius: "50%",
            height: 10,
            position:"relative",
            top:4,
          }}
        >&nbsp;</span> {username}
      </div>
      <div style={{flex:1}}>
        <div>
          &#128337; {isCurrentPlayer ? tick : ""}
        </div>
        <div>
          &#x1F4BB; {score}
        </div>
      </div>
    </div>
  );
}

export default Player

//&#128337;