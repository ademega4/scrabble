"use strict";
/**
 *                                            (  root  )
 *                                             /       \
 *                                           ( a )    ( b )
 *                                           /   \    /    \
 *                                          (b)  (a)   (a)   (d)
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @description lowercase alpahebet character
 */
var ALPHABELTS = "abcdefghijklmnopqrstuvwxyz";
/**
 *
 * @description determine if character is alphabelt
 */
function isAlphabelt(char) {
    return ALPHABELTS.indexOf(char.toLocaleLowerCase()) > -1;
}
/**
 * @description determine if word contain only alphabelt character only
 */
function isWord(word) {
    //if word is empty string return false
    if (word.length < 1)
        return false;
    //loop thru all char word and determine if char is alphabelt
    for (var i = 0; i < word.length; i++) {
        if (!isAlphabelt(word[i]))
            return false;
    }
    return true;
}
/**
 * @description get all word that match a substring and store in array
 */
function getWordFromTrieNode(trieNode, store, substr, limit) {
    if (substr === void 0) { substr = ""; }
    if (limit === void 0) { limit = -1; }
    //if limit is greater than -1 and number of word already stored is is greater
    //or equal to limit
    if (limit > -1 && store.length >= limit)
        return;
    //if trie node is not undefined
    if (trieNode) {
        //if its a whole word, push to store substring
        if (trieNode.isEnd)
            store.push(substr);
        //get all entries in map, its an iterator
        var iterator = trieNode.node.entries();
        //item in iterator
        var nex = iterator.next();
        //while not done
        while (!nex.done) {
            //get key 
            var _a = nex.value, key = _a[0], nextTrieNode = _a[1];
            //call function again recursively
            getWordFromTrieNode(nextTrieNode, store, (substr + key), limit);
            nex = iterator.next();
        } //end while 
    }
}
/**
 * @description initialize trie
 * @param node
 */
function initialize(node) {
    //use to store char at a particular index
    var char = "";
    //loop thru all char in alphabelt
    for (var i = 0; i < ALPHABELTS.length; i++) {
        //get char at an index
        char = ALPHABELTS[i];
        //if char does not exist in map
        if (!node.has(char)) {
            //set in map
            node.set(char, getTrieNode(false));
        } //end if
    } //end for loop
} //end function
/**
 * @description get a new trie node
 * @param isEnd
 */
function getTrieNode(isEnd) {
    return { isEnd: isEnd, node: new Map() };
}
var Trie = /** @class */ (function () {
    function Trie() {
        /**
         * @description store trie root node
         */
        this.root = new Map();
        //initialize root node by adding map to each alphabelt char
        initialize(this.root);
    }
    /**
     * @description add word to trie
     * @param word
     */
    Trie.prototype.add = function (word) {
        //convert to lowercase
        word = word.toLocaleLowerCase();
        //check if word contain alphabelt only
        if (!isWord(word))
            return false;
        //get trie node map
        var nodeMap = this.root;
        //store the trie node object
        var trieNode;
        //store each character in string
        var char = "";
        //store the length of word minus one
        var wordLen = word.length - 1;
        //use to determine if node is the end of a full word
        var isEnd = false;
        //loop through the world one after the other
        for (var i = 0; i < word.length; i++) {
            //have we reach the end of the word
            isEnd = i === wordLen;
            //get character at index i
            char = word[i];
            //get trie node at this character
            trieNode = nodeMap.get(char);
            //if trie node exist no need to create new trie node
            if (trieNode) {
                //if trie node is the end of the word
                if (isEnd) {
                    //mark as trie end node
                    trieNode.isEnd = isEnd;
                }
                //set trie node map as new node map
                nodeMap = trieNode.node;
            } //end n
            //else we need to create new
            else {
                //get new trie node 
                trieNode = getTrieNode(isEnd);
                //set in
                nodeMap.set(char, trieNode);
                //set new trie node map as new node map
                nodeMap = trieNode.node;
            }
        } //end for loop
        return true;
    }; //end function
    /**
     * @description check if word is in trie
     * @param word
     */
    Trie.prototype.exist = function (word) {
        word = word.toLocaleLowerCase();
        //if word contain any other character apart from alphabelt return
        if (!isWord(word))
            return false;
        //get map
        var nodeMap = this.root;
        //get trie node 
        var trieNode;
        //store each char in word string
        var char = "";
        //store length of the word, ensure we do not search more than the length of the
        //word before checking if word exist
        //e.g "picked", seaching for "pick", will not search beyond "k" before stopping
        //and returning word
        var wordLen = word.length - 1;
        //loop thru word
        for (var i = 0; i < word.length; i++) {
            //get index at index i
            char = word[i];
            //get map at char
            trieNode = nodeMap.get(char);
            //if trie node is not undefined
            if (trieNode) {
                //if we have reach the end of the word search
                //return true if trie node is end is true
                //if its a word it'll be true
                if (wordLen === i)
                    return trieNode.isEnd;
                else {
                    //go to next trie node map
                    nodeMap = trieNode.node;
                }
            } //end if
            //if we have reach the end of the trie node
            else {
                //return false
                return false;
            } //end else
        } //end for loop 
        return false;
    }; //end existDict
    /**
     * @description return the trie root node
     */
    Trie.prototype.getRoot = function () {
        return this.root;
    };
    /**
     * @description search all word that match all substring
     */
    Trie.prototype.getAllWordThatMatchSubtr = function (word, limit) {
        if (limit === void 0) { limit = -1; }
        //word contain any other character from alphabelt
        if (!isWord(word))
            return [];
        //store current nodemap
        var nodeMap = this.root;
        //store current trie Node
        var trieNode;
        //store word length
        var wordLen = word.length;
        //store current
        var char = "";
        //store result of the search
        var result = [];
        //need to get trie node of the last word char
        for (var i = 0; i < word.length; i++) {
            //get char at current at index i
            char = word[i];
            //get trie node at char
            trieNode = nodeMap.get(char);
            //if 
            if (wordLen === i) {
                break;
            }
            //if trie node
            else if (trieNode) {
                //get the map at trie node
                nodeMap = trieNode.node;
            }
            else {
                //if trie node is undefined
                //else break
                break;
            }
        } //end for loop
        //if trie node is not undefined
        if (trieNode) {
            //get
            getWordFromTrieNode(trieNode, result, word, limit);
        }
        return result;
    }; //end method
    return Trie;
}());
exports.default = Trie;
