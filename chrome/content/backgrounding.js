Components.utils.import("resource:///modules/gloda/log4moz.js");

var checkTimeout;
var sendlater3_displayprogressbar;

var sendlater3_prefservice = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);


//mailnews.customDBHeaders 
var installedCustomHeaders = sendlater3_prefservice.getCharPref('mailnews.customDBHeaders');
if (installedCustomHeaders.indexOf("x-send-later-at")<0)
{
  dump("Installing Custom Header\n");
  sendlater3_prefservice.setCharPref('mailnews.customDBHeaders',installedCustomHeaders + " x-send-later-at");
}

checkTimeout = sendlater3_prefservice.getIntPref("extensions.sendlater3.checktimepref");
sendlater3_displayprogressbar = sendlater3_prefservice.getBoolPref("extensions.sendlater3.showprogress");

if (checkTimeout < 5000) checkTimeout = 60000;


var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"].createInstance();
msgWindow = msgWindow.QueryInterface(Components.interfaces.nsIMsgWindow);

var DisplayMessages = new Array();

var logger = null;

function SENDLATER3dump(msg)
{
  logger.info(msg);
}

function SENDLATER3debug(msg)
{
  logger.debug(msg);
}

function initDebug()
{

	logger = Log4Moz.getConfiguredLogger("extensions.sendlater3",
					     Log4Moz.Level.Debug,
					     Log4Moz.Level.Info,
					     Log4Moz.Level.Debug);
}

initDebug();

var Sendlater3DisplayReportTimer;
var Sendlater3DisplayReportCallback = {
    notify: function(timer) {
	if (DisplayMessages.length>0) {
	    var msg = DisplayMessages.shift();
	    document.getElementById("sendlater_status").value = msg;
	}
	else {
	    timer.cancel();
	}
    }
}
     
function StatusReportMsg(msg) {
    if (!DisplayMessages.length) {
        Sendlater3DisplayReportTimer = Components
	    .classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	Sendlater3DisplayReportTimer.initWithCallback(
	    Sendlater3DisplayReportCallback,
	    300,
	    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
	    );
    }
    DisplayMessages.push(msg);   
}

function FormatDateTime(thisdate,includeTZ)
{
	var s="";
	var sDaysOfWeek = [ "Sun","Mon","Tue","Wed","Thu","Fri","Sat" ];
	var sMonths= ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
	if (includeTZ) 
	{
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
}

const FOLDER_IS_IDLE = 0;
const FOLDER_IS_LOADING = 1;
var folderstocheck = new Array();
var MessagesPending=0;
var copyServiceListener =  { sfileNP: null,
															QueryInterface : function(iid) 
															{
																	if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
																									iid.equals(Components.interfaces.nsISupports))
																		return this;
																	throw Components.results.NS_NOINTERFACE;
																	return 0;
															 },

															OnProgress: function (progress, progressMax) {
															},

															OnStartCopy: function () {
															},

															OnStopCopy: function ( status ) {
															},

															SetMessageKey: function (key ) {
															}
															
										};
								

var Sendlater3AnimTimer = null;
var Sendlater3AnimCallback = {
    notify: function(timer) {
	SENDLATER3debug("STATUS MESSAGE - " + MessagesPending);
	document.getElementById("sendlater_deck").selectedIndex = 1;
	var strbundle = document.getElementById("sendlater3backgroundstrings");
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
}
function Sendlater3SetAnimTimer(timeout) {
    if (Sendlater3AnimTimer != null) {
        Sendlater3AnimTimer.cancel();
    }
    Sendlater3AnimTimer = Components
	.classes["@mozilla.org/timer;1"]
	.createInstance(Components.interfaces.nsITimer);
    Sendlater3AnimTimer.initWithCallback(
	Sendlater3AnimCallback,
	timeout,
	Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
}

var Sendlater3CheckThisURIQueue = new Array();
var Sendlater3CheckThisURITimer;

var Sendlater3CheckThisURICallback = {
    notify: function (timer) {
	if (Sendlater3CheckThisURIQueue.length == 0) {
	    timer.cancel();
	    return;
	}
	messageURI = Sendlater3CheckThisURIQueue.shift();

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

	Sendlater3SetAnimTimer(3000);

	SENDLATER3debug("Checking message : " + messageURI + "\n");
	
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
		   	 SENDLATER3debug("header is now ready");
			   headerready = true;
		      if (content.match(/^X-Send-Later-At:.*$/m)) xsendlaterpresent = true;
		   }
		}
	}
	
	SENDLATER3debug("HeaderReady = " + headerready + " , SendLaterPresent = " + xsendlaterpresent);
	var gotcha;
	if (xsendlaterpresent)
	gotcha =content.match(/^X-Send-Later-At:.*$/m).toString();
	else
	gotcha = false;
	if (gotcha)
	{
		SENDLATER3dump ("Found Pending Message.");
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

			content = content.replace(/(\nDate:).*(\r?\n)/,"$1 "+FormatDateTime(new Date(),true)+"$2");
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
			SENDLATER3dump("Saving message to " + sfile.path);
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
			if (sendlater3_prefservice.getBoolPref("extensions.sendlater3.sendunsentmessages")) {
			    msgSendLater.sendUnsentMessages(null);
			    SENDLATER3dump ("Sending Message.");
			}
			else {
			    SENDLATER3dump("Message deposited in Outbox.");
			}
			Sendlater3SetAnimTimer(3000);
		}
		else
		{
			MessagesPending++;
			SENDLATER3dump(MessagesPending + " messages still pending");
		}
	}
    }
}

// We use a queue of URIs to be checked, and only allow one URI to be
// checked each time the timer fires, so that we don't block for a
// long time checking drafts and cause the UI to hang or respond
// sluggishly.
function Sendlater3CheckThisURIQueueAdd(messageURI) {
    if (Sendlater3CheckThisURIQueue.length == 0) {
        Sendlater3CheckThisURITimer = Components
	    .classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	Sendlater3CheckThisURITimer.initWithCallback(
	    Sendlater3CheckThisURICallback,
	    100,
	    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
	    );
    }
    Sendlater3CheckThisURIQueue.push(messageURI);
}

var folderLoadListener =
{
    OnItemEvent: function(folder, event)
    {
        var eventType = event.toString();
        
        if (eventType == "FolderLoaded")
        {
            if (folder)
            {
             folder.endFolderLoading();
				SENDLATER3debug("FOLDER LOADED - " + folder.URI);
                if (folderstocheck.indexOf(folder.URI)>=0)
                {
		    Sendlater3SetAnimTimer(3000);

                    SENDLATER3dump("FOLDER MONITORED - " + folder.URI + "\n");
                    //folderstocheck.splice(folderstocheck.indexOf(folder.URI),1);
                    var thisfolder = folder.QueryInterface(Components.interfaces.nsIMsgFolder);
                    var messageenumerator = thisfolder.messages;
                    if ( messageenumerator )
                    {
                        SENDLATER3dump ("Got Enumerator\n");
                        while ( messageenumerator.hasMoreElements() )
                        {
                            var messageDBHDR = messageenumerator.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
                            var messageURI = thisfolder.getUriForMsg(messageDBHDR);
			    Sendlater3CheckThisURIQueueAdd(messageURI);
                        }
                    }
		    else
		    {
		      SENDLATER3dump("No Enumerator\n");
		    }
                }
            }
		} 
    }
};
	
	 
var Sendlater3BackgroundTimer;

var Sendlater3CheckForSendLaterCallback = {
    notify: function (timer) {
	MessagesPending = 0;
	SENDLATER3debug("One cycle of checking");
	
		var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
	var fdrlocal = accountManager.localFoldersServer.rootFolder;
	
	folderstocheck = new Array();
	folderstocheck.push(fdrlocal.findSubFolder("Drafts").URI);
	SENDLATER3dump("SCHEDULE - " + fdrlocal.findSubFolder("Drafts").URI);
	fdrlocal.findSubFolder("Drafts").endFolderLoading();
	fdrlocal.findSubFolder("Drafts").startFolderLoading();
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
	    SENDLATER3debug("updateFolder on local Drafts folder failed");
	}

	var allaccounts = accountManager.accounts;

	var acindex;
	SENDLATER3debug("Progress Animation SET");
	if (sendlater3_displayprogressbar)
		document.getElementById("sendlater_deck").selectedIndex = 0;
	
	for (acindex = 0;acindex < allaccounts.Count();acindex++)
	{
		Sendlater3SetAnimTimer(5000);
		SENDLATER3debug("Progress Animation RESET");
		var thisaccount = allaccounts.GetElementAt(acindex);
		if (thisaccount)
		{
			thisaccount = thisaccount.QueryInterface(Components.interfaces.nsIMsgAccount);
		
			SENDLATER3debug(thisaccount.incomingServer.type + " - Identities [" + thisaccount.identities.Count() + "]");
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
										SENDLATER3dump("SCHEDULE - " + thisfolder.URI );
										thisfolder.endFolderLoading();
										thisfolder.startFolderLoading();
										thisfolder.updateFolder(msgWindow);
									}
									else
									{
									   SENDLATER3debug("Already scheduled - " + thisfolder.URI);
									}
								}
							}
							break;
					default:
							SENDLATER3debug("Skipping this server type - " + thisaccount);
							break;

				
			}
		}
	}
    }
}

var Sendlater3FirstBackgroundCallback = {
    notify: function (timer) {
	Sendlater3CheckForSendLaterCallback.notify(null);
	Sendlater3BackgroundTimer.initWithCallback(
	    Sendlater3CheckForSendLaterCallback,
	    checkTimeout+Math.ceil(Math.random()*3000)-1500,
	    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
	    );
    }
}

var Sendlater3StartMonitorCallback = {
    notify: function (timer) {
	SENDLATER3debug("Starting monitor [for every " + checkTimeout + "ms]");
	var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
	mailSession.AddFolderListener(folderLoadListener,Components.interfaces.nsIFolderListener.event);
	Sendlater3BackgroundTimer.initWithCallback(
	    Sendlater3FirstBackgroundCallback,
	    2000,
	    Components.interfaces.nsITimer.TYPE_ONE_SHOT
	    );
    }
}

Sendlater3BackgroundTimer = Components
    .classes["@mozilla.org/timer;1"]
    .createInstance(Components.interfaces.nsITimer);
Sendlater3BackgroundTimer.initWithCallback(
    Sendlater3StartMonitorCallback,
    5000,
    Components.interfaces.nsITimer.TYPE_ONE_SHOT
    );
