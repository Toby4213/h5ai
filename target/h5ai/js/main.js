(function(h){h(function(){i();a();f();n();k()});var d={columnClasses:["icon","name","date","size"],defaultSortOrder:"C=N;O=A",viewmodes:["details","icons"],store:{viewmode:"h5ai.viewmode"},icons:{crumb:"/h5ai/icons/crumb.png",ascending:"/h5ai/icons/ascending.png",descending:"/h5ai/icons/descending.png"},customHeader:"h5ai.header.html",customFooter:"h5ai.footer.html"};function i(){H5ai=function(){var p=[];var q=[];this.folderClick=function(r){if(typeof r==="function"){p.push(r)}};this.fileClick=function(r){if(typeof r==="function"){q.push(r)}};this.applyFolderClick=function(r){for(idx in p){p[idx].call(window,r)}};this.applyFileClick=function(r){for(idx in q){q[idx].call(window,r)}}};h.h5ai=new H5ai()}function g(){var p=localStorage.getItem(d.store.viewmode);if(h.inArray(p,d.viewmodes)){return p}return d.viewmodes[0]}function a(p){if(p!==undefined){localStorage.setItem(d.store.viewmode,p)}if(g()==="icons"){h("#details").hide();h("#icons").show()}else{h("#details").show();h("#icons").hide()}}function f(){h("#domain span").text(document.domain);var t=decodeURI(document.location.pathname);var s=t.split("/");var r="/";var q=h("nav ul");for(idx in s){var p=s[idx];if(p!==""){r+=p+"/";q.append(h("<li class='crumb'><a href='"+r+"'><img src='"+d.icons.crumb+"' alt='>' />"+p+"</a></li>"))}}h("nav li a").closest("li").click(function(){document.location.href=h(this).find("a").attr("href")});document.title=document.domain+t}function c(){h("#details td").removeAttr("align").removeAttr("valign")}function j(p){if(p>=0&&p<d.columnClasses.length){return d.columnClasses[p]}return"unknown"}function b(){h("#details tr").each(function(){var p=0;h(this).find("th,td").each(function(){h(this).addClass(j(p));p++})})}function m(){h("#details th a").closest("th").addClass("header").click(function(){document.location.href=h(this).find("a").attr("href")});h("#details td.name a").closest("tr").addClass("entry").click(function(){document.location.href=h(this).find("td.name a").attr("href")});h("#details tr.entry").each(function(){var p=h(this);p.find("td.name a").addClass("label");if(p.find("td.icon img").attr("alt")==="[DIR]"){p.addClass("folder")}else{p.addClass("file")}});$entries=h("#details tr.entry");if($entries.size()===0||$entries.size()===1&&$entries.find("td.name a").text()==="Parent Directory"){h("#details").append(h("<div class='empty'>empty</div>"))}}function e(){var p=document.location.search;if(p===""){p=d.defaultSortOrder}var q;if(p.indexOf("O=A")>=0){q=h("<img src='"+d.icons.ascending+"' class='sort' alt='ascending' />")}else{q=h("<img src='"+d.icons.descending+"' class='sort' alt='descending' />")}if(p.indexOf("C=N")>=0){h("#details th.name a").append(q)}else{if(p.indexOf("C=M")>=0){h("#details th.date a").prepend(q)}else{if(p.indexOf("C=S")>=0){h("#details th.size a").prepend(q)}}}}function l(){c();b();m();e()}function o(){var p=h("<div></div>");h("#details td.name a").closest("tr").each(function(){var t=h(this);var s=t.find("td.icon img").attr("src").replace("icons","images");var q=t.find("td.name a");var r=h("<div class='entry'><img src='"+s+"' /><div class='label'>"+q.text()+"</div></div>").click(function(){document.location.href=q.attr("href")}).appendTo(p);if(t.hasClass("folder")){r.addClass("folder")}else{r.addClass("file")}});p.append(h("<div class='clearfix'></div>"));h("#icons").append(p)}function n(){l();o();h("#content .entry.folder").click(function(){h.h5ai.applyFolderClick(h(this).find(".label").text())});h("#content .entry.file").click(function(){h.h5ai.applyFileClick(h(this).find(".label").text())});h("#viewdetails").closest("li").click(function(){a("details")});h("#viewicons").closest("li").click(function(){a("icons")})}function k(){try{h.ajax({url:d.customHeader,dataType:"html",success:function(q){h("#content > header").append(h(q)).show()}})}catch(p){}try{h.ajax({url:d.customFooter,dataType:"html",success:function(q){h("#content > footer").prepend(h(q)).show()}})}catch(p){}}})(jQuery);