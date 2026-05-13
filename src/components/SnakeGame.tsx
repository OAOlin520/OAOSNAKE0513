/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  CANVAS_HEIGHT, 
  CANVAS_WIDTH, 
  GRID_SIZE, 
  INITIAL_SPEED, 
  MIN_SPEED, 
  SPEED_INCREMENT, 
  THEME 
} from '../constants';
import { Direction, GameStatus, Point } from '../types';

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  
  // Game logic refs to avoid re-renders during the loop
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const foodRef = useRef<Point>({ x: 5, y: 5 });
  const directionRef = useRef<Direction>(Direction.UP);
  const nextDirectionRef = useRef<Direction>(Direction.UP);
  const speedRef = useRef(INITIAL_SPEED);
  const lastUpdateRef = useRef(0);
  const requestRef = useRef<number>(0);

  // Initialize high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('snake-high-score');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Random food generator
  const generateFood = useCallback(() => {
    const cols = Math.floor(CANVAS_WIDTH / GRID_SIZE);
    const rows = Math.floor(CANVAS_HEIGHT / GRID_SIZE);
    let newFood: Point;
    
    // Ensure food doesn't spawn on snake
    do {
      newFood = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows),
      };
    } while (snakeRef.current.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    
    foodRef.current = newFood;
  }, []);

  const resetGame = useCallback(() => {
    snakeRef.current = [
      { x: 15, y: 15 },
      { x: 15, y: 16 },
      { x: 15, y: 17 },
    ];
    directionRef.current = Direction.UP;
    nextDirectionRef.current = Direction.UP;
    speedRef.current = INITIAL_SPEED;
    setScore(0);
    generateFood();
    setStatus(GameStatus.PLAYING);
  }, [generateFood]);

  const gameOver = useCallback(() => {
    setStatus(GameStatus.GAME_OVER);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  // Game Loop
  const update = useCallback((time: number) => {
    if (status !== GameStatus.PLAYING) return;

    if (time - lastUpdateRef.current > speedRef.current) {
      lastUpdateRef.current = time;
      
      // Update direction
      directionRef.current = nextDirectionRef.current;
      
      const head = { ...snakeRef.current[0] };
      
      switch (directionRef.current) {
        case Direction.UP: head.y -= 1; break;
        case Direction.DOWN: head.y += 1; break;
        case Direction.LEFT: head.x -= 1; break;
        case Direction.RIGHT: head.x += 1; break;
      }
      
      // Wall collision
      if (
        head.x < 0 || 
        head.y < 0 || 
        head.x >= CANVAS_WIDTH / GRID_SIZE || 
        head.y >= CANVAS_HEIGHT / GRID_SIZE
      ) {
        gameOver();
        return;
      }
      
      // Self collision
      if (snakeRef.current.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
      }
      
      const newSnake = [head, ...snakeRef.current];
      
      // Food collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore(prev => prev + 10);
        speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT);
        generateFood();
      } else {
        newSnake.pop();
      }
      
      snakeRef.current = newSnake;
    }
    
    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [status, generateFood, gameOver]);

  // Drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear
    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw Grid (Subtle)
    ctx.strokeStyle = THEME.grid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    
    // Draw Food
    ctx.shadowBlur = 15;
    ctx.shadowColor = THEME.food;
    ctx.fillStyle = THEME.food;
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * GRID_SIZE + GRID_SIZE / 2,
      foodRef.current.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Draw Snake
    ctx.shadowBlur = 10;
    ctx.shadowColor = THEME.snake;
    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? THEME.snakeHead : THEME.snake;
      
      // Rounded segments
      const x = segment.x * GRID_SIZE + 1;
      const y = segment.y * GRID_SIZE + 1;
      const size = GRID_SIZE - 2;
      const radius = 4;
      
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + size - radius, y);
      ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
      ctx.lineTo(x + size, y + size - radius);
      ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
      ctx.lineTo(x + radius, y + size);
      ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.shadowBlur = 0;
  }, []);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      
      if (status !== GameStatus.PLAYING) return;
      
      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (directionRef.current !== Direction.DOWN) nextDirectionRef.current = Direction.UP;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (directionRef.current !== Direction.UP) nextDirectionRef.current = Direction.DOWN;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (directionRef.current !== Direction.RIGHT) nextDirectionRef.current = Direction.LEFT;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (directionRef.current !== Direction.LEFT) nextDirectionRef.current = Direction.RIGHT;
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  // Request Animation Frame starter
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      draw(); // Initial draw for idle state
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [status, update, draw]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] font-mono selection:bg-neon-green/30">
      {/* Header / HUD */}
      <div className="w-full max-w-[800px] flex items-center justify-between px-4 py-6 mb-4">
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold tracking-tighter text-white flex items-center gap-2">
            霓虹<span className="text-[#00ff00]">蛇</span>
            <div className="w-2 h-2 rounded-full bg-[#00ff00] animate-pulse" />
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">版本 1.0.0 // 系統啟動</p>
        </div>
        
        <div className="flex gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">分數</span>
            <span className="text-2xl font-bold text-[#00ff00]">{score.toString().padStart(4, '0')}</span>
          </div>
          <div className="flex flex-col items-end border-l border-gray-800 pl-8">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
              <Trophy size={10} className="text-yellow-500" /> 最高分
            </span>
            <span className="text-2xl font-bold text-white">{highScore.toString().padStart(4, '0')}</span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative group">
        {/* Subtle decorative corners */}
        <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-gray-800" />
        <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-gray-800" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-gray-800" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-gray-800" />
        
        <canvas
          id="game-canvas"
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="rounded-sm border border-gray-800 shadow-[0_0_50px_rgba(0,0,0,1)] cursor-crosshair"
        />

        {/* Overlays */}
        <AnimatePresence>
          {status === GameStatus.IDLE && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-sm"
            >
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-8"
              >
                <div className="p-6 rounded-full bg-[#00ff00]/10 border border-[#00ff00]/20">
                  <Play size={48} className="text-[#00ff00] fill-[#00ff00]" />
                </div>
              </motion.div>
              <h2 className="text-3xl font-bold mb-2 tracking-tight">準備開始？</h2>
              <p className="text-gray-400 mb-8 max-w-sm text-center text-sm px-4">
                使用方向鍵或WASD鍵控制系統。吃掉數據包以增加長度和複雜度。
              </p>
              <button
                id="start-button"
                onClick={resetGame}
                className="px-10 py-4 bg-[#00ff00] text-black font-bold text-sm tracking-widest hover:bg-[#33ff33] transition-colors rounded-sm uppercase shadow-[0_0_20px_rgba(0,255,0,0.3)] transition-transform hover:scale-105 active:scale-95"
              >
                開始遊戲
              </button>
            </motion.div>
          )}

          {status === GameStatus.GAME_OVER && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md rounded-sm border-2 border-red-500/20"
            >
              <h2 className="text-6xl font-black mb-4 tracking-tighter text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                連接中斷
              </h2>
              <div className="flex flex-col items-center gap-1 mb-8">
                <span className="text-gray-500 uppercase text-[10px] tracking-widest">最終完整度</span>
                <span className="text-4xl font-bold text-white leading-none">{score} 分</span>
              </div>
              <button
                id="restart-button"
                onClick={resetGame}
                className="flex items-center gap-3 px-8 py-4 bg-white text-black font-bold text-sm tracking-widest hover:bg-gray-200 transition-colors rounded-sm uppercase shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-transform hover:scale-105 active:scale-95"
              >
                <RefreshCw size={18} /> 重新連接
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="mt-12 flex flex-col items-center gap-4">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-2 p-4 border border-gray-900 rounded-lg">
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded border border-gray-700 flex items-center justify-center"><ChevronUp size={14} /></div>
            </div>
            <div className="flex gap-1">
              <div className="w-8 h-8 rounded border border-gray-700 flex items-center justify-center"><ChevronLeft size={14} /></div>
              <div className="w-8 h-8 rounded border border-gray-700 flex items-center justify-center"><ChevronDown size={14} /></div>
              <div className="w-8 h-8 rounded border border-gray-700 flex items-center justify-center"><ChevronRight size={14} /></div>
            </div>
            <span className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">導航</span>
          </div>
          
          <div className="flex flex-col items-center gap-2 p-4 border border-gray-900 rounded-lg min-w-[120px]">
             <div className="flex gap-1 items-center mb-1">
                <div className="w-4 h-4 rounded-full bg-[#ff00ff] shadow-[0_0_8px_#ff00ff]" />
                <span className="text-xs text-gray-400">目標</span>
             </div>
             <div className="flex gap-1 items-center">
                <div className="w-4 h-4 rounded-sm bg-[#00ff00] shadow-[0_0_8px_#00ff00]" />
                <span className="text-xs text-gray-400">主機</span>
             </div>
             <span className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">圖例</span>
          </div>
        </div>
        
        <p className="text-[9px] text-gray-800 uppercase tracking-[0.3em] font-bold">
          安全協議 // 未檢測到外部干擾
        </p>
      </div>
    </div>
  );
}
