Components.utils.import("resource:///modules/gloda/log4moz.js");

var Sendlater3Util = {
    PrefService: Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch),

    _PromptBundle: null,

    IsThunderbird2: function() {
	var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
	var versionChecker = Components
	    .classes["@mozilla.org/xpcom/version-comparator;1"]
            .getService(Components.interfaces.nsIVersionComparator);
	return(versionChecker.compare(appInfo.version, "3.0") < 0);
    },

    IsPostbox: function() {
	var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
            .getService(Components.interfaces.nsIXULAppInfo);
	return(appInfo.name == "Postbox");
    },

    FindSubFolder: function(folder, name) {
	if (Sendlater3Util.IsThunderbird2()) {
	    return folder.FindSubFolder(name);
	}
	else {
	    return folder.findSubFolder(name);
	}
    },

    HeaderRowId: function(name) {
	if (Sendlater3Util.IsThunderbird2() && !Sendlater3Util.IsPostbox()) {
	    return "expanded" + name + "Box";
	}
	else {
	    return "expanded" + name + "Row";
	}
    },

    ComposeToolboxName: function() {
	if (Sendlater3Util.IsThunderbird2()) {
	    return "compose-toolbox2";
	}
	else {
	    return "compose-toolbox";
	}
    },

    PromptBundleGet: function(name) {
	Sendlater3Util.Entering("Sendlater3Util.PromptBundleGet", name);
	if (Sendlater3Util._PromptBundle == null) {
	    Sendlater3Util._PromptBundle =
		document.getElementById("promptstrings");
	}
	Sendlater3Util.Returning("Sendlater3Util.PromptBundleGet",
				 Sendlater3Util._PromptBundle.getString(name));
	return Sendlater3Util._PromptBundle.getString(name);
    },

    PromptBundleGetFormatted: function(name, params) {
	Sendlater3Util.Entering("Sendlater3Util.PromptBundleGetFormatted", name,
				params, length);
	if (Sendlater3Util._PromptBundle == null) {
	    Sendlater3Util._PromptBundle =
		document.getElementById("promptstrings");
	}
	var formatted = Sendlater3Util._PromptBundle
	    .getFormattedString(name, params)
	Sendlater3Util.Returning("Sendlater3Util.PromptBundleGetFormatted",
				 formatted);
	return formatted;
    },

    UpdatePref: function(key) {
	return "extensions.sendlater3.update_needed." + key;
    },

    SetUpdatePref: function(key) {
	Sendlater3Util.Entering("Sendlater3Util.SetUpdatePref", key);
	Sendlater3Util.PrefService.setBoolPref(Sendlater3Util.UpdatePref(key),
					       true);
	Sendlater3Util.Leaving("Sendlater3Util.SetUpdatePref", key);
    },

    GetUpdatePref: function(key) {
	Sendlater3Util.Entering("Sendlater3Util.GetUpdatePref", key);
	var pref = Sendlater3Util.UpdatePref(key);
	var value;
	try {
	    value = Sendlater3Util.PrefService.getBoolPref(pref);
	    Sendlater3Util.PrefService.deleteBranch(pref);
	}
	catch (ex) {
	    value = false;
	}
	Sendlater3Util.Returning("Sendlater3Util.GetUpdatePref", value);
	return value;
    },

    ButtonLabel: function(num) {
	Sendlater3Util.Entering("Sendlater3Util.ButtonLabel", num);
    	var label = Sendlater3Util.PrefService.
	    getComplexValue("extensions.sendlater3.quickoptions." + num + ".label",
			    Components.interfaces.nsISupportsString).data;
	if (label == "<from locale>") {
	    label = Sendlater3Util.PromptBundleGet("Button" + num + "Label");
	}
	Sendlater3Util.Returning("Sendlater3Util.ButtonLabel", label);
	return label;
    },

    ShortcutValue: function(num, validate) {
	Sendlater3Util.Entering("Sendlater3Util.ShortcutValue", num, validate);
	if (validate == undefined) {
	    validate = false;
	}
	var raw = Sendlater3Util.PrefService.
	    getCharPref("extensions.sendlater3.quickoptions." + num +
			".valuestring");
	if (raw.match(/^[0-9]+$/)) {
	    Sendlater3Util.Returning("Sendlater3Util.ShortcutValue", raw);
	    return raw;
	}
	else if (raw.match(/^[A-Za-z_$][A-Za-z0-9_$]*$/)) {
	    var func = window[raw];
	    if (typeof(func) == "undefined") {
		Sendlater3Util.warn("Invalid setting for quick option " + num + 
				    ": function \"" + raw + 
				    "\" is not defined");
		return; // undefined
	    }
	    else if (typeof(func) != "function") {
		Sendlater3Util.warn("Invalid setting for quick option " + num + 
				    ": \"" + raw + "\" is not a function");
		return; // undefined
	    }
	    if (validate) {
		var v = func();
		if (typeof(v) != "number") {
		    Sendlater3Util.warn("Invalid setting for quick option " + 
					num + ": \"" + raw + 
					"()\" does not return a number");
		    return; // undefined
		}
	    }
	    v = raw + "()";
	    Sendlater3Util.Returning("Sendlater3Util.ShortcutValue", v);
	    return v;
	}
	Sendlater3Util.warn("Invalid setting for quick option " + num + ": \"" +
			    raw + "\" is neither a number nor a function " +
			    "that returns a number");
	return; // undefined
    },

    FormatDateTime: function(thisdate,includeTZ) {
	Sendlater3Util.Entering("Sendlater3Util.FormatDateTime", thisdate,
				includeTZ);
	var s="";
	var sDaysOfWeek = [ "Sun","Mon","Tue","Wed","Thu","Fri","Sat" ];
	var sMonths= ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep",
	    	      "Oct","Nov","Dec"];

	var offset = thisdate.getTimezoneOffset();
	s += sDaysOfWeek[thisdate.getDay()];
	s += ", ";
	s += thisdate.getDate();
	s += " ";
	s += sMonths[thisdate.getMonth()];
	s += " ";
	s+=( thisdate.getFullYear());
	s += " ";
	var val = thisdate.getHours();
	if (val < 10)
	    s += "0";
	s += val;
	s += ":";
	val = thisdate.getMinutes();
	if (val < 10)
	    s += "0";
	s+= val;
	s += ":";
	val = thisdate.getSeconds();
	if (val < 10)
	    s += "0";
	s+=val;
	if (includeTZ) {
	    s += " ";
	    if (offset < 0) 
	    {
		offset *= -1;
		s += "+";
	    }
	    else
		s += "-";

	    val = Math.floor (offset / 60);
	    if (val < 10)
		s += "0";
	    s+=val;
	    val = Math.floor (offset % 60);
	    if (val < 10)
		s += "0";
	    s+=val;
	}
	Sendlater3Util.Returning("Sendlater3Util.FormatDateTime", s);
	return s;
    },

    logger: null,

    warn: function(msg) {
        Sendlater3Util.initLogging();
        Sendlater3Util.logger.warn(msg);
    },

    dump: function(msg) {
        Sendlater3Util.initLogging();
        Sendlater3Util.logger.info(msg);
    },

    debug: function(msg) {
        Sendlater3Util.initLogging();
    	Sendlater3Util.logger.debug(msg);
    },

    trace: function(msg) {
        Sendlater3Util.initLogging();
    	Sendlater3Util.logger.trace(msg);
    },

    initLogging: function() {
        if (Sendlater3Util.logger == null) {
	    Sendlater3Util.logger =
	        Log4Moz.getConfiguredLogger("extensions.sendlater3",
					    Log4Moz.Level.Trace,
					    Log4Moz.Level.Info,
					    Log4Moz.Level.Debug);
	    Sendlater3Util.logger.debug("Initialized logging");
	}
    },

    reinitLogging: {
	observe: function() {
	    Sendlater3Util.Entering("Sendlater3Util.reinitLogging.observe");
	    // This is really disgusting.
	    delete Log4Moz.repository._loggers["extensions.sendlater3"];
	    Sendlater3Util.logger = null;
	    Sendlater3Util.initLogging();
	    Sendlater3Util.Leaving("Sendlater3Util.reinitLogging.observe");
	},
    },

    getInstanceUuid: function() {
	var uuid_pref = "extensions.sendlater3.instance.uuid";
	var instance_uuid = Sendlater3Util.PrefService.getCharPref(uuid_pref);
	if (! instance_uuid) {
	    var uuidGenerator = 
		Components.classes["@mozilla.org/uuid-generator;1"]
		.getService(Components.interfaces.nsIUUIDGenerator);
	    instance_uuid = uuidGenerator.generateUUID().toString();
	    Sendlater3Util.PrefService.setCharPref(uuid_pref, instance_uuid);
	}
	return instance_uuid;
    },

    toSendDate: function(year, month, day, hour, min) {
	// We use an existing Date object to get the number of seconds
	// so that we don't end up sending every message at exactly
	// the same number of seconds past the minute. That would look
	// weird.
	var sendat = new Date();
	// We use an existing Date object to get the number of seconds
	// so that we don't end up sending every message at exactly
	// the same number of seconds past the minute. That would look
	// weird.
	sendat = new Date(parseInt(year), parseInt(month), parseInt(day),
			  parseInt(hour), parseInt(min), sendat.getSeconds(),
			  0);
	return sendat;
    },

    initUtil: function() {
	Sendlater3Util.Entering("Sendlater3Util.initUtil");
	Sendlater3Util.PrefService
	    .QueryInterface(Components.interfaces.nsIPrefBranch2);
	Sendlater3Util.consoleObserver =
	    Sendlater3Util.PrefService.addObserver(
		"extensions.sendlater3.logging.console",
		Sendlater3Util.reinitLogging, false);
	Sendlater3Util.dumpObserver =
	    Sendlater3Util.PrefService.addObserver(
		"extensions.sendlater3.logging.dump",
		Sendlater3Util.reinitLogging, false);
	Sendlater3Util.Leaving("Sendlater3Util.initUtil");
    },

    uninitUtil: function() {
	Sendlater3Util.Entering("Sendlater3Util.uninitUtil");
	Sendlater3Util.PrefService
	    .QueryInterface(Components.interfaces.nsIPrefBranch2);
	Sendlater3Util.PrefService.removeObserver(
	    "extensions.sendlater3.logging.console",
	    Sendlater3Util.reinitLogging);
	Sendlater3Util.PrefService.removeObserver(
	    "extensions.sendlater3.logging.dump",
	    Sendlater3Util.reinitLogging);
	Sendlater3Util.Leaving("Sendlater3Util.uninitUtil");
    },

    DZFormat: function(val) {
    	Sendlater3Util.Entering("Sendlater3Util.DZFormat", val);
	var ret;
	if (val < 10) ret = "0" + val; else ret = val;
	Sendlater3Util.Returning("Sendlater3Util.DZFormat", ret);
	return ret;
    },

    Entering: function() {
    	var func = arguments[0];
	var msg = "Entering " + func;
	var a = new Array();
	var i;
	for (i = 1; i < arguments.length; i++) {
	    a.push(arguments[i]);
	}
	if (a.length > 0) {
	    msg = msg + "(" + a.join(", ") + ")";
	}
        Sendlater3Util.trace(msg);
    },

    Leaving: function(func) {
        Sendlater3Util.trace("Leaving " + func);
    },

    Returning: function(func, value) {
        Sendlater3Util.trace("Returning \"" + value + "\" from " + func);
    },

    Throwing: function(func, error) {
        Sendlater3Util.trace("Throwing \"" + error + "\" from " + func);
    }
}
