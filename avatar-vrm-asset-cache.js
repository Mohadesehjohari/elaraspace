/* Reusable real VRM/VRMA bytes: per-account, per-browser Cache Storage. No synthetic assets. */
(()=>{
  'use strict';
  const VERSION='elara-vrm-assets-v1-';
  const inflight=new Map(),memory=new Map();
  const validGLB=bytes=>bytes instanceof ArrayBuffer&&bytes.byteLength>=20&&
    new DataView(bytes).getUint32(0,true)===0x46546c67;
  async function load(url,{accountId='guest',onProgress=()=>{}}={}){
    const account=String(accountId||'guest').slice(0,160);
    const key=account+'|'+url;
    if(memory.has(key))return {buffer:memory.get(key).slice(0),cached:true};
    if(inflight.has(key)){
      const result=await inflight.get(key);
      return {buffer:result.buffer.slice(0),cached:result.cached};
    }
    const job=(async()=>{
      let store=null;
      if(typeof caches!=='undefined'){
        try{store=await caches.open(VERSION+encodeURIComponent(account));}
        catch(error){console.info('Elara: avatar persistent cache unavailable',error);}
      }
      if(store){
        try{
          const hit=await store.match(url);
          if(hit){
            const bytes=await hit.arrayBuffer();
            if(validGLB(bytes)){
              memory.set(key,bytes);
              return {buffer:bytes,cached:true};
            }
            await store.delete(url);
          }
        }catch(error){console.warn('Elara: ignoring invalid cached avatar',error);}
      }
      const response=await fetch(url,{mode:'cors',cache:'default'});
      if(!response.ok)throw new Error('Avatar asset HTTP '+response.status);
      const total=Number(response.headers.get('Content-Length'))||0;
      let bytes;
      if(response.body?.getReader){
        const reader=response.body.getReader(),chunks=[];
        let received=0;
        for(;;){
          const {done,value}=await reader.read();
          if(done)break;
          if(!value?.byteLength)continue;
          chunks.push(value);received+=value.byteLength;
          onProgress(received,total);
        }
        const merged=new Uint8Array(received);
        let offset=0;
        for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength;}
        bytes=merged.buffer;
      }else{
        bytes=await response.arrayBuffer();
        onProgress(bytes.byteLength,total);
      }
      if(!validGLB(bytes))throw new Error('Downloaded avatar asset is not a valid GLB container');
      memory.set(key,bytes);
      if(store){
        try{
          await store.put(url,new Response(bytes.slice(0),{
            headers:{'Content-Type':'model/gltf-binary','Content-Length':String(bytes.byteLength)}
          }));
        }catch(error){console.warn('Elara: avatar saved only in memory (storage quota)',error);}
      }
      return {buffer:bytes,cached:false};
    })();
    inflight.set(key,job);
    try{
      const result=await job;
      return {buffer:result.buffer.slice(0),cached:result.cached};
    }finally{inflight.delete(key);}
  }
  window.ElaraAvatarAssetCache={load,version:VERSION};
})();
