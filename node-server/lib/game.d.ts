declare class Game {
    private timeOutToJoinGame;
    private players;
    private numPlayer;
    constructor(numPlayer: number, gameSessionID: string, deleteGame: (gameSessionID: string) => void);
    addPlayer(ws: WebSocket): void;
}
export default class Games {
    private gameStore;
    generateGameSessionID(): string;
    addGame(gameSessionID: string, numPlayer: number): Game;
    getGame(gameSessionID: string): Game;
    deleteGame(gameSessionID: string): void;
}
export {};
