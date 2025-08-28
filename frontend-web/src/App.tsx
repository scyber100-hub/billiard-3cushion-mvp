import React, { useState, useCallback } from 'react';
import BilliardTable from './components/BilliardTable';
import PathPanel from './components/PathPanel';
import { Ball, ShotPath } from './types';
import { calculatePaths } from './services/api';
import './App.css';

const App: React.FC = () => {
  const TABLE_WIDTH = 568;
  const TABLE_HEIGHT = 284;
  
  const [balls, setBalls] = useState<Ball[]>([
    { id: 'cue', x: 100, y: TABLE_HEIGHT / 2, radius: 15, color: '#ffffff' },
    { id: 'object1', x: 300, y: TABLE_HEIGHT / 2 - 50, radius: 15, color: '#ffff00' },
    { id: 'object2', x: 450, y: TABLE_HEIGHT / 2 + 30, radius: 15, color: '#ff0000' }
  ]);
  
  const [paths, setPaths] = useState<ShotPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<ShotPath | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleBallMove = useCallback((ballId: string, x: number, y: number) => {
    setBalls(prevBalls => 
      prevBalls.map(ball => 
        ball.id === ballId ? { ...ball, x, y } : ball
      )
    );
    
    setPaths([]);
    setSelectedPath(null);
    setError(null);
  }, []);

  const handleCalculatePaths = async () => {
    setIsCalculating(true);
    setError(null);
    
    try {
      const cueBall = balls.find(b => b.id === 'cue')!;
      const object1 = balls.find(b => b.id === 'object1')!;
      const object2 = balls.find(b => b.id === 'object2')!;
      
      const calculatedPaths = await calculatePaths({
        cueBall,
        object1,
        object2,
        table: {
          width: TABLE_WIDTH,
          height: TABLE_HEIGHT,
          cushionRestitution: 0.8
        }
      });
      
      setPaths(calculatedPaths);
      if (calculatedPaths.length > 0) {
        setSelectedPath(calculatedPaths[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('Path calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handlePathSelect = (path: ShotPath) => {
    setSelectedPath(path);
  };

  const resetBalls = () => {
    setBalls([
      { id: 'cue', x: 100, y: TABLE_HEIGHT / 2, radius: 15, color: '#ffffff' },
      { id: 'object1', x: 300, y: TABLE_HEIGHT / 2 - 50, radius: 15, color: '#ffff00' },
      { id: 'object2', x: 450, y: TABLE_HEIGHT / 2 + 30, radius: 15, color: '#ff0000' }
    ]);
    setPaths([]);
    setSelectedPath(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎱 3쿠션 당구 분석기</h1>
        <p>공의 위치를 드래그하여 설정하고, 최적의 3쿠션 경로를 찾아보세요!</p>
      </header>

      <main className="app-main">
        <div className="table-container">
          <div className="controls">
            <button 
              className="btn btn-primary"
              onClick={handleCalculatePaths}
              disabled={isCalculating}
            >
              {isCalculating ? '계산 중...' : '경로 계산'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={resetBalls}
            >
              초기화
            </button>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <BilliardTable
            width={TABLE_WIDTH}
            height={TABLE_HEIGHT}
            balls={balls}
            paths={paths}
            selectedPath={selectedPath}
            onBallMove={handleBallMove}
          />

          <div className="ball-legend">
            <div className="legend-item">
              <div className="legend-ball cue-ball"></div>
              <span>큐볼 (흰색)</span>
            </div>
            <div className="legend-item">
              <div className="legend-ball object1-ball"></div>
              <span>목적구 1 (노란색)</span>
            </div>
            <div className="legend-item">
              <div className="legend-ball object2-ball"></div>
              <span>목적구 2 (빨간색)</span>
            </div>
          </div>
        </div>

        <div className="panel-container">
          <PathPanel
            paths={paths}
            selectedPath={selectedPath}
            onPathSelect={handlePathSelect}
            isCalculating={isCalculating}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Made with ❤️ for 3쿠션 당구 애호가들</p>
      </footer>
    </div>
  );
};

export default App;