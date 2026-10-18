// Cálculos puros de combustible y gastos. Valores CLP y kilómetros chilenos.
export const FUEL_GRADES = [
  {value:'93',label:'Bencina 93 octanos'},
  {value:'95',label:'Bencina 95 octanos'},
  {value:'97',label:'Bencina 97 octanos'},
  {value:'diesel',label:'Diésel / petróleo'},
  {value:'glp',label:'GLP'},
  {value:'gnc',label:'GNC'},
  {value:'electricidad',label:'Electricidad'},
  {value:'otro',label:'Otro / no indicado'}
];
export const EXPENSE_TYPES = [
  {value:'mantencion',label:'Mantención / taller'},
  {value:'repuestos',label:'Repuestos'},
  {value:'peajes',label:'Peajes / TAG'},
  {value:'estacionamiento',label:'Estacionamiento'},
  {value:'seguro',label:'Seguro'},
  {value:'documentos',label:'Permiso / documentos'},
  {value:'lavado',label:'Lavado / limpieza'},
  {value:'multa',label:'Multas'},
  {value:'otro',label:'Otros gastos'}
];
export const money = v => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
export const quantity = (v, digits=1) => new Intl.NumberFormat('es-CL',{maximumFractionDigits:digits}).format(Number(v)||0);
export const fuelName = code => FUEL_GRADES.find(f=>f.value===code)?.label||'Sin especificar';
export const expenseName = code => EXPENSE_TYPES.find(f=>f.value===code)?.label||'Otros gastos';
export const positive = value => Number.isFinite(Number(value))&&Number(value)>0;
export const vehicleFuelLogs = (logs,vehicleId)=>logs.filter(x=>x.vehicleId===vehicleId).sort((a,b)=>a.date.localeCompare(b.date)||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
export const carExpenses = (expenses,vehicleId)=>expenses.filter(x=>x.vehicleId===vehicleId);
export function consumption(logs,vehicleId){
  // Método lleno-a-lleno: suma TODAS las recargas posteriores al primer tanque lleno
  // y hasta el siguiente tanque lleno; exige km en ambos llenados.
  const sorted=vehicleFuelLogs(logs,vehicleId);let lastFull=-1;const results=[];
  for(let i=0;i<sorted.length;i++){
    const entry=sorted[i];if(!entry.fullTank||!positive(entry.odometer))continue;
    if(lastFull>=0){
      const previous=sorted[lastFull];const distance=Number(entry.odometer)-Number(previous.odometer);
      const consumed=sorted.slice(lastFull+1,i+1).reduce((s,x)=>s+(Number(x.liters)||0),0);
      const cost=sorted.slice(lastFull+1,i+1).reduce((s,x)=>s+(Number(x.total)||0),0);
      if(distance>0&&distance<4000&&consumed>0)results.push({distance,liters:consumed,kmPerLiter:distance/consumed,litersPer100:consumed/distance*100,costPerKm:cost/distance});
    }
    lastFull=i;
  }
  if(!results.length)return null;
  const distance=results.reduce((s,x)=>s+x.distance,0);const liters=results.reduce((s,x)=>s+x.liters,0);
  const sumCostPerKm=results.reduce((s,x)=>s+x.costPerKm*x.distance,0);
  return {intervals:results.length,distance,liters,kmPerLiter:distance/liters,litersPer100:100*liters/distance,costPerKm:sumCostPerKm/distance};
}
export function periodSummary(logs,expenses,vehicleId,month=''){
  const fuel=logs.filter(x=>x.vehicleId===vehicleId&&(!month||x.date?.startsWith(month)));
  const other=expenses.filter(x=>x.vehicleId===vehicleId&&(!month||x.date?.startsWith(month)));
  const fuelCLP=fuel.reduce((a,x)=>a+(Number(x.total)||0),0);
  const otherCLP=other.reduce((a,x)=>a+(Number(x.amount)||0),0);
  const liters=fuel.reduce((a,x)=>a+(Number(x.liters)||0),0);
  return {fuelCLP,otherCLP,total:fuelCLP+otherCLP,liters,fillCount:fuel.length,expenseCount:other.length,averagePricePerLiter:liters?fuelCLP/liters:null};
}
export function monthlySeries(logs,expenses,vehicleId,now=new Date()){
  return Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
    const month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label=new Intl.DateTimeFormat('es-CL',{month:'short'}).format(d).replace('.','');
    return {month,label,...periodSummary(logs,expenses,vehicleId,month)};
  });
}
