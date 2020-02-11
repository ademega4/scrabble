const tiles = [
  {letter:"A", point:1}
];

type TileType = {
  letter:string,
  point:number
};

type TilePosOnBoard = {
  tile:TileType,
  pos:[number, number]
}
