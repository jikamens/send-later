var Sendlater3Composing = {
    main: function() {

	var composelogMngr = null;
	var composelogger = null;
	var sComposeMsgsBundle = document.getElementById("bundle_composeMsgs");

	var msgWindow = Components
	    .classes["@mozilla.org/messenger/msgwindow;1"].createInstance()
	    .QueryInterface(Components.interfaces.nsIMsgWindow);
	var sendlater3ComposePrefs = Components
	    .classes["@mozilla.org/preferences-service;1"]
	    .getService(Components.interfaces.nsIPrefBranch);

	function CheckForXSendLater() {
	    Sendlater3Util.dump("CheckforXSendLater")
	    if (gMsgCompose != null) {
		var msgCompFields = gMsgCompose.compFields;
		if (msgCompFields && gMsgCompose.originalMsgURI!="") {
		    Sendlater3Util.dump("Checking " +
					gMsgCompose.originalMsgURI);
		    var messageURI = gMsgCompose.originalMsgURI;
		    var accountManager = Components
			.classes["@mozilla.org/messenger/account-manager;1"]
			.getService(Components.interfaces
				    .nsIMsgAccountManager);
		    var messenger = Components
			.classes["@mozilla.org/messenger;1"]
			.getService(Components.interfaces.nsIMessenger);
		    var fdrlocal = accountManager.localFoldersServer
			.rootFolder;
		    var content = "";
		    var MsgService = messenger
			.messageServiceFromURI(messageURI);
		    var messageHDR = messenger.msgHdrFromURI(messageURI);
		    var MsgStream = Components
			.classes["@mozilla.org/network/sync-stream-listener;1"]
			.createInstance();
		    var consumer = MsgStream
			.QueryInterface(Components.interfaces.nsIInputStream);
		    var ScriptInput = Components
			.classes["@mozilla.org/scriptableinputstream;1"]
			.createInstance();
		    var ScriptInputStream = ScriptInput
			.QueryInterface(Components.interfaces
					.nsIScriptableInputStream);
		    
		    //dump("Checking message : " + messageURI + "\n");
		    
		    ScriptInputStream .init(consumer);
		    try {
			MsgService .streamMessage(messageURI, MsgStream,
						  msgWindow, null, false,null);
		    }
		    catch (ex) {}
		    ScriptInputStream .available();
		    var headerready=false;
		    var xsendlaterpresent=false;
		    
		    while ((ScriptInputStream .available()) &&
			   ( (!headerready) || 
			     (headerready && xsendlaterpresent) )) {
			content = content + ScriptInputStream .read(512);
			if (!headerready && content.match(/\r\n\r\n/)) {
			    headerready = true;
			    if (content.match(/\r\nX-Send-Later-At:.*/))
				xsendlaterpresent = true;
			}
		    }
		    Sendlater3Util.dump("HeaderReady = " + headerready +
					" , SendLaterPresent = " + 
					xsendlaterpresent);
		    var gotcha;
		    if (xsendlaterpresent)
			gotcha = content
			.match(/\r\nX-Send-Later-At:.*/).toString();
		    else
			gotcha = false;
		    if (gotcha) {
			Sendlater3Composing.prevXSendLater = 
			    new Date (gotcha.substr(18));
			Sendlater3Util.dump("PrevXSendLater = " +
					    Sendlater3Composing.prevXSendLater);
		    } 
		}
	    }
	}                            

	var mysleventListener = {
	    handleEvent : function(event) { 
		CheckForXSendLater(); 
		if (SENDLATER3_TOOLBAR_SetOnLoad) {
		    SENDLATER3_TOOLBAR_SetOnLoad();
		}
	    } 
	}

	document.getElementById("msgcomposeWindow")
	    .addEventListener("compose-window-init",mysleventListener,false);
    },

    CheckSendAt: function() {
	window.openDialog("chrome://sendlater3/content/prompt.xul",
			  "SendAtWindow", "modal,chrome,centerscreen", 
			  { finishCallback: Sendlater3Composing.SendAtTime,
			    continueCallback: Sendlater3Composing.ContinueSendLater,
			    cancelCallback: Sendlater3Composing.CancelSendLater,
			    previouslyTimed: Sendlater3Composing.prevXSendLater });
    },

    ReallySendAtTimer: null,
    ReallySendAtClosure: null,
    ReallySendAtCallback: {
	notify: function (timer) {
	    var sendat = Sendlater3Composing.ReallySendAtClosure;

	    gCloseWindowAfterSave = true;
	    Sendlater3Composing.GenericSendMessage(
		nsIMsgCompDeliverMode.SaveAsDraft,
		sendat);
	    defaultSaveOperation = "draft";
	}
    },

    SendAtTime: function(sendat) {
	Sendlater3Composing.ReallySendAtClosure = sendat;
	Sendlater3Composing.ReallySendAtTimer = Components
	    .classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	Sendlater3Composing.ReallySendAtTimer.initWithCallback(
	    Sendlater3Composing.ReallySendAtCallback,
	    500,
	    Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
    },

    ContinueSendLaterTimer: null,
    ContinueSendLaterCallback: {
	notify: function (timer) {
	    goDoCommand('cmd_sendLater');
	}
    },

    ContinueSendLater: function() {
	Sendlater3Composing.ContinueSendLaterTimer = Components
	    .classes["@mozilla.org/timer;1"]
	    .createInstance(Components.interfaces.nsITimer);
	Sendlater3Composing.ContinueSendLaterTimer.initWithCallback(
	    Sendlater3Composing.ContinueSendLaterCallback,
	    500,
	    Components.interfaces.nsITimer.TYPE_ONE_SHOT
	);
    },

    CancelSendLater: function() {},

    prevXSendLater: false,

    // Copied from mail/components/compose/content/MsgComposeCommands.js
    // in Thunderbird 3.1 source. Unfortunately, I can't find a better way
    // than this to interpose Send Later into the message send flow.
    // SENDMAIL3 CHANGED: Added "sendat" argument
    GenericSendMessage: function( msgType, sendat )
    {
	if (gMsgCompose != null)
	{
	    var msgCompFields = gMsgCompose.compFields;
	    if (msgCompFields)
	    {
		Recipients2CompFields(msgCompFields);

		// BEGIN SENDLATER3 ADDED
		var head = "X-Send-Later-At: " + Sendlater3Util.FormatDateTime(sendat,true) + "\r\n";
		msgCompFields.otherRandomHeaders += head;
		// END SENDLATER3 ADDED

		var subject = GetMsgSubjectElement().value;
		msgCompFields.subject = subject;
		Attachments2CompFields(msgCompFields);

		if (msgType == nsIMsgCompDeliverMode.Now ||
		    msgType == nsIMsgCompDeliverMode.Later ||
		    msgType == nsIMsgCompDeliverMode.Background
		    // BEGIN SENDLATER3 ADDED
		    // Note that when this function is called, msgType will
		    // always be SaveAsDraft, but I'm just adding this condition
		    // here rather than getting rid of the conditional to keep
		    // the number of changes to the copied code as small as
		    // possible, to make it easier to merge new versions of that
		    // code in later.
		    || msgType == nsIMsgCompDeliverMode.SaveAsDraft
		    // END SENDLATER3 ADDED
		   )
		{
		    //Do we need to check the spelling?
		    if (getPref("mail.SpellCheckBeforeSend"))
		    {
			// We disable spellcheck for the following -subject line, attachment pane, identity and addressing widget
			// therefore we need to explicitly focus on the mail body when we have to do a spellcheck.
			SetMsgBodyFrameFocus();
			window.cancelSendMessage = false;
			try {
			    window.openDialog("chrome://editor/content/EdSpellCheck.xul", "_blank",
					      "chrome,close,titlebar,modal", true, true);
			}
			catch(ex){}
			if(window.cancelSendMessage)
			    return;
		    }

		    // Strip trailing spaces and long consecutive WSP sequences from the
		    // subject line to prevent getting only WSP chars on a folded line.
		    var fixedSubject = subject.replace(/\s{74,}/g, "    ")
			.replace(/\s*$/, "");
		    if (fixedSubject != subject)
		    {
			subject = fixedSubject;
			msgCompFields.subject = fixedSubject;
			GetMsgSubjectElement().value = fixedSubject;
		    }

		    // Remind the person if there isn't a subject
		    if (subject == "")
		    {
			var bundle = document.getElementById("bundle_composeMsgs");
			if (gPromptService.confirmEx(
			    window,
			    bundle.getString("subjectEmptyTitle"),
			    bundle.getString("subjectEmptyMessage"),
			    (gPromptService.BUTTON_TITLE_IS_STRING * gPromptService.BUTTON_POS_0) +
				(gPromptService.BUTTON_TITLE_IS_STRING * gPromptService.BUTTON_POS_1),
			    bundle.getString("sendWithEmptySubjectButton"),
			    bundle.getString("cancelSendingButton"),
			    null, null, {value:0}) == 1)
			{
			    GetMsgSubjectElement().focus();
			    return;
			}
		    }

		    // Alert the user if
		    //  - the button to remind about attachments was clicked, or
		    //  - the aggressive pref is set and the notification was not dismissed
		    // and the message (still) contains attachment keywords.
		    if ((gRemindLater || (getPref("mail.compose.attachment_reminder_aggressive") &&
					  document.getElementById("attachmentNotificationBox").currentNotification)) &&
			ShouldShowAttachmentNotification(false)) {
			var bundle = document.getElementById("bundle_composeMsgs");
			var flags = gPromptService.BUTTON_POS_0 * gPromptService.BUTTON_TITLE_IS_STRING +
			    gPromptService.BUTTON_POS_1 * gPromptService.BUTTON_TITLE_IS_STRING;
			var hadForgotten = gPromptService.confirmEx(window,
								    bundle.getString("attachmentReminderTitle"),
								    bundle.getString("attachmentReminderMsg"),
								    flags,
								    bundle.getString("attachmentReminderFalseAlarm"),
								    bundle.getString("attachmentReminderYesIForgot"),
								    null, null, {value:0});
			if (hadForgotten)
			    return;
		    }

		    // check if the user tries to send a message to a newsgroup through a mail account
		    var currentAccountKey = getCurrentAccountKey();
		    var account = gAccountManager.getAccount(currentAccountKey);
		    if (!account)
		    {
			throw "UNEXPECTED: currentAccountKey '" + currentAccountKey +
			    "' has no matching account!";
		    }
		    var servertype = account.incomingServer.type;

		    if (servertype != "nntp" && msgCompFields.newsgroups != "")
		    {
			// SENDLATER3 CHANGED: "let" -> "var"
			var kDontAskAgainPref = "mail.compose.dontWarnMail2Newsgroup";
			// default to ask user if the pref is not set
			var dontAskAgain = getPref(kDontAskAgainPref);
			if (!dontAskAgain)
			{
			    var checkbox = {value:false};
			    var bundle = document.getElementById("bundle_composeMsgs");
			    var okToProceed = gPromptService.confirmCheck(
				window,
				bundle.getString("noNewsgroupSupportTitle"),
				bundle.getString("recipientDlogMessage"),
				bundle.getString("CheckMsg"),
				checkbox);

			    if (!okToProceed)
				return;

			    if (checkbox.value) {
				var branch = Components.classes["@mozilla.org/preferences-service;1"]
				    .getService(Components.interfaces.nsIPrefBranch);

				branch.setBoolPref(kDontAskAgainPref, true);
			    }
			}

			// remove newsgroups to prevent news_p to be set
			// in nsMsgComposeAndSend::DeliverMessage()
			msgCompFields.newsgroups = "";
		    }

		    // Before sending the message, check what to do with HTML message, eventually abort.
		    var convert = DetermineConvertibility();
		    var action = DetermineHTMLAction(convert);
		    // check if e-mail addresses are complete, in case user
		    // has turned off autocomplete to local domain.
		    if (!CheckValidEmailAddress(msgCompFields.to, msgCompFields.cc, msgCompFields.bcc))
			return;

		    if (action == nsIMsgCompSendFormat.AskUser)
		    {
			var recommAction = (convert == nsIMsgCompConvertible.No)
			    ? nsIMsgCompSendFormat.AskUser
			    : nsIMsgCompSendFormat.PlainText;
			var result2 = {action:recommAction,
				       convertible:convert,
				       abort:false};
			window.openDialog("chrome://messenger/content/messengercompose/askSendFormat.xul",
					  "askSendFormatDialog", "chrome,modal,titlebar,centerscreen",
					  result2);
			if (result2.abort)
			    return;
			action = result2.action;
		    }

		    // we will remember the users "send format" decision
		    // in the address collector code (see nsAbAddressCollector::CollectAddress())
		    // by using msgCompFields.forcePlainText and msgCompFields.useMultipartAlternative
		    // to determine the nsIAbPreferMailFormat (unknown, plaintext, or html)
		    // if the user sends both, we remember html.
		    switch (action)
		    {
		    case nsIMsgCompSendFormat.PlainText:
			msgCompFields.forcePlainText = true;
			msgCompFields.useMultipartAlternative = false;
			break;
		    case nsIMsgCompSendFormat.HTML:
			msgCompFields.forcePlainText = false;
			msgCompFields.useMultipartAlternative = false;
			break;
		    case nsIMsgCompSendFormat.Both:
			msgCompFields.forcePlainText = false;
			msgCompFields.useMultipartAlternative = true;
			break;
		    default: dump("\###SendMessage Error: invalid action value\n"); return;
		    }
		}

		// hook for extra compose pre-processing
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.notifyObservers(window, "mail:composeOnSend", null);

		var originalCharset = gMsgCompose.compFields.characterSet;
		// Check if the headers of composing mail can be converted to a mail charset.
		if (msgType == nsIMsgCompDeliverMode.Now ||
		    msgType == nsIMsgCompDeliverMode.Later ||
		    msgType == nsIMsgCompDeliverMode.Background ||
		    msgType == nsIMsgCompDeliverMode.Save ||
		    msgType == nsIMsgCompDeliverMode.SaveAsDraft ||
		    msgType == nsIMsgCompDeliverMode.AutoSaveAsDraft ||
		    msgType == nsIMsgCompDeliverMode.SaveAsTemplate)
		{
		    var fallbackCharset = new Object;
		    // Check encoding, switch to UTF-8 if the default encoding doesn't fit
		    // and disable_fallback_to_utf8 isn't set for this encoding.
		    if (!gMsgCompose.checkCharsetConversion(getCurrentIdentity(), fallbackCharset))
		    {
			var disableFallback = false;
			try
			{
			    disableFallback = getPref("mailnews.disable_fallback_to_utf8." + originalCharset);
			}
			catch (e) {}
			if (disableFallback)
			    msgCompFields.needToCheckCharset = false;
			else
			    fallbackCharset.value = "UTF-8";
		    }

		    if (fallbackCharset &&
			fallbackCharset.value && fallbackCharset.value != "")
			gMsgCompose.SetDocumentCharset(fallbackCharset.value);
		}
		try {

		    // just before we try to send the message, fire off the compose-send-message event for listeners
		    // such as smime so they can do any pre-security work such as fetching certificates before sending
		    var event = document.createEvent('UIEvents');
		    event.initEvent('compose-send-message', false, true);
		    var msgcomposeWindow = document.getElementById("msgcomposeWindow");
		    msgcomposeWindow.setAttribute("msgtype", msgType);
		    msgcomposeWindow.dispatchEvent(event);
		    if (event.getPreventDefault())
			throw Components.results.NS_ERROR_ABORT;

		    gAutoSaving = (msgType == nsIMsgCompDeliverMode.AutoSaveAsDraft);
		    // disable the ui if we're not auto-saving
		    if (!gAutoSaving)
		    {
			gWindowLocked = true;
			disableEditableFields();
			updateComposeItems();
		    }
		    // if we're auto saving, mark the body as not changed here, and not
		    // when the save is done, because the user might change it between now
		    // and when the save is done.
		    else
			SetContentAndBodyAsUnmodified();

		    var progress = Components.classes["@mozilla.org/messenger/progress;1"].createInstance(Components.interfaces.nsIMsgProgress);
		    if (progress)
		    {
			progress.registerListener(progressListener);
			gSendOrSaveOperationInProgress = true;
		    }
		    msgWindow.domWindow = window;
		    msgWindow.rootDocShell.allowAuth = true;
		    gMsgCompose.SendMsg(msgType, getCurrentIdentity(), currentAccountKey, msgWindow, progress);
		}
		catch (ex) {
		    dump("failed to SendMsg: " + ex + "\n");
		    gWindowLocked = false;
		    enableEditableFields();
		    updateComposeItems();
		}
		if (gMsgCompose && originalCharset != gMsgCompose.compFields.characterSet)
		    SetDocumentCharacterSet(gMsgCompose.compFields.characterSet);
	    }
	}
	else
	    dump("###SendMessage Error: composeAppCore is null!\n");
    }
}

Sendlater3Composing.main();
