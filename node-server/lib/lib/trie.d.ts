/**
 *                                            (  root  )
 *                                             /       \
 *                                           ( a )    ( b )
 *                                           /   \    /    \
 *                                          (b)  (a)   (a)   (d)
 */
declare type TrieNodeMap = Map<string, TrieNode>;
declare type TrieNode = {
    isEnd: boolean;
    node: TrieNodeMap;
};
export default class Trie {
    /**
     * @description store trie root node
     */
    private root;
    constructor();
    /**
     * @description add word to trie
     * @param word
     */
    add(word: string): boolean;
    /**
     * @description check if word is in trie
     * @param word
     */
    exist(word: string): boolean;
    /**
     * @description return the trie root node
     */
    getRoot(): TrieNodeMap;
    /**
     * @description search all word that match all substring
     */
    getAllWordThatMatchSubtr(word: string, limit?: number): string[];
}
export {};
