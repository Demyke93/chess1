
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChessGameBoard } from "./ChessGameBoard";
import { ChessGameProvider, useChessGame } from "@/context/ChessGameContext";
import { RefreshCw } from "lucide-react";

interface ChessGameControlsProps {
  className?: string;
}

const ChessGameControls = ({ className = '' }: ChessGameControlsProps) => {
  const { resetGame, gameState } = useChessGame();
  
  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Game Controls</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetGame}
          className="flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Reset Game
        </Button>
      </div>
      
      <div>
        <h4 className="font-medium">Captured Pieces</h4>
        <div className="flex justify-between mt-2">
          <div>
            <p className="text-sm text-muted-foreground">White</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {gameState.capturedPieces.black.map((piece, i) => (
                <span key={i} className="text-xl">
                  {piece.type === 'pawn' ? '♟' : 
                   piece.type === 'rook' ? '♜' : 
                   piece.type === 'knight' ? '♞' : 
                   piece.type === 'bishop' ? '♝' : 
                   piece.type === 'queen' ? '♛' : '♚'}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Black</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {gameState.capturedPieces.white.map((piece, i) => (
                <span key={i} className="text-xl">
                  {piece.type === 'pawn' ? '♙' : 
                   piece.type === 'rook' ? '♖' : 
                   piece.type === 'knight' ? '♘' : 
                   piece.type === 'bishop' ? '♗' : 
                   piece.type === 'queen' ? '♕' : '♔'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {gameState.gameStatus !== 'active' && (
        <div className="mt-2 p-2 rounded bg-chess-brown/20 border border-chess-brown/30">
          <p className="font-medium text-center">
            {gameState.gameStatus === 'check' && `${gameState.currentTurn === 'white' ? 'White' : 'Black'} is in check!`}
            {gameState.gameStatus === 'checkmate' && 
              `Checkmate! ${gameState.winner === 'white' ? 'White' : 'Black'} wins!`}
            {gameState.gameStatus === 'stalemate' && 'Stalemate! The game is a draw.'}
          </p>
        </div>
      )}
    </div>
  );
};

interface ChessGameProps {
  className?: string;
}

export const ChessGame = ({ className = '' }: ChessGameProps) => {
  return (
    <ChessGameProvider>
      <Card className={`${className} bg-chess-dark border-chess-brown/50`}>
        <CardHeader>
          <CardTitle>Chess Game</CardTitle>
          <CardDescription>Play a game of chess with another player</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ChessGameBoard />
          <ChessGameControls className="mt-6" />
        </CardContent>
      </Card>
    </ChessGameProvider>
  );
};
