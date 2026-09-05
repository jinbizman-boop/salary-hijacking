(function(){
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items=[...document.querySelectorAll('.reveal')];
  if(reduce||!('IntersectionObserver' in window)){items.forEach(x=>x.classList.add('visible'));}
  else{
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}}),{threshold:.12});
    items.forEach(x=>io.observe(x));
  }
  const form=document.querySelector('#partnerForm');
  if(form){
    const status=document.querySelector('#formStatus');
    form.addEventListener('submit',async function(e){
      e.preventDefault();
      if(!form.reportValidity()) return;
      const fd=new FormData(form);
      const button=form.querySelector('button[type="submit"]');
      if(button) button.disabled=true;
      if(status) status.textContent='문의 접수 중입니다.';
      try{
        const response=await fetch('/api/v1/public/partnership-inquiries',{
          method:'POST',
          headers:{'content-type':'application/json'},
          body:JSON.stringify({
            company:String(fd.get('company')||''),
            name:String(fd.get('name')||''),
            email:String(fd.get('email')||''),
            phone:String(fd.get('phone')||''),
            type:String(fd.get('type')||''),
            message:String(fd.get('message')||''),
            privacyConsent:fd.get('privacyConsent')==='true',
            website:String(fd.get('website')||'')
          })
        });
        if(!response.ok) throw new Error('request_failed');
        form.reset();
        if(status) status.textContent='문의가 접수되었습니다. 운영 채널에서 확인 후 연락드리겠습니다.';
      }catch(_){
        if(status) status.textContent='현재 문의 접수가 원활하지 않습니다. 잠시 후 다시 시도해 주세요.';
      }finally{
        if(button) button.disabled=false;
      }
    });
  }
})();
