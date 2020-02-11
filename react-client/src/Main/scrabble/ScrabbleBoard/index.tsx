import React, { useEffect, useState, useRef, useCallback } from "react";
import {BoardSlot} from "./BlockSlot";
import ScrabbleActionButton from "./ScrabbleActionBtn";

import {MovableLetterTile, UnMovableLetterTile} from "./LetterTile";

//import WebSocketWrapper from "../../../lib/client-websocket-wrapper";

import { getViewport, getElementPosition, generateUniqueID, getPlayerOfflineMsg } from "../../../lib";
import { SelectedTileType, TileType, TileBoardCellPos, PlayedTileBoardCellPos, MsgType, Coordinate } from "../../../declaration";
import WebSocketWrapper from "../../../lib/client-websocket-wrapper";
import { EVENT_TYPE } from "../../../lib/enum";
import { MessageDialog } from "./MessageDialog";

interface BoardPosition{x:number, y:number}

interface ThisRef{
  //store total board size
  boardSize:number, 
  boundaryX:number,
  boundaryY:number,
  //store the starting position to start putting tiles
  startLeftPos:number,
  startTopPos:number,
  //lemme know that a tile was moved so as perform action when the tile is place at a particular point
  //on mouse up
  moveTiles:number,
  //store the location of the board on the page
  boardPos:BoardPosition,
  //store the width and height of each cell or slot on the scrabble board
  cellSize:number,
  //store the id of the moved tile from rack to the scrabble board
  //I have to store it cos, once the mouse is up, I reset the selected
  //tile id in state to -1 before rendering
  tileToPutOnBoardCell:string,
  //Store the id of the tiles which are already in position
  //this ensure that I do not set position again on every tile drop on the scrabblle board
  //this is only cleared when there is a resize of the page so as to reposition all tileson window resize
  alreadyInPositionTiles:{[key:string]:boolean},
  //I need to store the previous tile position. This ensure if the tile is place at previous position
  //nothing is transmitted to the server as well as to change the position if it changes
  prevSelectedTileBoardCellPos:BoardPosition,
  //store all tiles being played by a player at a particular time
  //cos player can only play vertically or horizontally from left to right
  playedTilesBoardCellPos:PlayedTileBoardCellPos,
  //I need to add this cos, the is current player is set once when component mount
  //so i need to set it use effect and when the values changes
  isCurrentPlayer:boolean,
  //I have to wait for server to process user inputand prevent current user from placing tile
  //on the board.
  waitForServer:boolean,
  prevPos:Coordinate,
  //I need to store the dialog message Idto be shown to user
  //when the game is paused when one or more player disconnect
  dialogMsgID:string,
}

interface TileTypeAndPosition{
  tile:{letter:string,  point:number, id:string, boardCellPos:{x:number, y:number}}, 
  pos:BoardPosition,
};

type  DialogMessageType = {msg:string, type:MsgType, id:string, pauseDialogMsg:boolean};

interface Props{
  tiles:TileType[],
  ws:WebSocketWrapper,
  isCurrentPlayer:boolean,
  passed:boolean,
  defTileBoardCellPos:TileBoardCellPos,
  arePlayerOffline:boolean,
  msg:string,
  //showMsg:boolean,
  currentPlayerID:string,
  //updateShowMsgRef:()=>void
};

//board representation
const boardArray: string[][] = [
  ["TW", "", "", "DL", "", "", "", "TW", "", "", "", "DL", "", "", "TW"],
  ["", "DW", "", "", "", "TL", "", "", "", "TL", "", "", "", "DW", ""],
  ["", "", "DW", "", "", "", "DL", "", "DL", "", "", "", "DW", "", ""],
  ["DL", "", "", "DW", "", "", "", "DL", "", "", "", "DW", "", "", "DL"],
  ["", "", "", "", "DW", "", "", "", "", "", "DW", "", "", "", ""],
  ["", "TL", "", "", "", "TL", "", "", "", "TL", "", "", "", "TL", ""],
  ["", "", "DL", "", "", "", "DL", "", "DL", "", "", "", "DL", "", ""],
  ["TW", "", "", "DL", "", "", "", "CE", "", "", "", "DL", "", "", "TW"],
  ["", "", "DL", "", "", "", "DL", "", "DL", "", "", "", "DL", "", ""],
  ["", "TL", "", "", "", "TL", "", "", "", "TL", "", "", "", "TL", ""],
  ["", "", "", "", "DW", "", "", "", "", "", "DW", "", "", "", ""],
  ["DL", "", "", "DW", "", "", "", "DL", "", "", "", "DW", "", "", "DL"],
  ["", "", "DW", "", "", "", "DL", "", "DL", "", "", "", "DW", "", ""],
  ["", "DW", "", "", "", "TL", "", "", "", "TL", "", "", "", "DW", ""],
  ["TW", "", "", "DL", "", "", "", "TW", "", "", "", "DL", "", "", "TW"],
];

//
const boardBlockColour :{[key:string]:{backgroundColor:string, color:string}} = {
  TW:{backgroundColor:"#d72421", color:"#f8bdb4"},
  TL:{backgroundColor:"#4695ca", color:"#c3f5f7"},
  DW:{backgroundColor:"#ffbead", color:"#b86e74"},
  DL:{backgroundColor:"#6fe6f6", color:"#5d94c5"},
  CE:{backgroundColor:"#d72421", color:""},
  "":{backgroundColor:"", color:""}
}

function resetTilesPosOnRack(
  prevTilesWithPos: TileTypeAndPosition[], 
  startLeftPos:number, 
  startTopPos:number, 
  sort:boolean
) :TileTypeAndPosition[]{
  
  if(sort){
    prevTilesWithPos = prevTilesWithPos.sort((a:TileTypeAndPosition, b:TileTypeAndPosition)=>{
      //if(!a.onRack || !b.onRack) return 0;
      const a1 = a.pos.x;
      const b1 = b.pos.x;
      return a1 < b1 ? -1 : a1 > b1 ? 1 : 0; 
    });
  }

  let counter = 0;

  return prevTilesWithPos.map((tp:TileTypeAndPosition)=>{
    //only try to rearrange till if tile is on rack and not on board
    //y >= (thisRef.current.startTopPos - 40)
    if(tp.tile.boardCellPos.x === -1 || tp.tile.boardCellPos.y === -1){
      tp.pos = {
        x:startLeftPos + (counter * 40),
        y:startTopPos
      };
      counter++;
    }
    return tp;
  });
}

function setDialogHelper(dialog:DialogMessageType[], type:MsgType, msg:string, pauseDialogMsg:boolean=false) :DialogMessageType[]{
  return [{type, msg, id:generateUniqueID(), pauseDialogMsg}, ...dialog];
}

function getScrollTop() :number{
  return document.body.parentElement ? Math.floor(document.body.parentElement.scrollTop) : 0;
}

const ScrabbleBoard: React.FC<Props> = ({tiles, msg, arePlayerOffline, isCurrentPlayer, currentPlayerID, ws, passed, defTileBoardCellPos})=>{
  //console.log()
  //console.log(tiles);
  
  //set msg dialog
  const [dialogs, setDialogs] = useState<DialogMessageType[]>([]);

  const [gamePaused, pauseOrResumeGame] = useState(false);
  //store the location of each tiles on the board in this form `[${y}|${x}] = tile.id`
  //it'll be use to permanently add the tile to the board when client finaly enter word input
  //tileBoardCellPos:TileBoardCellPos,
  const [tileBoardCellPos, setTileBoardCellPos] = useState<TileBoardCellPos>(defTileBoardCellPos);
  //use to set and update app on window resize
  const [size, setSize] = useState({width:0, height:0});
  //use to set and update selected tile id
  const [selectedTile, setSelectedTile] = useState<SelectedTileType>({id:"-1", diff:{x:0, y:0}});
  
  const [tilesWithPos, setTilesWithPos] = useState<TileTypeAndPosition[]>(
    ()=>{
      return tiles.map(tile=>{
        //console.log("I was called");
        return ({tile:{...tile, boardCellPos:{x:-1, y:-1}}, pos:{x:0, y:0}});
      })
    }
  );

  const [scrollTop, setScrollTop] = useState<number>(getScrollTop());

  //use to get board position on window resize
  const boardRef = useRef<HTMLDivElement>(null);
  //contain all object that should have being stored in private property if the function is a class
  const thisRef = useRef<ThisRef>({
    //(((grid width * number) + (gridGap * 15)) - 2) i.e ((30 * 15 + 3 * 15) - 2)
    boardSize:(((30 * 15) + (3 * 15)) - 2),
    boundaryX:0,
    boundaryY:0,
    startLeftPos:0,
    startTopPos:0,
    moveTiles:0,
    boardPos:{x:0,y:0},
    cellSize:33,
    tileToPutOnBoardCell:"-1",
    alreadyInPositionTiles:{},
    prevSelectedTileBoardCellPos:{x:-1,y:-1},
    playedTilesBoardCellPos:{},
    isCurrentPlayer:isCurrentPlayer,
    //currently initialize to false
    waitForServer:false,
    prevPos:{x:0, y:0},
    dialogMsgID:"", 
  });

  //use to add handler to window resize
  useEffect(()=>{
    //window resize event handler
    const onResize = ()=>{
      //console.log(ev.target.scrollTop);
      const {width, height} = getViewport();
      
      if(size.width !== width){
        //console.log({width, height, size});
        setSize({width, height});
      }
    }//end onResize

    const handleOnScroll = ()=>{
      setScrollTop(getScrollTop());
    };
    //add event handler to window resize
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", handleOnScroll);

    const onMoveTile = (data:{
      x:number,
      y:number,
      prevTileBoardPos:string,
      tile:TileType,
    })=>{
      console.log(data);
      //add new position to place tile after fdeleting previous location
      setTileBoardCellPos(prev=>{
        delete prev[data.prevTileBoardPos];
        return (
          Number.isInteger(data.y) && Number.isInteger(data.x) && data.tile ? ({
              ...prev,
              [`${data.y}|${data.x}`]:data.tile
          }) : ({
            ...prev
          })
        );
      });
    };//end function onMoveTile

    //add event handler when to move tile around board
    ws.addEventListener(EVENT_TYPE.MOVE_TILE, onMoveTile);

    const onTileInputError :()=>void = ()=>{
      //stop waiting for server, since server as responded to user tile input 
      thisRef.current.waitForServer = false;
      //set to default
      thisRef.current.playedTilesBoardCellPos = {};
      //console.log("input tile error");
      setDialogs(PrevDialogs=>setDialogHelper(PrevDialogs, "ERROR", "Tile input is not correct"));
      
      //remove tile from board and place them back to tile
      //when user tile input is wrong
      setTilesWithPos(
        prevTilesWithPos=>
        //call method to place tile back on rack
        resetTilesPosOnRack(
          prevTilesWithPos.map(t=>{
            //put tile back to tile
            t.tile.boardCellPos = {x:-1, y:-1};
            return t;
          }),
          thisRef.current.startLeftPos,
          thisRef.current.startTopPos,
          false
        )
      );
    };
    ws.addEventListener(EVENT_TYPE.TILE_INPUT_ERROR, onTileInputError);

    const onBoardCellOcuppied :()=>void = ()=>{
      setDialogs(PrevDialogs=>setDialogHelper(PrevDialogs, "ERROR", "Board cell is already occupied"))
    };
    ws.addEventListener(EVENT_TYPE.BOARD_CELL_OCCUPIED, onBoardCellOcuppied);

    const onPass :(data:{msg:string, b:string[]})=>void = (data)=>{
      const isCurrentPlayer = thisRef.current.isCurrentPlayer;
      //if its the current 
      if(isCurrentPlayer){
        //console.log("I executed isCurrentPlayer");
        //remove tile from board and place them back to tile
        setTilesWithPos(
          prevTilesWithPos=>
          //call method to place tile back on rack
          resetTilesPosOnRack(
            prevTilesWithPos.map(t=>{
              //put tile back to tile
              t.tile.boardCellPos = {x:-1, y:-1};
              return t;
            }),
            thisRef.current.startLeftPos,
            thisRef.current.startTopPos,
            false
          )
        );
        //initialize to empty object
        thisRef.current.playedTilesBoardCellPos = {};
      }//end if(isCurrentPlayer)
      else{
        //don't show message to the user who just passed
        setDialogs(PrevDialogs=>setDialogHelper(PrevDialogs, "INFO", data.msg));
        //if a player pass, I need to delete the tile the player place on the board
        if(data.b.length > 0){
          setTileBoardCellPos(prev=>{
            data.b.forEach(boardCellPos=>{
              delete prev[boardCellPos];
            });
            return {...prev};
          });
        }
      }//end else
      //initialize played tiles to empty object
      //thisRef.current.playedTilesBoardCellPos = {};
    };
    ws.addEventListener(EVENT_TYPE.PASS, onPass);

    const onPauseGame :()=>void = ()=>{
      pauseOrResumeGame(true);
    };
    ws.addEventListener(EVENT_TYPE.PAUSE_GAME, onPauseGame);

    const onResumeGame :()=>void = ()=>{
      const {dialogMsgID} = thisRef.current;
      const msg = (
        isCurrentPlayer 
        ? "Game resumed!, its your turn to play." 
        :`Game resumed!, ${currentPlayerID} is on turn to play.`
      );
      /**
       * When game resume I need to remove the pause dialog message
       * initialize it to object with id property of empty string and offline player empty array 
       */
      if(dialogMsgID){
        //hide the message
        setDialogs(prevDialog=>prevDialog.map(
          d=>d.id === dialogMsgID ? {...d, pauseDialogMsg:false, msg, type:"INFO"} : d
        ));
        //remove info from store
        thisRef.current.dialogMsgID = "";
      }else{
        setDialogs(prevDialog=>[
          {type:"INFO", id:generateUniqueID(), pauseDialogMsg:false, msg}, ...prevDialog
        ]);
      }
      pauseOrResumeGame(false);
      //setDialogs(prevDialog=>prevDialog.map())
    };
    ws.addEventListener(EVENT_TYPE.RESUME_GAME, onResumeGame);

    const onRemoveTileFromBoardDueToPlayerError :(boardCellPos :string[])=>void = (boardCellPos)=>{
      setTileBoardCellPos(prevTileBoardCellPos=>{
        boardCellPos.forEach(boardCoord=>{
          delete prevTileBoardCellPos[boardCoord];
        });
        console.log("I was called");
        return {
          ...prevTileBoardCellPos
        };
      });
    };
    ws.addEventListener(EVENT_TYPE.REMOVE_TILE_FROM_BOARD, onRemoveTileFromBoardDueToPlayerError);

    const onPlayerDisconnectDuringGame :(newOfflinePlayer:string[]) => void = (newOfflinePlayer)=>{
      //get the id of the pause message that is show to user
      const {dialogMsgID} = thisRef.current;
      //if message is already displayed
      if(dialogMsgID){
        //get dialog message
        setDialogs(prevDialog=>prevDialog.map(d=>{
          return (
            //if message find, spread and generate new message
            d.id === dialogMsgID 
            ? {...d, msg:getPlayerOfflineMsg(newOfflinePlayer)}
            //else return dialog message
            : d
          );
        }));
      }
      else{
        const dialogMsgID = generateUniqueID();
        thisRef.current.dialogMsgID = dialogMsgID
        //generate dialog msg
        const dialogMsg:DialogMessageType = {
          pauseDialogMsg:true,
          msg:getPlayerOfflineMsg(newOfflinePlayer),
          id:dialogMsgID,
          type:"WARNING"
        };
        //update dialog message state
        setDialogs(prevDialogs=>[dialogMsg, ...prevDialogs]);
      }
    };
    ws.addEventListener(EVENT_TYPE.PLAYER_DISCONNECT_DURING_GAME, onPlayerDisconnectDuringGame);


    //
    //const onSetT
    //component will unmount to ensure
    //no memory leak when component unmount
    return ()=>{
      //when component unmount remove event handler
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", handleOnScroll);
      //remove when unmount
      ws.removeEventListener(EVENT_TYPE.MOVE_TILE, onMoveTile);
      ws.removeEventListener(EVENT_TYPE.TILE_INPUT_ERROR, onTileInputError);
      ws.removeEventListener(EVENT_TYPE.BOARD_CELL_OCCUPIED, onBoardCellOcuppied);
      ws.removeEventListener(EVENT_TYPE.PASS, onPass);
      ws.removeEventListener(EVENT_TYPE.PAUSE_GAME, onPauseGame);
      ws.removeEventListener(EVENT_TYPE.RESUME_GAME, onResumeGame);
      ws.removeEventListener(EVENT_TYPE.REMOVE_TILE_FROM_BOARD, onRemoveTileFromBoardDueToPlayerError);
      ws.removeEventListener(EVENT_TYPE.PLAYER_DISCONNECT_DURING_GAME, onPlayerDisconnectDuringGame);
    };
    /*eslint-disable react-hooks/exhaustive-deps*/
  }, []);
  
  //use to "recalibarate" the app on window resize
  useEffect(()=>{
    if(boardRef.current){
      //get board wrapper poistion on page
      const boardPos = getElementPosition(boardRef.current);
      //add hidding part of the page to the position from which the board is starting from
      //the page need to re-render to fit page
      boardPos.y += scrollTop;
      //ensure user can only carry tile on board and re arrange tile only
      //boardPos.x is the left position of the board
      //boardSize is the width of the scrabble board
      thisRef.current.boundaryX = boardPos.x + thisRef.current.boardSize;
      //board size is the height of the board
      //15px is the top margin between board and scrabble rack
      //boardPos.y is the top position of the board
      //32px is the height of the scrabble tile
      
      
      console.log({scrollTop});

      thisRef.current.boundaryY = thisRef.current.boardSize + 15 + boardPos.y + 32;
      //70px is margin left from the left red button
      thisRef.current.startLeftPos= boardPos.x + 70;
      //board size is the height of the board
      //the added 15 pixel is margin to push away the tiles from board
      //y position of the board
      thisRef.current.startTopPos = thisRef.current.boardSize + 15 + boardPos.y;
      //store the new board position for later use
      thisRef.current.boardPos = boardPos;
      //reset already in position variable,this ensure all tile board position is recalculated
      thisRef.current.alreadyInPositionTiles = {};
      //reset tile position when resize take place
      //also set tile on first load
      setTilesWithPos(prevTilesWithPos=>(
        resetTilesPosOnRack(
          prevTilesWithPos, 
          thisRef.current.startLeftPos, 
          thisRef.current.startTopPos, 
          false
        )
      ));
    }
    //console.log({size});
  }, [size, scrollTop]);

  useEffect(()=>{
    thisRef.current.tileToPutOnBoardCell = "-1";
  }, [selectedTile, tilesWithPos]);

  //when finish playing and new tiles are added to replace previous played tiles
  useEffect(()=>{
    //console.log(tiles);
    //if there are tiles 
    const tileBoardCells = Object.keys(thisRef.current.playedTilesBoardCellPos);
    //console.log(tileBoardCells);
    if(tileBoardCells.length > 0){
      //store the tile id of that the user just play, so as to put them permanently on the board
      let tileID = "", 
          //store the cell on which the tile is placed
          tileBoardCell = "",
          tile = null;
      //temporary map tile id to each tile
      const tempTileObject :{[key:string]:TileType}= {};
      //map the board cell position to tile object
      const permanentTileBoardCellPos:TileBoardCellPos = {};
      //loop thru all tile
      for(let c = 0; c < tilesWithPos.length; c++){
        tile =  tilesWithPos[c].tile;
        //set tile as value and tile id as key
        tempTileObject[tile.id] = tile;
      }//end for loop
      console.log({tempTileObject});
      //loop throught the boarc cell position
      for(let i = 0; i < tileBoardCells.length; i++){
        //get the board cell position of a tile
        tileBoardCell = tileBoardCells[i];
        //get the tile id of that is placed on this tile board
        tileID = thisRef.current.playedTilesBoardCellPos[tileBoardCell];
        console.log({tileID})
        //store the tile as value and the board cell as key
        permanentTileBoardCellPos[tileBoardCell] = tempTileObject[tileID];
      }//end for loop
      console.log({permanentTileBoardCellPos});
      //update all permanent tile on the board
      setTileBoardCellPos(prevTileBoardCells=>({...prevTileBoardCells, ...permanentTileBoardCellPos}));
      //initialize for next play
      thisRef.current.playedTilesBoardCellPos ={};
      //set tiles back to rack
      //setTilesWithPos(tiles.map(tile=>({tile:{...tile, boardCellPos:{x:-1, y:-1}}, pos:{x:0, y:0}})));
      setTilesWithPos(
        resetTilesPosOnRack(
          tiles.map(tile=>({tile:{...tile, boardCellPos:{x:-1, y:-1}}, pos:{x:0, y:0}})), 
          thisRef.current.startLeftPos, 
          thisRef.current.startTopPos, 
          false
        )
      );
    }//end if
  }, [tiles]);

  useEffect(()=>{
    //some time the message might be from parent component, so i don't want the 
    //message to be clashing with each other
    //if(showMsg){
      
      const dialogMsgID = generateUniqueID();

      setDialogs(prevDialog=>([{
        msg, pauseDialogMsg:arePlayerOffline,
        type:arePlayerOffline ? "WARNING" : "INFO",
        id:dialogMsgID
      }, ...prevDialog]));
      /**
       * I need to store this message ID cos, the message is "sticky", I need to store 
       * this id to delete it later
       */
      if(arePlayerOffline) thisRef.current.dialogMsgID = dialogMsgID;
      /**
       * I need to update show message ref from parent so, I don't show a 
       * particular message more than onces
       */
      //updateShowMsgRef();
    //}
  }, [msg]);

  useEffect(()=>{
    //let player be able to place tile on the board
    //cos i find out while processing user input on the server
    //player can place tile on the board and the tile are locked, thereby disrupting play
    //thisRef.current.waitForServer = false;
    //let player be able to place tile on the board
    //cos i find out while processing user input on the server
    //player can place tile on the board and the tile are locked, thereby disrupting play
    thisRef.current.waitForServer = false;
    //save weather player is the current player to play or not
    thisRef.current.isCurrentPlayer = isCurrentPlayer;
  }, [isCurrentPlayer]);

  //event handler which respond to clicking of the tile prior to movement
  const onSetSelectedTile :(selectedTile:SelectedTileType, boardCellPos:Coordinate, prevPos:Coordinate)=>void 
  = useCallback((selectedTile, boardCellPos, prevPos)=>{
    //I mean need to set tile back at the previous position when player try to place tile on
    //a slot that is already filled
    //Its also needed to prevent multiple sending of position to other player
    //when tile is moved around and drop back at the original position it was moved from
    thisRef.current.prevSelectedTileBoardCellPos = boardCellPos;
    //I needed this value to return tile back to rack if player try to place tile on a board slot that
    //already contain tile
    thisRef.current.prevPos = prevPos;
    //trigger move
    setSelectedTile(selectedTile);
  }, [setSelectedTile]);

  const resetTilePosOnBoard :(boardCellPos:Coordinate, _scrollTop:number, tileID:string)=>void 
  = useCallback(
    (boardCellPos, _scrollTop, titleID)=>setTilesWithPos(prevTilesWithPos=>{
      return prevTilesWithPos.map(tp=>{
        if(tp.tile.id === titleID){
          
          tp.pos.x = boardCellPos.x - 1;
          tp.pos.y = (boardCellPos.y + _scrollTop) - 1;
          thisRef.current.alreadyInPositionTiles[titleID] = true;
        }//end if
        return tp;
      });
    }),
    [setTilesWithPos]
  );

  const hideDialogMsg :(dialogID:string)=>void = useCallback((dialogID)=>{
    setDialogs(PrevDialogs=>{
      return PrevDialogs.filter(d=>d.id !== dialogID)
    });
  }, [setDialogs]);

  const handleSubmitTile :()=>void = ()=>{
    if(Object.keys(thisRef.current.playedTilesBoardCellPos).length > 0){
      console.log("I was called");
      //wait for server to process user tile input
      //during the wait time, this ensure user cannot put tile on the board
      thisRef.current.waitForServer = true;
      console.log(thisRef.current.waitForServer);
      ws.send(EVENT_TYPE.SUBMIT_TILE, {}, []);
    }
  };

  const onPass :()=>void = ()=>{
    //ensure user cannot place new tile on the board while server is processing
    thisRef.current.waitForServer = true;
    ws.send(EVENT_TYPE.PASS, {}, []);
  };

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>)=>{
    //only move tile if a particular tile is selected by client
    if(selectedTile.id !== "-1"){
      //get mouse postion from page
      const clientX = event.clientX > thisRef.current.boundaryX ? thisRef.current.boundaryX : event.clientX, 
            clientY = event.clientY > thisRef.current.boundaryY ? thisRef.current.boundaryY : event.clientY;

      let x = (clientX - selectedTile.diff.x);
      let y = (clientY - selectedTile.diff.y);
      //tile is only being moved around rack
      if(x >= thisRef.current.boardPos.x && y >= (thisRef.current.startTopPos - 40)){
        //ensure re arranging of tiles does to go beyond tiles total tiles in rack
        //if(x <= (thisRef.current.startLeftPos + (40 * tilesWithPos.length))){
        //if(x <= (thisRef.current.boardPos.x + (thisRef.current.boardSize - 30))){
          setTilesWithPos(prevTilesWithPos=>{
            return prevTilesWithPos.map(tp=>{
              if(tp.tile.id === selectedTile.id){
                tp.tile.boardCellPos = {x:-1, y:-1};
                //move tiles around
                tp.pos = {x, y};
              }
              return tp;
            });
          });//end setTilesWithPos
        //}//end if(x <= (thisRef.current.startLeftPos + (40 * tilesWithPos.length)))
        //ensure that no matter where tiles is moved to, its be align back on rack
        thisRef.current.moveTiles = 1;

        return;
      }//end inner if(x >= thisRef.current.startLeftPos && y >= thisRef.current.startTopPos)

      //if its not player turn to play prevent player from placing tiles on board
      //if game is paused
      //if passed
      //if game is waiting for server response 
      //prevent player from playcing tile on the board
      if(!isCurrentPlayer || gamePaused || passed || thisRef.current.waitForServer) return
      /**
       * ensure tiles does not move out of the board
       * y >= thisRef.current.boardPos.y ensure the tiles does not go out of the board toward the header section
       * x >= thisRef.current.boardPos.x ensure the tiles does not go out of the board toward the player and score baord
       * x <= (thisRef.current.boundaryX - 25) ensure the tiles does not go out of the board on the right hand side
       */
      y = y >= thisRef.current.boardPos.y ? y : thisRef.current.boardPos.y;
      x = x >= thisRef.current.boardPos.x ? x : thisRef.current.boardPos.x;
      x = x <= (thisRef.current.boundaryX - 25) ? x : (thisRef.current.boundaryX - 25);
      //console.log("I executed");
      setTilesWithPos(prevTilesWithPos=>{
        return prevTilesWithPos.map(tp=>{
          //
          if(tp.tile.id === selectedTile.id){
            //get the cell location where tiles is currently hovering at
            const yRow = Math.round((y - thisRef.current.boardPos.y) / thisRef.current.cellSize);
            const xColumn = Math.round((x - thisRef.current.boardPos.x) / thisRef.current.cellSize);
            thisRef.current.moveTiles = 2;
            //set position for tile
            tp.tile.boardCellPos = {y:yRow, x:xColumn};
            /**
             * tiles is on now on the scrabble board, we won't re-arrange this tiles 
             * i.e this tile will maintain position on the board and not place on rack again
             * when the tiles are moved around on the rack
             */
            tp.pos = {x, y};
            //ensure the position is not yet filled by another tile
          }//end if(tp.tile.id === selectedTile.id)
          return tp;
        });
      });//end setTilesWithPos
        
    }//end end function onMouseMOve
  };//end on mouse move
  //snap into position
  
  const onMouseUp = ()=>{
    console.log({moveTiles:thisRef.current.moveTiles});

    if(thisRef.current.moveTiles === 2){
      thisRef.current.tileToPutOnBoardCell = selectedTile.id;
    }
    else if(thisRef.current.moveTiles === 1){
      //needed to remove tile from board if user just move the tile from board 
      //back to the rack
      const {x, y} = thisRef.current.prevSelectedTileBoardCellPos;
      const index = `${y}|${x}`;
      //if 
      if(thisRef.current.playedTilesBoardCellPos[index]){
        //send request to server to remove tile from board
        //delete position from board store
        delete thisRef.current.playedTilesBoardCellPos[index];
        ws.send(EVENT_TYPE.MOVE_TILE, {prevTileBoardPos:index}, [])
      }//end if(thisRef.current.playedTileBoardCellPos[index])

      //delete 
      setTilesWithPos(prevTilesWithPos=>(
        resetTilesPosOnRack(
          prevTilesWithPos, 
          thisRef.current.startLeftPos, 
          thisRef.current.startTopPos, 
          true
        )
      ));
    }
    setSelectedTile({id:"-1", diff:{y:0, x:0}});
    thisRef.current.moveTiles = 0;
  };

  //I need to know the selected board cell to add hover to it so as to show user
  //where the tile will be dropped
  let selectedTileBoardPos = {x:-1, y:-1};
  /**
   * I want to prevent the repositioning of tile every time the tile is moved across the board
   * I just want to reposition the tile if there is a window resize
   */
  const tileToReposition : {[key:string]:string} = {};
  //get all id of played tiles
  const playedTileIDs = Object.values(thisRef.current.playedTilesBoardCellPos);
  
  const tilesReactNode = (
    tilesWithPos.map(tp=>{
      let zIndex = 1000;
      
      //const {tile, pos} = tp;

      const {x:prevCellPosX, y:prevCellPosY} = thisRef.current.prevSelectedTileBoardCellPos;

      if(tp.tile.boardCellPos.x > -1 && tp.tile.boardCellPos.y > -1){
        if(tp.tile.id === selectedTile.id){
          selectedTileBoardPos = tp.tile.boardCellPos;
          zIndex = 1001;
        }

        else if(thisRef.current.tileToPutOnBoardCell === tp.tile.id){
          //ensure user place the tile vertically or horizontally and not scatter the
          //tile across the board
          //get tile drop position on the board
          selectedTileBoardPos = tp.tile.boardCellPos;
          /**
           * I need to ensure tile slot is not occupied i.e empty before
           * dropping a new tile on it.
           */
          //stringify position
          const index = `${selectedTileBoardPos.y}|${selectedTileBoardPos.x}`;
          //ensure board slot is empty i.e ensure no tile is on it
          //if true, tile is on board slot new tile cannot be placed on old one
          if(tileBoardCellPos[index] || thisRef.current.playedTilesBoardCellPos[index]){            
            //return tile back to previous position
            tp.tile.boardCellPos = thisRef.current.prevSelectedTileBoardCellPos;
            selectedTileBoardPos = {x:-1,y:-1};
            //if tile was picked from rack, send tile back to rack
            if(tp.tile.boardCellPos.y <= -1 || tp.tile.boardCellPos.x <= -1){
              tp.pos = thisRef.current.prevPos;
            }
            else{
              tileToReposition[`${tp.tile.boardCellPos.y}|${tp.tile.boardCellPos.x}`] = tp.tile.id;
            }
          }//end if(!thisRef.current.playedTilesBoardCellPos[`${yRow}|${xColumn}`])

          //if 
          else if(selectedTileBoardPos.x !== prevCellPosX || selectedTileBoardPos.y !== prevCellPosY){
            //send prev cell location and new location to the server
            const toBeSentTileBoardPos:{
              x:number,
              y:number,
              prevTileBoardPos:string,
              tID:string,
            } = {
              x:selectedTileBoardPos.x,
              y:selectedTileBoardPos.y,
              tID:tp.tile.id,
              prevTileBoardPos:(prevCellPosY === -1 || prevCellPosX === -1) ? "" : `${prevCellPosY}|${prevCellPosX}`
            };
            //debug
            //send tiles position to the server to be sent to all other player(s)
            ws.send(EVENT_TYPE.MOVE_TILE, toBeSentTileBoardPos, []);
            //payload to be sent to server
            //delete previous location and save new location
            delete thisRef.current.playedTilesBoardCellPos[`${prevCellPosY}|${prevCellPosX}`];
            //save in new position
            thisRef.current.playedTilesBoardCellPos[`${tp.tile.boardCellPos.y}|${tp.tile.boardCellPos.x}`] = tp.tile.id;
            //console.log(thisRef.current.playedTilesBoardCellPos);
          }//end if
          //reset to -1;
          thisRef.current.prevSelectedTileBoardCellPos = {x:-1, y:-1};
          //debug
          //console.log(thisRef.current.playedTilesBoardCellPos); 
        }//end else if(thisRef.current.tileToPutOnBoardCell === tile.id)
        else if(!thisRef.current.alreadyInPositionTiles[tp.tile.id]){
          tileToReposition[`${tp.tile.boardCellPos.y}|${tp.tile.boardCellPos.x}`] = tp.tile.id;
        }
      }
      //The selected tile should be above every other tile when picked and drag around
      else if(tp.tile.id === selectedTile.id){
        zIndex = 1001;
      }
      //console.log(thisRef.current.tileToPutOnBoardCell)
      return (
        <MovableLetterTile 
          tile={tp.tile} 
          key={tp.tile.id} 
          pos={tp.pos}
          handleSetSelectedTile = {onSetSelectedTile}
          zIndex = {zIndex}
          boardCellPos={tp.tile.boardCellPos}
          justPlayedTile = {(playedTileIDs.indexOf(tp.tile.id) > -1)}
        />
      );
    })
  );

  //console.log(tileToReposition);
  //console.log(selectedTileBoardPos);

  return(
    <div 
      className = "scrabble-board-wrapper" 
      ref={boardRef} 
      onMouseMove={onMouseMove}
      onMouseUp = {onMouseUp}
    >
      <div 
        style={{
          display:"grid", 
          gridGap:3, 
          gridTemplateColumns:`repeat(15, 30px)`,
          gridTemplateRows:`repeat(15, 30px)`,
          //(((grid width * number) + (gridGap * 15)) - 2) i.e ((35 * 15 + 3 * 15) - 2)
          maxWidth:thisRef.current.boardSize,
          border:"3px solid #fff",
          position:"relative"
        }}
        className="scrabble-board"
      >
        {
          dialogs.map((d, index)=>(
            <MessageDialog 
              key={d.id} 
              top={index * 30} 
              type={d.type}
              msg={d.msg}
              id={d.id}
              handleHideDialog={hideDialogMsg}
              hide={!d.pauseDialogMsg}
            />
          ))
        }
        {
          boardArray.map((boardRow:string[], rowIndex:number)=>(
            boardRow.map((text:string, columnIndex)=>{

              const hovering = (
                rowIndex === selectedTileBoardPos.y 
                && columnIndex === selectedTileBoardPos.x
              );

              let tileID = undefined;
              const index = `${rowIndex}|${columnIndex}`;

              let children = text === "" ? (<>&nbsp;</>) : null;

              if(tileBoardCellPos[index]){
                children = (
                  <UnMovableLetterTile tile={tileBoardCellPos[index]}/>
                );
              }
              else if(hovering && thisRef.current.tileToPutOnBoardCell !== "-1"){
                tileID = thisRef.current.tileToPutOnBoardCell;
              }
              else if(tileToReposition[index]){
                tileID = tileToReposition[index];
              }

              //console.log({tileID});
              return (
                <BoardSlot
                  key={index}
                  rowIndex={rowIndex}
                  columnIndex={columnIndex}
                  {...boardBlockColour[text]}
                  text={text}
                  hovering = {hovering}
                  resetTilePosOnBoard = {resetTilePosOnBoard}
                  _scrollTop = {scrollTop}
                  tileID={tileID}
                >
                  {children}
                </BoardSlot>
              );//end return
            })//end inner map
          ))//end outer map
        }
      </div>
      <ScrabbleActionButton 
        maxWidth={thisRef.current.boardSize}
        handleSubmitTile={handleSubmitTile}
        handlePass={onPass}
        disableBtn={!isCurrentPlayer || gamePaused}
      >
        {
          tilesReactNode
        }
      </ScrabbleActionButton>
    </div>
  );
};

export default ScrabbleBoard;