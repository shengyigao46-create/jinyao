export enum PhilosopherID {
  HEGEL = 'HEGEL',
  WILLIAMS = 'WILLIAMS',
  HUSSERL = 'HUSSERL'
}

export enum WeatherMode {
  SNOW = 'SNOW'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface DiaryEntry {
  id: string;
  timestamp: string; // ISO string
  title: string;
  content: string;
  weatherMode: WeatherMode;
  isDeleted?: boolean; // New field for Recycle Bin
}

export interface ParticleSettings {
  brightness: number;
  size: number;
  activity: number;
}