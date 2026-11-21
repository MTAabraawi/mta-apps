(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.MTA_PAGINATION=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function key(app){
    if(app&&app.source!=null&&app.external_id!=null)return String(app.source)+":"+String(app.external_id);
    if(app&&app.id!=null)return String(app.id);
    return [app&&app.platform,app&&app.name,app&&app.developer].map(x=>String(x||"").trim().toLowerCase()).join("|");
  }
  function mergeUnique(current,incoming){
    const result=Array.isArray(current)?current.slice():[],seen=new Set(result.map(key));
    for(const app of Array.isArray(incoming)?incoming:[]){
      const id=key(app);if(!seen.has(id)){seen.add(id);result.push(app);}
    }
    return result;
  }
  function hasMore(offset,total,loaded){
    const next=Math.max(0,Number(offset)||0),count=Math.max(0,Number(total)||0);
    return count>0?next<count:(Number(loaded)||0)>0&&next>=(Number(loaded)||0);
  }
  return {key,mergeUnique,hasMore};
});