import axios from 'axios';
import { Ball, ShotPath, PathAnalysisResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CalculatePathsRequest {
  cueBall: Ball;
  object1: Ball;
  object2: Ball;
  table?: {
    width: number;
    height: number;
    cushionRestitution: number;
  };
}

export const calculatePaths = async (request: CalculatePathsRequest): Promise<ShotPath[]> => {
  try {
    const response = await api.post<PathAnalysisResponse>('/paths/calculate', request);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || '경로 계산에 실패했습니다.');
    }
    
    return response.data.data.paths;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || '서버와의 연결에 실패했습니다.');
    }
    throw error;
  }
};

export const analyzeDifficulty = async (
  cueBall: Ball,
  object1: Ball,
  object2: Ball,
  angle: number,
  speed: number
) => {
  try {
    const response = await api.post('/paths/analyze-difficulty', {
      cueBall,
      object1,
      object2,
      angle,
      speed
    });
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || '난이도 분석에 실패했습니다.');
    }
    throw error;
  }
};

export const getTableDimensions = async () => {
  try {
    const response = await api.get('/paths/table-dimensions');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.error || '당구대 규격 정보를 가져올 수 없습니다.');
    }
    throw error;
  }
};

export default api;