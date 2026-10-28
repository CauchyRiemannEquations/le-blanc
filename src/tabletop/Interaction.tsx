import {createContext,useContext,useLayoutEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
interface Binding {selected?:number[];onSelect?:(i:number)=>void;enabled?:(i:number)=>boolean;label?:string}
const Context=createContext<{binding:Binding|null;target:HTMLDivElement|null;setBinding:(b:Binding|null)=>void;setTarget:(t:HTMLDivElement|null)=>void}|null>(null);
export function TableInteractionProvider({children}:{children:ReactNode}){
 const [binding,setBinding]=useState<Binding|null>(null),[target,setTarget]=useState<HTMLDivElement|null>(null);
 const value=useMemo(()=>({binding,target,setBinding,setTarget}),[binding,target]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useTableInteraction=()=>useContext(Context);
/** The modal owns focus, while the original WebGL canvas keeps rendering the same cards. */
export function TableTargets({selected,onSelect,enabled,label}:Binding){
 const context=useTableInteraction();const setBinding=context?.setBinding;
 useLayoutEffect(()=>{setBinding?.({selected,onSelect,enabled,label});return()=>setBinding?.(null);},[selected,onSelect,enabled,label,setBinding]);
 return <div className="table-target-portal" ref={context?.setTarget}/>;
}
