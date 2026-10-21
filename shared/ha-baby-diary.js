// The full diary reuses the real card and commands. Native HA owns its hass
// after a source remount; standalone previews own a normal native dialog.
function createBabyDiaryV53({host,getHass,getConfig,getSourceKey}) {
  const doc=host.ownerDocument,win=doc.defaultView,tag='ha-tools-baby-diary-dialog-v53';
  const route=()=>win.location.pathname+win.location.search+win.location.hash;
  const clone=value=>JSON.parse(JSON.stringify(value));
  if(!win.customElements.get(tag))win.customElements.define(tag,class extends win.HTMLElement {
    set hass(value){this._hass=value;const r=this._request;if(!r)return;if(!this._current()){this.closeDialog();return;}if(this._card)this._card.hass=value;}
    get hass(){return this._hass;}
    _current(){const h=this._hass,r=this._request;return !!r&&h?.user?.id===r.user&&h.user.is_admin===r.admin&&h.user.is_active!==false&&h.connection===r.connection&&h.connection?.connected!==false&&win.navigator.onLine!==false&&route()===r.route;}
    showDialog(request){this.closeDialog();this._request=request;request.owner=this;win.queueMicrotask(()=>this._start());}
    connectedCallback(){this._start();}
    disconnectedCallback(){this.closeDialog();}
    _start(){
      const r=this._request;if(!r||this._dialog||!this.isConnected)return;if(!this._current()){this.closeDialog();return;}
      const dialog=doc.createElement('dialog');dialog.setAttribute('data-baby-diary','');dialog.setAttribute('aria-label',r.title);
      const style=doc.createElement('style');style.textContent='dialog[data-baby-diary]{box-sizing:border-box;width:min(960px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:12px;border:1px solid var(--divider-color,#888);border-radius:16px;background:var(--primary-background-color,#fff);color:var(--primary-text-color,#222);overflow:auto}dialog[data-baby-diary]::backdrop{background:rgba(0,0,0,.5)}dialog[data-baby-diary] [data-baby-close]{min-width:44px;min-height:44px;font:inherit;font-size:14px;float:right}dialog[data-baby-diary] :focus-visible{outline:3px solid var(--primary-color,#1565c0);outline-offset:2px}';
      const close=doc.createElement('button');close.type='button';close.setAttribute('data-baby-close','');close.textContent=r.language==='pl'?'Zamknij dziennik':'Close diary';close.addEventListener('click',()=>this.closeDialog());
      const card=doc.createElement('ha-baby-tracker');card.setConfig(r.config);
      if(Number.isInteger(r.localIndex)&&!r.config.child){card.selectedBaby=r.localIndex;card.initializeDataStructures();}
      card.hass=this._hass;card.selectedTab=r.tab;
      let focused=false;
      card.addEventListener('baby-rendered-v53',()=>{if(focused||!card._backendChecked||card._backendAccessPendingV53)return;const id={feeding:'feedingType',diapers:'diapersType',sleep:'startSleepBtn',lactation:'lactationType',growth:'growthType'}[r.tab];const field=id&&card.shadowRoot.getElementById(id);if(field&&!field.disabled){focused=true;field.focus();}});
      dialog.append(style,close,card);this.append(dialog);this._dialog=dialog;this._card=card;
      dialog.addEventListener('cancel',event=>{event.preventDefault();this.closeDialog();});
      this._leave=()=>this.closeDialog();for(const name of ['offline','location-changed','popstate','hashchange'])win.addEventListener(name,this._leave);
      for(const name of ['disconnected','reconnect-error'])r.connection?.addEventListener?.(name,this._leave);
      dialog.showModal();
    }
    closeDialog(){
      const r=this._request;if(!r)return true;this._request=null;r.owner=null;r.closed=true;
      for(const name of ['offline','location-changed','popstate','hashchange'])win.removeEventListener(name,this._leave);
      for(const name of ['disconnected','reconnect-error'])r.connection?.removeEventListener?.(name,this._leave);
      this._card?.remove();this._card=null;this._dialog?.close();this._dialog?.remove();this._dialog=null;
      if(r.opener?.isConnected)r.opener.focus({preventScroll:true});r.opener=null;r.config=null;r.connection=null;
      this.dispatchEvent(new win.CustomEvent('dialog-closed',{detail:{dialog:tag},bubbles:true,composed:true}));
      if(r.standalone)this.remove();return true;
    }
  });
  let request=null;
  const close=()=>{if(request){request.owner?.closeDialog();request.closed=true;request=null;}};
  return {
    open(tab,opener){
      if(request&&!request.closed)return true;
      const h=getHass();if(!host.isConnected||!h?.user?.id||h.user.is_active===false||h.connection?.connected===false||win.navigator.onLine===false)return false;
      let ancestor=host;while(ancestor&&ancestor.localName!=='home-assistant')ancestor=ancestor.parentElement||ancestor.getRootNode?.().host;
      const native=typeof ancestor?.provideHass==='function',config=clone(getConfig());
      request={config:{...config,variant:'full',compact:false,default_tab:tab||config.default_tab||'feeding'},tab:tab||config.default_tab||'feeding',user:h.user.id,admin:h.user.is_admin,connection:h.connection,route:route(),source:JSON.stringify(getSourceKey()),title:config.title||'Baby diary',language:String(h.locale?.language||h.language||'en').startsWith('pl')?'pl':'en',opener,localIndex:host._backendAvailable?null:host.selectedBaby,closed:false,standalone:!native};
      if(native)host.dispatchEvent(new win.CustomEvent('show-dialog',{bubbles:true,composed:true,detail:{dialogTag:tag,dialogImport:()=>Promise.resolve(),dialogParams:request,addHistory:false}}));
      else {const owner=doc.createElement(tag);owner.hass=h;doc.body.append(owner);owner.showDialog(request);}
      return true;
    },
    update(){if(!request||request.closed)return;const h=getHass();if(h?.user?.id!==request.user||h?.connection!==request.connection||JSON.stringify(getSourceKey())!==request.source){close();return;}if(request.standalone&&request.owner)request.owner.hass=h;},
    close,sourceDisconnected(){if(request?.standalone)close();}
  };
}
if(typeof module!=='undefined'&&module.exports)module.exports={createBabyDiaryV53};
