var Sendlater3Sendlater3Prompt = {
    SetOnLoad: function() {
	document.getElementById("yearvalue")
	    .addEventListener("ValueChange",
			      Sendlater3Sendlater3Prompt.populateMonths, false);
	document.getElementById("monthvalue")
	    .addEventListener("ValueChange",
			      Sendlater3Sendlater3Prompt.populateDays, false);
	document.getElementById("dayvalue")
	    .addEventListener("ValueChange",
			      Sendlater3Sendlater3Prompt.updateSummary, false);
	document.getElementById("hourvalue").
	    addEventListener("ValueChange",
			     Sendlater3Sendlater3Prompt.updateSummary, false);
	document.getElementById("minvalue").
	    addEventListener("ValueChange",
			     Sendlater3Sendlater3Prompt.updateSummary, false);
	Sendlater3Sendlater3Prompt.populateYears();
	Sendlater3Sendlater3Prompt.populateHours();
	Sendlater3Sendlater3Prompt.populateMins();
	var hhmm = new Date();
	document.getElementById("hourvalue").value = hhmm.getHours();
	document.getElementById("minvalue").value = hhmm.getMinutes();
	document.getElementById("shortcutbtn_1").label =
	    Sendlater3Util.PrefService.getComplexValue("extensions.sendlater3.quickoptions.1.label",
						   Components.interfaces.nsISupportsString).data;
	document.getElementById("shortcutbtn_2").label =
	    Sendlater3Util.PrefService.getComplexValue("extensions.sendlater3.quickoptions.2.label",
						   Components.interfaces.nsISupportsString).data;
	document.getElementById("shortcutbtn_3").label =
	    Sendlater3Util.PrefService.getComplexValue("extensions.sendlater3.quickoptions.3.label",
						   Components.interfaces.nsISupportsString).data;
	var shortcut1value = Sendlater3Util.PrefService.getIntPref("extensions.sendlater3.quickoptions.1.value");
	var shortcut2value = Sendlater3Util.PrefService.getIntPref("extensions.sendlater3.quickoptions.2.value");
	var shortcut3value = Sendlater3Util.PrefService.getIntPref("extensions.sendlater3.quickoptions.3.value");
	document.getElementById("shortcutbtn_1")
	    .setAttribute("oncommand",
			  "Sendlater3Sendlater3Prompt.CallSendAfter(" +
			  shortcut1value + ");close();");
	document.getElementById("shortcutbtn_2")
	    .setAttribute("oncommand",
	                  "Sendlater3Sendlater3Prompt.CallSendAfter(" +
			  shortcut2value + ");close();");
	document.getElementById("shortcutbtn_3")
	    .setAttribute("oncommand",
			  "Sendlater3Sendlater3Prompt.CallSendAfter(" +
			  shortcut3value + ");close();");
	document.getElementById("quickbutton1-key")
	    .setAttribute("oncommand",
			  "Sendlater3Sendlater3Prompt.CallSendAfter(" +
			  shortcut1value + ");close();");
	document.getElementById("quickbutton2-key")
	    .setAttribute("oncommand",
			  "Sendlater3Sendlater3Prompt.CallSendAfter(" +
			  shortcut2value + ");close();");
	document.getElementById("quickbutton3-key")
	    .setAttribute("oncommand",
			  "Sendlater3Sendlater3Prompt.CallSendAfter(" +
			  shortcut3value + ");close();");

	var prevXSendLater = window.arguments[0].previouslyTimed;
	if (prevXSendLater)
	{
	   document.getElementById("yearvalue").value =
	       prevXSendLater.getFullYear();
	   document.getElementById("monthvalue").value =
	       prevXSendLater.getMonth();
	   document.getElementById("dayvalue").value =
	       prevXSendLater.getDate();
	   document.getElementById("hourvalue").value =
	       prevXSendLater.getHours();
	   document.getElementById("minvalue").value =
	       prevXSendLater.getMinutes();
	}
	document.getElementById("cancelButton").focus();
    },

    populateYears: function() {
	var today = new Date();
	var container = document.getElementById("years");
	var i;
	for (i=0;i<5;i++)
	{
	      var newitem = document.createElement("menuitem");
	      newitem.setAttribute("label",(today.getFullYear()+i).toString());
	      newitem.setAttribute("value",(today.getFullYear()+i).toString());
	      container.appendChild(newitem);
	}

	 document.getElementById("yearvalue").selectedIndex = 0;
    },

    populateMonths: function() {
	var selectedyear =  document.getElementById("yearvalue").value;
	var today = new Date();
	var strbundle = document.getElementById("sendlater3promptstrings");
	var monthStr = [ strbundle.getString("January"),
	    	         strbundle.getString("February"),
			 strbundle.getString("March"),
			 strbundle.getString("April"),
			 strbundle.getString("May"),
			 strbundle.getString("June"),
			 strbundle.getString("July"),
			 strbundle.getString("August"),
			 strbundle.getString("September"),
			 strbundle.getString("October"),
			 strbundle.getString("November"),
			 strbundle.getString("December") ];
	var container = document.getElementById("months");
	Sendlater3Sendlater3Prompt.clearChildren(container);
	var i = 0;
	if (selectedyear == today.getFullYear()) {  
	    i = today.getMonth();
	}
	for (;i<12;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",monthStr[i]);
	    newitem.setAttribute("value",i);
	    container.appendChild(newitem);
	}
	document.getElementById("monthvalue").selectedIndex = 0;
    },

    populateDays: function() {
	var today = new Date();

	var selectedyear =  document.getElementById("yearvalue").value;
	var selectedmonth =  document.getElementById("monthvalue").value;

	var container = document.getElementById("days");
	Sendlater3Sendlater3Prompt.clearChildren(container);
	var i=0;
        if ((selectedyear == today.getFullYear()) &&
            (selectedmonth == today.getMonth())) {
	    i = today.getDate() - 1;
	}
	for (;i<Sendlater3Sendlater3Prompt.getMaxDays(selectedyear,selectedmonth);i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",(i+1).toString());
	    newitem.setAttribute("value",(i+1).toString());
	    container.appendChild(newitem);
	}
	 document.getElementById("dayvalue").selectedIndex = 0;
    },

    populateHours: function() {
	var container = document.getElementById("hours");
	var i;
	for (i=0;i<24;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",Sendlater3Util.DZFormat(i));
	    newitem.setAttribute("value",i.toString());
	    container.appendChild(newitem);
	}
    },

    populateMins: function() {
	var container = document.getElementById("mins");
	var i;
	for (i=0;i<60;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",Sendlater3Util.DZFormat(i));
	    newitem.setAttribute("value",i.toString());
	    container.appendChild(newitem);
	}
    },

    updateSummary: function() {
	var sendat = new Date();
	var selectedyear =  document.getElementById("yearvalue").value;
	var selectedmonth =  document.getElementById("monthvalue").value;
	var selecteddate =  document.getElementById("dayvalue").value;
	var selectedhour =  document.getElementById("hourvalue").value;
	var selectedmin =  document.getElementById("minvalue").value;
	sendat.setFullYear(parseInt(selectedyear));
	sendat.setMonth(parseInt(selectedmonth));
	sendat.setDate(parseInt(selecteddate));
	sendat.setHours(parseInt(selectedhour));
	sendat.setMinutes(parseInt(selectedmin));

	var strbundle = document.getElementById("sendlater3promptstrings");
	document.getElementById("summary").value =
	    strbundle.getString("willsendat") + " " + sendat.toLocaleString();
    },

    CallSendAfter: function(mins) {
	var sendat = new Date();
	sendat.setTime(sendat.getTime()+mins*60*1000);
	window.arguments[0].finishCallback(sendat);
    },

    clearChildren: function(element) {
	while (element.childNodes.length>0) {
	    element.removeChild(element.childNodes[0]);
	}
    },

    getMaxDays: function(year,month) {
	var oneDay = (1000 * 60 * 60 * 24);
	var today = new Date();
	today.setFullYear(parseInt(year));
	today.setDate(1);
	month++;
	today.setMonth(month);
	var bt = today.toString();
	today.setTime(today.valueOf() - oneDay);
	return today.getDate();
    },

    CallSendAt: function() {
	var sendat = new Date();
	var selectedyear =  document.getElementById("yearvalue").value;
	var selectedmonth =  document.getElementById("monthvalue").value;
	var selecteddate =  document.getElementById("dayvalue").value;
	var selectedhour =  document.getElementById("hourvalue").value;
	var selectedmin =  document.getElementById("minvalue").value;

	sendat.setFullYear(parseInt(selectedyear));
	sendat.setMonth(parseInt(selectedmonth));
	sendat.setDate(parseInt(selecteddate));
	sendat.setHours(parseInt(selectedhour));
	sendat.setMinutes(parseInt(selectedmin));

	window.arguments[0].finishCallback(sendat);
    }
}
