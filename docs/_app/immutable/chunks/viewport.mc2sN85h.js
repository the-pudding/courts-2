import{r as k}from"./index.DyYs5Jqr.js";var p=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function P(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}function te(e){if(e.__esModule)return e;var t=e.default;if(typeof t=="function"){var r=function i(){return this instanceof i?Reflect.construct(t,arguments,this.constructor):t.apply(this,arguments)};r.prototype=t.prototype}else r={};return Object.defineProperty(r,"__esModule",{value:!0}),Object.keys(e).forEach(function(i){var f=Object.getOwnPropertyDescriptor(e,i);Object.defineProperty(r,i,f.get?f:{enumerable:!0,get:function(){return e[i]}})}),r}var W="Expected a function",I=NaN,C="[object Symbol]",N=/^\s+|\s+$/g,R=/^[-+]0x[0-9a-f]+$/i,$=/^0b[01]+$/i,A=/^0o[0-7]+$/i,F=parseInt,z=typeof p=="object"&&p&&p.Object===Object&&p,B=typeof self=="object"&&self&&self.Object===Object&&self,D=z||B||Function("return this")(),H=Object.prototype,G=H.toString,V=Math.max,U=Math.min,v=function(){return D.Date.now()};function X(e,t,r){var i,f,m,c,o,a,s=0,O=!1,d=!1,b=!0;if(typeof e!="function")throw new TypeError(W);t=S(t)||0,j(r)&&(O=!!r.leading,d="maxWait"in r,m=d?V(S(r.maxWait)||0,t):m,b="trailing"in r?!!r.trailing:b);function y(n){var u=i,l=f;return i=f=void 0,s=n,c=e.apply(l,u),c}function _(n){return s=n,o=setTimeout(g,t),O?y(n):c}function x(n){var u=n-a,l=n-s,E=t-u;return d?U(E,m-l):E}function w(n){var u=n-a,l=n-s;return a===void 0||u>=t||u<0||d&&l>=m}function g(){var n=v();if(w(n))return T(n);o=setTimeout(g,x(n))}function T(n){return o=void 0,b&&i?y(n):(i=f=void 0,c)}function L(){o!==void 0&&clearTimeout(o),s=0,i=a=f=o=void 0}function M(){return o===void 0?c:T(v())}function h(){var n=v(),u=w(n);if(i=arguments,f=this,a=n,u){if(o===void 0)return _(a);if(d)return o=setTimeout(g,t),y(a)}return o===void 0&&(o=setTimeout(g,t)),c}return h.cancel=L,h.flush=M,h}function j(e){var t=typeof e;return!!e&&(t=="object"||t=="function")}function q(e){return!!e&&typeof e=="object"}function J(e){return typeof e=="symbol"||q(e)&&G.call(e)==C}function S(e){if(typeof e=="number")return e;if(J(e))return I;if(j(e)){var t=typeof e.valueOf=="function"?e.valueOf():e;e=j(t)?t+"":t}if(typeof e!="string")return e===0?e:+e;e=e.replace(N,"");var r=$.test(e);return r||A.test(e)?F(e.slice(2),r?2:8):R.test(e)?I:+e}var K=X;const Q=P(K),Y=()=>{var e;return((e=window==null?void 0:window.visualViewport)==null?void 0:e.width)||document.documentElement.clientWidth},Z=()=>{var e;return((e=window==null?void 0:window.visualViewport)==null?void 0:e.height)||document.documentElement.clientHeight},ne=k({width:0,height:0},e=>{const t=()=>e({width:Y(),height:Z()});return t(),window.addEventListener("resize",Q(t,250)),()=>{window.removeEventListener("resize",t)}});export{te as a,p as c,P as g,K as l,ne as v};