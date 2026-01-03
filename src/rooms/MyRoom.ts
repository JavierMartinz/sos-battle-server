import { Room, Client } from "@colyseus/core";
import { MyRoomState, createInitialCells } from "./schema/MyRoomState";

type PlayerKey = "player1" | "player2";
type MoveMessage = { x: number; y: number; letter: string };
type Sequence = Array<{ x: number; y: number }>;

const MODES = {
  HORIZONTAL_VERTICAL: "horizontal-vertical",
  ALL_DIRECTIONS: "all-directions",
};

const DEFAULT_WORD = "OSO";

export class MyRoom extends Room<MyRoomState> {
  maxClients = 2;

  private players = new Map<string, PlayerKey>();

  onCreate(options: any) {
    this.setState(new MyRoomState());

    const gridSizeX = options?.gridSizeX ?? 6;
    const gridSizeY = options?.gridSizeY ?? 6;
    const gameMode = options?.gameMode ?? MODES.ALL_DIRECTIONS;
    const targetWord = options?.targetWord ?? DEFAULT_WORD;

    this.state.gridSizeX = gridSizeX;
    this.state.gridSizeY = gridSizeY;
    this.state.gameMode = gameMode;
    this.state.targetWord = targetWord;
    this.state.currentPlayer = "player1";
    this.state.extraTurn = false;
    this.state.gameOver = false;
    this.state.filledCells = 0;
    this.state.playerCount = 0;
    this.state.scores.set("player1", 0);
    this.state.scores.set("player2", 0);
    this.state.cells = createInitialCells(gridSizeX, gridSizeY);

    this.onMessage("place_letter", (client, message: MoveMessage) => {
      this.handlePlaceLetter(client, message);
    });
  }

  onJoin(client: Client) {
    const seat = this.assignSeat(client.sessionId);
    this.state.playerCount = this.clients.length;

    client.send("seat", {
      sessionId: client.sessionId,
      playerKey: seat,
      roomId: this.roomId,
    });
  }

  onLeave(client: Client) {
    this.players.delete(client.sessionId);
    this.state.playerCount = this.clients.length;
  }

  private assignSeat(sessionId: string): PlayerKey {
    if (this.players.size === 0) {
      this.players.set(sessionId, "player1");
      return "player1";
    }

    if (![...this.players.values()].includes("player2")) {
      this.players.set(sessionId, "player2");
      return "player2";
    }

    this.players.set(sessionId, "player1");
    return "player1";
  }

  private handlePlaceLetter(client: Client, message: MoveMessage) {
    if (this.state.gameOver) return;

    const playerKey = this.players.get(client.sessionId);
    if (!playerKey) return;
    if (this.state.currentPlayer !== playerKey) return;

    const { x, y, letter } = message;
    if (!this.isValidCell(x, y)) return;
    if (letter !== "O" && letter !== "S") return;

    const cell = this.getCell(x, y);
    if (!cell || cell.letter) return;

    cell.letter = letter;
    cell.player = playerKey;
    this.state.filledCells += 1;

    const sequences = this.detectSequences(x, y, letter);
    const scoreDelta = sequences.length;

    if (scoreDelta > 0) {
      this.state.scores.set(playerKey, (this.state.scores.get(playerKey) ?? 0) + scoreDelta);
      this.state.extraTurn = true;
    } else {
      this.state.extraTurn = false;
    }

    if (!this.state.extraTurn) {
      this.state.currentPlayer = this.state.currentPlayer === "player1" ? "player2" : "player1";
    }

    if (this.state.filledCells >= this.state.gridSizeX * this.state.gridSizeY) {
      this.state.gameOver = true;
    }

    const scores = {
      player1: this.state.scores.get("player1") ?? 0,
      player2: this.state.scores.get("player2") ?? 0,
    };

    this.broadcast("move_result", {
      x,
      y,
      letter,
      playerKey,
      sequences,
      currentPlayer: this.state.currentPlayer,
      scores,
      extraTurn: this.state.extraTurn,
      gameOver: this.state.gameOver,
      filledCells: this.state.filledCells,
    });
  }

  private getCell(x: number, y: number) {
    return this.state.cells[y * this.state.gridSizeX + x];
  }

  private isValidCell(x: number, y: number) {
    return x >= 0 && x < this.state.gridSizeX && y >= 0 && y < this.state.gridSizeY;
  }

  private detectSequences(placedX: number, placedY: number, placedLetter: string): Sequence[] {
    const word = (this.state.targetWord || DEFAULT_WORD).toUpperCase();
    if (word.length !== 3) return [];

    const directions = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
    ];

    if (this.state.gameMode === MODES.ALL_DIRECTIONS) {
      directions.push({ dx: 1, dy: 1 }, { dx: 1, dy: -1 });
    }

    const sequences: Sequence[] = [];

    for (const direction of directions) {
      for (let offsetIndex = 0; offsetIndex < 3; offsetIndex += 1) {
        const startX = placedX - offsetIndex * direction.dx;
        const startY = placedY - offsetIndex * direction.dy;

        const positions: Sequence = [];
        let matches = true;

        for (let i = 0; i < 3; i += 1) {
          const x = startX + i * direction.dx;
          const y = startY + i * direction.dy;
          const expectedLetter = word[i];

          if (!this.isValidCell(x, y)) {
            matches = false;
            break;
          }

          const actualLetter = i === offsetIndex ? placedLetter : this.getCell(x, y)?.letter ?? "";
          if (actualLetter !== expectedLetter) {
            matches = false;
            break;
          }

          positions.push({ x, y });
        }

        if (matches) {
          sequences.push(positions);
        }
      }
    }

    return sequences;
  }
}
