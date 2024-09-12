import{s as ee,e as z,j as w,t as j,C as me,c as x,d as b,l as D,a as S,b as F,w as W,p as v,q as Y,f as d,i as R,D as ye,E as X,g as K,F as _e,n as $,G as ie,o as ve,x as Q,H as re,I as ge}from"../chunks/scheduler.DWvxBnEd.js";import{S as te,i as le,a as q,g as fe,c as ce,t as J,b as ue,d as de,m as he,e as pe}from"../chunks/index.C32fdg8C.js";import{e as Z}from"../chunks/each.D6YF6ztN.js";import{g as Ee,d as be}from"../chunks/transform.BIl3ljzv.js";import{b as Ce}from"../chunks/paths.CA5n2doK.js";async function ze(l){if("clipboard"in navigator)await navigator.clipboard.writeText(l);else{const e=document.createElement("input");e.type="text",e.disabled=!0,e.style.setProperty("position","fixed"),e.style.setProperty("z-index","-100"),e.style.setProperty("pointer-events","none"),e.style.setProperty("opacity","0"),e.value=l,document.body.appendChild(e),e.click(),e.select(),document.execCommand("copy"),document.body.removeChild(e)}}const xe=(l,e)=>{async function s(){if(r)try{await ze(r),l.dispatchEvent(new CustomEvent("svelte-copy",{detail:r}))}catch(o){l.dispatchEvent(new CustomEvent("svelte-copy:error",{detail:o}))}}let t=typeof e=="string"?["click"]:[e.events].flat(1),r=typeof e=="string"?e:e.text;return t.forEach(o=>{l.addEventListener(o,s,!0)}),{update:o=>{const C=typeof o=="string"?["click"]:[o.events].flat(1),g=typeof o=="string"?o:o.text,h=C.filter(y=>!t.includes(y)),n=t.filter(y=>!C.includes(y));h.forEach(y=>{l.addEventListener(y,s,!0)}),n.forEach(y=>{l.removeEventListener(y,s,!0)}),t=C,r=g},destroy:()=>{t.forEach(o=>{l.removeEventListener(o,s,!0)})}}};function ke(l){let e,s,t,r,o,C,g,h,n,y,a,f="CSS Snippet",p,_,N,I,B,T,L="Copy CSS to Clipboard",H,k,M,O,V;return{c(){e=z("link"),s=w(),t=z("div"),r=z("h3"),o=j(l[0]),C=w(),g=z("p"),h=j(l[1]),n=w(),y=z("details"),a=z("summary"),a.textContent=f,p=w(),_=z("code"),N=j(l[2]),I=w(),B=z("p"),T=z("button"),T.textContent=L,k=z("span"),M=j(l[3]),this.h()},l(E){const i=me("svelte-1uevrx3",document.head);e=x(i,"LINK",{rel:!0,href:!0}),i.forEach(b),s=D(E),t=x(E,"DIV",{style:!0,class:!0});var P=S(t);r=x(P,"H3",{class:!0});var c=S(r);o=F(c,l[0]),c.forEach(b),C=D(P),g=x(P,"P",{});var m=S(g);h=F(m,l[1]),m.forEach(b),n=D(P),y=x(P,"DETAILS",{class:!0});var u=S(y);a=x(u,"SUMMARY",{class:!0,"data-svelte-h":!0}),W(a)!=="svelte-1p4cxwi"&&(a.textContent=f),p=D(u),_=x(u,"CODE",{class:!0});var A=S(_);N=F(A,l[2]),A.forEach(b),u.forEach(b),I=D(P),B=x(P,"P",{});var U=S(B);T=x(U,"BUTTON",{class:!0,"data-svelte-h":!0}),W(T)!=="svelte-v2s51m"&&(T.textContent=L),k=x(U,"SPAN",{class:!0});var G=S(k);M=F(G,l[3]),G.forEach(b),U.forEach(b),P.forEach(b),this.h()},h(){v(e,"rel","external stylesheet"),v(e,"href",l[5]),v(r,"class","svelte-19ry7n"),Y(g,"font-size",l[4]),v(a,"class","svelte-19ry7n"),v(_,"class","svelte-19ry7n"),v(y,"class","svelte-19ry7n"),v(T,"class","svelte-19ry7n"),v(k,"class","svelte-19ry7n"),Y(t,"font-family","'"+l[0]+"'"),v(t,"class","svelte-19ry7n")},m(E,i){d(document.head,e),R(E,s,i),R(E,t,i),d(t,r),d(r,o),d(t,C),d(t,g),d(g,h),d(t,n),d(t,y),d(y,a),d(y,p),d(y,_),d(_,N),d(t,I),d(t,B),d(B,T),d(B,k),d(k,M),O||(V=[ye(H=xe.call(null,T,l[2])),X(T,"svelte-copy",l[6])],O=!0)},p(E,[i]){i&1&&K(o,E[0]),i&2&&K(h,E[1]),i&16&&Y(g,"font-size",E[4]),i&4&&K(N,E[2]),H&&_e(H.update)&&i&4&&H.update.call(null,E[2]),i&8&&K(M,E[3]),i&1&&Y(t,"font-family","'"+E[0]+"'")},i:$,o:$,d(E){E&&(b(s),b(t)),b(e),O=!1,ie(V)}}}function Te(l,e,s){let t,{id:r=""}=e,{family:o=""}=e,{size:C=16}=e,{text:g}=e,h="",n="";const y=`${Ce}/assets/demo/fonts/${r}.css`,a=()=>{s(3,n="Copied!"),setTimeout(()=>{s(3,n="")},1e3)};return ve(async()=>{const f=await fetch(y);s(2,h=await f.text())}),l.$$set=f=>{"id"in f&&s(7,r=f.id),"family"in f&&s(0,o=f.family),"size"in f&&s(8,C=f.size),"text"in f&&s(1,g=f.text)},l.$$.update=()=>{l.$$.dirty&256&&s(4,t=`${C}px`)},[o,g,h,n,t,y,a,r,C]}class Le extends te{constructor(e){super(),le(this,e,Te,ke,ee,{id:7,family:0,size:8,text:1})}}const Se=[{id:"atkinson",family:"Atkinson",type:"sans-serif"},{id:"atlas",family:"Atlas Grotesk",type:"sans-serif"},{id:"baloo-bhai",family:"Baloo Bhai",type:"sans-serif"},{id:"canela",family:"Canela",type:"serif"},{id:"computer-modern",family:"Computer Modern",type:"serif"},{id:"cozette",family:"Cozette",type:"other"},{id:"inter",family:"Inter",type:"sans-serif"},{id:"jamboree",family:"Jamboree",type:"other"},{id:"jersey",family:"Jersey M54",type:"other"},{id:"lyon",family:"Lyon Display",type:"serif"},{id:"metropolis",family:"Metropolis",type:"sans-serif"},{id:"national",family:"National 2 Web",type:"sans-serif"},{id:"publico",family:"Publico Text",type:"serif"},{id:"recoleta",family:"Recoleta",type:"serif"},{id:"rubik",family:"Rubik",type:"sans-serif"},{id:"spacemono",family:"Space Mono",type:"mono"},{id:"tiempos",family:"Tiempos Text",type:"serif"}];function se(l,e,s){const t=l.slice();return t[5]=e[s][0],t[6]=e[s][1],t}function ne(l,e,s){const t=l.slice();return t[9]=e[s].family,t[10]=e[s].id,t}function oe(l){let e,s;return e=new Le({props:{id:l[10],family:l[9],size:l[0],text:l[1]}}),{c(){ue(e.$$.fragment)},l(t){de(e.$$.fragment,t)},m(t,r){he(e,t,r),s=!0},p(t,r){const o={};r&1&&(o.size=t[0]),r&2&&(o.text=t[1]),e.$set(o)},i(t){s||(q(e.$$.fragment,t),s=!0)},o(t){J(e.$$.fragment,t),s=!1},d(t){pe(e,t)}}}function ae(l){let e,s=l[5]+"",t,r,o,C,g,h=Z(l[6]),n=[];for(let a=0;a<h.length;a+=1)n[a]=oe(ne(l,h,a));const y=a=>J(n[a],1,1,()=>{n[a]=null});return{c(){e=z("h2"),t=j(s),r=w(),o=z("section");for(let a=0;a<n.length;a+=1)n[a].c();C=w(),this.h()},l(a){e=x(a,"H2",{});var f=S(e);t=F(f,s),f.forEach(b),r=D(a),o=x(a,"SECTION",{class:!0});var p=S(o);for(let _=0;_<n.length;_+=1)n[_].l(p);C=D(p),p.forEach(b),this.h()},h(){v(o,"class","svelte-1lzc8ku")},m(a,f){R(a,e,f),d(e,t),R(a,r,f),R(a,o,f);for(let p=0;p<n.length;p+=1)n[p]&&n[p].m(o,null);d(o,C),g=!0},p(a,f){if(f&7){h=Z(a[6]);let p;for(p=0;p<h.length;p+=1){const _=ne(a,h,p);n[p]?(n[p].p(_,f),q(n[p],1)):(n[p]=oe(_),n[p].c(),q(n[p],1),n[p].m(o,C))}for(fe(),p=h.length;p<n.length;p+=1)y(p);ce()}},i(a){if(!g){for(let f=0;f<h.length;f+=1)q(n[f]);g=!0}},o(a){n=n.filter(Boolean);for(let f=0;f<n.length;f+=1)J(n[f]);g=!1},d(a){a&&(b(e),b(r),b(o)),re(n,a)}}}function we(l){let e,s,t="Hosted Fonts on The Pudding",r,o,C="<em>Do not use fonts hosted by The Pudding without written permission.</em>",g,h,n,y,a,f,p,_,N,I,B="text sample",T,L,H,k,M,O,V,E=Z(l[2]),i=[];for(let c=0;c<E.length;c+=1)i[c]=ae(se(l,E,c));const P=c=>J(i[c],1,1,()=>{i[c]=null});return{c(){e=z("div"),s=z("h1"),s.textContent=t,r=w(),o=z("p"),o.innerHTML=C,g=w(),h=z("form"),n=z("label"),y=j("font-size: "),a=j(l[0]),f=j("px"),p=w(),_=z("input"),N=w(),I=z("label"),I.textContent=B,T=w(),L=z("input"),H=w(),k=z("article");for(let c=0;c<i.length;c+=1)i[c].c();this.h()},l(c){e=x(c,"DIV",{id:!0,class:!0});var m=S(e);s=x(m,"H1",{"data-svelte-h":!0}),W(s)!=="svelte-1m2hcwq"&&(s.textContent=t),r=D(m),o=x(m,"P",{"data-svelte-h":!0}),W(o)!=="svelte-895ja5"&&(o.innerHTML=C),g=D(m),h=x(m,"FORM",{});var u=S(h);n=x(u,"LABEL",{for:!0,class:!0});var A=S(n);y=F(A,"font-size: "),a=F(A,l[0]),f=F(A,"px"),A.forEach(b),p=D(u),_=x(u,"INPUT",{id:!0,type:!0,min:!0,max:!0}),N=D(u),I=x(u,"LABEL",{for:!0,class:!0,"data-svelte-h":!0}),W(I)!=="svelte-16zo6eo"&&(I.textContent=B),T=D(u),L=x(u,"INPUT",{id:!0,type:!0,maxlength:!0}),u.forEach(b),m.forEach(b),H=D(c),k=x(c,"ARTICLE",{class:!0});var U=S(k);for(let G=0;G<i.length;G+=1)i[G].l(U);U.forEach(b),this.h()},h(){v(n,"for","size"),v(n,"class","svelte-1lzc8ku"),v(_,"id","size"),v(_,"type","range"),v(_,"min","12"),v(_,"max","48"),v(I,"for","text"),v(I,"class","svelte-1lzc8ku"),v(L,"id","text"),v(L,"type","text"),v(L,"maxlength","100"),v(e,"id","info"),v(e,"class","svelte-1lzc8ku"),v(k,"class","svelte-1lzc8ku")},m(c,m){R(c,e,m),d(e,s),d(e,r),d(e,o),d(e,g),d(e,h),d(h,n),d(n,y),d(n,a),d(n,f),d(h,p),d(h,_),Q(_,l[0]),d(h,N),d(h,I),d(h,T),d(h,L),Q(L,l[1]),R(c,H,m),R(c,k,m);for(let u=0;u<i.length;u+=1)i[u]&&i[u].m(k,null);M=!0,O||(V=[X(_,"change",l[3]),X(_,"input",l[3]),X(L,"input",l[4])],O=!0)},p(c,[m]){if((!M||m&1)&&K(a,c[0]),m&1&&Q(_,c[0]),m&2&&L.value!==c[1]&&Q(L,c[1]),m&7){E=Z(c[2]);let u;for(u=0;u<E.length;u+=1){const A=se(c,E,u);i[u]?(i[u].p(A,m),q(i[u],1)):(i[u]=ae(A),i[u].c(),q(i[u],1),i[u].m(k,null))}for(fe(),u=E.length;u<i.length;u+=1)P(u);ce()}},i(c){if(!M){for(let m=0;m<E.length;m+=1)q(i[m]);M=!0}},o(c){i=i.filter(Boolean);for(let m=0;m<i.length;m+=1)J(i[m]);M=!1},d(c){c&&(b(e),b(H),b(k)),re(i,c),O=!1,ie(V)}}}function De(l,e,s){let t=18,r="The quick brown fox jumps over the lazy dog.";const o=Ee(Se,h=>h.type);o.sort((h,n)=>be(h[1].length,n[1].length));function C(){t=ge(this.value),s(0,t)}function g(){r=this.value,s(1,r)}return[t,r,o,C,g]}class Ie extends te{constructor(e){super(),le(this,e,De,we,ee,{})}}function Me(l){let e,s;return e=new Ie({}),{c(){ue(e.$$.fragment)},l(t){de(e.$$.fragment,t)},m(t,r){he(e,t,r),s=!0},p:$,i(t){s||(q(e.$$.fragment,t),s=!0)},o(t){J(e.$$.fragment,t),s=!1},d(t){pe(e,t)}}}class je extends te{constructor(e){super(),le(this,e,null,Me,ee,{})}}export{je as component};