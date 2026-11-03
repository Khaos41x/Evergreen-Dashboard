import {useEffect,useState} from 'react'
import {Capacitor} from '@capacitor/core'
import {Download} from 'lucide-react'
import './install.css'

interface InstallEvent extends Event{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>}
export function InstallApp(){
 const native=Capacitor.isNativePlatform()
 const [prompt,setPrompt]=useState<InstallEvent|null>(null),[help,setHelp]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone))
 useEffect(()=>{
  if(native)return
  const ready=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent)}
  const done=()=>{setInstalled(true);setPrompt(null);setNotice('')}
  window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',done)
  return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',done)}
 },[native])
 if(native)return null
 async function install(){
  if(!prompt){setHelp(value=>!value);return}
  setBusy(true);setNotice('')
  try{await prompt.prompt();setPrompt(null);const choice=await prompt.userChoice;setNotice(choice.outcome==='accepted'?'Instalação solicitada ao navegador.':'Você pode instalar quando quiser.')}
  catch{setHelp(true);setNotice('Abra o menu do navegador para instalar o aplicativo.')}
  finally{setBusy(false)}
 }
 return <section className="pwa-install" aria-label="Aplicativo Evergreen"><h3>Evergreen no seu dispositivo</h3>{installed?<p>Você está usando o aplicativo instalado.</p>:<><p>Adicione o Evergreen à tela inicial. A conexão é necessária para acessar os dados da equipe.</p><button type="button" disabled={busy} onClick={()=>void install()}><Download size={18}/>{busy?'Abrindo instalação…':'Instalar aplicativo'}</button>{help&&<div className="pwa-install-help"><p><strong>Android ou computador:</strong> abra o menu do Chrome ou Edge e selecione “Instalar aplicativo” ou “Adicionar à tela inicial”.</p><p><strong>iPhone ou iPad:</strong> abra no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p></div>}{notice&&<p role="status">{notice}</p>}</>}</section>
}
