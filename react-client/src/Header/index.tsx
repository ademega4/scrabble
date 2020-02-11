import React from 'react'
import "./index.css";
import { Menu } from './Menu';

interface Props {
  isOnline:boolean,
  loggedIn:boolean,
  handleLogOut:(evt:React.MouseEvent<HTMLLIElement, MouseEvent>)=>void,
  username?:string
}

export const Header:React.FC<Props> = ({isOnline, loggedIn, handleLogOut, username=""}) => {
  return (
    <header>
      Play Scrabble.Com
      {
        loggedIn ? (
          <Menu isOnline={isOnline} username={username} handleLogOut={handleLogOut}/>
        ) : null
      }
    </header>
  );
}
