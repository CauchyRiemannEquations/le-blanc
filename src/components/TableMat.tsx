/** Original Figma vector exports; the game graph is drawn separately from live state. */
export default function TableMat({title=false}:{title?:boolean}) {
 return <div className={`atelier-mat ${title?'title-mat':'board-mat'}`} aria-hidden="true">
  <div className="mat-mobile"><img src={`/atelier/${title?'title':'board'}-felt.svg`} alt=""/><img src={`/atelier/${title?'title':'board'}-rim.svg`} alt=""/></div>
  {!title?<div className="mat-desktop"><img src="/atelier/desktop-felt.svg" alt=""/><img src="/atelier/desktop-rim.svg" alt=""/></div>:null}
 </div>;
}
