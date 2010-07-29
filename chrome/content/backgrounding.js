var Sendlater3Backgrounding = function() {
    Sendlater3Util.Entering("Sendlater3Backgrounding");

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
	onMessageSendProgress: function(aCurrentMessage, aTotalMessageCount,
					aMessageSendPercent,
					aMessageCopyPercent) {},
	onStatus: function(aMsg) {},
	onStopSending: function(aStatus, aMsg, aTotalTried, aSuccessful) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.sendUnsentMessagesListener.onStopSending");
	    sendingUnsentMessages = false;
	    if (needToSendUnsentMessages) {
		var msgSendLater = Components
		    .classes["@mozilla.org/messengercompose/sendlater;1"]
		    .getService(Components.interfaces.nsIMsgSendLater);
		msgSendLater.sendUnsentMessages(null);
	    }
	    Sendlater3Util.Leaving("Sendlater3Backgrounding.sendUnsentMessagesListener.onStopSending");
	}
    }
    function queueSendUnsentMessages(msgSendLater) {
	Sendlater3Util.Entering("Sendlater3Backgrounding.queueSendUnsentMessages");
	if (sendingUnsentMessages) {
	    Sendlater3Util.debug("Deferring sendUnsentMessages");
	    needToSendUnsentMessages = true;
	}
	else {
	    msgSendLater.sendUnsentMessages(null);
	}
	Sendlater3Util.Leaving("Sendlater3Backgrounding.queueSendUnsentMessages");
    }
    function addMsgSendLaterListener() {
	Sendlater3Util.Entering("Sendlater3Backgrounding.addMsgSendLaterListener");
	var msgSendLater = Components
	    .classes["@mozilla.org/messengercompose/sendlater;1"]
	    .getService(Components.interfaces.nsIMsgSendLater);
	msgSendLater.addListener(sendUnsentMessagesListener);
	Sendlater3Util.Leaving("Sendlater3Backgrounding.addMsgSendLaterListener");
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
	Sendlater3Util.dump("Installing Custom Header\n");
	Sendlater3Util.PrefService.setCharPref('mailnews.customDBHeaders',
					       installedCustomHeaders +
					       " x-send-later-at");
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

    var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"]
	.createInstance();
    msgWindow = msgWindow.QueryInterface(Components.interfaces.nsIMsgWindow);

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

    const FOLDER_IS_IDLE = 0;
    const FOLDER_IS_LOADING = 1;
    var folderstocheck = new Array();
    var MessagesPending=0;
    var copyServiceListener =  {
	sfileNP: null,
	QueryInterface : function(iid) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.copyServiceListener.QueryInterface");
	    if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
		iid.equals(Components.interfaces.nsISupports)) {
		Sendlater3Util.Returning("Sendlater3Backgrounding.copyServiceListener.QueryInterface",
					 this);
		return this;
	    }
	    Sendlater3Util.Throwing("Sendlater3Backgrounding.copyServiceListener.QueryInterface",
				    Components.results.NS_NOINTERFACE);
	    throw Components.results.NS_NOINTERFACE;
	},

	OnProgress: function (progress, progressMax) {},

	OnStartCopy: function () {},

	OnStopCopy: function ( status ) {},

	SetMessageKey: function (key ) {}

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
		else {
		    status = strbundle.getString("IdleMessage");
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
		this._header = header.match(/^X-Send-Later-At:.*$/mi);
	    }

	    Sendlater3Util.debug("SendLaterPresent = " + this._header);
	    if (this._header != null) {
		this._header = this._header.toString();
		Sendlater3Util.dump ("Found Pending Message.");
		var sendattime = new Date (this._header.substr(16));
		var now = new Date();
		if (now > sendattime) {
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

		    var dirService = Components
			.classes["@mozilla.org/file/directory_service;1"]
			.getService(Components.interfaces.nsIProperties);
		    var tempDir = dirService
			.get("TmpD", Components.interfaces.nsIFile);
		    var sfile = Components
			.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		    sfile.initWithPath(tempDir.path);
		    sfile.appendRelativePath("tempMsg" + messageHDR.messageId +
					     ".eml");
		    var filePath = sfile.path;
		    Sendlater3Util.dump("Saving message to " + filePath);
		    if (sfile.exists()) sfile.remove(true);
		    sfile.create(sfile.NORMAL_FILE_TYPE, 0600);
		    var stream = Components
			.classes['@mozilla.org/network/file-output-stream;1']
			.createInstance(Components.interfaces
					.nsIFileOutputStream);
		    stream.init(sfile, 2, 0x200, false);
		    stream.write(content, content.length);
		    stream.close();
		    // Separate stream required for reading, since
		    // nsIFileOutputStream is write-only on Windows (and for
		    // that matter should probably be write-only on Linux as
		    // well, since it's an *output* stream, but it doesn't
		    // actually behave that way).
		    sfile = Components.classes["@mozilla.org/file/local;1"]
			.createInstance(Components.interfaces.nsILocalFile);
		    sfile.initWithPath(filePath);
		    var copyService = Components
			.classes["@mozilla.org/messenger/messagecopyservice;1"]
			.createInstance();
		    copyService = copyService
			.QueryInterface( Components.interfaces
					 .nsIMsgCopyService);
		    copyService.CopyFileMessage(sfile, fdrunsent, null, false,
						0, "", copyServiceListener,
						msgWindow);
		    if (sfile.exists()) sfile.remove(true);
		    var dellist = Components.classes["@mozilla.org/array;1"]
			.createInstance(Components.interfaces.nsIMutableArray);
		    dellist.appendElement(messageHDR, false);
		    messageHDR.folder.deleteMessages(dellist, msgWindow, true,
						     false, null, false);
		    if (Sendlater3Util.PrefService.getBoolPref("extensions.sendlater3.sendunsentmessages")) {
			queueSendUnsentMessages(msgSendLater);
			Sendlater3Util.dump ("Sending Message.");
		    }
		    else {
			Sendlater3Util.dump("Message deposited in Outbox.");
		    }
		    SetAnimTimer(3000);
		}
		else {
		    MessagesPending++;
		    Sendlater3Util.dump(MessagesPending +
					" messages still pending");
		}
	    }
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
		this._content = this._content.slice(0, this.content.length -1);
	    }
	    this._content += data;

	    var eoh = this._content.search(/\n\n/);
	    if (eoh > -1) {
		var header = this._content.slice(0, eoh);

		this._header = header.match(/^X-Send-Later-At:.*$/mi);
		if (this._header == null) {
		    Sendlater3Util.debug("SendLaterPresent = null");
		    this._content = "";
		    aInputStream.close();
		    Sendlater3Util.Returning("Sendlater3Backgrounding.UriStreamListener.onDataAvailable", "no header");
		    return;
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
	    var listener = new UriStreamListener(messageHDR);
	    MsgService.streamMessage(messageURI, listener,
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
	Sendlater3Util.Entering("Sendlater3Backgrounding.CheckThisURIQueueAdd");
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
	Sendlater3Util.Leaving("Sendlater3Backgrounding.CheckThisURIQueueAdd");
    }

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
		// folder.endFolderLoading();
		Sendlater3Util.debug("FOLDER LOADED - " + folder.URI);
		var where = folderstocheck.indexOf(folder.URI);
		if (where >= 0) {
		    SetAnimTimer(3000);

		    Sendlater3Util.dump("FOLDER MONITORED - "+folder.URI+"\n");
		    folderstocheck.splice(where, 1);
		    var thisfolder = folder
			.QueryInterface(Components.interfaces.nsIMsgFolder);
		    var messageenumerator = thisfolder.messages;
		    if ( messageenumerator ) {
			Sendlater3Util.dump ("Got Enumerator\n");
			while ( messageenumerator.hasMoreElements() ) {
			    var messageDBHDR = messageenumerator.getNext()
				.QueryInterface(Components.interfaces
						.nsIMsgDBHdr);
			    var messageURI = thisfolder
				.getUriForMsg(messageDBHDR);
			    CheckThisURIQueueAdd(messageURI);
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


    var BackgroundTimer;

    var CheckForSendLaterCallback = {
	notify: function (timer) {
	    Sendlater3Util.Entering("Sendlater3Backgrounding.CheckForSendLaterCallback.notify");

	    BackgroundTimer.initWithCallback(
		CheckForSendLaterCallback,
		checkTimeout() + Math.ceil(Math.random()*3000)-1500,
		Components.interfaces.nsITimer.TYPE_ONE_SHOT
	    );

	    if (! checkUuid(true)) {
		Sendlater3Util.Returning("Sendlater3Backgrounding.CheckForSendLaterCallback.notify", "");
		return;
	    }

	    MessagesPending = 0;
	    Sendlater3Util.debug("One cycle of checking");

	    cycle++;

	    var accountManager = Components
		.classes["@mozilla.org/messenger/account-manager;1"]
		.getService(Components.interfaces.nsIMsgAccountManager);
	    var fdrlocal = accountManager.localFoldersServer.rootFolder;

	    folderstocheck = new Array();
	    folderstocheck.push(fdrlocal.findSubFolder("Drafts").URI);
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
	    }
	    //	fdrlocal.findSubFolder("Drafts").endFolderLoading();
	    //	fdrlocal.findSubFolder("Drafts").startFolderLoading();
	    try {
		// Documentation for nsiMsgFolder says, "Note: Even if the
		// folder doesn't currently exist, a nsIMsgFolder may be
		// returned." When that happens, the following line generates
		// an error. I can't find any way to check whether the folder
		// currently exists before calling this, so I'm just discarding
		// the error.
		fdrlocal.findSubFolder("Drafts").updateFolder(msgWindow);
	    }
	    catch (e) {
		Sendlater3Util.debug("updateFolder on local Drafts folder failed");
	    }

	    var allaccounts = accountManager.accounts;

	    var acindex;
	    Sendlater3Util.debug("Progress Animation SET");
	    if (displayprogressbar())
		document.getElementById("sendlater_deck").selectedIndex = 0;

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
			    if (folderstocheck.indexOf(thisfolder.URI)<0) {
				folderstocheck.push (thisfolder.URI);
				Sendlater3Util.dump("SCHEDULE - " +
						    thisfolder.URI );
				// thisfolder.endFolderLoading();
				// thisfolder.startFolderLoading();
				thisfolder.updateFolder(msgWindow);
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
	BackgroundTimer = Components
	    .classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	BackgroundTimer.initWithCallback(
	    CheckForSendLaterCallback,
	    2000,
	    Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
	Sendlater3Util.Leaving("Sendlater3Backgrounding.StartMonitorCallback");
    }

    // BackgroundTimer = Components
    //     .classes["@mozilla.org/timer;1"]
    //     .createInstance(Components.interfaces.nsITimer);
    // BackgroundTimer.initWithCallback(
    //     StartMonitorCallback,
    //     5000,
    //     Components.interfaces.nsITimer.TYPE_ONE_SHOT
    //     );

    window.addEventListener("load", StartMonitorCallback,false);
    window.addEventListener("unload", clearActiveUuidCallback, false);
    Sendlater3Util.Leaving("Sendlater3Backgrounding");
    addMsgSendLaterListener();
}

Sendlater3Backgrounding.apply();
