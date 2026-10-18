/* SNK Garage v4 - lectura local de imágenes y PDF, sin servidor propio.
   Las bibliotecas se descargan en el navegador la primera vez que se usan.
   OCR siempre sujeto a revisión humana. */
const urls={
  tesseract:['https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js','https://unpkg.com/tesseract.js@5.1.1/dist/tesseract.min.js'],
  pdf:['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js']
};
const loaded=new Map();
function script(src){if(loaded.has(src))return loaded.get(src);const p=new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src=src;el.async=true;
  el.onload=resolve;el.onerror=()=>{el.remove();reject(new Error('No se pudo descargar '+src));};document.head.append(el);
});loaded.set(src,p);p.catch(()=>loaded.delete(src));return p;}
async function library(which,check){if(check())return;let err;for(const src of urls[which])try{await script(src);if(check())return;}catch(e){err=e;}throw new Error('No se pudo cargar el lector '+(which==='pdf'?'PDF':'OCR')+'. Comprueba Internet, bloqueadores o modo ahorro de datos. '+(err?.message||''));}
let workerPromise;
async function worker(onProgress){
 await library('tesseract',()=>!!window.Tesseract?.createWorker);
 if(!workerPromise)workerPromise=window.Tesseract.createWorker('spa',1,{
   logger:evt=>{if(evt.status==='recognizing text')onProgress?.('Reconociendo letras',Math.round((evt.progress||0)*100));}
 }).catch(err=>{workerPromise=null;throw err;});
 return workerPromise;
}
async function pdfLib(){await library('pdf',()=>!!window.pdfjsLib?.getDocument);window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';return window.pdfjsLib;}
const notify=(fn,msg,pct)=>fn?.(msg,pct);
async function imageCanvas(blob){
 const img=await createImageBitmap(blob);
 const long=Math.max(img.width,img.height);
 const scale=Math.min(2.4,Math.max(.3,2100/Math.max(1,long)));
 const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);img.close?.();
 // Grises y contraste suave: OCR más estable en fotos de documentos.
 const pixels=ctx.getImageData(0,0,w,h),a=pixels.data;
 for(let i=0;i<a.length;i+=4){const gray=.299*a[i]+.587*a[i+1]+.114*a[i+2];const value=Math.max(0,Math.min(255,(gray-128)*1.32+136));a[i]=a[i+1]=a[i+2]=value;}
 ctx.putImageData(pixels,0,0);return canvas;
}
async function convert(canvas){return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo preparar la imagen')),'image/png'));}
async function scanPicture(blob,progress){notify(progress,'Preparando imagen…',5);const canvas=await imageCanvas(blob);try{const prepared=await convert(canvas);const w=await worker(progress);notify(progress,'Leyendo fotografía…',20);const result=await w.recognize(prepared);notify(progress,'Imagen procesada',100);return String(result.data?.text||'');}finally{canvas.width=0;canvas.height=0;}}
function joinedText(content){
 // Respeta saltos y posición de líneas (sin esto las etiquetas se mezclan con valores).
 let lastY=null,line='',out=[];
 for(const item of content.items||[]){if(!item.str)continue;const y=item.transform?.[5];if(lastY!==null && Number.isFinite(y)&&Math.abs(y-lastY)>4){out.push(line.trim());line='';}line+=item.str+' ';if(item.hasEOL){out.push(line.trim());line='';lastY=null;}else if(Number.isFinite(y))lastY=y;}
 if(line.trim())out.push(line.trim());return out.filter(Boolean).join('\n');
}
function needsVisual(text){const chars=text.replace(/\s/g,'').length;const hints=(text.match(/MARCA|MODELO|PATENTE|PLACA|CHASIS|MOTOR|VEHICULO|VEHÍCULO|VIN|P\.P\.U\.|INSCRIPCI|VENCIMIENTO/gi)||[]).length;return chars<28||(hints<2&&chars<160);}
async function scanPDF(file,progress){
 const pdfjs=await pdfLib();const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),disableFontFace:true});let pdf;
 try{pdf=await task.promise;}catch(e){throw new Error('El PDF está dañado, tiene contraseña o no es compatible: '+e.message);}
 const total=Math.min(pdf.numPages,8);const all=[],warnings=[];
 try{
  for(let p=1;p<=total;p++){
   notify(progress,`PDF: página ${p} de ${total}`,Math.round((p-1)/total*100));
   const page=await pdf.getPage(p);let text='';try{text=joinedText(await page.getTextContent());}catch(e){warnings.push(`Página ${p}: texto PDF no disponible.`);}
   if(needsVisual(text)){
    // Render nítido pero limitado para celulares con poca memoria.
    const canvas=document.createElement('canvas');
    try{const natural=page.getViewport({scale:1});const scale=Math.min(2.25,1800/Math.max(natural.width,natural.height));
    const viewport=page.getViewport({scale:Math.max(1.2,scale)});
    canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);const ctx=canvas.getContext('2d',{alpha:false});
    await page.render({canvasContext:ctx,viewport}).promise;const blob=await convert(canvas);const ocr=await scanPicture(blob,(txt,percent)=>notify(progress,`Página ${p}/${total} · ${txt}`,Math.round(((p-1)+(percent||0)/100)/total*100)));if(ocr.trim().length>text.trim().length/2)text=ocr||text;else if(ocr)text+='\n'+ocr;}
    catch(e){if(!text.trim())warnings.push(`Página ${p}: ${e.message}`);}finally{canvas.width=canvas.height=0;}
   }
   all.push(text);
  }
 }finally{await pdf.destroy();}
 if(pdf.numPages>total)warnings.push(`PDF de ${pdf.numPages} páginas: se analizaron las primeras ${total}. El archivo original se conserva completo.`);
 if(!all.some(s=>s.trim()))throw new Error('No se pudo extraer texto del PDF. Puedes guardarlo y completar los datos manualmente.');
 return {text:all.join('\n'),warnings};
}
export async function scanVehicleFile(file,progress){
 const mime=(file.type||'').toLowerCase(),name=file.name.toLowerCase();
 if(mime.includes('text')||name.endsWith('.txt'))return {text:(await file.text()).slice(0,250000),warnings:[]};
 if(mime.includes('pdf')||name.endsWith('.pdf'))return await scanPDF(file,progress);
 if(mime.startsWith('image/')||/\.(png|jpe?g|webp)$/.test(name))return {text:await scanPicture(file,progress),warnings:[]};
 throw new Error('Formato no compatible: utiliza PDF, JPG, PNG, WebP o TXT.');
}
