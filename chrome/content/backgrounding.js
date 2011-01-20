var Sendlater3Backgrounding = function() {
    Sendlater3Util.Entering("Sendlater3Backgrounding");

    var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"]
	.createInstance();
    msgWindow = msgWindow.QueryInterface(Components.interfaces.nsIMsgWindow);

    // If you add a message to the Outbox and call nsIMsgSendLater when it's
    // already in the middle of sending unsent messages, then it's possible
    // that the message you just added won't get sent. Therefore, when we add a
    // new message to the Outbox, we need to be aware of whether we're already
    // in the middle of sending unsent messages, and if so, then trigger
    // another send after it's finished.
    var sendingUnsentMessages = false;
    var needToSendUnsentMessages = false;
    var sendUnsentMessagesListener = {
	onStartSending: function(aTotalMessageCount) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.sendUnsentMessagesListener.onStartSending");
	    sendingUnsentMessages = true;
	    needToSendUnsentMessages = false;
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.sendUnsentMessagesListener.onStartSending");
	},
	onMessageStartSending: function(aCurrentMessage, aTotalMessageCount,
					aMessageHeader, aIdentity) {},
	onProgress: function(aCurrentMessage, aTotalMessage) {},
	onMessageSendError: function(aCurrentMessage, aMessageHeader, aSstatus,
				     aMsg) {},
	onMessageSendProgress: function(aCurrentMessage, aTotalMessageCount,
					aMessageSendPercent,
					aMessageCopyPercent) {},
	onStatus: function(aMsg) {},
	onStopSending: function(aStatus, aMsg, aTotalTried, aSuccessful) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.sendUnsentMessagesListener.onStopSending");
	    sendingUnsentMessages = false;
	    if (needToSendUnsentMessages) {
		try {
		    if (Sendlater3Util.IsThunderbird2()) {
			messenger.sendUnsentMessages(null, msgWindow);
		    }
		    else {
			var msgSendLater = Components
			    .classes["@mozilla.org/messengercompose/sendlater;1"]
			    .getService(Components.interfaces.nsIMsgSendLater);
			msgSendLater.sendUnsentMessages(null);
		    }
		}
		catch (ex) {
		    alert(Sendlater3Util.PromptBundleGet("SendingUnsentError"));
		}
	    }
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.sendUnsentMessagesListener.onStopSending");
	}
    }
    function queueSendUnsentMessages() {
	Sendlater3Util.Entering("Sendlater3Backgrounding.queueSendUnsentMessages");
	try {
	    if (sendingUnsentMessages) {
		Sendlater3Util.debug("Deferring sendUnsentMessages");
		needToSendUnsentMessages = true;
	    }
	    else if (Sendlater3Util.IsThunderbird2()) {
		messenger.sendUnsentMessages(null, msgWindow);
	    }
	    else {
		var msgSendLater = Components
		    .classes["@mozilla.org/messengercompose/sendlater;1"]
		    .getService(Components.interfaces.nsIMsgSendLater);
		msgSendLater.sendUnsentMessages(null);
	    }
	}
	catch (ex) {
	    alert(Sendlater3Util.PromptBundleGet("SendingUnsentError"));
	}
	Sendlater3Util.Leaving("Sendlater3Backgrounding.queueSendUnsentMessages");
    }
    function addMsgSendLaterListener() {
	Sendlater3Util.Entering("Sendlater3Backgrounding.addMsgSendLaterListener");
	var msgSendLater = Components
	    .classes["@mozilla.org/messengercompose/sendlater;1"]
	    .getService(Components.interfaces.nsIMsgSendLater);
	if (Sendlater3Util.IsThunderbird2()) {
	    msgSendLater.AddListener(sendUnsentMessagesListener);
	}
	else {
	    msgSendLater.addListener(sendUnsentMessagesListener);
	}
	Sendlater3Util.Leaving("Sendlater3Backgrounding.addMsgSendLaterListener");
    }
    function removeMsgSendLaterListener() {
	Sendlater3Util.Entering("Sendlater3Backgrounding.removeMsgSendLaterListener");
	var msgSendLater = Components
	    .classes["@mozilla.org/messengercompose/sendlater;1"]
	    .getService(Components.interfaces.nsIMsgSendLater);
	if (Sendlater3Util.IsThunderbird2()) {
	    msgSendLater.RemoveListener(sendUnsentMessagesListener);
	}
	else {
	    msgSendLater.removeListener(sendUnsentMessagesListener);
	}
	Sendlater3Util.Leaving("Sendlater3Backgrounding.removeMsgSendLaterListener");
    }

    // I had to change the type of one of my preferences from int to char to be
    // able to add some new functionality. I couldn't find a way to change the
    // type of a preference for people who had the old version of the add-on
    // with the old preference installed. When I just changed its type from int
    // to string in the <preference ...> element in my XUL file and in my
    // references to it in my code, that didn't work -- I got errors trying to
    // use the preference. So the best idea I could come up with for solving
    // this problem is to replace the preference with a new one, migrate over
    // any old values, and delete the old one. I don't know if there's a better
    // way to do this.
    function MigrateQuickOptionValue(num) {
	var oldp = "extensions.sendlater3.quickoptions." + num + ".value";
	var newp = oldp + "string";
	
	var v;
	try {
	    v = Sendlater3Util.PrefService.getIntPref(oldp);
	}
	catch (e) {}

	if (v != null) {
	    Sendlater3Util.PrefService.setCharPref(newp, v);
	    Sendlater3Util.PrefService.deleteBranch(oldp);
	}
    }
    var i;
    for (i = 1; i <= 3; i++) {
	MigrateQuickOptionValue(i);
    }

    // If there are multiple open Thunderbird windows, then each of them is
    // going to load this overlay, which will wreak havoc when multiple windows
    // try to run our background proceses at the same time. To avoid this
    // problem, we assign each instance of this overlay a unique ID, and we
    // store the ID of the currently active instance in the user's preferences,
    // along with the time when the active instance last started a background
    // pass. Every entry point function (e.g., event handlers, etc.)  checks to
    // see if its unique ID is the one in the preferences. If so, then it
    // processed as normal -- it has the conch. Otherwise, if it's the main
    // callback function (CheckForSendLaterCallback) AND the last active
    // timestamp is >2x the current check interval, then it resets the active
    // instance to its own UUID and proceeds, thus taking over for the other
    // instance that has apparently given up the ghost.
    var uuid;
    var pref_prefix = "extensions.sendlater3.activescanner.";
    function checkUuid(capturable) {
	if (! uuid) {
	    var uuidGenerator = 
		Components.classes["@mozilla.org/uuid-generator;1"]
		.getService(Components.interfaces.nsIUUIDGenerator);
	    uuid = uuidGenerator.generateUUID().toString();
	}
	var current_time = Math.round((new Date()).getTime() / 1000);
	var active_uuid = Sendlater3Util.PrefService
	    .getCharPref(pref_prefix + "uuid");
	var active_time = Sendlater3Util.PrefService
	    .getIntPref(pref_prefix + "time");
	var timeout = Math.round(checkTimeout() / 1000);
	var func = "Sendlater3Backgrounding.checkUuid: ";
	var dbgMsg =
	    "uuid="         + uuid         + ", " +
	    "current_time=" + current_time + ", " +
	    "active_uuid="  + active_uuid  + ", " +
	    "active_time="  + active_time  + ", " +
	    "timeout="      + timeout;
	if (active_uuid && active_uuid != "" && active_uuid != uuid) {
	    if (current_time - active_time > 2 * timeout) {
		if (capturable) {
		    Sendlater3Util.debug(func + "capturing: " + dbgMsg);
		    Sendlater3Util.PrefService.setCharPref(pref_prefix + "uuid",
							   uuid);
		}
		else {
		    Sendlater3Util.debug(func + "can't capture: " + dbgMsg);
		    return false;
		}
	    }
	    else {
		Sendlater3Util.debug(func + "non-active window: " + dbgMsg);
		return false;
	    }
	}
	else if (active_uuid && active_uuid != "") {
	    Sendlater3Util.debug(func + "active window: " + dbgMsg);
	}
	else {
	    Sendlater3Util.debug(func + "first window: " + dbgMsg);
	    Sendlater3Util.PrefService.setCharPref(pref_prefix + "uuid", uuid);
	}
	Sendlater3Util.PrefService.setIntPref(pref_prefix + "time",
					      current_time);
	return true;
    }

    function clearActiveUuidCallback() {
	if (! uuid) return;
	var active_uuid = Sendlater3Util.PrefService
	    .getCharPref(pref_prefix + "uuid");
	if (active_uuid != uuid) return;
	var func = "Sendlater3Backgrounding.clearActiveUuidCallback: ";
	Sendlater3Util.debug(func + "clearing: uuid=" + uuid);
	Sendlater3Util.PrefService.setCharPref(pref_prefix + "uuid", "");
    }

    //mailnews.customDBHeaders 
    var installedCustomHeaders = Sendlater3Util.PrefService
        .getCharPref('mailnews.customDBHeaders');
    if (installedCustomHeaders.indexOf("x-send-later-at")<0) {
	Sendlater3Util.dump("Installing Custom X-Send-Later-At Header\n");
	Sendlater3Util.PrefService.setCharPref('mailnews.customDBHeaders',
					       installedCustomHeaders +
					       " x-send-later-at");
    }
    if (installedCustomHeaders.indexOf("x-send-later-uuid")<0) {
	Sendlater3Util.dump("Installing Custom X-Send-Later-Uuid Header\n");
	Sendlater3Util.PrefService.setCharPref('mailnews.customDBHeaders',
					       installedCustomHeaders +
					       " x-send-later-uuid");
    }
    if (installedCustomHeaders.indexOf("x-send-later-recur")<0) {
	Sendlater3Util.dump("Installing Custom X-Send-Later-Recur Header\n");
	Sendlater3Util.PrefService.setCharPref('mailnews.customDBHeaders',
					       installedCustomHeaders +
					       " x-send-later-recur");
    }

    function checkTimeout() {
	var timeout = Sendlater3Util.PrefService
	    .getIntPref("extensions.sendlater3.checktimepref");
	if (timeout < 5000) timeout = 60000;
	return timeout;
    }

    function displayprogressbar() {
	return Sendlater3Util.PrefService
	    .getBoolPref("extensions.sendlater3.showprogress");
    }

    var DisplayMessages = new Array();

    var DisplayReportTimer;
    var DisplayReportCallback = {
	notify: function(timer) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.DisplayReportCallback.notify");
	    if (DisplayMessages.length>0) {
		var msg = DisplayMessages.shift();
		document.getElementById("sendlater_status").value = msg;
	    }
	    else {
		timer.cancel();
	    }
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.DisplayReportCallback.notify");
	}
    }

    function StatusReportMsg(msg) {
	Sendlater3Util.Entering("Sendlater3Backgrounding.StatusReportMsg");
	if (!DisplayMessages.length) {
	    DisplayReportTimer = Components.classes["@mozilla.org/timer;1"]
		.createInstance(Components.interfaces.nsITimer);
	    DisplayReportTimer.initWithCallback(
		DisplayReportCallback,
		300,
		Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
	    );
	}
	DisplayMessages.push(msg);   
	Sendlater3Util.Leaving("Sendlater3Backgrounding.StatusReportMsg");
    }

    var MessagesPending=0;
    var ProgressValue;
    var ProgressMax;

    function ProgressSet(str) {
	var n = document.getElementById("sendlater_anim");
	n.max = ProgressMax;
	n.value = ProgressValue;
	Sendlater3Util.debug(str+": value="+n.value+", max="+n.max);
    }

    function ProgressClear() {
	ProgressValue = 0;
	ProgressMax = 0;
	ProgressSet("ProgressClear");
    }

    function ProgressAdd() {
	ProgressMax++;
	ProgressSet("ProgressAdd");
    }

    function ProgressFinish() {
	ProgressValue++;
	ProgressSet("ProgressFinish");
    }

    function CopyUnsentListener(content, hdr, sendat, recur) {
	this._content = content;
	this._hdr = hdr;
	this._sendat = sendat;
	this._recur = recur;
    }

    CopyUnsentListener.prototype = {
	QueryInterface : function(iid) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.CopyUnsentListener.QueryInterface");
	    if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
		iid.equals(Components.interfaces.nsISupports)) {
		Sendlater3Util.Returning("Sendlater3Backgrounding.copyServiceListener.QueryInterface",
					 this);
		return this;
	    }
	    Sendlater3Util.Throwing("Sendlater3Backgrounding.CopyUnsentListener.QueryInterface",
				    Components.results.NS_NOINTERFACE);
	    throw Components.results.NS_NOINTERFACE;
	},

	OnProgress: function (progress, progressMax) {
	},

	OnStartCopy: function () {
	},

	OnStopCopy: function ( status ) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.CopyUnsentListener.OnStopCopy");
	    var copying = this.localFile;
	    if (copying.exists()) {
		try {
		    copying.remove(true);
		}
		catch (ex) {
		    // Windows still has it open.
		    Sendlater3Util.dump("Failed to delete " + copying.path +
					"; queuing.");
		    Sendlater3Util.WaitAndDelete(copying);
		}
	    }
	    if (! Components.isSuccessCode(status)) {
		Sendlater3Backgrounding.BackgroundTimer.cancel();
		Sendlater3Backgrounding.BackgroundTimer = undefined;
		alert(Sendlater3Util.PromptBundleGetFormatted("CopyUnsentError",
							      [status]));
		Sendlater3Util.Returning("Sendlater3Backgrounding.CopyUnsentListener.OnStopCopy", "");
		return;
	    }
	    var messageHDR = this._hdr;
	    var sendat = this._sendat;
	    var recur = this._recur;
	    var folder = messageHDR.folder;
	    var dellist;
	    if (Sendlater3Util.IsThunderbird2() ||
		Sendlater3Util.IsPostbox()) {
		dellist = Components.classes["@mozilla.org/supports-array;1"]
		    .createInstance(Components.interfaces.nsISupportsArray);
		dellist.AppendElement(messageHDR);
	    }
	    else {
		dellist = Components.classes["@mozilla.org/array;1"]
		    .createInstance(Components.interfaces.nsIMutableArray);
		dellist.appendElement(messageHDR, false);
	    }
	    messageHDR.folder.deleteMessages(dellist, msgWindow, true, false,
					     null, false);
	    if (Sendlater3Util.PrefService.getBoolPref("extensions.sendlater3.sendunsentmessages")) {
		queueSendUnsentMessages();
		Sendlater3Util.dump ("Sending Message.");
	    }
	    else {
		Sendlater3Util.dump("Message deposited in Outbox.");
	    }
	    SetAnimTimer(3000);
	    if (recur) {
		var settings = recur.split(" ");
		var next = new Date(sendat);
		var now = new Date();
		while (next < now) {
		    switch (settings[0]) {
		    case "daily":
			next.setDate(next.getDate()+1);
			break;
		    case "weekly":
			next.setDate(next.getDate()+7);
			break;
		    case "monthly":
			if (next.getDate() == settings[1]) {
			    next.setMonth(next.getMonth()+1);
			}
			else {
			    // Wrapped around end of previous month
			    next.setDate(settings[1]);
			}
			break;
		    case "yearly":
			next.setFullYear(next.getFullYear()+1);
			next.setMonth(settings[1]);
			next.setDate(settings[2]);
			break;
		    default:
			throw "Send Later 3 internal error: unrecognized recurrence type: " + settings[0];
			break;
		    }
		}
		var content = this._content;
		content = content.replace(/\r\n\r\n/, "\r\nX-Send-Later-At: " +
					  Sendlater3Util.FormatDateTime(next,
									true) +
					  "\r\n" + "X-Send-Later-Uuid: " +
					  Sendlater3Util.getInstanceUuid() +
					  "\r\n" + "X-Send-Later-Recur: " +
					  recur + "\r\n\r\n");
		var listener = new CopyRecurListener(folder);
		Sendlater3Util.CopyStringMessageToFolder(content, folder,
							 listener);
	    }
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.CopyUnsentListener.OnStopCopy");
	},

	SetMessageKey: function (key ) {}
    };

    function CopyRecurListener(folder) {
	this._folder = folder;
    }

    CopyRecurListener.prototype = {
	QueryInterface : function(iid) {
	    if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
		iid.equals(Components.interfaces.nsISupports)) {
		return this;
	    }
	    throw Components.results.NS_NOINTERFACE;
	},

	OnProgress: function (progress, progressMax) {},

	OnStartCopy: function () {},

	OnStopCopy: function ( status ) {
	    var copying = this.localFile;
	    if (copying.exists()) {
		try {
		    copying.remove(true);
		}
		catch (ex) {
		    // Windows still has it open.
		    Sendlater3Util.dump("Failed to delete " + copying.path +
					"; queuing.");
		    Sendlater3Util.WaitAndDelete(copying);
		}
	    }

	    var listener = new Sendlater3Backgrounding
		.markReadListener(this._folder, this._key);
	    var notificationService = Components
		.classes["@mozilla.org/messenger/msgnotificationservice;1"]
		.getService(Components.interfaces
			    .nsIMsgFolderNotificationService);
	    if (UndigestifyKamensUs.IsThunderbird2() ||
		UndigestifyKamensUs.IsPostbox()) {
		notificationService.addListener(listener);
	    }
	    else {
		notificationService.addListener(listener, 
						notificationService.msgAdded);
	    }
	    if (! Components.isSuccessCode(status)) {
		Sendlater3Backgrounding.BackgroundTimer.cancel();
		Sendlater3Backgrounding.BackgroundTimer = undefined;
		alert(Sendlater3Util.PromptBundleGetFormatted("CopyRecurError",
							      [status]));
		return;
	    }
	},

	SetMessageKey: function (key) {
	    this._key = key;
	}
    };

    var AnimTimer = null;
    var AnimCallback = {
	notify: function(timer) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.AnimCallback.notify");
	    Sendlater3Util.debug("STATUS MESSAGE - " + MessagesPending);
	    if (document != null) {
		document.getElementById("sendlater_deck").selectedIndex = 1;
		var strbundle =
		    document.getElementById("sendlater3backgroundstrings");
		var status;

		if (MessagesPending > 0) {
		    status = strbundle.getString("PendingMessage") + " " +
			MessagesPending;
		}
		else if (Sendlater3Backgrounding.BackgroundTimer) {
		    status = strbundle.getString("IdleMessage");
		}
		else {
		    status = strbundle.getString("DisabledMessage");
		}

		StatusReportMsg("SENDLATER3 [" + status + "]");
	    }
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.AnimCallback.notify");
	}
    }
    function SetAnimTimer(timeout) {
	Sendlater3Util.Entering("Sendlater3Backgrounding.SetAnimTimer");
	if (AnimTimer != null) {
	    AnimTimer.cancel();
	}
	AnimTimer = Components.classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	AnimTimer.initWithCallback(
	    AnimCallback,
	    timeout,
	    Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
	Sendlater3Util.Leaving("Sendlater3Backgrounding.SetAnimTimer");
    }

    function CheckDraftUuid(header, content) {
	var matches = content.match(/^X-Send-Later-Uuid:\s*(.*)/mi);
	if (matches) {
	    var draft_uuid = matches[1];
	    var instance_uuid = Sendlater3Util.getInstanceUuid();
	    if (draft_uuid != instance_uuid) {
		Sendlater3Util.debug("Skipping message with date " + header +
				     " on uuid mismatch (draft " + draft_uuid +
				     " vs. instance " + instance_uuid + ")");
		return false;
	    }
	    else {
		Sendlater3Util.debug("Draft uuid match: " +
				     draft_uuid);
		return true;
	    }
	}
	else {
	    Sendlater3Util.debug("No draft uuid");
	    return true;
	}
    }

    // Can we assume that a read from a hung server will eventually time out
    // and cause onStopRequest to be called with an error status code, or are
    // we introducing a memory leak here by creating asynchronous listeners
    // that are going to hang around forever? That is, do we have to explicitly
    // set up timeouts to destroy the listeners that take too long to read? I'm
    // going to assume for now that we don't have to do that.

    var cycle = 0;

    function UriStreamListener(messageHDR) {
	Sendlater3Util.Entering("Sendlater3Backgrounding.UriStreamListener",
			       messageHDR);
    	this._content = "";
	this._cycle = cycle;
	this._messageHDR = messageHDR;
	this._header = null;
	this._recur = null;
	Sendlater3Util.Leaving("Sendlater3Backgrounding.UriStreamListener");
    }

    UriStreamListener.prototype = {
	QueryInterface: function(iid) {
	    // Sort of cheating, but we know this is going to be used safely.
	    if (iid.equals(Components.interfaces.nsIStreamListener) ||
		iid.equals(Components.interfaces.nsISupports)) {
		return this;
	    }
	    return null;
	},
	onStartRequest: function(aReq, aContext) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.UriStreamListener.onStartRequest");
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.UriStreamListener.onStartRequest");
	},
	onStopRequest: function(aReq, aContext, aStatusCode) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.UriStreamListener.onStopRequest");
	    if (! checkUuid(false) || cycle != this._cycle || 
		this._content == "") {
		return;
	    }
	    var content = this._content;
	    var messageHDR = this._messageHDR;
	    this._messageHDR = null;
	    this._content = null;

	    // We check if we've reached the end of the header below, in
	    // onDataAvailable, as each block of data is read. Therefore, if we
	    // get to this point, it's because we never hit the end of the
	    // header, which means that the message consists only of a header.
	    if (this._header == null) {
		var matches = content.match(/^X-Send-Later-At:\s*(.*)$/mi);
		if (matches) {
		    this._header = matches[1];
		    if (! CheckDraftUuid(this._header, content)) {
			this._header = null;
		    }
		}
		var recur = content.match(/^X-Send-Later-Recur:\s*(.*)/mi);
		if (recur) {
		    this._recur = recur[1];
		}
	    }

	    Sendlater3Util.debug("SendLaterPresent = " + this._header);
	    if (this._header) {
		Sendlater3Util.dump ("Found Pending Message.");
		var sendattime = new Date (this._header);
		var now = new Date();
		if (now > sendattime &&
		    (Sendlater3Util.PrefService
		     .getBoolPref("extensions.sendlater3.senddrafts"))) {
		    // Simplify search & replace in header by putting a
		    // blank line at the beginning of the message, so that
		    // we can match header lines starting with \n, i.e., we
		    // can assume that there's always a newline immediately
		    // before any header line. This prevents false
		    // negatives when the header line we're looking for
		    // happens to be the first header line in the
		    // message. We'll remove the extra newline when we're
		    // done mucking with the headers.
		    content = "\n" + content;

		    content = content
			.replace(/(\nDate:).*\n/i,"$1 " +
				 Sendlater3Util.FormatDateTime(new Date(),
							       true)+"\n");
		    content = content.replace(/\nX-Send-Later-At:.*\n/i,
					      "\n");
		    content = content.replace(/\nX-Send-Later-Uuid:.*\n/i,
					      "\n");
		    content = content.replace(/\nX-Send-Later-Recur:.*\n/i,
					      "\n");

		    // Remove extra newline -- see comment above.
		    content = content.slice(1);

		    // There is a bug in Thunderbird (3.1, at least) where when
		    // a message is being sent from the user's Outbox and then
		    // a copy is being uploaded into an IMAP server's Sent
		    // Items folder, Thunderbird doesn't convert bare \n to
		    // \r\n before trying to upload the message copy.  This is
		    // a violation of the IMAP spec, and some IMAP servers,
		    // e.g., Cyrus IMAPd, reject the message because of the
		    // bare newlines.  So we have to make sure that the message
		    // has only \r\n line terminators in it before we put it
		    // into the Outbox.  It might *already* have \r\n line
		    // terminators in it, so first we replace \r\n with \n, and
		    // then we replace \n with \r\n.  The reason why we prepend
		    // a "From - <date>" line to the message before doing this
		    // is because if we don't, then CopyFileMessage will
		    // prepend a couple of useless X-Mozilla-* headers to the
		    // top of the message, and the headers it adds will end
		    // with bare \n's on them, so we're back to the original
		    // problem.
		    if (content.slice(0,5) != "From ") {
			content = "From - " + Date().toString() + "\n"
			    + content;
		    }
		    content = content.replace(/\n/g,"\r\n");

		    var msgSendLater = Components
			.classes["@mozilla.org/messengercompose/sendlater;1"]
			.getService(Components.interfaces.nsIMsgSendLater);
		    var fdrunsent = msgSendLater.getUnsentMessagesFolder(null);
		    var listener = new CopyUnsentListener(content, messageHDR,
							  this._header,
							  this._recur)
		    Sendlater3Util.CopyStringMessageToFolder(content, fdrunsent,
							     listener);
		}
		else {
		    MessagesPending++;
		    Sendlater3Util.dump(MessagesPending +
					" messages still pending");
		}
	    }
	    ProgressFinish();
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.UriStreamListener.onStopRequest");
	},
	onDataAvailable: function(aReq, aContext, aInputStream, aOffset,
				  aCount) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.UriStreamListener.onDataAvailable");
	    var uuidOk = checkUuid(false);
	    var cycleOk = cycle == this._cycle;
	    if (! (uuidOk && cycleOk)) {
		this._content = "";
		aInputStream.close();
		Sendlater3Util.Returning("Sendlater3Backgrounding.UriStreamListener.onDataAvailable",
					 uuidOk ? "obsolete cycle" : "inactive window");
		return;
	    }
	    var stream = Components
		.classes["@mozilla.org/scriptableinputstream;1"]
		.createInstance()
		.QueryInterface(Components.interfaces
				.nsIScriptableInputStream);
	    stream.init(aInputStream);
	    var data = stream.read(aCount);
	    data = data.replace(/\r\n/g, "\n");
	    if (this._content.length && this._content.slice(-1) == "\r"
		&& data.slice(0, 1) == "\n") {
		this._content = this._content.slice(0, this._content.length -1);
	    }
	    this._content += data;

	    if (this._header) { // only the first time we reach the end
                                // of the header
		var eoh = this._content.search(/\n\n/);
		if (eoh > -1) {
		    var header = this._content.slice(0, eoh);

		    var matches = header.match(/^X-Send-Later-At:\s*(.*)/mi);
		    if (! matches) {
			Sendlater3Util.debug("SendLaterPresent = null");
			this._content = "";
			aInputStream.close();
			Sendlater3Util.Returning("Sendlater3Backgrounding.UriStreamListener.onDataAvailable", "no header");
			ProgressFinish();
			return;
		    }
		    this._header = matches[1];
		    if (! CheckDraftUuid(this._header, header)) {
			this._content = "";
			aInputStream.close();
			Sendlater3Util.Returning("Sendlater3Backgrounding.UriStreamListener.onDataAvailable", "uuid mismatch");
			ProgressFinish();
			return;
		    }
		    var recur = header.match(/^X-Send-Later-Recur:\s*(.*)/mi);
		    if (recur) {
			this._recur = recur[1];
		    }
		}
	    }

	    Sendlater3Util.Leaving("Sendlater3Backgrounding.UriStreamListener.onDataAvailable");
	}
    };

    var CheckThisURIQueue = new Array();
    var CheckThisURITimer;

    var CheckThisURICallback = {
	notify: function (timer) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.CheckThisUriCallback.notify");
	    if (CheckThisURIQueue.length == 0) {
		timer.cancel();
		Sendlater3Util.Returning("Sendlater3Backgrounding.CheckThisUriCallback.notify", "");
		return;
	    }

	    if (! checkUuid(false)) {
		CheckThisURIQueue = new Array();
		Sendlater3Util.Returning("Sendlater3Backgrounding.CheckThisUriCallback.notify", "");
		return;
	    }

	    var messageURI = CheckThisURIQueue.shift();
	    Sendlater3Util.debug("Checking message : " + messageURI + "\n");

	    var MsgService = messenger.messageServiceFromURI(messageURI);
	    var messageHDR = messenger.msgHdrFromURI(messageURI);
	    MsgService.streamMessage(messageURI,
				     new UriStreamListener(messageHDR),
				     msgWindow, null, false, null);
	    SetAnimTimer(3000);
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.CheckThisUriCallback.notify");
	}
    }

    // We use a queue of URIs to be checked, and only allow one URI to be
    // checked each time the timer fires, so that we don't block for a
    // long time checking drafts and cause the UI to hang or respond
    // sluggishly.
    function CheckThisURIQueueAdd(messageURI) {
	Sendlater3Util.Entering("Sendlater3Backgrounding.CheckThisURIQueueAdd", messageURI);
	if (CheckThisURIQueue.length == 0) {
	    CheckThisURITimer = Components.classes["@mozilla.org/timer;1"]
		.createInstance(Components.interfaces.nsITimer);
	    CheckThisURITimer.initWithCallback(
		CheckThisURICallback,
		100,
		Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
	    );
	}
	CheckThisURIQueue.push(messageURI);
	ProgressAdd();
	Sendlater3Util.Leaving("Sendlater3Backgrounding.CheckThisURIQueueAdd");
    }

    // folderstocheck is a list of folders waiting to be checked in this
    // cycle. foldersdone is a list of folders we've already checked in this
    // cycle. folderstocheck grows when we scan all the draft folders in
    // CheckForSendLaterCallback. folderstocheck shrinks and foldersdone grows
    // when we process a folder in the folderLoadListener. We need to keep
    // track of both folderstocheck and folderstodone because we call
    // updateFolder in CheckForSendLaterCallback as we add folders to
    // folderstocheck, and updateFolder sometimes calls the folderLoadListener
    // synchronously, so if we just kept track of folderstocheck and multiple
    // accounts were pointing at the same Drafts folder, then we could end up
    // processing that Drafts folder multiple times and miscounting pending
    // messages.
    var folderstocheck = new Array();
    var foldersdone = new Array();

    var folderLoadListener = {
	OnItemEvent: function(folder, event) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.folderLoadListener.OnItemEvent");

	    if (! checkUuid(false)) {
		Sendlater3Util.Returning("Sendlater3Backgrounding.folderLoadListener.OnItemEvent", "");
		return;
	    }

	    var eventType = event.toString();

	    if (eventType == "FolderLoaded" && folder) {
		// I don't know why there are endFolderLoading and
		// startFolderLoading calls scattered throughout this
		// file. In my simple tests, they don't seem to be
		// necessary, so I'm disabling them in the spirit of
		// optimizing performance by making plugins do as little as
		// possible.
		// if (Sendlater3Util.IsThunderbird2() || Sendlater3Util.IsPostbox()) {
		//     folder.endFolderLoading();
		// }
		Sendlater3Util.debug("FOLDER LOADED - " + folder.URI);
		var where = folderstocheck.indexOf(folder.URI);
		if (where >= 0) {
		    SetAnimTimer(3000);

		    Sendlater3Util.dump("FOLDER MONITORED - "+folder.URI+"\n");
		    folderstocheck.splice(where, 1);
		    foldersdone.push(folder.URI);
		    ProgressFinish();
		    var thisfolder = folder
			.QueryInterface(Components.interfaces.nsIMsgFolder);
		    var messageenumerator;
		    if (Sendlater3Util.IsThunderbird2() ||
			Sendlater3Util.IsPostbox()) {
			messageenumerator = thisfolder.getMessages(msgWindow);
		    }
		    else {
			messageenumerator = thisfolder.messages;
		    }
		    if ( messageenumerator ) {
			Sendlater3Util.dump ("Got Enumerator\n");
			while ( messageenumerator.hasMoreElements() ) {
			    Sendlater3Util.dump("hasMoreElements=true\n");
			    var messageDBHDR = messageenumerator.getNext()
				.QueryInterface(Components.interfaces
						.nsIMsgDBHdr);
			    var flags;
			    if (Sendlater3Util.IsThunderbird2() ||
				Sendlater3Util.IsPostbox()) {
				flags = 2097152 | 8; // Better way to do this?
			    }
			    else {
				var f = Components.interfaces.nsMsgMessageFlags;
				flags = f.IMAPDeleted | f.Expunged;
			    }
			    if (! (messageDBHDR.flags & flags)) {
				var messageURI = thisfolder
				    .getUriForMsg(messageDBHDR);
				CheckThisURIQueueAdd(messageURI);
			    }
			}
		    }
		    else {
			Sendlater3Util.dump("No Enumerator\n");
		    }
		}
	    } 
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.folderLoadListener.OnItemEvent");
	}
    };


    var CheckForSendLaterCallback = {
	notify: function (timer) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.CheckForSendLaterCallback.notify");

	    Sendlater3Backgrounding.BackgroundTimer.initWithCallback(
		CheckForSendLaterCallback,
		checkTimeout() + Math.ceil(Math.random()*3000)-1500,
		Components.interfaces.nsITimer.TYPE_ONE_SHOT
	    );

	    if (! checkUuid(true)) {
		Sendlater3Util.Returning("Sendlater3Backgrounding.CheckForSendLaterCallback.notify", "");
		return;
	    }

	    Sendlater3Util.debug("One cycle of checking");

	    MessagesPending = 0;
	    ProgressClear();

	    cycle++;

	    var accountManager = Components
		.classes["@mozilla.org/messenger/account-manager;1"]
		.getService(Components.interfaces.nsIMsgAccountManager);
	    var fdrlocal = accountManager.localFoldersServer.rootFolder;

	    folderstocheck = new Array();
	    foldersdone = new Array();
	    folderstocheck.push(
		Sendlater3Util.FindSubFolder(fdrlocal, "Drafts").URI
	    );
	    Sendlater3Util.dump("SCHEDULE - " + folderstocheck[0]);
	    // Local Drafts folder might have different name, e.g., in other
	    // locales.
	    var local_draft_pref = Sendlater3Util.PrefService
		.getComplexValue('mail.identity.default.draft_folder',
				 Components.interfaces.nsISupportsString).data;
	    Sendlater3Util.debug("mail.identity.default.draft_folder=" +
				 local_draft_pref);
	    if (local_draft_pref != null &&
		local_draft_pref != folderstocheck[0]) {
		Sendlater3Util.debug("SCHEDULE - " + local_draft_pref);
		folderstocheck.push(local_draft_pref);
		ProgressAdd();
	    }
	    // if (Sendlater3Util.IsThunderbird2() || Sendlater3Util.IsPostbox()) {
	    // 	var sub = Sendlater3Util.FindSubFolder(fdrlocal, "Drafts");
	    // 	sub.endFolderLoading();
	    // 	sub.startFolderLoading();
	    // }
	    try {
		// Documentation for nsiMsgFolder says, "Note: Even if the
		// folder doesn't currently exist, a nsIMsgFolder may be
		// returned." When that happens, the following line generates
		// an error. I can't find any way to check whether the folder
		// currently exists before calling this, so I'm just discarding
		// the error.
		Sendlater3Util.FindSubFolder(fdrlocal, "Drafts")
		    .updateFolder(msgWindow);
	    }
	    catch (e) {
		Sendlater3Util.debug("updateFolder on local Drafts folder failed");
	    }

	    var allaccounts = accountManager.accounts;

	    var acindex;
	    Sendlater3Util.debug("Progress Animation SET");
	    if (displayprogressbar()) {
		document.getElementById("sendlater_deck").selectedIndex = 0;
	    }

	    for (acindex = 0;acindex < allaccounts.Count();acindex++) {
		SetAnimTimer(5000);
		Sendlater3Util.debug("Progress Animation RESET");
		var thisaccount = allaccounts.GetElementAt(acindex);
		if (thisaccount) {
		    thisaccount = thisaccount
			.QueryInterface(Components.interfaces.nsIMsgAccount);

		    Sendlater3Util.debug(thisaccount.incomingServer.type +
					 " - Identities [" +
					 thisaccount.identities.Count() + "]");
		    switch (thisaccount.incomingServer.type) {
		    case "pop3":
		    case "imap":
			var identityNum;
			for (identityNum = 0;
			     identityNum < thisaccount.identities.Count();
			     identityNum++) {
			    var identity = thisaccount.identities
				.GetElementAt(identityNum)
				.QueryInterface(Components.interfaces
						.nsIMsgIdentity);
			    var thisfolder =
				GetMsgFolderFromUri(identity.draftFolder);
			    if (folderstocheck.indexOf(thisfolder.URI)<0 &&
				foldersdone.indexOf(thisfolder.URI)<0) {
				folderstocheck.push (thisfolder.URI);
				ProgressAdd();
				var pref = "mail.server." + thisaccount
				    .incomingServer.key + ".check_new_mail"
				var pref_value;
				try {
				    pref_value = Sendlater3Util.PrefService
					.getBoolPref(pref)
				}
				catch (e) {
				    // If unset, defaults to true
				    pref_value = true;
				}
				pref_value = Sendlater3Util.
				    GetUpdatePref(identity.key) || pref_value;
				if (pref_value) {
				    Sendlater3Util.dump("SCHEDULE - " +
							thisfolder.URI );
				    // if (Sendlater3Util.IsThunderbird2() || Sendlater3Util.IsPostbox()) {
				    // 	thisfolder.endFolderLoading();
				    // 	thisfolder.startFolderLoading();
				    // }
				    try {
					thisfolder.updateFolder(msgWindow);
				    }
				    catch (e) {
					Sendlater3Util.debug("updateFolder " +
							     thisfolder.URI +
							     " failed");
				    }
				}
				else {
				    Sendlater3Util.dump("IMMEDIATE - " +
							thisfolder.URI );
				    folderLoadListener.OnItemEvent(thisfolder,
								   "FolderLoaded");
				}
			    }
			    else {
				Sendlater3Util.debug("Already scheduled - " +
						     thisfolder.URI);
			    }
			}
			break;
		    default:
			Sendlater3Util.debug("skipping this server type - " +
					     thisaccount);
			break;
		    }
		}
	    }
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.CheckForSendLaterCallback.notify");
	}
    }

    var SetUpStatusBar = {
	observe: function() {
	    var showStatus = Sendlater3Util
		.PrefService.getBoolPref("extensions.sendlater3.showstatus");
	    document.getElementById("sendlater_deck")
		.setAttribute("hidden", ! showStatus);
	}
    };

    function StartMonitorCallback() {
	Sendlater3Util.Entering("Sendlater3Backgrounding.StartMonitorCallback");
	Sendlater3Util.debug("Starting monitor [for every " + checkTimeout() +
			     "ms]");
	var mailSession = Components
	    .classes["@mozilla.org/messenger/services/session;1"]
	    .getService(Components.interfaces.nsIMsgMailSession);
	mailSession
	    .AddFolderListener(folderLoadListener,
			       Components.interfaces.nsIFolderListener.event);
	Sendlater3Backgrounding.BackgroundTimer = Components
	    .classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);    
	Sendlater3Backgrounding.BackgroundTimer.initWithCallback(
	    CheckForSendLaterCallback,
	    2000,
	    Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
	Sendlater3Util.Leaving("Sendlater3Backgrounding.StartMonitorCallback");
    }

    function StopMonitorCallback() {
	Sendlater3Util.Entering("Sendlater3Backgrounding.StopMonitorCallback");
	var mailSession = Components
	    .classes["@mozilla.org/messenger/services/session;1"]
	    .getService(Components.interfaces.nsIMsgMailSession);
	mailSession.RemoveFolderListener(folderLoadListener);
	if (Sendlater3Backgrounding.BackgroundTimer) {
	    Sendlater3Backgrounding.BackgroundTimer.cancel();
	    Sendlater3Backgrounding.BackgroundTimer = undefined;
	}
	clearActiveUuidCallback();
	removeMsgSendLaterListener();
	Sendlater3Util.Leaving("Sendlater3Backgrounding.StopMonitorCallback");
	Sendlater3Util.uninitUtil();
    }

    // BackgroundTimer = Components
    //     .classes["@mozilla.org/timer;1"]
    //     .createInstance(Components.interfaces.nsITimer);
    // BackgroundTimer.initWithCallback(
    //     StartMonitorCallback,
    //     5000,
    //     Components.interfaces.nsITimer.TYPE_ONE_SHOT
    //     );

    window.addEventListener("load", SetUpStatusBar.observe, false);
    Sendlater3Util.PrefService
	.QueryInterface(Components.interfaces.nsIPrefBranch2);
    Sendlater3Util.PrefService.addObserver(
	"extensions.sendlater3.showstatus", SetUpStatusBar, false);

    window.addEventListener("load", StartMonitorCallback,false);
    window.addEventListener("unload", StopMonitorCallback, false);
    Sendlater3Util.Leaving("Sendlater3Backgrounding");
    addMsgSendLaterListener();
}

Sendlater3Backgrounding.markReadListener = function(folder, key) {
    this._folder = folder;
    this._key = key;
}

Sendlater3Backgrounding.markReadListener.prototype = {
    // Thunderbird 2 and Postbox
    itemAdded: function(item) {
	var aMsgHdr = item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
	this.msgAdded(aMsgHdr);
    },

    // Thunderbird 3
    msgAdded: function(aMsgHdr) {
	if (this._folder == aMsgHdr.folder &&
	    this._key == aMsgHdr.messageKey) {
	    if (Sendlater3Util.IsThunderbird2() ||
		Sendlater3Util.IsPostbox()) {
		readlist = Components.classes["@mozilla.org/supports-array;1"]
		    .createInstance(Components.interfaces.nsISupportsArray);
		readlist.AppendElement(aMsgHdr);
	    }
	    else {
		readlist = Components.classes["@mozilla.org/array;1"]
		    .createInstance(Components.interfaces.nsIMutableArray);
		readlist.appendElement(aMsgHdr, false);
	    }
	    aMsgHdr.folder.markMessagesRead(readlist, true);
	    dump("MarkRead\n");
	}
	var notificationService = Components
	    .classes["@mozilla.org/messenger/msgnotificationservice;1"]
	    .getService(Components.interfaces
			.nsIMsgFolderNotificationService);
	notificationService.removeListener(this);
    }
};

Sendlater3Util.initUtil();
Sendlater3Backgrounding.apply();
