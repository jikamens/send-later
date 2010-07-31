var Sendlater3Options = {
    ValidatePrefs: function() {
	var i;
	for (i = 1; i <= 3; i++) {
	    if (Sendlater3Util.ShortcutValue(i) == undefined) {
		var promptService = Components
		    .classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
		var value = Sendlater3Util.PrefService
		    .getCharPref("extensions.sendlater3.quickoptions." + i +
				 ".valuestring");
		var msg = Sendlater3Util.PromptBundleGetFormatted(
		    "OptionShortcutAlertText",
		    [i, value]);
		promptService.alert(window,
				    Sendlater3Util.PromptBundleGet(
					"OptionShortcutAlertTitle"),
				    msg);
		return false;
	    }
	}
	return true;
    }
};
