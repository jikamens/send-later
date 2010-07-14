var Sendlater3Backgrounding = function() {

Sendlater3Util.debug("Entering Sendlater3Backgrounding");

var checkTimeout;
var displayprogressbar;

//mailnews.customDBHeaders 
var installedCustomHeaders = Sendlater3Util.PrefService.getCharPref('mailnews.customDBHeaders');
if (installedCustomHeaders.indexOf("x-send-later-at")<0)
{
  Sendlater3Util.dump("Installing Custom Header\n");
  Sendlater3Util.PrefService.setCharPref('mailnews.customDBHeaders',installedCustomHeaders + " x-send-later-at");
}

checkTimeout = Sendlater3Util.PrefService.getIntPref("extensions.sendlater3.checktimepref");
displayprogressbar = Sendlater3Util.PrefService.getBoolPref("extensions.sendlater3.showprogress");

if (checkTimeout < 5000) checkTimeout = 60000;


var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"].createInstance();
msgWindow = msgWindow.QueryInterface(Components.interfaces.nsIMsgWindow);

var DisplayMessages = new Array();

var DisplayReportTimer;
var DisplayReportCallback = {
    notify: function(timer) {
    	Sendlater3Util.debug("Entering Sendlater3Backgrounding.DisplayReportCallback.notify");
	if (DisplayMessages.length>0) {
	    var msg = DisplayMessages.shift();
	    document.getElementById("sendlater_status").value = msg;
	}
	else {
	    timer.cancel();
	}
    	Sendlater3Util.debug("Leaving Sendlater3Backgrounding.DisplayReportCallback.notify");
    }
}
     
function StatusReportMsg(msg) {
    Sendlater3Util.debug("Entering Sendlater3Backgrounding.StatusReportMsg");
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
    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.StatusReportMsg");
}

const FOLDER_IS_IDLE = 0;
const FOLDER_IS_LOADING = 1;
var folderstocheck = new Array();
var MessagesPending=0;
var copyServiceListener =  { sfileNP: null,
															QueryInterface : function(iid) 
															{
															    Sendlater3Util.debug("Entering Sendlater3Backgrounding.copyServiceListener.QueryInterface");
																	if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
																									iid.equals(Components.interfaces.nsISupports))
																		return this;
																	throw Components.results.NS_NOINTERFACE;
																	return 0;
															    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.copyServiceListener.QueryInterface");
															 },

															OnProgress: function (progress, progressMax) {
															    Sendlater3Util.debug("Entering Sendlater3Backgrounding.copyServiceListener.OnProgress");
															    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.copyServiceListener.OnProgress");
															},

															OnStartCopy: function () {
															    Sendlater3Util.debug("Entering Sendlater3Backgrounding.copyServiceListener.OnStartCopy");
															    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.copyServiceListener.OnStartCopy");
															},

															OnStopCopy: function ( status ) {
															    Sendlater3Util.debug("Entering Sendlater3Backgrounding.copyServiceListener.OnStopCopy");
															    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.copyServiceListener.OnStopCopy");
															},

															SetMessageKey: function (key ) {
															    Sendlater3Util.debug("Entering Sendlater3Backgrounding.copyServiceListener.SetMessageKey");
															    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.copyServiceListener.SetMessageKey");
															}
															
										};
								

var AnimTimer = null;
var AnimCallback = {
    notify: function(timer) {
        Sendlater3Util.debug("Entering Sendlater3Backgrounding.AnimCallback.notify");
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
        Sendlater3Util.debug("Leaving Sendlater3Backgrounding.AnimCallback.notify");
    }
}
function SetAnimTimer(timeout) {
    Sendlater3Util.debug("Entering Sendlater3Backgrounding.SetAnimTimer");
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
    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.SetAnimTimer");
}

var CheckThisURIQueue = new Array();
var CheckThisURITimer;

var CheckThisURICallback = {
    notify: function (timer) {
	Sendlater3Util.debug("Entering Sendlater3Backgrounding.CheckThisUriCallback.notify");
	if (CheckThisURIQueue.length == 0) {
	    timer.cancel();
	    return;
	}
	messageURI = CheckThisURIQueue.shift();

	var msgSendLater = Components.classes["@mozilla.org/messengercompose/sendlater;1"]
                             .getService(Components.interfaces.nsIMsgSendLater);
	var fdrunsent = msgSendLater.getUnsentMessagesFolder(null);
	var content = "";
	var MsgService = messenger.messageServiceFromURI(messageURI);
	var messageHDR = messenger.msgHdrFromURI(messageURI);
	var MsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
	var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
	var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
	var ScriptInputStream = ScriptInput .QueryInterface(Components.interfaces.nsIScriptableInputStream);

	SetAnimTimer(3000);

	Sendlater3Util.debug("Checking message : " + messageURI + "\n");
	
	ScriptInputStream .init(consumer);
	MsgService .streamMessage(messageURI, MsgStream, msgWindow, null, false,null);
//	ScriptInputStream .available();
	var headerready=false;
	var xsendlaterpresent=false;
	
	while ((ScriptInputStream .available()) && ( (!headerready) || (headerready && xsendlaterpresent) ))
	{
		content = content + ScriptInputStream .read(512);
		if (!headerready)
		{
		   if (content.match(/\r\n\r\n/) || content.match(/\n\n/))
		   {
		   	 Sendlater3Util.debug("header is now ready");
			   headerready = true;
		      if (content.match(/^X-Send-Later-At:.*$/m)) xsendlaterpresent = true;
		   }
		}
	}
	
	Sendlater3Util.debug("HeaderReady = " + headerready + " , SendLaterPresent = " + xsendlaterpresent);
	var gotcha;
	if (xsendlaterpresent)
	gotcha =content.match(/^X-Send-Later-At:.*$/m).toString();
	else
	gotcha = false;
	if (gotcha)
	{
		Sendlater3Util.dump ("Found Pending Message.");
		var sendattime = new Date (gotcha.substr(16));
		var now = new Date();
		if (now > sendattime)
		{
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

			content = content.replace(/(\nDate:).*(\r?\n)/,"$1 "+Sendlater3Util.FormatDateTime(new Date(),true)+"$2");
			content = content.replace(/\nX-Send-Later-At:.*\r?\n/,"\n");

			// Remove extra newline -- see comment above.
			content = content.slice(1);

			// There is a bug in Thunderbird (3.1, at least) where
			// when a message is being sent from the user's Outbox
			// and then a copy is being uploaded into an IMAP
			// server's Sent Items folder, Thunderbird doesn't
			// convert bare \n to \r\n before trying to upload the
			// message copy.  This is a violation of the IMAP spec,
			// and some IMAP servers, e.g., Cyrus IMAPd, reject the
			// message because of the bare newlines.  So we have to
			// make sure that the message has only \r\n line
			// terminators in it before we put it into the Outbox.
			// It might *already* have \r\n line terminators in it,
			// so first we replace \r\n with \n, and then we
			// replace \n with \r\n.  The reason why we prepend a
			// "From - <date>" line to the message before doing
			// this is because if we don't, then CopyFileMessage
			// will prepend a couple of useless X-Mozilla-* headers
			// to the top of the message, and the headers it adds
			// will end with bare \n's on them, so we're back to
			// the original problem.
			if (content.slice(0,5) != "From ") {
			    content = "From - " + Date().toString() + "\r\n"
				    + content;
			}
			content = content.replace(/\r\n/g,"\n").
				replace(/\n/g,"\r\n");

			var dirService = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
			var tempDir = dirService.get("TmpD", Components.interfaces.nsIFile);
			var sfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			sfile.initWithPath(tempDir.path);
			sfile.appendRelativePath("tempMsg" + messageHDR.messageId + ".eml");
			Sendlater3Util.dump("Saving message to " + sfile.path);
			if (sfile.exists()) sfile.remove(true);
			sfile.create(sfile.NORMAL_FILE_TYPE, 0600);
			var stream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
			stream.init(sfile, 2, 0x200, false); // open as "write only"
			stream.write(content, content.length);
			stream.close();
			// If we try (Thunderbird 3.1 on Windows) to use the
			// same sfile object created and written to above in
			// CopyFileMessage, it fails and copies nothing but a
			// blank line into the unsent messages folder. Perhaps
			// the file object doesn't like being used for both
			// write and read or something.  In any case, just
			// recreating the file object is an acceptable
			// workaround.
			sfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			sfile.initWithPath(tempDir.path);
			sfile.appendRelativePath("tempMsg" + messageHDR.messageId + ".eml");
			var copyService = Components.classes["@mozilla.org/messenger/messagecopyservice;1"].createInstance();
			copyService = copyService.QueryInterface( Components.interfaces.nsIMsgCopyService);
			copyService.CopyFileMessage(sfile, fdrunsent, null, false, 0, "", copyServiceListener,msgWindow);
			if (sfile.exists()) sfile.remove(true);
			var dellist = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
			dellist.appendElement(messageHDR, false);
			messageHDR.folder.deleteMessages(dellist,msgWindow,true,false,null,false);
			if (Sendlater3Util.PrefService.getBoolPref("extensions.sendlater3.sendunsentmessages")) {
			    msgSendLater.sendUnsentMessages(null);
			    Sendlater3Util.dump ("Sending Message.");
			}
			else {
			    Sendlater3Util.dump("Message deposited in Outbox.");
			}
			SetAnimTimer(3000);
		}
		else
		{
			MessagesPending++;
			Sendlater3Util.dump(MessagesPending + " messages still pending");
		}
	}
	Sendlater3Util.debug("Leaving Sendlater3Backgrounding.CheckThisUriCallback.notify");
    }
}

// We use a queue of URIs to be checked, and only allow one URI to be
// checked each time the timer fires, so that we don't block for a
// long time checking drafts and cause the UI to hang or respond
// sluggishly.
function CheckThisURIQueueAdd(messageURI) {
    Sendlater3Util.debug("Entering Sendlater3Backgrounding.CheckThisURIQueueAdd");
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
    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.CheckThisURIQueueAdd");
}

var folderLoadListener =
{
    OnItemEvent: function(folder, event)
    {
	Sendlater3Util.debug("Entering Sendlater3Backgrounding.folderLoadListener.OnItemEvent");
        var eventType = event.toString();
        
        if (eventType == "FolderLoaded")
        {
            if (folder)
            {
// I don't know why there are endFolderLoading and startFolderLoading
// calls scattered throughout this file. In my simple tests, they
// don't seem to be necessary, so I'm disabling them in the spirit of
// optimizing performance by making plugins do as little as possible.
//             folder.endFolderLoading();
				Sendlater3Util.debug("FOLDER LOADED - " + folder.URI);
		var where = folderstocheck.indexOf(folder.URI);
                if (where >= 0)
                {
		    SetAnimTimer(3000);

                    Sendlater3Util.dump("FOLDER MONITORED - " + folder.URI + "\n");
                    folderstocheck.splice(where, 1);
                    var thisfolder = folder.QueryInterface(Components.interfaces.nsIMsgFolder);
                    var messageenumerator = thisfolder.messages;
                    if ( messageenumerator )
                    {
                        Sendlater3Util.dump ("Got Enumerator\n");
                        while ( messageenumerator.hasMoreElements() )
                        {
                            var messageDBHDR = messageenumerator.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
                            var messageURI = thisfolder.getUriForMsg(messageDBHDR);
			    CheckThisURIQueueAdd(messageURI);
                        }
                    }
		    else
		    {
		      Sendlater3Util.dump("No Enumerator\n");
		    }
                }
            }
		} 
	Sendlater3Util.debug("Leaving Sendlater3Backgrounding.folderLoadListener.OnItemEvent");
    }
};
	
	 
var BackgroundTimer;

var CheckForSendLaterCallback = {
    notify: function (timer) {
	Sendlater3Util.debug("Entering Sendlater3Backgrounding.CheckForSendLaterCallback.notify");
	MessagesPending = 0;
	Sendlater3Util.debug("One cycle of checking");
	
		var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
	var fdrlocal = accountManager.localFoldersServer.rootFolder;
	
	folderstocheck = new Array();
	folderstocheck.push(fdrlocal.findSubFolder("Drafts").URI);
	Sendlater3Util.dump("SCHEDULE - " + folderstocheck[0]);
	// Local Drafts folder might have different name, e.g., in other locales
	var local_draft_pref = Sendlater3Util.
	    PrefService.getCharPref('mail.identity.default.draft_folder');
	Sendlater3Util.debug("mail.identity.default.draft_folder=" +
	                     local_draft_pref);
	if (local_draft_pref != null && local_draft_pref != folderstocheck[0]) {
	    Sendlater3Util.debug("SCHEDULE - " + local_draft_pref);
	    folderstocheck.push(local_draft_pref);
	}
//	fdrlocal.findSubFolder("Drafts").endFolderLoading();
//	fdrlocal.findSubFolder("Drafts").startFolderLoading();
	try {
	    // Documentation for nsiMsgFolder says, "Note: Even if the
	    // folder doesn't currently exist, a nsIMsgFolder may be
	    // returned." When that happens, the following line
	    // generates an error. I can't find any way to check
	    // whether the folder currently exists before calling
	    // this, so I'm just discarding the error.
	    fdrlocal.findSubFolder("Drafts").updateFolder(msgWindow);
	}
	catch (e) {
	    Sendlater3Util.debug("updateFolder on local Drafts folder failed");
	}

	var allaccounts = accountManager.accounts;

	var acindex;
	Sendlater3Util.debug("Progress Animation SET");
	if (displayprogressbar)
		document.getElementById("sendlater_deck").selectedIndex = 0;
	
	for (acindex = 0;acindex < allaccounts.Count();acindex++)
	{
		SetAnimTimer(5000);
		Sendlater3Util.debug("Progress Animation RESET");
		var thisaccount = allaccounts.GetElementAt(acindex);
		if (thisaccount)
		{
			thisaccount = thisaccount.QueryInterface(Components.interfaces.nsIMsgAccount);
		
			Sendlater3Util.debug(thisaccount.incomingServer.type + " - Identities [" + thisaccount.identities.Count() + "]");
			switch (thisaccount.incomingServer.type) 
			{
				   case "pop3":
				   case "imap":
							var identity;
							for (identity = 0;identity < thisaccount.identities.Count();identity++)
							{
								var thisfolder = GetMsgFolderFromUri(thisaccount.identities.GetElementAt(identity).QueryInterface(Components.interfaces.nsIMsgIdentity).draftFolder);
								{
									if (folderstocheck.indexOf(thisfolder.URI)<0)
									{
										folderstocheck.push (thisfolder.URI);
										Sendlater3Util.dump("SCHEDULE - " + thisfolder.URI );
//										thisfolder.endFolderLoading();
//										thisfolder.startFolderLoading();
										thisfolder.updateFolder(msgWindow);
									}
									else
									{
									   Sendlater3Util.debug("Already scheduled - " + thisfolder.URI);
									}
								}
							}
							break;
					default:
							Sendlater3Util.debug("Skipping this server type - " + thisaccount);
							break;

				
			}
		}
	}
	Sendlater3Util.debug("Leaving Sendlater3Backgrounding.CheckForSendLaterCallback.notify");
    }
}

var FirstBackgroundCallback = {
    notify: function (timer) {
	Sendlater3Util.debug("Entering Sendlater3Backgrounding.FirstBackgroundCallback.notify");
	CheckForSendLaterCallback.notify(null);
	BackgroundTimer.initWithCallback(
	    CheckForSendLaterCallback,
	    checkTimeout+Math.ceil(Math.random()*3000)-1500,
	    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
	    );
	Sendlater3Util.debug("Leaving Sendlater3Backgrounding.FirstBackgroundCallback.notify");
    }
}

function StartMonitorCallback() {
    Sendlater3Util.debug("Entering Sendlater3Backgrounding.StartMonitorCallback");
    Sendlater3Util.debug("Starting monitor [for every " + checkTimeout + "ms]");
    var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
    mailSession.AddFolderListener(folderLoadListener,Components.interfaces.nsIFolderListener.event);
    BackgroundTimer = Components
	.classes["@mozilla.org/timer;1"]
	.createInstance(Components.interfaces.nsITimer);
    BackgroundTimer.initWithCallback(
	FirstBackgroundCallback,
	2000,
	Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
    Sendlater3Util.debug("Leaving Sendlater3Backgrounding.StartMonitorCallback");
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
    Sendlater3Util.debug("Leaving Sendlater3Backgrounding");
}

Sendlater3Backgrounding.apply();
