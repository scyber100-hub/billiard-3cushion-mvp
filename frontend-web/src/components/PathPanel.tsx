import React from 'react';
import { ShotPath } from '../types';

interface PathPanelProps {
  paths: ShotPath[];
  selectedPath?: ShotPath | null;
  onPathSelect: (path: ShotPath) => void;
  isCalculating: boolean;
}

const PathPanel: React.FC<PathPanelProps> = ({ 
  paths, 
  selectedPath, 
  onPathSelect, 
  isCalculating 
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'hard': return '#f44336';
      default: return '#666';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '쉬움';
      case 'medium': return '보통';
      case 'hard': return '어려움';
      default: return '불명';
    }
  };

  if (isCalculating) {
    return (
      <div className="path-panel">
        <h3>경로 분석</h3>
        <div className="calculating">
          <div className="spinner"></div>
          <p>최적 경로를 계산하고 있습니다...</p>
        </div>
        <style jsx>{`
          .calculating {
            text-align: center;
            padding: 40px 20px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 2s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (paths.length === 0) {
    return (
      <div className="path-panel">
        <h3>경로 분석</h3>
        <div className="no-paths">
          <p>공의 위치를 설정하고 경로를 계산해보세요.</p>
          <p>📊 최대 5가지 최적 경로를 제공합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="path-panel">
      <h3>분석된 경로 ({paths.length}개)</h3>
      <div className="path-list">
        {paths.map((path, index) => (
          <div
            key={path.id}
            className={`path-item ${selectedPath?.id === path.id ? 'selected' : ''}`}
            onClick={() => onPathSelect(path)}
          >
            <div className="path-header">
              <span className="path-number">#{index + 1}</span>
              <span 
                className="difficulty-badge"
                style={{ backgroundColor: getDifficultyColor(path.difficulty) }}
              >
                {getDifficultyText(path.difficulty)}
              </span>
            </div>
            
            <div className="path-info">
              <div className="info-row">
                <span className="label">쿠션:</span>
                <span className="value">{path.cushionCount}회</span>
              </div>
              <div className="info-row">
                <span className="label">성공률:</span>
                <span className="value">{(path.successRate * 100).toFixed(0)}%</span>
              </div>
            </div>
            
            <div className="path-description">
              {path.description}
            </div>
            
            <div className="success-bar">
              <div 
                className="success-fill"
                style={{ width: `${path.successRate * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .path-panel {
          background: #2a2a2a;
          border-radius: 8px;
          padding: 20px;
          color: white;
        }
        
        .path-panel h3 {
          margin: 0 0 16px 0;
          color: #ffffff;
        }
        
        .no-paths {
          text-align: center;
          padding: 40px 20px;
          color: #888;
        }
        
        .path-list {
          max-height: 400px;
          overflow-y: auto;
        }
        
        .path-item {
          background: #3a3a3a;
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .path-item:hover {
          background: #4a4a4a;
          transform: translateY(-1px);
        }
        
        .path-item.selected {
          border-color: #ff6b6b;
          background: #4a2a2a;
        }
        
        .path-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .path-number {
          font-weight: bold;
          font-size: 18px;
          color: #fff;
        }
        
        .difficulty-badge {
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        
        .path-info {
          display: flex;
          gap: 16px;
          margin-bottom: 8px;
        }
        
        .info-row {
          display: flex;
          gap: 4px;
        }
        
        .label {
          color: #888;
          font-size: 14px;
        }
        
        .value {
          color: #fff;
          font-weight: bold;
          font-size: 14px;
        }
        
        .path-description {
          color: #ccc;
          font-size: 13px;
          margin-bottom: 12px;
        }
        
        .success-bar {
          height: 4px;
          background: #444;
          border-radius: 2px;
          overflow: hidden;
        }
        
        .success-fill {
          height: 100%;
          background: linear-gradient(90deg, #f44336 0%, #ff9800 50%, #4caf50 100%);
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default PathPanel;