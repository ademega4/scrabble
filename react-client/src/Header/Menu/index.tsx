import React, { useState } from 'react'

interface Props {
  isOnline:boolean,
  username:string,
  handleLogOut:(evt:React.MouseEvent<HTMLLIElement, MouseEvent>)=>void,
}

export const Menu:React.FC<Props> = ({isOnline, username, handleLogOut}) => {
  const [toggle, setToggle] = useState(false);

  return (
    <div className="status" style={{position:"relative"}}>
      <img 
        src="./img/avatar/default-avatar.jpg" 
        alt="avatar" 
        className={`avatar ${isOnline ? "is-online" : "is-offline"}`}
        onClick={()=>setToggle(t=>!t)}
      />
      <ul className="menu" style={{display:toggle ? "block" : "none"}}>
        <li className="word-wrap-up" style={{ borderBottom:"solid 1px #000", cursor:"default"}}>&#9977; {username}</li>
        <li style={{cursor:"pointer"}} onClick={handleLogOut}>Log Out</li>
      </ul>
    </div>
  );
}