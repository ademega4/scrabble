import React, {useState} from 'react';

import {Header} from "./Header";

import { DisplayMsg } from './DisplayMsg';
import { Login } from './Login';
import { useQuery } from './hooks';
import {indexUrl} from "./lib"
import {URL} from "./lib/enum"
import query from "./query";
import { Main } from './Main';

const App: React.FC = () => {
  //set 
  const [isOnline, setIsOnline] = useState(false);
  //const [loggedIn, setIsLoggedIn] = useState(false);
  const [response, setResponse] = useQuery((indexUrl + URL.viewer), query.viewer);

  const {loading, error, data, reQuery} = response;

  const updateUsername = (username:string)=>{
    setResponse({reQuery:response.reQuery, loading:false, error:null, data:{success:true, msg:"", username}})
  };

  const logOut = ()=>{
    reQuery(indexUrl + URL.logOut, query.logOut);
  }
  
  
  if(loading){
    return <div>Loading</div>
  }
  
  else if(error){
    return <DisplayMsg msg={error.message} type="ERROR"/>
  }

  
  const loggedIn = !!data.username;

  return (
    <div className="App">
      <Header isOnline={isOnline} loggedIn={loggedIn} handleLogOut={logOut} username={loggedIn ? data.username : ""}/>
      {
        loggedIn ? (
          <Main setIsOnline={setIsOnline} handleLogOut={logOut} isOnline={isOnline} myUsername={data.username}/>
        ) : (
          <Login updateUsername={updateUsername}/>
        )
      }
    </div>
  );
}

export default App;
