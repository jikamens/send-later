Components.utils.import("resource:///modules/gloda/log4moz.js");

var Sendlater3Util = {
    PrefService: Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch),

    _PromptBundle: null,

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

    ShortcutValue: function(num) {
	Sendlater3Util.Entering("Sendlater3Util.ShortcutValue", num);
	var raw = Sendlater3Util.PrefService.
	    getCharPref("extensions.sendlater3.quickoptions." + num +
			".valuestring");
	if (raw.match(/^[0-9]+$/)) {
	    Sendlater3Util.Returning("Sendlater3Util.ShortcutValue", raw);
	    return raw;
	}
	else if (raw.match(/^[A-Za-z_$][A-Za-z0-9_$]*$/)) {
	    // If the user specifies an invalid function name, then this will
	    // throw an error, which will show up in the error console, which
	    // is what we want.
	    var v;
	    eval("v = " + raw + "();");
	    if (typeof(v) == "number") {
		v = raw + "()";
		Sendlater3Util.Returning("Sendlater3Util.ShortcutValue", v);
		return v;
	    }
	}
	throw("Invalid setting for quick option " + num + ": \"" + raw + "\"");
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
	}
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
