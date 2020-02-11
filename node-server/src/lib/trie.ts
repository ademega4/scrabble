/**
 *                                            (  root  )
 *                                             /       \
 *                                           ( a )    ( b )
 *                                           /   \    /    \
 *                                          (b)  (a)   (a)   (d)
 */


/**
 * @description lowercase alpahebet character
 */
const ALPHABELTS :string = "abcdefghijklmnopqrstuvwxyz";

type TrieNodeMap= Map<string, TrieNode>;

type TrieNode = {
  isEnd:boolean,
  node:TrieNodeMap
}

/**
 * 
 * @description determine if character is alphabelt
 */
function isAlphabelt(char :string) :boolean{
  return ALPHABELTS.indexOf(char.toLocaleLowerCase()) > -1;
}

/**
 * @description determine if word contain only alphabelt character only
 */
function isWord(word :string) : boolean{
  //if word is empty string return false
  if(word.length < 1) return false;
  //loop thru all char word and determine if char is alphabelt
  for(let i = 0; i < word.length; i++){
    if(!isAlphabelt(word[i])) return false;
  }
  return true;
}

/**
 * @description get all word that match a substring and store in array
 */
function getWordFromTrieNode(trieNode:TrieNode|undefined, store:string[], substr :string="", limit :number = -1) :void{
  //if limit is greater than -1 and number of word already stored is is greater
  //or equal to limit
  if(limit > -1 && store.length >= limit) return;
  //if trie node is not undefined
  if(trieNode){
    //if its a whole word, push to store substring
    if(trieNode.isEnd) store.push(substr);
    //get all entries in map, its an iterator
    let iterator:IterableIterator<[string, TrieNode]> = trieNode.node.entries();
    //item in iterator
    let nex:IteratorResult<[string, TrieNode], [string, TrieNode]> = iterator.next();
    //while not done
    while(!nex.done){
      //get key 
      const [key, nextTrieNode] = nex.value;
      //call function again recursively
      getWordFromTrieNode(nextTrieNode, store, (substr + key), limit);
      nex = iterator.next();
    }//end while 
  }
}

/**
 * @description initialize trie 
 * @param node 
 */
function initialize(node :TrieNodeMap) :void{
  //use to store char at a particular index
  let char: string = "";
  //loop thru all char in alphabelt
  for(let i = 0; i < ALPHABELTS.length; i++){
    //get char at an index
    char = ALPHABELTS[i];
    //if char does not exist in map
    if(!node.has(char)){
      //set in map
      node.set(char, getTrieNode(false));
    }//end if
  }//end for loop
}//end function

/**
 * @description get a new trie node
 * @param isEnd 
 */
function getTrieNode(isEnd:boolean) :TrieNode{
  return {isEnd, node:new Map()};
}

export default class Trie{
  /**
   * @description store trie root node 
   */
  private root: TrieNodeMap = new Map();

  constructor(){
    //initialize root node by adding map to each alphabelt char
    initialize(this.root);
  }

  /**
   * @description add word to trie
   * @param word 
   */
  add(word :string) :boolean{
    //convert to lowercase
    word = word.toLocaleLowerCase();
    //check if word contain alphabelt only
    if(!isWord(word)) return false;
    //get trie node map
    let nodeMap :TrieNodeMap = this.root;
    //store the trie node object
    let trieNode: TrieNode|undefined;
    //store each character in string
    let char :string = "";
    //store the length of word minus one
    const wordLen :number= word.length - 1;
    //use to determine if node is the end of a full word
    let isEnd :boolean = false;
    //loop through the world one after the other
    for(let i = 0; i < word.length; i++){
      //have we reach the end of the word
      isEnd = i === wordLen;
      //get character at index i
      char = word[i];
      //get trie node at this character
      trieNode = nodeMap.get(char);
      //if trie node exist no need to create new trie node
      if(trieNode){
        //if trie node is the end of the word
        if(isEnd){
          //mark as trie end node
          trieNode.isEnd = isEnd;
        }
        //set trie node map as new node map
        nodeMap = trieNode.node;
      }//end n
      //else we need to create new
      else{
        //get new trie node 
        trieNode = getTrieNode(isEnd);
        //set in
        nodeMap.set(char, trieNode);
        //set new trie node map as new node map
        nodeMap = trieNode.node;
      }
    }//end for loop
    return true;
  }//end function

  /**
   * @description check if word is in trie
   * @param word 
   */
  exist(word :string) :boolean{
    word = word.toLocaleLowerCase();
    //if word contain any other character apart from alphabelt return
    if(!isWord(word)) return false;
    //get map
    let nodeMap :TrieNodeMap = this.root;
    //get trie node 
    let trieNode :TrieNode|undefined;
    //store each char in word string
    let char :string = "";
    //store length of the word, ensure we do not search more than the length of the
    //word before checking if word exist
    //e.g "picked", seaching for "pick", will not search beyond "k" before stopping
    //and returning word
    const wordLen = word.length - 1;
    //loop thru word
    for(let i = 0; i < word.length; i++){
      //get index at index i
      char = word[i];
      //get map at char
      trieNode = nodeMap.get(char);
      //if trie node is not undefined
      if(trieNode){
        //if we have reach the end of the word search
        //return true if trie node is end is true
        //if its a word it'll be true
        if(wordLen === i) return trieNode.isEnd;
        else {
          //go to next trie node map
          nodeMap = trieNode.node;
        }
      }//end if
      //if we have reach the end of the trie node
      else{
        //return false
        return false;
      }//end else
    }//end for loop 
    return false;
  }//end existDict

  /**
   * @description return the trie root node
   */
  getRoot() :TrieNodeMap{
    return this.root;
  }

  /**
   * @description search all word that match all substring
   */
  getAllWordThatMatchSubtr(word :string, limit :number=-1) :string[]{
    //word contain any other character from alphabelt
    if(!isWord(word)) return [];
    //store current nodemap
    let nodeMap :TrieNodeMap = this.root;
    //store current trie Node
    let trieNode :TrieNode|undefined;
    //store word length
    let wordLen = word.length;
    //store current
    let char :string = "";
    //store result of the search
    const result :string[] = [];
    //need to get trie node of the last word char
    for(let i = 0; i < word.length; i++){
      //get char at current at index i
      char = word[i];
      //get trie node at char
      trieNode = nodeMap.get(char);
      //if 
      if(wordLen === i){
        break;
      }
      //if trie node
      else if(trieNode){
        //get the map at trie node
        nodeMap = trieNode.node;
      }
      else{
        //if trie node is undefined
        //else break
        break;
      }
    }//end for loop
    
    //if trie node is not undefined
    if(trieNode){
      //get
      getWordFromTrieNode(trieNode, result, word, limit);
    }
    return result;
  }//end method
}

