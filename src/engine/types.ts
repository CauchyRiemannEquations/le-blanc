export type PlayerId = 0 | 1;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionKind = 'near' | 'sum3' | 'coprime' | 'distance' | 'sumMultiple' | 'multiple' | 'ratio';
export interface QuestionSpec { kind:QuestionKind; parameter?:number; negate?:boolean }
/** null means no question limit; finite caps remain available for balance experiments. */
export interface Rules { version:2; gapPolicy:'continue-once'|'legacy'; min: number; max: number; handSize: number; initialReveal: number[]; questions: number|null }
export interface Tile { value: number; revealed: boolean }
/** delta = value[b] - value[a]; edge traversal reverses its sign. */
export interface GapConnection { a: number; b: number; delta: number }
export interface PublicQuestion extends QuestionSpec { a:number; b:number; turn:number }
export interface QuestionResult extends PublicQuestion { answer:boolean }
export interface FailedGuess { kind: 'number' | 'gap'; a: number; b?: number; value: number }
export interface Player { name: string; tiles: Tile[]; connections: GapConnection[]; questions: QuestionResult[]; failed: FailedGuess[] }
export type Action = ({type:'question'; a:number; b:number} & QuestionSpec) | {type:'number'; a:number; value:number} | {type:'gap'; a:number; b:number; value:number} | {type:'penalty'} | {type:'pass'};
export interface RevelationEvent { player: PlayerId; index: number; value:number; reason:'number'|'gap'|'chain'|'penalty'; from?:number }
export interface Outcome { id:number; actor:PlayerId; type:Action['type']|'timeout'|'resign'; success?:boolean; answer?:boolean; question?:QuestionKind; parameter?:number; negate?:boolean; a?:number; b?:number; value?:number; reveals:RevelationEvent[]; text:string }
export interface GameResult { winner:PlayerId; turns:number; maxChain:number; finalChain:number }
export interface GameState { gapUsed:boolean; rules:Rules; players:[Player,Player]; active:PlayerId; phase:'action'|'continue'|'penalty'|'over'; turn:number; sequence:number; penaltySeed:number; history:Outcome[]; result:GameResult|null; maxChain:number }
export interface VisibleTile { value:number|null; revealed:boolean }
export interface AIObservation { gapUsed:boolean; rules:Rules; player:PlayerId; own:Tile[]; ownConnections:GapConnection[]; opponent:VisibleTile[]; connections:GapConnection[]; questions:QuestionResult[]; failed:FailedGuess[]; ownQuestionsLeft:number|null; phase:GameState['phase']; turn:number; active:PlayerId; }
export interface GameView extends AIObservation { names:[string,string]; history:Outcome[]; result:GameResult|null; opponentQuestionsLeft:number|null }
