import React from "react";
import "./index.css"

const Player = ()=>{
  return (
    <div 
      style={{
        display:"flex",
        backgroundColor: "#6ba2b7",
        width:250,
        borderRadius:5,
        padding:5,
        color:"#fff",
        marginBottom:"20px"
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
        >&nbsp;</span> ZRK
      </div>
      <div style={{flex:1}}>
        <div>
          &#128337; 00 : 23
        </div>
        <div>
          &#x1F4BB; 0
        </div>
      </div>
    </div>
  );
}

const Board = ()=>{
  return (
    <table 
      style={{
        borderRadius:5, 
        backgroundColor: "#6ba2b7", 
        width:250, 
        color:"#fff",
        height:200
      }}
    >
      <thead
        style={{boxShadow:"0px 2px 1px 0px rgba(0, 0, 0, 0.5"}}
      >
        <tr>
          <th>Player</th>
          <th>Word</th>
          <th>Points</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody style={{textAlign:"center"}}>
        <tr style={{verticalAlign:"top"}}>
          <td className="word-wrap-up">
            Zrk
          </td>
          <td>Dicast</td>
          <td>18</td>
          <td>18</td>
        </tr>
      </tbody>
    </table>
  );
}

const Button : React.FC<{style:any}> = ({style})=>{
  return(<button className="_button" style={style}></button>)
}

const Scrabble = ()=>{
  return(
    <section className="wrapper">
        <div className="score-board">
          <Player/>
          <Player/>
          <Player/>
          <Board/>
        </div>
        <div className="scrabble-board-wrapper">
        <div className="scrabble-board">
          <div className="board">
            <div className="board-wrapper">

            </div>
          </div>
          <Button 
            style={{
              bottom:-60,
              left:-110,
              boxShadow:"10px -5px 0 #675f4f"
            }}
          />
          <Button 
            style={{
              bottom:-50,
              right:-170, 
              backgroundColor:"green",
              boxShadow: "-10px -5px 0 #675f4f"
            }}/>
        </div>
        </div>
    </section>
  );
}

export default Scrabble;