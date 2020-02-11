export default class Emitter{
    private handlerContainers :{[key:string]:Function[]}= {};

    constructor(){
    }
  
    addEventListener(eventType:string, handler:Function){
      if(this.handlerContainers[eventType]){
        this.handlerContainers[eventType].push(handler);
      }else{
        this.handlerContainers[eventType] = [handler];
      }
      return this;
    }
  
    emit(eventType:string, ...args:any[]){
      if(Array.isArray(this.handlerContainers[eventType])){
        for(let i = 0; i < this.handlerContainers[eventType].length; i++){
          (this.handlerContainers[eventType][i]).apply(this, args);
        }
      }
    }
  
    removeEventListener(eventType:string, handler:Function){
      if(Array.isArray(this.handlerContainers[eventType])){
        this.handlerContainers[eventType] = this.handlerContainers[eventType].filter(h=>h !== handler);
      }
      return this;
    }//end method removeEventListener
  }