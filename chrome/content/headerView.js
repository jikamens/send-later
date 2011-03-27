var Sendlater3HeaderView = function() {

    var sendlater3columnHandler = {
	getCellText: function(row, col) {
	    SL3U.Entering("Sendlater3HeaderView.sendlater3columnHandler.getCellText", row, col);
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
		    val += " (" + SL3U.PromptBundleGet(settings[0]) + ")";
		}
		SL3U.Returning("Sendlater3HeaderView.sendlater3columnHandler.getCellText", val);
		return val;
	    }
	    else {
		SL3U.Returning("Sendlater3HeaderView.sendlater3columnHandler.getCellText", null);
		return null;
	    }
	},

	getSortStringForRow: function(hdr) {
	    SL3U.Entering("Sendlater3HeaderView.sendlater3columnHandler.getSortStringForRow", hdr);
	    return null;
	},
	
	isString:            function() {return false;},
	getCellProperties:   function(row, col, props){},
	getImageSrc:         function(row, col) {return null;},
	getRowProperties:    function(row,props){},
	getColumnProperties: function(colid,col,props){},
	getSortLongForRow:   function(hdr) {
	    SL3U.Entering("Sendlater3HeaderView.sendlater3columnHandler.getSortLongForRow", hdr);
	    if (hdr.getStringProperty("x-send-later-at")) {
		var hdrdate =
		    new Date(hdr.getStringProperty("x-send-later-at"));
		SL3U.Returning("Sendlater3HeaderView.sendlater3columnHandler.getSortLongForRow", hdrdate.valueOf());
		return hdrdate.valueOf();
	    }
	    else {
		SL3U.Returning("Sendlater3HeaderView.sendlater3columnHandler.getSortLongForRow", 0);
		return 0;
	    }
	}
    }

    function IsThisDraft(msgFolder) {
	SL3U.Entering("Sendlater3HeaderView.IsThisDraft", msgFolder);
	if (msgFolder == null) {
	    SL3U.Returning("Sendlater3HeaderView.IsThisDraft",
			   "false (msgFolder == null)");
	    return false;
	}

	var accountManager = Components
	    .classes["@mozilla.org/messenger/account-manager;1"]
	    .getService(Components.interfaces.nsIMsgAccountManager);
	
	var fdrlocal = accountManager.localFoldersServer.rootFolder;
	if (SL3U.FindSubFolder(fdrlocal, "Drafts").URI == msgFolder.URI) {
	    return true;
	}
	if (SL3U.PrefService.getCharPref('mail.identity.default.draft_folder')
	    == msgFolder.URI) {
	    SL3U.Returning("Sendlater3HeaderView.IsThisDraft","true (default)");
	    return true;	
	}

	var identities = accountManager
	    .GetIdentitiesForServer(msgFolder.server);
	
	for (idindex = 0;idindex < identities.Count(); idindex++) {
	    if (identities.GetElementAt(idindex)
		.QueryInterface(Components.interfaces.nsIMsgIdentity)
		.draftFolder==msgFolder.URI) {
		SL3U.Returning("Sendlater3HeaderView.IsThisDraft",
			       "true (identity)");
		return true;
	    }
	}

	SL3U.Returning("Sendlater3HeaderView.IsThisDraft", "false (not found)");
	return false;
    }

    function addSENDLATER3ColumnHandler() {
	SL3U.Entering("Sendlater3HeaderView.addSENDLATER3ColumnHandler");
	var folder;
	try {
	    folder = gDBView.viewFolder;
	}
	catch (ex) {
	    // TB2 bug
	    SL3U.warn("addSENDLATER3ColumnHandler: gDBView problem");
	    return;
	}
	if ( IsThisDraft(folder) ) {
	    if (SL3U.getBoolPref("showcolumn")) {
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
	SL3U.Leaving("Sendlater3HeaderView.addSENDLATER3ColumnHandler");
    }

    var sendlater3_HeaderDisplay = {
	dispHeader: function () {
	    SL3U.Entering("Sendlater3HeaderView.sendlater3_HeaderDisplay.dispHeader");
	    var hidden = true;
	    if (SL3U.getBoolPref("showheader")) {
		SL3U.debug("headerView.js: dispHeader: showheader is true");
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
			    SL3U.debug("headerView.js: dispHeader: showing header");
			}	
			else {
			    SL3U.debug("headerView.js: dispHeader: hiding header (empty)");
			}
		    }
		    else {
			SL3U.debug("headerView.js: dispHeader: hiding header (null msghdr)");
		    }
		}
		else {
		    SL3U.debug("headerView.js: dispHeader: hiding header (not draft)");
		}
	    }
	    else {
		SL3U.debug("headerView.js: dispHeader: showheader is false");
	    }
	    document.getElementById(SL3U.HeaderRowId("x-send-later-at")).hidden = hidden;
	    SL3U.Leaving("Sendlater3HeaderView.sendlater3_HeaderDisplay.dispHeader");
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
    window.addEventListener("unload", SL3U.uninitUtil, false);

}

SL3U.initUtil();
Sendlater3HeaderView.apply();
