import { Request } from 'express';
export function stringfyData<T>(eventType:string, payload:T) :string{
  return JSON.stringify([eventType, payload]);
}

export function generateRandomNumber(len :number) :string{
  const code = (Math.random() * Math.random() * Math.random()).toString(32).replace(".", "");
  const codeLen = code.length;
  return (codeLen >= len ? (code.slice((codeLen - len), codeLen)) : (code + generateRandomNumber(len - codeLen)));
}

export function getTokenFromHeader(req:Request, key:string) :string{
  let token:string = "";

  if(req.cookies){
    token = req.cookies[key];
  }
  else if(req.query){
    token = req.query[key];
  }
  else if(req.body){
    token = req.body[key];
  }
  else if(req.headers.cookie){
    token = req.headers.cookie;
  }

  if(typeof(token) === "string"){
    token = token.trim();
  }
  
  return !!token ? token : "";
}

export const CUSTOM_ERROR= "custom_error";

export function randomNumber(min :number, max :number) :number{
  return Math.floor(max * Math.random()) + min;
}