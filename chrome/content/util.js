Components.utils.import("resource:///modules/gloda/log4moz.js");

var Sendlater3Util = {
    PrefService: Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch),

    _PromptBundle: null,

    PromptBundleGet: function(name) {
	if (Sendlater3Util._PromptBundle == null) {
	   Sendlater3Util._PromptBundle =
	       document.getElementById("sendlater3promptstrings");
	}
	return Sendlater3Util._PromptBundle.getString(name);
    },

    ButtonLabel: function(num) {
    	var label = Sendlater3Util.PrefService.
	    getComplexValue("extensions.sendlater3.quickoptions." + num + ".label",
			    Components.interfaces.nsISupportsString).data;
	if (label == "<from locale>") {
	    label = Sendlater3Util.PromptBundleGet("Button" + num + "Label");
	}
	return label;
    },

    FormatDateTime: function(thisdate,includeTZ) {
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

    initLogging: function() {
        if (Sendlater3Util.logger == null) {
	    Sendlater3Util.logger =
	        Log4Moz.getConfiguredLogger("extensions.sendlater3",
					    Log4Moz.Level.Debug,
					    Log4Moz.Level.Info,
					    Log4Moz.Level.Debug);
	}
    },

    DZFormat: function(val) {
	if (val < 10) return "0" + val; else return val;
    }
}
