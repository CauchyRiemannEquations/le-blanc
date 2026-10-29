export default function TurnNotice({name,reason}:{name:string;reason:string}){
 return <div className="turn-notice"><span className="turn-notice-mark" aria-hidden="true">◇</span><span className="eyebrow">다음 차례</span><h2>{name}의 차례입니다.</h2><p>{reason}</p></div>;
}
