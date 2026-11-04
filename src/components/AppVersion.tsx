import release from '../mobile/live-update-policy.json'
import './app-version.css'

export function AppVersion({className='',testId}:{className?:string;testId?:string}){
 return <small className={`app-version ${className}`} data-testid={testId}>Versão {release.displayVersion} · revisão 05</small>
}
