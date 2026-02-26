import React, { useState, useEffect, useCallback } from 'react';
import { Bomb, Flag, RefreshCw, Trophy, AlertTriangle, Clock, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type CellValue = number | 'mine';
type CellState = 'hidden' | 'revealed' | 'flagged';

interface Cell {
  value: CellValue;
  state: CellState;
  x: number;
  y: number;
}

interface Difficulty {
  name: string;
  rows: number;
  cols: number;
  mines: number;
}

const DIFFICULTIES: Difficulty[] = [
  { name: 'Beginner', rows: 9, cols: 9, mines: 10 },
  { name: 'Intermediate', rows: 16, cols: 16, mines: 40 },
  { name: 'Expert', rows: 16, cols: 30, mines: 99 },
];

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'idle'>('idle');
  const [flagsUsed, setFlagsUsed] = useState(0);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const createGrid = useCallback((diff: Difficulty): Cell[][] => {
    const newGrid: Cell[][] = [];
    for (let y = 0; y < diff.rows; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < diff.cols; x++) {
        row.push({ value: 0, state: 'hidden', x, y });
      }
      newGrid.push(row);
    }
    return newGrid;
  }, []);

  const initializeGame = useCallback(() => {
    setGrid(createGrid(difficulty));
    setGameState('idle');
    setFlagsUsed(0);
    setTime(0);
    setTimerActive(false);
  }, [difficulty, createGrid]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && gameState === 'playing') {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameState]);

  const placeMines = (firstX: number, firstY: number, currentGrid: Cell[][]) => {
    const newGrid = [...currentGrid.map(row => [...row])];
    let minesPlaced = 0;
    while (minesPlaced < difficulty.mines) {
      const x = Math.floor(Math.random() * difficulty.cols);
      const y = Math.floor(Math.random() * difficulty.rows);

      // Don't place mine on first click or where a mine already exists
      if ((x === firstX && y === firstY) || newGrid[y][x].value === 'mine') continue;

      newGrid[y][x].value = 'mine';
      minesPlaced++;
    }

    // Calculate numbers
    for (let y = 0; y < difficulty.rows; y++) {
      for (let x = 0; x < difficulty.cols; x++) {
        if (newGrid[y][x].value === 'mine') continue;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < difficulty.rows && nx >= 0 && nx < difficulty.cols) {
              if (newGrid[ny][nx].value === 'mine') count++;
            }
          }
        }
        newGrid[y][x].value = count;
      }
    }
    return newGrid;
  };

  const revealCell = (x: number, y: number) => {
    if (gameState === 'won' || gameState === 'lost' || grid[y][x].state !== 'hidden') return;

    let newGrid = [...grid.map(row => [...row])];

    if (gameState === 'idle') {
      newGrid = placeMines(x, y, newGrid);
      setGameState('playing');
      setTimerActive(true);
    }

    const reveal = (cx: number, cy: number, g: Cell[][]) => {
      if (cx < 0 || cx >= difficulty.cols || cy < 0 || cy >= difficulty.rows) return;
      if (g[cy][cx].state !== 'hidden') return;

      g[cy][cx].state = 'revealed';

      if (g[cy][cx].value === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            reveal(cx + dx, cy + dy, g);
          }
        }
      }
    };

    if (newGrid[y][x].value === 'mine') {
      // Game Over
      newGrid.forEach(row => row.forEach(cell => {
        if (cell.value === 'mine') cell.state = 'revealed';
      }));
      setGrid(newGrid);
      setGameState('lost');
      setTimerActive(false);
      return;
    }

    reveal(x, y, newGrid);
    setGrid(newGrid);

    // Check Win
    let hiddenNonMines = 0;
    newGrid.forEach(row => row.forEach(cell => {
      if (cell.value !== 'mine' && cell.state !== 'revealed') hiddenNonMines++;
    }));

    if (hiddenNonMines === 0) {
      setGameState('won');
      setTimerActive(false);
    }
  };

  const toggleFlag = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    if (gameState !== 'playing' && gameState !== 'idle') return;
    if (grid[y][x].state === 'revealed') return;

    const newGrid = [...grid.map(row => [...row])];
    const currentState = newGrid[y][x].state;

    if (currentState === 'hidden') {
      if (flagsUsed < difficulty.mines) {
        newGrid[y][x].state = 'flagged';
        setFlagsUsed(prev => prev + 1);
      }
    } else if (currentState === 'flagged') {
      newGrid[y][x].state = 'hidden';
      setFlagsUsed(prev => prev - 1);
    }

    setGrid(newGrid);
  };

  const getCellContent = (cell: Cell) => {
    if (cell.state === 'flagged') return <Flag className="w-4 h-4 text-red-500" />;
    if (cell.state === 'hidden') return null;
    if (cell.value === 'mine') return <Bomb className="w-4 h-4 text-black" />;
    if (cell.value === 0) return null;
    return <span className={`font-bold ${getNumberColor(cell.value)}`}>{cell.value}</span>;
  };

  const getNumberColor = (num: number) => {
    const colors = [
      '',
      'text-blue-600',
      'text-green-600',
      'text-red-600',
      'text-purple-600',
      'text-maroon-600',
      'text-teal-600',
      'text-black',
      'text-gray-600'
    ];
    return colors[num] || '';
  };

  return (
    <div className="min-h-screen bg-neutral-100 py-12 px-4 font-sans text-neutral-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-2 italic">
            Minesweeper
          </h1>
          <p className="text-neutral-500 uppercase text-xs tracking-widest font-bold">
            Precision & Logic
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {DIFFICULTIES.map((diff) => (
            <button
              key={diff.name}
              onClick={() => setDifficulty(diff)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                difficulty.name === diff.name
                  ? 'bg-neutral-900 text-white shadow-lg'
                  : 'bg-white text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {diff.name}
            </button>
          ))}
        </div>

        {/* Game Board Container */}
        <div className="bg-white p-6 rounded-3xl shadow-2xl border border-neutral-200">
          {/* Stats Bar */}
          <div className="flex justify-between items-center mb-6 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-neutral-400" />
              <span className="font-mono text-xl font-bold">
                {String(difficulty.mines - flagsUsed).padStart(3, '0')}
              </span>
            </div>
            
            <button
              onClick={initializeGame}
              className="p-3 bg-neutral-900 text-white rounded-xl hover:scale-110 transition-transform active:scale-95"
            >
              <RefreshCw className={`w-6 h-6 ${gameState === 'playing' ? 'animate-spin-slow' : ''}`} />
            </button>

            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-neutral-400" />
              <span className="font-mono text-xl font-bold">
                {String(time).padStart(3, '0')}
              </span>
            </div>
          </div>

          {/* Grid */}
          <div 
            className="grid gap-1 mx-auto overflow-auto max-h-[70vh] p-2 bg-neutral-200 rounded-xl"
            style={{ 
              gridTemplateColumns: `repeat(${difficulty.cols}, minmax(30px, 1fr))`,
              width: 'fit-content'
            }}
          >
            {grid.map((row, y) => 
              row.map((cell, x) => (
                <motion.div
                  key={`${x}-${y}`}
                  initial={false}
                  whileHover={{ scale: cell.state === 'hidden' ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => revealCell(x, y)}
                  onContextMenu={(e) => toggleFlag(e, x, y)}
                  className={`
                    w-8 h-8 flex items-center justify-center text-sm cursor-pointer rounded-sm
                    transition-colors duration-200
                    ${cell.state === 'revealed' 
                      ? cell.value === 'mine' ? 'bg-red-500' : 'bg-neutral-50' 
                      : 'bg-neutral-400 hover:bg-neutral-300 shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.2),inset_2px_2px_0px_rgba(255,255,255,0.4)]'
                    }
                  `}
                >
                  {getCellContent(cell)}
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Status Overlay */}
        <AnimatePresence>
          {(gameState === 'won' || gameState === 'lost') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-neutral-900 text-center pointer-events-auto max-w-sm w-full mx-4">
                {gameState === 'won' ? (
                  <>
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-10 h-10 text-yellow-600" />
                    </div>
                    <h2 className="text-3xl font-black mb-2 italic">VICTORY!</h2>
                    <p className="text-neutral-500 mb-6">You cleared the field in {time} seconds.</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-10 h-10 text-red-600" />
                    </div>
                    <h2 className="text-3xl font-black mb-2 italic">BOOM!</h2>
                    <p className="text-neutral-500 mb-6">Better luck next time, commander.</p>
                  </>
                )}
                <button
                  onClick={initializeGame}
                  className="w-full py-4 bg-neutral-900 text-white rounded-2xl font-bold text-lg hover:bg-neutral-800 transition-colors"
                >
                  Play Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <div className="mt-12 text-center text-neutral-400 text-xs uppercase tracking-widest font-bold">
          <p>Left Click to Reveal • Right Click to Flag</p>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
