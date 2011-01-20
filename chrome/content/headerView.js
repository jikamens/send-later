var Sendlater3HeaderView = function() {

    var sendlater3columnHandler = {
	getCellText: function(row, col) {
	    var key = gDBView.getKeyAt(row);
	    var hdr = gDBView.db.GetMsgHdrForKey(key);
	    var retval = hdr.getStringProperty("x-send-later-at");
	    if (retval != "") {
		var recur = hdr.getStringProperty("x-send-later-recur");
		var retdate = new Date(retval);
		var dateFormatService = Components
		    .classes["@mozilla.org/intl/scriptabledateformat;1"]
                    .getService(Components.interfaces.nsIScriptableDateFormat);
		var val = dateFormatService
		    .FormatDateTime("",
				    dateFormatService.dateFormatShort,
				    dateFormatService.timeFormatNoSeconds,
				    retdate.getFullYear(),
				    retdate.getMonth()+1,
				    retdate.getDate(),
				    retdate.getHours(),
				    retdate.getMinutes(),
				    0);
		if (recur) {
		    var settings = recur.split(" ");
		    val += " (" + Sendlater3Util.PromptBundleGet(settings[0]) +
			")";
		}
		return val;
	    }
	    else {
		return null;
	    }
	},

	getSortStringForRow: function(hdr) {
	    return null;
	},
	
	isString:            function() {return false;},
	getCellProperties:   function(row, col, props){},
	getImageSrc:         function(row, col) {return null;},
	getRowProperties:    function(row,props){},
	getColumnProperties: function(colid,col,props){},
	getSortLongForRow:   function(hdr) {
	    if (hdr.getStringProperty("x-send-later-at")) {
		var hdrdate =
		    new Date(hdr.getStringProperty("x-send-later-at"));
		return hdrdate.valueOf();
	    }
	    else {
		return 0;
	    }
	}
    }

    function IsThisDraft(msgFolder) {
	if (msgFolder == null) {
	    return false;
	}

	var accountManager = Components
	    .classes["@mozilla.org/messenger/account-manager;1"]
	    .getService(Components.interfaces.nsIMsgAccountManager);
	
	var fdrlocal = accountManager.localFoldersServer.rootFolder;
	if (Sendlater3Util.FindSubFolder(fdrlocal, "Drafts").URI == 
	    msgFolder.URI) return true;
	if (Sendlater3Util.PrefService
	    .getCharPref('mail.identity.default.draft_folder')==msgFolder.URI)
	    return true;	

	var identities = accountManager
	    .GetIdentitiesForServer(msgFolder.server);
	
	for (idindex = 0;idindex < identities.Count(); idindex++) {
	    if (identities.GetElementAt(idindex)
		.QueryInterface(Components.interfaces.nsIMsgIdentity)
		.draftFolder==msgFolder.URI)
		return true;
	}

	return false;
    }

    function addSENDLATER3ColumnHandler() {
	var folder;
	try {
	    folder = gDBView.viewFolder;
	}
	catch (ex) {
	    // TB2 bug
	    return;
	}
	if ( IsThisDraft(folder) ) {
	    if (Sendlater3Util.PrefService
		.getBoolPref("extensions.sendlater3.showcolumn")) {
		document.getElementById("colXSendLaterAt").hidden = false;
	    }
	    else {
		document.getElementById("colXSendLaterAt").hidden = true;
	    }
	    gDBView.addColumnHandler("colXSendLaterAt",
				     sendlater3columnHandler);
	}
	else {
	    document.getElementById("colXSendLaterAt").hidden = true;
	}
    }

    var sendlater3_HeaderDisplay = {
	dispHeader: function () {
	    Sendlater3Util.Entering("Sendlater3HeaderView.sendlater3_HeaderDisplay.dispHeader");
	    var hidden = true;
	    if (Sendlater3Util.PrefService
		.getBoolPref("extensions.sendlater3.showheader")) {
		Sendlater3Util.debug("headerView.js: dispHeader: showheader is true");
		if (IsThisDraft(gDBView.viewFolder)) {
		    var msghdr = gDBView.hdrForFirstSelectedMessage;
		    if (msghdr!=null) {
			var sendat =msghdr.getStringProperty("x-send-later-at");
			if (sendat) {
			    var xsendlater = new Date(sendat);
			    var val = xsendlater.toLocaleString();
			    var recur = msghdr
				.getStringProperty("x-send-later-recur");
			    if (recur) {
				var settings = recur.split(" ");
				val += " (" + Sendlater3Util
				    .PromptBundleGet(settings[0]) + ")";
			    }
			    document
				.getElementById("expandedx-send-later-atBox")
				.headerValue = val;
			    hidden = false;
			    Sendlater3Util.debug("headerView.js: dispHeader: showing header");
			}	
			else {
			    Sendlater3Util.debug("headerView.js: dispHeader: hiding header (empty)");
			}
		    }
		    else {
			Sendlater3Util.debug("headerView.js: dispHeader: hiding header (null msghdr)");
		    }
		}
		else {
		    Sendlater3Util.debug("headerView.js: dispHeader: hiding header (not draft)");
		}
	    }
	    else {
		Sendlater3Util.debug("headerView.js: dispHeader: showheader is false");
	    }
	    document.getElementById(Sendlater3Util.HeaderRowId("x-send-later-at")).hidden = hidden;
	    Sendlater3Util.Leaving("Sendlater3HeaderView.sendlater3_HeaderDisplay.dispHeader");
	},
	noop: function() { }

    }

    function sendlater3_HeaderView_SetupListener() {
	var listener = {};
	listener.onStartHeaders	= sendlater3_HeaderDisplay.noop;
	listener.onEndHeaders	= sendlater3_HeaderDisplay.dispHeader;
	gMessageListeners.push(listener);
	window.document.getElementById('folderTree')
	    .addEventListener("select",addSENDLATER3ColumnHandler,false);
    }

    window.addEventListener("load",sendlater3_HeaderView_SetupListener,false);
    window.addEventListener("unload", Sendlater3Util.uninitUtil, false);

}

Sendlater3Util.initUtil();
Sendlater3HeaderView.apply();
