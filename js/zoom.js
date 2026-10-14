(function(){document.addEventListener('click',function(e){var i=e.target.closest('.shot img');if(!i)return;
var o=document.createElement('div');o.className='lb';o.innerHTML='<span aria-hidden="true">×</span>';
var m=document.createElement('img');m.src=i.src;m.alt=i.alt;o.appendChild(m);
function c(){o.remove();document.removeEventListener('keydown',k)}function k(ev){if(ev.key==='Escape')c()}
o.addEventListener('click',c);document.addEventListener('keydown',k);document.body.appendChild(o)})})();
