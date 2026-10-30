import './EvergreenBrand.css'
/** Original asset supplied by the company. No recoloring, tracing or distortion. */
export function EvergreenBrand({compact=false,symbol=false}:{compact?:boolean;symbol?:boolean}){
 return <img className={`evergreen-brand${compact?' evergreen-brand-compact':''}${symbol?' evergreen-symbol':''}`} src={symbol?'/evergreen-symbol.png':'/evergreen-holdings-logo.png'} alt="Evergreen Holdings" width={symbol?1254:1536} height={symbol?1254:1024} decoding="async"/>
}
