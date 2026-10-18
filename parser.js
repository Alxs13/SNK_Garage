// Procesador local y heurístico de documentos vehiculares chilenos.
// Los resultados de OCR pueden tener errores: siempre deben revisarse.
export const VEHICLE_FIELDS = [
  ['plate','Patente'], ['brand','Marca'], ['model','Modelo'], ['version','Versión'],
  ['year','Año'], ['kind','Tipo de vehículo'], ['color','Color'], ['fuel','Combustible'],
  ['transmission','Transmisión'], ['vin','VIN'], ['chassis','N° de chasis'],
  ['engine','N° de motor'], ['displacement','Cilindrada'], ['owner','Propietario'],
  ['rut','RUT propietario'], ['mileage','Kilometraje']
];
export const DOC_TYPES = [
  {value:'padron',label:'Padrón / Certificado de inscripción',expires:false},
  {value:'permiso',label:'Permiso de circulación',expires:true},
  {value:'revision',label:'Revisión técnica',expires:true},
  {value:'soap',label:'Seguro SOAP',expires:true},
  {value:'emisiones',label:'Certificado de emisiones',expires:true},
  {value:'homologacion',label:'Homologación',expires:false},
  {value:'seguro',label:'Seguro automotriz',expires:true},
  {value:'boleta',label:'Boleta / comprobante de combustible',expires:false},
  {value:'otro',label:'Otro documento',expires:false}
];
const unaccent = (s) => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const norm = (s) => unaccent(s).toUpperCase().replace(/\s+/g,' ').trim();
export const cleanPlate = (s) => String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export const validPlate = (s) => /^([A-Z]{4}\d{2}|[A-Z]{2}\d{4})$/.test(cleanPlate(s));
const notCode = /^(?:N\/A|NO\s+INFORMA|NO\s+REGISTRA|SIN\s+INFORMACION|NO\s+TIENE|----|NINGUNO)$/i;
function tidy(s){
  let x = String(s||'').replace(/^[:;.,\-\s]+/,'').replace(/\s{3,}.*/,'').trim();
  // Columnas OCR: detiene valores cuando a continuación aparece otro rótulo.
  x = x.replace(/\s+(?=(?:MODELO|MARCA|COLOR|A[NÑ]O|TIPO|VIN|CHASIS|COMBUSTIBLE|PATENTE|MOTOR)\s*:)/i,'\n').split('\n')[0].trim();
  return notCode.test(x) ? '' : x.slice(0,120);
}
function findLabel(lines, rx, opts={}) {
  for(let i=0;i<lines.length;i++){
    const line = norm(lines[i]).replace(/\t/g,'   ');
    const m = line.match(rx);
    if(!m) continue;
    let val = tidy(line.slice((m.index||0)+m[0].length));
    if(!val && opts.next && i+1<lines.length) val=tidy(lines[i+1]);
    if(val && (!opts.verify || opts.verify(val))) return val;
  }
  return '';
}
const datesWords = {ENERO:'01',FEBRERO:'02',MARZO:'03',ABRIL:'04',MAYO:'05',JUNIO:'06',JULIO:'07',AGOSTO:'08',SEPTIEMBRE:'09',SETIEMBRE:'09',OCTUBRE:'10',NOVIEMBRE:'11',DICIEMBRE:'12'};
export function parseDate(raw){
  const s=norm(raw).replace(/\s+/g,' ');
  let m=s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if(m) return iso(+m[1],+m[2],+m[3]);
  m=s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if(m){const y=+m[3] < 100 ? 2000+(+m[3]) : +m[3];return iso(y,+m[2],+m[1]);}
  m=s.match(/\b(\d{1,2})\s+(?:DE\s+)?(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+(?:DE\s+)?(20\d{2}|19\d{2})\b/);
  if(m) return iso(+m[3],+datesWords[m[2]],+m[1]);
  return '';
}
function iso(y,m,d){
  if(y<1950||y>2100||m<1||m>12||d<1||d>31) return '';
  const dt = new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d ? `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}` : '';
}
function dateOnLabel(lines, label){
  for(let i=0;i<lines.length;i++) if(label.test(norm(lines[i]))){
    const onLine=parseDate(lines[i]);if(onLine) return onLine;
    if(i+1<lines.length && norm(lines[i+1]).length<46){const next=parseDate(lines[i+1]); if(next) return next;}
  }
  return '';
}
function detectType(text,filename=''){
  const s=norm(`${filename}\n${text.slice(0,2800)}`);
  if(/CERTIFICADO DE INSCRIPCION|PADRON|PADR[OÓ]N|REGISTRO DE VEHICULOS MOTORIZADOS/.test(s)) return 'padron';
  if(/PERMISO DE CIRCULACION|DERECHOS DE CIRCULACION/.test(s)) return 'permiso';
  if(/REVISION TECNICA|CERTIFICADO DE REVISION/.test(s)) return 'revision';
  if(/CERTIFICADO DE (?:ANALISIS DE )?GASES|CONTAMINANTES|EMISIONES/.test(s)) return 'emisiones';
  if(/HOMOLOGACION|CHI-E|CHIE/.test(s)) return 'homologacion';
  if(/SOAP|SEGURO OBLIGATORIO|ACCIDENTES PERSONALES/.test(s)) return 'soap';
  if(/POLIZA|SEGURO AUTOMOTRIZ/.test(s)) return 'seguro';
  return 'otro';
}
function fieldVal(lines, pattern, {next=true,verify,upper=false}={}){
  const val = findLabel(lines,pattern,{next,verify});
  return upper?norm(val).replace(/\s/g,''):val;
}
export function analyzeDocument(text,filename=''){
  const raw=String(text||'').replace(/\r/g,'\n').replace(/[|]/g,' ').replace(/([A-ZÁÉÍÓÚÑ])\s{3,}(?=(?:MARCA|MODELO|COLOR|CHASIS|MOTOR|VIN|A[NÑ]O|TIPO)\b)/g,'$1\n');
  const lines=raw.split('\n').map(x=>x.trim()).filter(Boolean);
  const normalized=norm(raw);
  const fields={};
  let plate=fieldVal(lines,/^(?:(?:PLACA\s*)?PATENTE(?:\s+UNICA)?|P\.?\s*P\.?\s*U\.?|PPU|DOMINIO)\s*[:.#-]?\s*/i,{verify:s=>validPlate((s.match(/([A-Z]{4}\s*[- ]?\s*\d{2}|[A-Z]{2}\s*[- ]?\s*\d{4})/i)||[])[0])});
  plate=cleanPlate((plate.match(/(?:[A-Z]{4}\s*[- ]?\s*\d{2}|[A-Z]{2}\s*[- ]?\s*\d{4})/i)||[])[0]||plate);
  if(!validPlate(plate)){
    const matches=normalized.match(/\b(?:[A-Z]{4}\s*[- ]?\s*\d{2}|[A-Z]{2}\s*[- ]?\s*\d{4})\b/g)||[];
    plate=cleanPlate(matches[0]||'');
  }
  if(validPlate(plate)) fields.plate=plate;
  const direct = [
    ['brand',/^(?:MARCA(?:\s+DEL\s+VEHICULO)?)\s*[:.#-]?\s*/i],
    ['model',/^(?:MODELO(?:\s+DEL\s+VEHICULO)?)\s*[:.#-]?\s*/i],
    ['version',/^(?:VERSION|VARIANTE)\s*[:.#-]?\s*/i],
    ['kind',/^(?:TIPO(?:\s+DE\s+VEHICULO)?|CLASE)\s*[:.#-]?\s*/i],
    ['color',/^COLOR\s*[:.#-]?\s*/i],
    ['fuel',/^(?:COMBUSTIBLE|TIPO\s+DE\s+COMBUSTIBLE)\s*[:.#-]?\s*/i],
    ['transmission',/^(?:TRANSMISION|CAJA\s+DE\s+CAMBIOS)\s*[:.#-]?\s*/i],
    ['displacement',/^(?:CILINDRADA|CILINDRAJE)\s*[:.#-]?\s*/i],
    ['owner',/^(?:NOMBRE(?:\s+(?:DEL\s+)?)?PROPIETARIO|PROPIETARIO|TITULAR)\s*[:.#-]?\s*/i],
    ['rut',/^(?:RUT(?:\s+(?:DEL\s+)?)?PROPIETARIO|RUT|RUN)\s*[:.#-]?\s*/i],
    ['mileage',/^(?:KILOMETRAJE|ODOMETRO|KM\s+REGISTRADOS)\s*[:.#-]?\s*/i]
  ];
  for(const [key,rx] of direct){const val=fieldVal(lines,rx);if(val) fields[key]=val;}
  const year=fieldVal(lines,/^(?:A[NÑ]O(?:\s+(?:DE\s+)?(?:FABRICACI[OÓ]N|MODELO))?|FABRICACI[OÓ]N)\s*[:.#-]?\s*/i,{verify:s=>/\b(?:19|20)\d{2}\b/.test(s)});
  if(year){const m=year.match(/\b(19\d{2}|20\d{2})\b/);if(m && +m[1]<=new Date().getFullYear()+2) fields.year=m[1];}
  const identifiers=[
    ['vin',/^(?:N[°ºo.]?\s*(?:DE\s*)?(?:V\.?I\.?N\.?|SERIE)|VIN|NUMERO\s+DE\s+SERIE)\s*[:.#-]?\s*/i],
    ['chassis',/^(?:N[°ºo.]?\s*(?:DE\s*)?CHASIS|CHASIS|NUMERO\s+DE\s+CHASIS)\s*[:.#-]?\s*/i],
    ['engine',/^(?:N[°ºo.]?\s*(?:DE\s*)?MOTOR|MOTOR|NUMERO\s+DE\s+MOTOR)\s*[:.#-]?\s*/i]
  ];
  for(const [key,rx] of identifiers){
    const value=fieldVal(lines,rx);
    const token=norm(value).match(/[A-Z0-9*.-]{5,30}/);
    if(token) fields[key]=token[0];
  }
  // Variantes frecuentes de certificados chilenos y capturas de celular.
  // Nunca completar con datos imaginados: solo valores con rótulos presentes.
  const relaxed=[
    ['brand',/^(?:MARCA|FABRICANTE)\s*[:=-]\s*(.+)$/i],
    ['model',/^(?:MODELO|LINEA)\s*[:=-]\s*(.+)$/i],
    ['year',/^(?:ANO|AÑO)\s+(?:FABRICACION|MODELO)\s*[:=-]?\s*((?:19|20)\d{2})$/i],
    ['color',/^COLOR\s*[:=-]\s*(.+)$/i],
  ];
  for(const [k,rx] of relaxed)if(!fields[k])for(const l of lines){const m=norm(l).match(rx);if(m){fields[k]=tidy(m[1]);break;}}
  if(!fields.vin){const candidate=normalized.match(/\b[A-HJ-NPR-Z0-9]{17}\b/g)||[];const found=candidate.find(s=>/[A-Z]/.test(s)&&/\d/.test(s));if(found) fields.vin=found;}
  const type=detectType(raw,filename);
  // No tomar una fecha genérica de emisión como vencimiento.
  const expires=dateOnLabel(lines,/VENC(?:IMIENTO|E)|VIGEN(?:CIA|TE)(?:\s+HASTA)?|VALID[OA]\s+HASTA|COBERTURA\s+HASTA|FECHA\s+TERMINO|EXPIRA|FECHA\s+PROXIMA\s+REVISION/);
  const issued=dateOnLabel(lines,/FECHA\s+(?:DE\s+)?(?:EMISION|EXPEDICION|OTORGAMIENTO)|EMITIDO\s+EL/);
  return {fields,type,expires,issued,characters:raw.length};
}
export const docLabel = type=>DOC_TYPES.find(x=>x.value===type)?.label||'Otro documento';
