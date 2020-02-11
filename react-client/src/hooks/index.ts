import { useState, useEffect, useCallback, useRef } from 'react';
import {RequestOption, QueryResponse, DoQuery, MutationResponse} from "../declaration";

const doQuery:DoQuery = (uri, option, setResponse, ignoreResultRef, reQuery)=>{
  fetch(uri, option)
  .then(response=>{
    //if response is ok
    if(response.ok){
      return response.json();
    }
    
    throw new Error(
      response.status === 404 
      ? "Not Found" 
      : (
        response.status === 500 
        ? response.statusText
        : "Internal Server Error"
      )
    );
  })
  .then(data=>{
    if(!ignoreResultRef.current){
      setResponse({loading:false, data, error:null, reQuery});
    }
  })
  .catch(error=>{
    console.error(error);
    setResponse({loading:false, data:null, error, reQuery})
  });
}

export function useQuery(
  uri:string, 
  option:RequestOption={}
) :[QueryResponse, React.Dispatch<React.SetStateAction<QueryResponse>>]{
  //lemme know if the component is already unmounted, we need to ignore the result of the query
  const ignoreResultRef = useRef(false);
  //if there is a need to refetch the query, this function will do the trick
  
  const reQuery = useCallback((uri, option)=>{
    doQuery(uri, option, setResponse, ignoreResultRef, reQuery);
  }, []);

  //set state
  const [response, setResponse] = useState<QueryResponse>({
    loading:true, data:null, error:null, reQuery
  });
  //deferuntil the component has mounted
  useEffect(()=>{
    doQuery(uri, option, setResponse, ignoreResultRef, reQuery);
    return ()=>{
      ignoreResultRef.current = true;
    }
  }, [uri, option, reQuery]);

  return [response, setResponse];
}

export function useMutation(uri:string) : [
  MutationResponse, (option:RequestOption)=>Promise<MutationResponse>
]{
  const [response, setResponse] = useState<MutationResponse>({loading:false, data:null, error:null});
  
  const mutate = useCallback((option)=>{
    return fetch(uri, option)
    .then(response=>{
      //if response is ok
      if(response.ok){
        return response.json();
      }
      
      throw new Error(
        response.status === 404 
        ? "Not Found" 
        : (
          response.status === 500 
          ? response.statusText
          : "Internal Server Error"
        )
      );
    })
    .then(data=>{
      //setUsername(event.target.value);
      const result:MutationResponse = {loading:false, data, error:null}
      setResponse(result);
      return result;
    })
    .catch(error=>{
      console.error(error);
      setResponse({loading:false, data:null, error})
      throw error;
    });
  }, [uri]);
  return [response, mutate];
} 