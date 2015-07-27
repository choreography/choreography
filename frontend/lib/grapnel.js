/****
 * Grapnel.js
 * https://github.com/EngineeringMode/Grapnel.js
 *
 * @author Greg Sabia Tucker <greg@artificer.io>
 * @link http://artificer.io
 * @version 0.5.9
 *
 * Released under MIT License. See LICENSE.txt or http://opensource.org/licenses/MIT
*/

(function(a){function b(b){"use strict";var c=this;return this.events={},this.state=null,this.options=b||{},this.options.env=this.options.env||(0===Object.keys(a).length&&process&&process.browser!==!0?"server":"client"),this.options.mode=this.options.mode||("server"!==this.options.env&&this.options.pushState&&a.history&&a.history.pushState?"pushState":"hashchange"),this.version="0.5.9","function"==typeof a.addEventListener&&(a.addEventListener("hashchange",function(){c.trigger("hashchange")}),a.addEventListener("popstate",function(a){return c.state&&null===c.state.previousState?!1:void c.trigger("navigate")})),this.fragment={get:function(){var b;return b="pushState"===c.options.mode?a.location.pathname.replace(c.options.root,""):"pushState"!==c.options.mode&&a.location?a.location.hash?a.location.hash.split(c.options.hashBang?"#!":"#")[1]:"":a._pathname||""},set:function(b){return"pushState"===c.options.mode?(b=c.options.root?c.options.root+b:b,a.history.pushState({},null,b)):a.location?a.location.hash=(c.options.hashBang?"!":"")+b:a._pathname=b||"",c},clear:function(){return"pushState"===c.options.mode?a.history.pushState({},null,c.options.root||"/"):a.location&&(a.location.hash=c.options.hashBang?"!":""),c}},this}b.regexRoute=function(a,b,c,d){return a instanceof RegExp?a:(a instanceof Array&&(a="("+a.join("|")+")"),a=a.concat(d?"":"/?").replace(/\/\(/g,"(?:/").replace(/\+/g,"__plus__").replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g,function(a,c,d,e,f,g){return b.push({name:e,optional:!!g}),c=c||"",""+(g?"":c)+"(?:"+(g?c:"")+(d||"")+(f||d&&"([^/.]+?)"||"([^/]+?)")+")"+(g||"")}).replace(/([\/.])/g,"\\$1").replace(/__plus__/g,"(.+)").replace(/\*/g,"(.*)"),new RegExp("^"+a+"$",c?"":"i"))},b._forEach=function(a,b){return"function"==typeof Array.prototype.forEach?Array.prototype.forEach.call(a,b):function(a,b){for(var c=0,d=this.length;d>c;++c)a.call(b,this[c],c,this)}.call(a,b)},b.prototype.get=b.prototype.add=function(a){var c=this,d=[],e=Array.prototype.slice.call(arguments,1,-1),f=Array.prototype.slice.call(arguments,-1)[0],g=b.regexRoute(a,d),h=function(){var h=c.fragment.get().match(g);if(h){var i={params:{},keys:d,matches:h.slice(1)};b._forEach(i.matches,function(a,b){var c=d[b]&&d[b].name?d[b].name:b;i.params[c]=a?decodeURIComponent(a):void 0});var j={route:a,value:c.fragment.get(),params:i.params,regex:h,stack:[],runCallback:!0,callbackRan:!1,propagateEvent:!0,next:function(){return this.stack.shift().call(c,i,j,function(){j.next.call(j)})},preventDefault:function(){this.runCallback=!1},stopPropagation:function(){this.propagateEvent=!1},parent:function(){var a=!(!this.previousState||!this.previousState.value||this.previousState.value!=this.value);return a?this.previousState:!1},callback:function(){j.callbackRan=!0,j.timeStamp=Date.now(),j.next()}};if(j.stack=e.concat(f),c.trigger("match",j,i),!j.runCallback)return c;if(j.previousState=c.state,c.state=j,j.parent()&&j.parent().propagateEvent===!1)return j.propagateEvent=!1,c;j.callback()}return c},i="pushState"!==c.options.mode&&"server"!==c.options.env?"hashchange":"navigate";return h().on(i,h)},b.prototype.trigger=function(a){var c=this,d=Array.prototype.slice.call(arguments,1);return this.events[a]&&b._forEach(this.events[a],function(a){a.apply(c,d)}),this},b.prototype.on=b.prototype.bind=function(a,c){var d=this,e=a.split(" ");return b._forEach(e,function(a){d.events[a]?d.events[a].push(c):d.events[a]=[c]}),this},b.prototype.once=function(a,b){var c=!1;return this.on(a,function(){return c?!1:(c=!0,b.apply(this,arguments),b=null,!0)})},b.prototype.context=function(a){var b=this;return function(c,d){var e="/"!==a.slice(-1)?a+"/":a,f=e+c;return b.add.call(b,f,d)}},b.prototype.navigate=function(a){return this.fragment.set(a).trigger("navigate")},b.listen=function(){var a,c;return arguments[0]&&arguments[1]?(a=arguments[0],c=arguments[1]):c=arguments[0],function(){for(var a in c)this.add.call(this,a,c[a]);return this}.call(new b(a||{}))},"function"!=typeof a.define||a.define.amd.grapnel?"object"==typeof module&&"object"==typeof module.exports?module.exports=exports=b:a.Grapnel=b:a.define(function(c,d,e){return a.define.amd.grapnel=!0,b})}).call({},"object"==typeof window?window:this);