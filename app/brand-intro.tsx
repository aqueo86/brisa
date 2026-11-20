'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {ChartNoAxesCombined} from 'lucide-react';

export default function BrandIntro({children}:{children:ReactNode}){
 const [playing,setPlaying]=useState(true);
 useEffect(()=>{
  const timer=window.setTimeout(()=>setPlaying(false),3500);
  return ()=>window.clearTimeout(timer);
 },[]);
 return <>
  {playing&&<div className="brand-intro" role="status" aria-label="Bienvenido a Brisa. Cargando tu espacio."><div className="brand-intro-glow" aria-hidden="true"/><div className="brand-intro-content" aria-hidden="true"><span className="brand-intro-icon"><ChartNoAxesCombined size={64} strokeWidth={2}/></span><div className="brand-intro-name">brisa<span>.</span></div><p>Tus finanzas, en calma.</p><span className="brand-intro-track"><i/></span></div></div>}
  <div className="brand-intro-page" style={playing?{visibility:'hidden',height:0,overflow:'hidden'}:undefined} inert={playing} aria-hidden={playing||undefined}>{children}</div>
 </>;
}
