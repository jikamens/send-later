var Sendlater3Options = {
    ValidatePrefs: function() {
	var i;
	for (i = 1; i <= 3; i++) {
	    if (SL3U.ShortcutValue(i, true) == undefined) {
		var promptService = Components
		    .classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
		var value = SL3U.getCharPref("quickoptions."+i+".valuestring");
		var msg = SL3U.PromptBundleGetFormatted(
		    "OptionShortcutAlertText",
		    [i, value]);
		promptService.alert(window,
				    SL3U.PromptBundleGet(
					"OptionShortcutAlertTitle"),
				    msg);
		return false;
	    }
	}
	return true;
    },

    SetOnLoad: function() {
	if (SL3U.IsThunderbird2()) {
	    document.getElementById("sendbutton_hbox").hidden = true;
	    document.getElementById("help_link").hidden = true;
	}
	else {
	    document.getElementById("help_text").hidden = true;
	}
    }
};

SL3U.initUtil();
window.addEventListener("load", Sendlater3Options.SetOnLoad, false);
window.addEventListener("unload", SL3U.uninitUtil, false);
