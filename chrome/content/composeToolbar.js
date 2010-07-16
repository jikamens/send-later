var Sendlater3ComposeToolbar = {
    main: function() {
    	Sendlater3Util.Entering("Sendlater3ComposeToolbar.main");

	function showquickbutton(num) {
	    return Sendlater3Util.PrefService
		.getBoolPref("extensions.sendlater3.quickoptions." + num +
			     ".showintoolbar");
	}

	function shortcutvalue(num) {
	    return Sendlater3Util.PrefService
		.getIntPref("extensions.sendlater3.quickoptions." + num +
			    ".value");
	}

	function populateHours() {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.populateHours");
	    var container = document.getElementById("hours");
	    var i;
	    for (i=0;i<24;i++) {
		var newitem = document.createElement("menuitem");
		newitem.setAttribute("label",Sendlater3Util.DZFormat(i));
		newitem.setAttribute("value",i.toString());
		container.appendChild(newitem);
	    }
	    Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.populateHours");
	}

	function populateMins() {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.populateMins");
	    var container = document.getElementById("mins");
	    var i;
	    for (i=0;i<60;i++) {
		var newitem = document.createElement("menuitem");
		newitem.setAttribute("label",Sendlater3Util.DZFormat(i));
		newitem.setAttribute("value",i.toString());
		container.appendChild(newitem);
	    }
	    Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.populateMins");
	}

	function populateYears() {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.populateYears");
	    var today = new Date();
	    var container = document.getElementById("years");
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
	    Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.populateYears");
	}

	function clearChildren(element) {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.clearChildren");
	    while (element.childNodes.length>0) {
	        element.removeChild(element.childNodes[0]);
	    }
	    Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.clearChildren");
	}

	function populateMonths() {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.populateMonths");
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
	    clearChildren(container);
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
	    Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.populateMonths");
	}

	function getMaxDays(year,month) {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.getMaxDays");
	    var oneDay = (1000 * 60 * 60 * 24);
	    var today = new Date();
	    today.setFullYear(parseInt(year));
	    today.setDate(1);
	    month++;
	    today.setMonth(month);
	    var bt = today.toString();
	    today.setTime(today.valueOf() - oneDay);
	    Sendlater3Util.Returning("Sendlater3ComposeToolbar.main.getMaxDays",
				     today.getDate());
	    return today.getDate();
	}

	function populateDays() {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.populateDays");
	    var today = new Date();

	    var selectedyear =  document.getElementById("yearvalue").value;
	    var selectedmonth =  document.getElementById("monthvalue").value;

	    var container = document.getElementById("days");
	    clearChildren(container);
	    var i=0;
	    if ((selectedyear == today.getFullYear()) &&
	        (selectedmonth == today.getMonth())) {
		i = today.getDate() - 1;
	    }
	    for (;i<getMaxDays(selectedyear,selectedmonth);i++) {
		var newitem = document.createElement("menuitem");
		newitem.setAttribute("label",(i+1).toString());
		newitem.setAttribute("value",(i+1).toString());
		container.appendChild(newitem);
	    }
	    document.getElementById("dayvalue").selectedIndex = 0;
	    Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.populateDays");
	}

	function SENDLATER3_TOOLBAR_SetOnLoad() {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.SENDLATER3_TOOLBAR_SetOnLoad");
	    if (document.getElementById('sendlater3_toolbar')) {
		document.getElementById("yearvalue")
		    .removeEventListener("ValueChange", populateMonths, false);
		document.getElementById("monthvalue")
		    .removeEventListener("ValueChange", populateDays, false);
		document.getElementById("yearvalue")
		    .addEventListener("ValueChange", populateMonths, false);
		document.getElementById("monthvalue")
		    .addEventListener("ValueChange", populateDays, false);

		//document.getElementById("dayvalue")
		//    .addEventListener("ValueChange", updateSummary , false);
		//document.getElementById("hourvalue")
		//    .addEventListener("ValueChange", updateSummary , false);
		//document.getElementById("minvalue")
		//    .addEventListener("ValueChange", updateSummary , false);
		populateYears();
		populateHours();
		populateMins();
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
		    if (showquickbutton(1)) {
			var cmd = "Sendlater3ComposeToolbar.CallSendAfter(" +
			    shortcutvalue(i) + ");"
			document.getElementById(btn).label =
			    Sendlater3Util.ButtonLabel(i);
			document.getElementById(btn)
			    .setAttribute("oncommand", cmd);
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
		Sendlater3Util.Returning("Sendlater3ComposeToolbar.main.SENDLATER3_TOOLBAR_SetOnLoad", true);
		return true;
	    }
	    Sendlater3Util.Returning("Sendlater3ComposeToolbar.main.SENDLATER3_TOOLBAR_SetOnLoad", false);
	    return false;
	}

	var originalCustomizeDone;

	function CustomizeDone(aToolboxChanged) {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.CustomizeDone", aToolboxChanged);
	    originalCustomizeDone(aToolboxChanged);
	    if (aToolboxChanged) {
		Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.CustomizeDone");
		captureonLoad();
		Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.CustomizeDone");
	    }
	    Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.CustomizeDone");
	}

	function captureonLoad() {
	    Sendlater3Util.Entering("Sendlater3ComposeToolbar.main.captureonLoad");
	    // We need to detect when the toolbar is first added to
	    // the message window, so we can populate it at that
	    // point.
	    if (! originalCustomizeDone) {
		originalCustomizeDone = document
		    .getElementById("compose-toolbox").customizeDone;
		Sendlater3Util.debug("originalCustomizeDone=" + 
				     originalCustomizeDone);
		document.getElementById("compose-toolbox").customizeDone =
		    CustomizeDone;
	    }

	    Sendlater3Util.debug("sendlater3_toolbar_initialized: " +
				 window.sendlater3_toolbar_initialized);
	    if (! window.sendlater3_toolbar_initialized) {
	        window.sendlater3_toolbar_initialized = 
		    SENDLATER3_TOOLBAR_SetOnLoad();
	    }
	    Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main.captureonLoad");
	}

	// The toolbar is only loaded the first time a message
	// composition window is created, but we want the time in our
	// toolbar to be set to the current time every time a new
	// message is composed. We accomplish that by detecting both
	// load and focus events and checking in the event listener
	// whether the values have already been set (using a custom
	// attribute on the window) before setting them.
	window.addEventListener("load",captureonLoad,false);
	window.addEventListener("focus",captureonLoad,false);

    	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.main");
    },

    CallSendAt: function() {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.CallSendAt");
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

	Sendlater3Composing.SendAtTime(sendat);
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.CallSendAt");
    },

    CallSendAfter: function(mins) {
	Sendlater3Util.Entering("Sendlater3ComposeToolbar.CallSendAfter");
	var sendat = new Date();
	sendat.setTime(sendat.getTime()+mins*60*1000);
	Sendlater3Composing.SendAtTime(sendat);
	Sendlater3Util.Leaving("Sendlater3ComposeToolbar.CallSendAfter");
    }
}

Sendlater3ComposeToolbar.main();
