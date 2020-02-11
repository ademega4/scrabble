import React from 'react'

interface Props {
  totalTileInBag:number
}

const ScrabbleBag:React.FC<Props> = ({totalTileInBag}) => {
  return (
    <span style={{position:"relative"}}>
      <img src="./img/scrabble-bag-2.jpg" alt="scrabble bag" style={{width:50, marginRight:15}}/>
      <span
        style={{
          position: "absolute",
          color: "#a55694",
          fontSize: "1.5em",
          left: "12px",
          top: "-20px",
          fontWeight: "bold",
        }}
    >{totalTileInBag}</span>
    </span>
  );
}

export default ScrabbleBag;