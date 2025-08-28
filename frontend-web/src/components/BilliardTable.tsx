import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Ball, PathPoint, ShotPath } from '../types';

interface BilliardTableProps {
  width: number;
  height: number;
  balls: Ball[];
  paths: ShotPath[];
  selectedPath?: ShotPath | null;
  onBallMove: (ballId: string, x: number, y: number) => void;
}

const BilliardTable: React.FC<BilliardTableProps> = ({
  width,
  height,
  balls,
  paths,
  selectedPath,
  onBallMove
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const drawTable = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#0d5c0d';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    
    const cushionWidth = 12;
    ctx.fillStyle = '#654321';
    ctx.fillRect(0, 0, width, cushionWidth);
    ctx.fillRect(0, height - cushionWidth, width, cushionWidth);
    ctx.fillRect(0, 0, cushionWidth, height);
    ctx.fillRect(width - cushionWidth, 0, cushionWidth, height);
  }, [width, height]);

  const drawBall = useCallback((ctx: CanvasRenderingContext2D, ball: Ball) => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    if (ball.id === 'cue') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius * 0.3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, []);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: ShotPath, isSelected: boolean = false) => {
    if (path.points.length < 2) return;

    ctx.strokeStyle = isSelected ? '#ff6b6b' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash(isSelected ? [] : [5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    path.points.forEach((point, index) => {
      if (point.type === 'cushion' && index > 0) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#ff6b6b' : '#fff';
        ctx.fill();
      }
    });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    
    drawTable(ctx);
    
    paths.forEach(path => {
      if (selectedPath && path.id === selectedPath.id) {
        drawPath(ctx, path, true);
      } else if (!selectedPath) {
        drawPath(ctx, path, false);
      }
    });
    
    balls.forEach(ball => drawBall(ctx, ball));
  }, [width, height, balls, paths, selectedPath, drawTable, drawBall, drawPath]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getBallAtPosition = (x: number, y: number): Ball | null => {
    for (const ball of balls) {
      const distance = Math.sqrt((x - ball.x) ** 2 + (y - ball.y) ** 2);
      if (distance <= ball.radius) {
        return ball;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ball = getBallAtPosition(x, y);
    if (ball) {
      setIsDragging(ball.id);
      setDragOffset({ x: x - ball.x, y: y - ball.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    const radius = 15;
    const constrainedX = Math.max(radius, Math.min(width - radius, x));
    const constrainedY = Math.max(radius, Math.min(height - radius, y));

    onBallMove(isDragging, constrainedX, constrainedY);
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <div className="billiard-table-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          border: '2px solid #333',
          borderRadius: '8px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      />
    </div>
  );
};

export default BilliardTable;