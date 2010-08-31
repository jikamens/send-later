var Sendlater3Prompt = {
    SetOnLoad: function() {
        Sendlater3Util.Entering("Sendlater3Prompt.SetOnLoad");
	document.getElementById("yearvalue")
	    .addEventListener("ValueChange",
			      Sendlater3Prompt.populateMonths, false);
	document.getElementById("monthvalue")
	    .addEventListener("ValueChange",
			      Sendlater3Prompt.populateDays, false);
	document.getElementById("dayvalue")
	    .addEventListener("ValueChange",
			      Sendlater3Prompt.updateSummary, false);
	document.getElementById("hourvalue").
	    addEventListener("ValueChange",
			     Sendlater3Prompt.updateSummary, false);
	document.getElementById("minvalue").
	    addEventListener("ValueChange",
			     Sendlater3Prompt.updateSummary, false);
	Sendlater3Prompt.populateYears();
	Sendlater3Prompt.populateHours();
	Sendlater3Prompt.populateMins();
	var hhmm = new Date();
	document.getElementById("hourvalue").value = hhmm.getHours();
	document.getElementById("minvalue").value = hhmm.getMinutes();
	var i;
	for (i = 1; i <= 3; i++) {
	    document.getElementById("shortcutbtn_" + i).label =
		Sendlater3Util.ButtonLabel(i);
	    var value = Sendlater3Util.ShortcutValue(i);
	    if (value == undefined) {
		document.getElementById("shortcutbtn_" + i).hidden = true;
	    }
	    else {
		var cmd = "Sendlater3Prompt.CallSendAfter(" + value +
		    ");close();";
		// For the life of me, I can't figure out why I have to remove
		// these attributes before setting them, but if I don't, then
		// sometimes when the user changes one of the button values in
		// the middle of a session, the new value doesn't take effect
		// immediately. I found a Web page claiming that setAttribute
		// is unreliable because it sets the "default value" for the
		// attribute rather than the actual value, and that therefore
		// attributes should be set as properties (as shown for setting
		// the "hidden" attribute just below), but I tried using
		// ".oncommand = ..." instead of ".setAttribute("oncommand",
		// ...)" and it did not solve the problem. Only removing and
		// recreating the attribute seems to solve the problem. I
		// suppose now that I've got it working, it'll do, but I sure
		// wish I understood what's going on here inside the JavaScript
		// interpreter.
		document.getElementById("shortcutbtn_" + i)
		    .removeAttribute("oncommand");
		document.getElementById("quickbutton" + i + "-key")
		    .removeAttribute("oncommand");
		document.getElementById("shortcutbtn_" + i)
		    .setAttribute("oncommand", cmd);
		document.getElementById("quickbutton" + i + "-key")
		    .setAttribute("oncommand", cmd);
		document.getElementById("shortcutbtn_" + i).hidden = false;
	    }
	}

	var prevXSendLater = window.arguments[0].previouslyTimed;
	if (prevXSendLater) {
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
        Sendlater3Util.Leaving("Sendlater3Prompt.SetOnLoad");
    },

    populateYears: function() {
        Sendlater3Util.Entering("Sendlater3Prompt.populateYears");
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
        Sendlater3Util.Leaving("Sendlater3Prompt.populateYears");
    },

    populateMonths: function() {
        Sendlater3Util.Entering("Sendlater3Prompt.populateMonths");
	var selectedyear =  document.getElementById("yearvalue").value;
	var today = new Date();
	var monthStr = [ Sendlater3Util.PromptBundleGet("January"),
	    	         Sendlater3Util.PromptBundleGet("February"),
			 Sendlater3Util.PromptBundleGet("March"),
			 Sendlater3Util.PromptBundleGet("April"),
			 Sendlater3Util.PromptBundleGet("May"),
			 Sendlater3Util.PromptBundleGet("June"),
			 Sendlater3Util.PromptBundleGet("July"),
			 Sendlater3Util.PromptBundleGet("August"),
			 Sendlater3Util.PromptBundleGet("September"),
			 Sendlater3Util.PromptBundleGet("October"),
			 Sendlater3Util.PromptBundleGet("November"),
			 Sendlater3Util.PromptBundleGet("December") ];
	var container = document.getElementById("months");
	Sendlater3Prompt.clearChildren(container);
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
        Sendlater3Util.Leaving("Sendlater3Prompt.populateMonths");
    },

    populateDays: function() {
        Sendlater3Util.Entering("Sendlater3Prompt.populateDays");
	var today = new Date();

	var selectedyear =  document.getElementById("yearvalue").value;
	var selectedmonth =  document.getElementById("monthvalue").value;

	var container = document.getElementById("days");
	Sendlater3Prompt.clearChildren(container);
	var i=0;
        if ((selectedyear == today.getFullYear()) &&
            (selectedmonth == today.getMonth())) {
	    i = today.getDate() - 1;
	}
	for (;i<Sendlater3Prompt.getMaxDays(selectedyear,selectedmonth);i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",(i+1).toString());
	    newitem.setAttribute("value",(i+1).toString());
	    container.appendChild(newitem);
	}
	document.getElementById("dayvalue").selectedIndex = 0;
        Sendlater3Util.Leaving("Sendlater3Prompt.populateDays");
    },

    populateHours: function() {
        Sendlater3Util.Entering("Sendlater3Prompt.populateHours");
	var container = document.getElementById("hours");
	var i;
	for (i=0;i<24;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",Sendlater3Util.DZFormat(i));
	    newitem.setAttribute("value",i.toString());
	    container.appendChild(newitem);
	}
        Sendlater3Util.Leaving("Sendlater3Prompt.populateHours");
    },

    populateMins: function() {
        Sendlater3Util.Entering("Sendlater3Prompt.populateMins");
	var container = document.getElementById("mins");
	var i;
	for (i=0;i<60;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",Sendlater3Util.DZFormat(i));
	    newitem.setAttribute("value",i.toString());
	    container.appendChild(newitem);
	}
        Sendlater3Util.Leaving("Sendlater3Prompt.populateMins");
    },

    updateSummary: function() {
        Sendlater3Util.Entering("Sendlater3Prompt.updateSummary");
	var selectedyear =  document.getElementById("yearvalue").value;
	var selectedmonth =  document.getElementById("monthvalue").value;
	var selecteddate =  document.getElementById("dayvalue").value;
	var selectedhour =  document.getElementById("hourvalue").value;
	var selectedmin =  document.getElementById("minvalue").value;
	var sendat = Sendlater3Util.toSendDate(selectedyear, selectedmonth,
					       selecteddate, selectedhour,
					       selectedmin);

	document.getElementById("summary").value =
	    Sendlater3Util.PromptBundleGet("willsendat") + " " +
	    sendat.toLocaleString();
        Sendlater3Util.Leaving("Sendlater3Prompt.updateSummary");
    },

    CallSendAfter: function(mins) {
        Sendlater3Util.Entering("Sendlater3Prompt.CallSendAfter", mins);
	var sendat = new Date();
	sendat.setTime(sendat.getTime()+mins*60*1000);
	window.arguments[0].finishCallback(sendat);
        Sendlater3Util.Leaving("Sendlater3Prompt.CallSendAfter");
    },

    clearChildren: function(element) {
        Sendlater3Util.Entering("Sendlater3Prompt.clearChildren");
	while (element.childNodes.length>0) {
	    element.removeChild(element.childNodes[0]);
	}
        Sendlater3Util.Leaving("Sendlater3Prompt.clearChildren");
    },

    getMaxDays: function(year,month) {
        Sendlater3Util.Entering("Sendlater3Prompt.getMaxDays");
	var oneDay = (1000 * 60 * 60 * 24);
	var today = new Date();
	today.setFullYear(parseInt(year));
	today.setDate(1);
	month++;
	today.setMonth(month);
	var bt = today.toString();
	today.setTime(today.valueOf() - oneDay);
        Sendlater3Util.Returning("Sendlater3Prompt.getMaxDays",
				 today.getDate());
	return today.getDate();
    },

    CallSendAt: function() {
        Sendlater3Util.Entering("Sendlater3Prompt.CallSendAt");
	var sendat = new Date();
	var selectedyear =  document.getElementById("yearvalue").value;
	var selectedmonth =  document.getElementById("monthvalue").value;
	var selecteddate =  document.getElementById("dayvalue").value;
	var selectedhour =  document.getElementById("hourvalue").value;
	var selectedmin =  document.getElementById("minvalue").value;
	var sendat = Sendlater3Util.toSendDate(selectedyear, selectedmonth,
					       selecteddate, selectedhour,
					       selectedmin);

	window.arguments[0].finishCallback(sendat);
        Sendlater3Util.Leaving("Sendlater3Prompt.CallSendAt");
    }
}

Sendlater3Util.initUtil();
window.addEventListener("unload", Sendlater3Util.uninitUtil, false);
