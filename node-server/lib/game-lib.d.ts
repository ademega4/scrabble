import WebSocket from "ws";
import Trie from "./lib/trie";
import Emitter from "./emitter";
declare type TileType = {
    letter: string;
    point: number;
    id: string;
};
declare class Game extends Emitter {
    private dictionary;
    private timeOutToJoinGameID;
    private players;
    private numPlayer;
    private gameSessionID;
    private gameInProgress;
    private currentPlayTurn;
    private playTimeoutIntervalID;
    private tileBag;
    private board;
    private clock;
    private paused;
    private lastWords;
    private playedTileBoardCellPos;
    private isFirstPlay;
    private pauseToProcess;
    constructor(dictionary: Trie, numPlayer: number, gameSessionID: string);
    isGameInProgress(): boolean;
    broadcastMsgToEveryoneExcept(wsID: string, eventType: string, payload: any): void;
    broadcastToAll(eventType: string, payload: any, callback?: () => void): void;
    addPlayer(ws: WebSocket): void;
    getPlayers(): Player[];
    getIDOfPlayers(): string[];
    getPlayerByPlayerID(playerID: string): Player | undefined;
    getGameSessionID(): string;
    getNumPlayers(): number;
    pauseGame(): void;
    resumeGame(): void;
    isGamePause(): boolean;
    destroy(): void;
    putPlayerBackInGame(playerWs: WebSocket, stillOfflinePlayers: string[], callback: () => void): void;
    private startGame;
    private sendGamePayload;
    /**
     * Tile can be place on the board from right to left, left to right, top to bottom or bottom to top.
     * It should only form a word from left to right or top to bottom, so I need to sort the board
     * coordinate since top most or left most will have a lower value when added together than the next
     * coordinate after it. It this function that does that.
     *
     * Also since the tile place must also form a word with existing tile on board, this function get all
     * those tile that touches the played tile(s)
     */
    private preparePlayedTileIDAndBoardCoord;
    /**
     *
     * @param {string[]} playedWordTileIDsWithBoardCoord the currently played tiles
     * @param {PlayedTileBoardCellPos} allBoardTileIDAndCoord all tile that later be on board
     * @param {boolean} tilePlacedHorizontally tile placement direction
     * @returns {boolean} whether the played tile form word with existing tiles on the board
     */
    private checkIfTileFormAWord;
    private verifyUserTilesAndGetPlayedWord;
    /**
     * @description get all tile(s) and their board position or coordinate that form player played word
     * @param {PlayedTileBoardCellPos} from - from which object store
     * @param {number} row starting from which row or y-axis
     * @param {number} column starting from which column or x-axis
     * @param {number} direction can be left, right, top or bottom
     * @returns {string[]} return array of tiles and their board position or coordinate in this format tileID:y|x
     */
    private getTileIDWithBoardCoord;
    private getCurrentPlayer;
    /**
     * Determine if game is over. Game is over when tile bag is empty and players pass twice
     * or a player plays all his or her tiles
     */
    private checkIfGameShouldBeOver;
    /**
     * calculate player final score, by subracting total of player' unplay score from totalscore
     * and adding it to player with empty rack if any.
     */
    private calculateFinalScore;
    private sendGamePayloadAndStartTimer;
    private isCurrentPlayer;
    private moveTile;
    private submitTile;
    private incrementPassCountIfTileBagIsEmpty;
    private onPass;
    private onSearchDict;
    private addEventHandlerToGame;
    private scorePlayerAndStoreWordOnTheBoard;
    private stopClock;
    private startClock;
    private shuffleTiles;
    private getNextToPlayPlayerID;
    private getTilesForPlayer;
    private getPlayerPayload;
    /**
     *
     * (1 point)-A, E, I, O, U, L, N, S, T, R
     * (2 points)-D, G
     * (3 points)-B, C, M, P
     * (4 points)-F, H, V, W, Y
     * (5 points)-K
     * (8 points)- J, X
     * (10 points)-Q, Z
     */
    private getPoint;
}
declare class Player {
    private ws;
    private score;
    private tiles;
    private passCount;
    constructor(ws: WebSocket);
    getTiles(): TileType[];
    setTiles(newTiles: TileType[]): void;
    removeTile(tileID: string | string[]): void;
    addTile(tile: TileType): void;
    replaceWs(ws: WebSocket): void;
    getWs(): WebSocket;
    incrementScore(increment: number): void;
    getScore(): number;
    setScore(score: number): void;
    getTotalTileInRank(): number;
    getPlayerID(): string;
    incrementPassCount(): void;
    getPassCount(): number;
}
export default class Games {
    private static gameStore;
    private static dict;
    private static disconnectUserStore;
    static init(dict: Trie, emitter: Emitter): void;
    static emitEventToGame(eventType: string, ws: WebSocket, data?: any): void;
    static generateGame(firstPlayerWs: WebSocket, numPlayer: number): string;
    private static addGame;
    static getGameByGameSessionID(gameSessionID: string): Game | undefined;
    static deleteGame(gameSessionID: string): void;
    static addPlayerIDToDisconnectGameStore(gameSessionID: string, playerID: string): void;
    static removePlayerIDFromDisconnectGameStore(gameSessionID: string, playerID: string): void;
    static noMorePlayerOffline(gameSessionID: string): boolean;
    static getGameSessionIDFromDisconnectStoreUsingPlayerID(playerID: string): string | undefined;
    static getDisconnectedPlayerIDByGameSessionID(gameSessionID: string): string[];
}
export {};
