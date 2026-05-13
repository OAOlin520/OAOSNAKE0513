/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GRID_SIZE,
  INITIAL_SPEED,
  MIN_SPEED,
  SPEED_INCREMENT,
  THEME,
} from '../constants';
import { Direction, GameStatus, Point } from '../types';

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [currentTime, setCurrentTime] = useState(new Date());
  
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

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
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

  const statusText = status === GameStatus.PLAYING ? '遊戲中' : status === GameStatus.GAME_OVER ? '遊戲結束' : '準備開始';

  return (
    <section className="snake-game-container" style={{ color: THEME.text, fontFamily: 'var(--font-mono)' }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>霓虹蛇遊戲</h1>
        <p style={{ margin: '8px 0 0' }}>請使用方向鍵或 WASD 控制蛇，吃到食物會加分。</p>
      </header>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{
              display: 'block',
              border: `2px solid ${THEME.accent}`,
              borderRadius: 12,
              background: THEME.background,
            }}
          />
        </div>

        <aside style={{ minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: 16, border: `1px solid ${THEME.grid}`, borderRadius: 12, background: '#111' }}>
            <div style={{ marginBottom: 8 }}><strong>狀態：</strong>{statusText}</div>
            <div style={{ marginBottom: 8 }}><strong>分數：</strong>{score}</div>
            <div style={{ marginBottom: 8 }}><strong>最高分：</strong>{highScore}</div>
            <div><strong>時間：</strong>{currentTime.toLocaleTimeString()}</div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={resetGame}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                borderRadius: 10,
                background: THEME.accent,
                color: '#000',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {status === GameStatus.PLAYING ? '重新開始' : '開始遊戲'}
            </button>
            {status === GameStatus.PLAYING && (
              <button
                type="button"
                onClick={() => setStatus(GameStatus.GAME_OVER)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: `1px solid ${THEME.grid}`,
                  borderRadius: 10,
                  background: '#111',
                  color: THEME.text,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                結束遊戲
              </button>
            )}
          </div>

          <div style={{ padding: 16, border: `1px solid ${THEME.grid}`, borderRadius: 12, background: '#111' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>操作</h2>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Arrow Keys / W A S D<br />
              吃到食物 +10 分，撞牆或撞到自己則遊戲結束。
            </p>
          </div>
        </aside>
      </div>
    </section>
  );


}