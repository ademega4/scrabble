import { RequestOption, METHOD } from '../declaration'

export const SIZE:number = 15;

export const MAX_USERNAME_LEN = 12;
export const MIN_USERNAME_LEN = 3;

export const ENV:string = "development";

export const indexUrl:string = ENV === "development" 
? `${window.location.protocol}//${window.location.hostname}:3001`
: `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;

export const wsUrl:string = ENV === "development" 
? `ws://${window.location.hostname}:3001`
: `ws://${window.location.hostname}:${window.location.port}`


export function getRequestOption(method:METHOD) :RequestOption{
  return {
    credentials:"include", method,
    mode: ENV === "development" ? "cors" : "same-origin"
  };
}

export function getElementPosition(el:any) :{x:number, y:number}{ 
  let x = 0, y = 0;
  while(el){
    if(el.tagName.toLowerCase() === "body"){
      const xScroll = el.scrollLeft || document.documentElement.scrollLeft;
      const yScroll = el.scrollTop || document.documentElement.scrollTop;
      x += (el.offsetLeft - xScroll + el.clientLeft);
      y += (el.offsetTop - yScroll + el.clientTop);
    }else{
      x += (el.offsetLeft - el.scrollLeft + el.clientLeft);
      y += (el.offsetTop - el.scrollTop + el.clientTop);
    }
    el = el.offsetParent;
  }//end while loop
  return {x, y};
}//end function

export function getViewport() :{width:number, height:number}{
  
  if (!('innerWidth' in window ) ){
    const body = document.documentElement || document.body;
    return {
      width:body.clientWidth,
      height:body.clientHeight
    }
  }
  
  return {
    width:window.innerWidth,
    height:window.innerHeight
  };
}

export function generateUniqueID() :string{
  return (Math.random() * Math.random() * Math.random()).toString(16);
}

export function getPlayerOfflineMsg(offlinePlayers :string[]) :string{
  if(offlinePlayers.length < 1) return "";
  
  return (
    offlinePlayers.length > 1 
    ? `${offlinePlayers.join(", ")} are offline, game paused`
    : `${offlinePlayers[0]} is offline, game paused`
  );
}