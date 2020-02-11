declare const tiles: {
    letter: string;
    point: number;
}[];
declare type TileType = {
    letter: string;
    point: number;
};
declare type TilePosOnBoard = {
    tile: TileType;
    pos: [number, number];
};
