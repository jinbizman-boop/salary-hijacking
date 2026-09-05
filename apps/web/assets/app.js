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
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(!form.reportValidity()) return;
      const fd=new FormData(form);
      const lines=[
        '[급여납치 제휴 문의]',
        '',
        '회사/단체: '+String(fd.get('company')||''),
        '담당자: '+String(fd.get('name')||''),
        '연락 이메일: '+String(fd.get('email')||''),
        '문의 유형: '+String(fd.get('type')||''),
        '',
        '문의 내용:',
        String(fd.get('message')||'')
      ];
      const subject='[급여납치] 제휴 문의 - '+String(fd.get('company')||fd.get('name')||'문의');
      const href='mailto:support@salaryhijacking.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n'));
      if(status) status.textContent='이메일 작성 화면을 열고 있습니다.';
      window.location.href=href;
    });
    const copy=document.querySelector('#copyInquiry');
    if(copy){copy.addEventListener('click',async function(){
      const fd=new FormData(form);
      const text=`급여납치 제휴 문의\n회사/단체: ${fd.get('company')||''}\n담당자: ${fd.get('name')||''}\n연락 이메일: ${fd.get('email')||''}\n문의 유형: ${fd.get('type')||''}\n문의 내용: ${fd.get('message')||''}`;
      try{await navigator.clipboard.writeText(text); if(status) status.textContent='문의 내용을 클립보드에 복사했습니다.';}
      catch(_){if(status) status.textContent='브라우저에서 복사가 제한되었습니다. 이메일 문의 버튼을 이용해 주세요.';}
    });}
  }
})();
