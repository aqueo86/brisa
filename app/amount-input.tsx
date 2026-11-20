'use client';
import {useLayoutEffect,useRef} from 'react';

export default function AmountInput({value,onChange}:{value:number;onChange:(value:number)=>void}){
 const input=useRef<HTMLInputElement>(null),caret=useRef<number|null>(null);
 const formatted=value?String(value).replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'';
 useLayoutEffect(()=>{if(caret.current===null||!input.current)return;let digits=0,position=0;while(position<formatted.length&&digits<caret.current){if(/\d/.test(formatted[position]))digits++;position++;}input.current.setSelectionRange(position,position);caret.current=null;},[formatted]);
 return <input ref={input} className="amount-input" type="text" inputMode="numeric" pattern="[0-9.]+" required value={formatted} placeholder="0" onChange={e=>{const raw=e.target.value;if(!/^[\d.]*$/.test(raw))return;const amount=Number(raw.replaceAll('.',''));if(!Number.isSafeInteger(amount)||amount>1000000000000)return;caret.current=raw.slice(0,e.target.selectionStart??raw.length).replaceAll('.','').length;onChange(amount);}}/>;
}
