var Sendlater3ComposeToolbar = {
    timer: null,
    originalCustomizeDone: null,

    updateModified: function() {
	var t = Sendlater3ComposeToolbar;
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.updateModified");
	if (t.timer != null) {
	    Sendlater3Util.debug("Sendlater3ComposeToolbar.updateModified: canceling timer");
	    t.timer.cancel();
	    t.timer = null;
	}
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.updateModified");
    },

    setTimer: function() {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.setTimer");
	var now = new Date();
	var then = new Date(now.getTime());
	then.setMinutes(now.getMinutes()+1)
	then.setSeconds(0);
	if (this.timer != null) {
	    this.timer.cancel();
	}
	var ms = then.getTime() - now.getTime();
	this.timer = Components.classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	this.timer.initWithCallback(this.SetOnLoad, ms,
				    Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	Sendlater3Util.debug("Currently " + now + ", next tick is " + 
			     then + ", ms = " + ms);
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.setTimer");
    },

    SetOnLoad: function() {
	var t = Sendlater3ComposeToolbar;
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.SetOnLoad");

	// We need to detect when the toolbar is first added to
	// the message window, so we can populate it at that
	// point.
	if (! t.originalCustomizeDone) {
	    t.originalCustomizeDone = document
		.getElementById("compose-toolbox").customizeDone;
	    Sendlater3Util.debug("t.originalCustomizeDone=" + 
				 t.originalCustomizeDone);
	    document.getElementById("compose-toolbox").customizeDone =
		t.CustomizeDone;
	}

	if (document.getElementById('sendlater3_toolbar')) {
	    document.getElementById("yearvalue")
		.removeEventListener("ValueChange", t.populateMonths, false);
	    document.getElementById("monthvalue")
		.removeEventListener("ValueChange", t.populateDays, false);
	    document.getElementById("yearvalue")
		.addEventListener("ValueChange", t.populateMonths, false);
	    document.getElementById("monthvalue")
		.addEventListener("ValueChange", t.populateDays, false);

	    document.getElementById("dayvalue")
		.addEventListener("ValueChange", t.updateModified, false);
	    document.getElementById("hourvalue")
		.addEventListener("ValueChange", t.updateModified, false);
	    document.getElementById("minvalue")
		.addEventListener("ValueChange", t.updateModified, false);
	    t.populateYears();
	    t.populateHours();
	    t.populateMins();
	    var hhmm = new Date();
	    document.getElementById("hourvalue").value = hhmm.getHours();
	    document.getElementById("minvalue").value = hhmm.getMinutes();
	    switch (document.getElementById("sendlater3_toolbar")
		    .parentNode.getAttribute("mode")) {
	    case "full":
	    case "icons":
		document.getElementById("sendlater3toolbartimeicon")
		    .hidden = false;
		document.getElementById("sendlater3toolbarcalicon")
		    .hidden = false;
		break;
	    default:
		document.getElementById("sendlater3toolbartimeicon")
		    .hidden = true;
		document.getElementById("sendlater3toolbarcalicon")
		    .hidden = true;
		break;
	    }

	    var i;
	    for (i = 1; i <= 3; i++) {
		var btn = "shortcutbtn_" + i;
		var minutes = Sendlater3Util.ShortcutValue(i);
		if (t.showquickbutton(1) && minutes != undefined) {
		    var cmd = "Sendlater3ComposeToolbar.CallSendAfter(" +
			minutes + ");"
		    document.getElementById(btn).label =
			Sendlater3Util.ButtonLabel(i);
		    // See comment about removeAttribute above similar code
		    // in prompt.js.
		    document.getElementById(btn).removeAttribute("oncommand");
		    document.getElementById("quickbutton" + i + "-key")
			.removeAttribute("oncommand");
		    document.getElementById(btn).setAttribute("oncommand", cmd);
		    document.getElementById("quickbutton" + i + "-key")
			.setAttribute("oncommand", cmd);
		    document.getElementById(btn).hidden = false;
		}
		else {
		    document.getElementById(btn).hidden = true;
		}
	    }

	    if (Sendlater3Composing.prevXSendLater) {
		Sendlater3Util.dump("PrevXSendlater is Set to " +
				    Sendlater3Composing.prevXSendLater);
		document.getElementById("yearvalue").value =
		    Sendlater3Composing.prevXSendLater.getFullYear();
		document.getElementById("monthvalue").value =
		    Sendlater3Composing.prevXSendLater.getMonth();
		document.getElementById("dayvalue").value =
		    Sendlater3Composing.prevXSendLater.getDate();
		document.getElementById("hourvalue").value =
		    Sendlater3Composing.prevXSendLater.getHours();
		document.getElementById("minvalue").value =
		    Sendlater3Composing.prevXSendLater.getMinutes();
	    }
	    else {
		Sendlater3Util.dump("No previous time");
	    }
	    t.setTimer();
	}
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.SetOnLoad");
    },

    showquickbutton: function(num) {
	return Sendlater3Util.PrefService
	    .getBoolPref("extensions.sendlater3.quickoptions." + num +
			 ".showintoolbar");
    },

    populateHours: function() {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.populateHours");
	var t = Sendlater3ComposeToolbar;
	var container = document.getElementById("hours");
	t.clearChildren(container);
	var i;
	for (i=0;i<24;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",Sendlater3Util.DZFormat(i));
	    newitem.setAttribute("value",i.toString());
	    container.appendChild(newitem);
	}
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.populateHours");
    },

    populateMins: function() {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.populateMins");
	var t = Sendlater3ComposeToolbar;
	var container = document.getElementById("mins");
	t.clearChildren(container);
	var i;
	for (i=0;i<60;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",Sendlater3Util.DZFormat(i));
	    newitem.setAttribute("value",i.toString());
	    container.appendChild(newitem);
	}
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.populateMins");
    },

    populateYears: function() {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.populateYears");
	var today = new Date();
	var t = Sendlater3ComposeToolbar;
	var container = document.getElementById("years");
	t.clearChildren(container);
	var i;
	for (i=0;i<5;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",
				 (today.getFullYear()+i).toString());
	    newitem.setAttribute("value",
				 (today.getFullYear()+i).toString());
	    container.appendChild(newitem);
	}

	document.getElementById("yearvalue").selectedIndex = 0;
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.populateYears");
    },

    clearChildren: function(element) {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.clearChildren");
	while (element.childNodes.length>0) {
	    element.removeChild(element.childNodes[0]);
	}
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.clearChildren");
    },

    populateMonths: function() {
	var t = Sendlater3ComposeToolbar;
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.populateMonths");
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
	t.clearChildren(container);
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
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.populateMonths");
    },

    getMaxDays: function(year,month) {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.getMaxDays");
	var oneDay = (1000 * 60 * 60 * 24);
	var today = new Date();
	today.setFullYear(parseInt(year));
	today.setDate(1);
	month++;
	today.setMonth(month);
	var bt = today.toString();
	today.setTime(today.valueOf() - oneDay);
	Sendlater3Util.Returning("Sendlater3ComposeToolbar.getMaxDays",
				 today.getDate());
	return today.getDate();
    },

    populateDays: function() {
	var t = Sendlater3ComposeToolbar;
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.populateDays");
	var today = new Date();

	var selectedyear =  document.getElementById("yearvalue").value;
	var selectedmonth =  document.getElementById("monthvalue").value;

	var container = document.getElementById("days");
	t.clearChildren(container);
	var i=0;
	if ((selectedyear == today.getFullYear()) &&
	    (selectedmonth == today.getMonth())) {
	    i = today.getDate() - 1;
	}
	var max = t.getMaxDays(selectedyear,selectedmonth);
	for (;i<max;i++) {
	    var newitem = document.createElement("menuitem");
	    newitem.setAttribute("label",(i+1).toString());
	    newitem.setAttribute("value",(i+1).toString());
	    container.appendChild(newitem);
	}
	document.getElementById("dayvalue").selectedIndex = 0;
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.populateDays");
    },

    CustomizeDone: function(aToolboxChanged) {
	var t = Sendlater3ComposeToolbar;
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.CustomizeDone", aToolboxChanged);
	t.originalCustomizeDone(aToolboxChanged);
	if (aToolboxChanged) {
	    t.SetOnLoad();
	}
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.CustomizeDone");
    },

    CallSendAt: function() {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.CallSendAt");
	var selectedyear =  document.getElementById("yearvalue").value;
	var selectedmonth =  document.getElementById("monthvalue").value;
	var selecteddate =  document.getElementById("dayvalue").value;
	var selectedhour =  document.getElementById("hourvalue").value;
	var selectedmin =  document.getElementById("minvalue").value;
	var sendat = new Sendlater3Util.toSendDate(selectedyear, selectedmonth,
						   selecteddate, selectedhour,
						   selectedmin);

	Sendlater3Composing.SendAtTime(sendat);
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.CallSendAt");
    },

    CallSendAfter: function(mins) {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.CallSendAfter");
	var sendat = new Date();
	sendat.setTime(sendat.getTime()+mins*60*1000);
	Sendlater3Composing.SendAtTime(sendat);
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.CallSendAfter");
    },

    main: function() {
    	Sendlater3Util.Entering("Sendlater3ComposeToolbar.main");

	window.addEventListener("load", this.SetOnLoad, false);
	window.addEventListener("unload", Sendlater3Util.uninitUtil, false);
	document.getElementById("msgcomposeWindow").addEventListener("compose-window-reopen", this.SetOnLoad, false);

    	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main");
    }
}

Sendlater3Util.initUtil();
Sendlater3ComposeToolbar.main();
