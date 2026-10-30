export type Role = 'vendor' | 'police';
export type GameMode = 'solo' | 'online';
export type GameStage = 'title' | 'playing' | 'paused' | 'gameover';

export interface GameState {
  mode: GameMode;
  role: Role;
  stage: GameStage;
  cash: number;
  policeCash: number;
  level: number;
  cap: number;
  stock: number;
  sales: number;
  total: number;
  heat: number;
  alert: boolean;
  escape: number;
  cooldown: number;
  sale: {
    seconds: number;
    start: number;
    price: number;
    product: string;
    customer: any;
  } | null;
  rank: number;
  arrests: number;
  integrity: number;
  stall: any | null;
  time: number;
  heading: number;
  speed: number;
  aiHeading: number;
}
