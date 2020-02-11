import React, { useState } from 'react'

import { useMutation } from '../hooks';

import {indexUrl, MAX_USERNAME_LEN, MIN_USERNAME_LEN} from "../lib";

import {URL} from "../lib/enum";

import query from '../query';

import "./index.css";

interface Props {
  updateUsername:(username:string)=>void
}

function validateUsername(username:string) :string{
  let errorMsg = "";
  if(username === ""){
    errorMsg = "Username is required"
  }
  else if(username.length < MIN_USERNAME_LEN){
    errorMsg = `Username should be atleast ${MIN_USERNAME_LEN} character long`;
  }
  else if(username.length > MAX_USERNAME_LEN){
    errorMsg = `Username should not be more than ${MAX_USERNAME_LEN} character long`
  }

  else if(!(/[a-zA-Z\d]/gi.test(username))){
    errorMsg = "Invalid username, Username can only contain alphabelt or number";
  }
  return errorMsg;
}

export const Login:React.FC<Props> = ({updateUsername}) => {
  //controlled
  const [username, setUsername] = useState("");
  //set error if any
  const [errorMsg, setErrorMsg] = useState("");
  //use to mutate user request
  const [response, mutate] = useMutation(indexUrl + URL.login)
  //event handler for onChange event
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>)=>{
    //clear error message when client attempt to enter a new username
    if(errorMsg.length > 0){
      //set error 
      setErrorMsg("");
    }
    //set username on change
    setUsername(event.target.value.trim().slice(0, MAX_USERNAME_LEN));
  };

  //log user in
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    //validate user input
    const msg = validateUsername(username);
    //if there is error display it
    if(msg){
      setErrorMsg(msg);
    }else{
      //get request option
      const requestOpt = query.login;
      //add header as json
      requestOpt.headers = {"Content-type":"application/json"}
      //add the post body
      requestOpt.body = JSON.stringify({username});
      //carry out request
      mutate(requestOpt)
      .then(({data})=>{
        if(data.success){
          updateUsername(data.username);
        }
        else{
          setErrorMsg(data.msg);
        }
      });    
    }//end else
  };//end on submit handler

  if(response.error){
    setErrorMsg(response.error.message);
  }

  return (
    <form action="" onSubmit = {handleSubmit} className="login-form">
      <label htmlFor="username">Select Username </label>
      <input type="text" name="username" onChange={handleChange} value={username}/>
      <span 
        style={{
          marginLeft: 10,
          color: "#64edcb",
          backgroundColor: "#2c23b3",
          padding: 5,
          borderRadius: 4,
        }}
      >{MAX_USERNAME_LEN - username.length}</span>
      <input type="submit" value="Log In" style={{marginLeft:10}}/>
      
      <div className="form-error">{errorMsg}</div>
    </form>
  );
}