export type PlayerId = 0 | 1;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionKind = 'near' | 'sum3' | 'coprime';
export interface Rules { min: number; max: number; handSize: number; initialReveal: number[]; questions: number }
export interface Tile { value: number; revealed: boolean }
/** delta = value[b] - value[a]; edge traversal reverses its sign. */
export interface GapConnection { a: number; b: number; delta: number }
export interface QuestionResult { kind: QuestionKind; a: number; b: number; answer: boolean; turn: number }
export interface FailedGuess { kind: 'number' | 'gap'; a: number; b?: number; value: number }
export interface Player { name: string; tiles: Tile[]; connections: GapConnection[]; questions: QuestionResult[]; failed: FailedGuess[] }
export type Action = { type:'question'; kind:QuestionKind; a:number; b:number } | {type:'number'; a:number; value:number} | {type:'gap'; a:number; b:number; value:number} | {type:'penalty'; a:number} | {type:'pass'};
export interface RevelationEvent { player: PlayerId; index: number; value:number; reason:'number'|'gap'|'chain'|'penalty'; from?:number }
export interface Outcome { id:number; actor:PlayerId; type:Action['type']; success?:boolean; answer?:boolean; question?:QuestionKind; a?:number; b?:number; value?:number; reveals:RevelationEvent[]; text:string }
export interface GameResult { winner:PlayerId; turns:number; maxChain:number; finalChain:number }
export interface GameState { rules:Rules; players:[Player,Player]; active:PlayerId; phase:'action'|'continue'|'penalty'|'over'; turn:number; sequence:number; history:Outcome[]; result:GameResult|null; maxChain:number }
export interface VisibleTile { value:number|null; revealed:boolean }
export interface AIObservation { rules:Rules; player:PlayerId; own:Tile[]; ownConnections:GapConnection[]; opponent:VisibleTile[]; connections:GapConnection[]; questions:QuestionResult[]; failed:FailedGuess[]; ownQuestionsLeft:number; phase:GameState['phase']; turn:number; active:PlayerId; }
export interface GameView extends AIObservation { names:[string,string]; history:Outcome[]; result:GameResult|null; opponentQuestionsLeft:number }
export const QUESTION_LABELS:Record<QuestionKind,string> = {near:'두 숫자의 차이가 3 이하인가?', sum3:'두 숫자의 합은 3의 배수인가?',coprime:'두 숫자는 서로소인가?'};
