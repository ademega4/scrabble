import React, { useLayoutEffect} from "react";
import {createPortal} from "react-dom";

import "./index.css";

const div = document.createElement("div");

export const Modal :React.FC<{children:React.ReactChild}> = ({children}) => {
  /**
   * I have to useLayoutEffect instead of useEffect cos the auto focus is not immediate when searching
   * the dictionary thereby not capturing user typed letter on time.
   */
  useLayoutEffect(()=>{
    
    const modalRoot = document.getElementById("modal-root");

    if(modalRoot){
      modalRoot.appendChild(div);
    }

    return ()=>{
      if(modalRoot){
        modalRoot.removeChild(div);
      }
    };
  }, []);

  return createPortal(children, div);
}