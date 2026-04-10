(function(){
  var A='https://fu-corp-crm.vercel.app';
  var K=document.currentScript&&document.currentScript.getAttribute('data-key')||'';
  var s=sessionStorage.getItem('_acc')||Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
  sessionStorage.setItem('_acc',s);
  function send(path,data){
    try{fetch(A+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({apiKey:K},data)),keepalive:true})}catch(e){}
  }
  var ua=navigator.userAgent;
  send('/api/track/visitor',{
    sessionId:s,
    page:location.pathname,
    referrer:document.referrer||null,
    device:/Mobile|Android|iPhone|iPad/i.test(ua)?'mobile':'desktop',
    browser:(ua.match(/(Chrome|Firefox|Safari|Edge|Opera)[\/\s](\d+)/)||[])[1]||'other'
  });
  window.ACCLead=function(d){send('/api/track/lead',d)};
})();
