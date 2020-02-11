import React, { useRef, useEffect, useState } from 'react';

import WebSocketWrapper from '../../../lib/client-websocket-wrapper';
import { EVENT_TYPE } from '../../../lib/enum';

interface Props {
  handleToggleDict:()=>void
  ws:WebSocketWrapper
};

const ACTION_TYPE = {
  TYPING:1,
  STOP_TYPING:2,
};

//const validCharReg = /\S/;

const alphabeltReg = /^[a-z]+$/;

// function isValidChar(char:string){
//   return (validCharReg.test(char) && (['Backspace', 'Enter', 'Delete'].indexOf(char) < 0));
// }

export const Dictionary:React.FC<Props> = ({handleToggleDict, ws}) => {
  const [word, setWord] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const [output, setOutput] = useState<string[]>([]);

  const thisRef = useRef<{
    word:string, 
    action:number,
    timeoutID:NodeJS.Timeout|undefined
  }>({
    word:"", 
    action:ACTION_TYPE.STOP_TYPING,
    timeoutID:undefined
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  
  //you
  useEffect(()=>{
    const onSearchWord:(data:{w:string, l:string})=>void = ({w:searchWord, l:matchList})=>{
      
      if(thisRef.current.word === searchWord){
        const f = matchList === "" ? [] : matchList.split(".");
        if(f.length > 0){
          //On the server side i remove some part of the word to reduce
          //the amount of data that is being transfer over the wire
          //the formular i use is n.slice(0, (n.length - 1))
          //where n is the search substring
          searchWord = searchWord.slice(0, searchWord.length - 1);
          setOutput(f.map(w=>(searchWord + w)));
        }
        else{
          setOutput([`word(s) that match "${searchWord}" cannot be found`])
        }
        setIsTyping(false);
      }//end if
    };

    ws.addEventListener(EVENT_TYPE.SEARCH_DICT, onSearchWord);

    const _timeout = thisRef.current.timeoutID;
    return ()=>{
      ws.removeEventListener(EVENT_TYPE.SEARCH_DICT, onSearchWord);
      if(_timeout){
        clearTimeout(_timeout);
      }
    };
    /*eslint-disable react-hooks/exhaustive-deps*/
  }, []);

  useEffect(()=>{
    
    if(inputRef.current){
      inputRef.current.focus();
    }
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>)=>{
    if(!isTyping) setIsTyping(true);
    const word = event.target.value.trim();
    thisRef.current.word = word;
    setWord(word);
  };

  const onKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // const key = event.key;
    //if user have a conversation id as well asuser id then send action 
    
    
    if(thisRef.current.timeoutID) clearTimeout(thisRef.current.timeoutID);
      //thisRef.current.action = ACTION_TYPE.TYPING;
        thisRef.current.timeoutID = setTimeout(()=>{
          
          const word = thisRef.current.word;
          thisRef.current.timeoutID = undefined;
          if(word.length < 2){
            setIsTyping(false);
            setOutput(["Type atleast two letter to check word in dictionary."]);
          }
          else if(!alphabeltReg.test(word)){
            setIsTyping(false);
            setOutput([`word(s) that match "${word}" cannot be found`]);
          }
          else{
            ws.send(EVENT_TYPE.SEARCH_DICT, {w:word.toLocaleLowerCase()}, []);
          }
        }, 1000);//end set timeout
  }//end onkeyup

  return (
    <div className="open-modal">
      <div className="modal-content">
        <div className="header" style={{position:"relative"}}>
          Dictionary <span className="close" onClick={handleToggleDict}>&#x2613;</span>
        </div>
        <div className="body">
          <p>Type atleast <strong>two (2)</strong> alphabelt to search dictionary.</p>
          <input type="text" value={word} 
            placeholder="Search for words" 
            onChange={handleChange}
            onKeyUp = {onKeyUp}
            ref={inputRef}
            autoFocus
          />
          {
            isTyping ? (
              <p>Searching</p>
            ) : (
              <ul className="word-list">
                {
                  output.map(w=><li key={w}>{w}</li>)
                }
              </ul>
            )
          }
          
        </div>
      </div>
    </div>
  );
}

