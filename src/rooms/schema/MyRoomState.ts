import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class CellState extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("string") letter = "";
  @type("string") player = "";
}

export class MyRoomState extends Schema {
  @type("number") gridSizeX = 6;
  @type("number") gridSizeY = 6;
  @type("string") gameMode = "all-directions";
  @type("string") targetWord = "OSO";
  @type("string") currentPlayer = "player1";
  @type("boolean") extraTurn = false;
  @type("boolean") gameOver = false;
  @type("number") filledCells = 0;
  @type("number") playerCount = 0;

  @type({ map: "number" }) scores = new MapSchema<number>();
  @type({ array: CellState }) cells = new ArraySchema<CellState>();
}

export const createInitialCells = (gridSizeX: number, gridSizeY: number) => {
  const cells = new ArraySchema<CellState>();
  for (let y = 0; y < gridSizeY; y += 1) {
    for (let x = 0; x < gridSizeX; x += 1) {
      const cell = new CellState();
      cell.x = x;
      cell.y = y;
      cells.push(cell);
    }
  }
  return cells;
};
