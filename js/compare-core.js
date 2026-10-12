/* Persistent comparison orchestration. Renderers own drawing, not comparison state. */
(function(root){
  'use strict';
  function create({container,panels,adapters,initial,onChange=()=>{},observeResize=true}){
    const copy=s=>({...s,views:{A:{...s.views.A},B:{...s.views.B}},sharedLocation:[...s.sharedLocation]});
    const defaults=copy(initial);let state=copy(initial),destroyed=false,frame=null,observer;
    const live=()=>{if(destroyed)throw Error('Comparația a fost închisă.');};
    const metrics=()=>{live();return Object.fromEntries(['A','B'].map(id=>[id,adapters[id].getMetrics()]));};
    function layout(){
      container.dataset.compareMode=state.mode;
      for(const id of ['A','B'])panels[id].hidden=state.mode==='toggle'&&state.active!==id;
    }
    function resize(){if(destroyed)return;for(const id of ['A','B'])if(!panels[id].hidden)adapters[id].resize();}
    function schedule(){if(!destroyed&&frame===null)frame=root.requestAnimationFrame(()=>{frame=null;resize();});}
    function update(patch={}){
      live();if(patch.mode&&!['side','toggle'].includes(patch.mode))throw Error('Mod de comparație necunoscut.');
      if(patch.active&&!['A','B'].includes(patch.active))throw Error('Vedere necunoscută.');
      if(patch.sharedLocation&&(!Array.isArray(patch.sharedLocation)||patch.sharedLocation.length!==2||!patch.sharedLocation.every(Number.isFinite)))throw Error('Punct comun invalid.');
      state={...state,...patch,views:{A:{...state.views.A,...patch.views?.A},B:{...state.views.B,...patch.views?.B}},sharedLocation:patch.sharedLocation?[...patch.sharedLocation]:state.sharedLocation};
      layout();
      for(const id of ['A','B']){
        if(patch.context||patch.views?.[id])adapters[id].update({view:state.views[id],context:state.context});
        if(patch.sharedLocation||patch.context||patch.views?.[id])adapters[id].setSharedLocation(state.sharedLocation);
      }
      if(patch.mode||patch.active)resize();
      onChange(copy(state),metrics());return copy(state);
    }
    for(const id of ['A','B']){
      adapters[id].init(panels[id]);adapters[id].update({view:state.views[id],context:state.context});adapters[id].setSharedLocation(state.sharedLocation);
    }
    layout();resize();onChange(copy(state),metrics());
    if(observeResize){if(root.ResizeObserver){observer=new root.ResizeObserver(schedule);observer.observe(container);}else root.addEventListener('resize',schedule);}
    return {
      getState:()=>{live();return copy(state);},getMetrics:metrics,update,resize,
      setSharedLocation:point=>update({sharedLocation:point}),
      reset:()=>update(copy(defaults)),
      destroy(){if(destroyed)return;destroyed=true;observer?.disconnect();if(frame!==null)root.cancelAnimationFrame(frame);frame=null;root.removeEventListener('resize',schedule);for(const id of ['A','B'])adapters[id].destroy();defaults.context=null;state=null;}
    };
  }
  root.CARTO_COMPARE={create};
})(window);
