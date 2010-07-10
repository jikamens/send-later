var composelogMngr = null;
var composelogger = null;

function CSENDLATER3dump(msg)
{
  if (composelogger)
  {
     composelogger.log(3,msg);
  }
}


function CinitDebug()
{

	try 
	{
	composelogMngr = Components.classes["@mozmonkey.com/debuglogger/manager;1"]
		.getService(Components.interfaces.nsIDebugLoggerManager);
		composelogger = composelogMngr.registerLogger("Compose.SENDLATER3@UnsignedByte.com");
	}
	catch (e)
	{
	  composelogger = null;
	}		

}

CinitDebug();



var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"].createInstance();
msgWindow = msgWindow.QueryInterface(Components.interfaces.nsIMsgWindow);
var sendlater3ComposePrefs        = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);



var prevXSendLater = false;

function CheckForXSendLater()
{

 CSENDLATER3dump("CheckforXSendLater")
 if (gMsgCompose != null)
  {
    var msgCompFields = gMsgCompose.compFields;
    if (msgCompFields)
    {
		if (gMsgCompose.originalMsgURI!="")
		{
			CSENDLATER3dump("Checking " + gMsgCompose.originalMsgURI);
				var messageURI = gMsgCompose.originalMsgURI;
						var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
						var messenger = Components.classes["@mozilla.org/messenger;1"].getService(Components.interfaces.nsIMessenger);
						var fdrlocal = accountManager.localFoldersServer.rootFolder;
						var content = "";
						var MsgService = messenger.messageServiceFromURI(messageURI);
						var messageHDR = messenger.msgHdrFromURI(messageURI);
						var MsgStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
						var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
						var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
						var ScriptInputStream = ScriptInput .QueryInterface(Components.interfaces.nsIScriptableInputStream);
					
						//dump("Checking message : " + messageURI + "\n");
						
						ScriptInputStream .init(consumer);
						try
						{
							MsgService .streamMessage(messageURI, MsgStream, msgWindow, null, false,null);
						}
						catch (ex)
						{
						}
						ScriptInputStream .available();
						var headerready=false;
						var xsendlaterpresent=false;
						
						while ((ScriptInputStream .available()) && ( (!headerready) || (headerready && xsendlaterpresent) ))
						{
							content = content + ScriptInputStream .read(512);
							if (!headerready)
							{
							   if (content.match(/\r\n\r\n/))
							   {
								  headerready = true;
								  if (content.match(/\r\nX-Send-Later-At:.*/)) xsendlaterpresent = true;
							   }
							}
						}
					CSENDLATER3dump("HeaderReady = " + headerready + " , SendLaterPresent = " + xsendlaterpresent);
						var gotcha;
						if (xsendlaterpresent)
							gotcha =content.match(/\r\nX-Send-Later-At:.*/).toString();
						else
							gotcha = false;
						if (gotcha)
						{
							prevXSendLater = new Date (gotcha.substr(18));
							CSENDLATER3dump("PrevXSendLater = " + prevXSendLater);
						} 
		}
			
	}
  }
 
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
	if (includeTZ) {
		s += " ";
		if (offset < 0) {
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

function MyGenericSendMessage( msgType , sendat)
{
//  dump("GenericSendMessage from XUL\n");

//  dump("Identity = " + getCurrentIdentity() + "\n");

  if (gMsgCompose != null)
  {
    var msgCompFields = gMsgCompose.compFields;
    if (msgCompFields)
    {
    
      Recipients2CompFields(msgCompFields);
      
      var head = "X-Send-Later-At: " + FormatDateTime(sendat,true) + "\r\n";
      msgCompFields.otherRandomHeaders += head;
      
   			
      var subject = GetMsgSubjectElement().value;
      msgCompFields.subject = subject;
      Attachments2CompFields(msgCompFields);

      if (msgType == nsIMsgCompDeliverMode.Now || msgType == nsIMsgCompDeliverMode.Later || msgType == nsIMsgCompDeliverMode.SaveAsDraft)
      {
      
        //Do we need to check the spelling?
        if (sendlater3ComposePrefs.getBoolPref("mail.SpellCheckBeforeSend"))
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

        // Check if we have a subject, else ask user for confirmation
        if (subject == "")
        {
          if (gPromptService)
          {
            var result = {value:sComposeMsgsBundle.getString("defaultSubject")};
            if (gPromptService.prompt(
                    window,
                    sComposeMsgsBundle.getString("sendMsgTitle"),
                    sComposeMsgsBundle.getString("subjectDlogMessage"),
                    result,
                    null,
                    {value:0}))
            {
              msgCompFields.subject = result.value;
              var subjectInputElem = GetMsgSubjectElement();
              subjectInputElem.value = result.value;
            }
            else
              return;
          }
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
          // default to ask user if the pref is not set
          var dontAskAgain = sendlater3ComposePrefs.getBoolPref("mail.compose.dontWarnMail2Newsgroup");

          if (!dontAskAgain)
          {
            var checkbox = {value:false};
            var okToProceed = gPromptService.confirmCheck(
                                  window,
                                  sComposeMsgsBundle.getString("sendMsgTitle"),
                                  sComposeMsgsBundle.getString("recipientDlogMessage"),
                                  sComposeMsgsBundle.getString("CheckMsg"),
                                  checkbox);

            if (!okToProceed)
              return;

            if (checkbox.value)
              sendlater3ComposePrefs.setBoolPref(kDontAskAgainPref, true);
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
        // in the address collector code (see nsAbAddressCollecter::CollectAddress())
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

      // Check if the headers of composing mail can be converted to a mail charset.
      if (msgType == nsIMsgCompDeliverMode.Now || 
        msgType == nsIMsgCompDeliverMode.Later ||
        msgType == nsIMsgCompDeliverMode.Save || 
        msgType == nsIMsgCompDeliverMode.SaveAsDraft || 
        msgType == nsIMsgCompDeliverMode.AutoSaveAsDraft || 
        msgType == nsIMsgCompDeliverMode.SaveAsTemplate) 
      {
        var fallbackCharset = new Object;
        if (gPromptService && 
            !gMsgCompose.checkCharsetConversion(getCurrentIdentity(), fallbackCharset)) 
        {
          var dlgTitle = sComposeMsgsBundle.getString("initErrorDlogTitle");
          var dlgText = sComposeMsgsBundle.getString("12553");  // NS_ERROR_MSG_MULTILINGUAL_SEND
          var result3 = gPromptService.confirmEx(window, dlgTitle, dlgText,
              (gPromptService.BUTTON_TITLE_IS_STRING * gPromptService.BUTTON_POS_0) +
              (gPromptService.BUTTON_TITLE_CANCEL * gPromptService.BUTTON_POS_1) +
              (gPromptService.BUTTON_TITLE_IS_STRING * gPromptService.BUTTON_POS_2),
              sComposeMsgsBundle.getString('sendInUTF8'), 
              null,
              sComposeMsgsBundle.getString('sendAnyway'), null, {value:0}); 
          switch(result3)
          {
            case 0: 
              fallbackCharset.value = "UTF-8";
              break;
            case 1:  // cancel
              return;
            case 2:  // send anyway
              msgCompFields.needToCheckCharset = false;
              break;
          }
        }
        if (fallbackCharset && 
            fallbackCharset.value && fallbackCharset.value != "")
          gMsgCompose.SetDocumentCharset(fallbackCharset.value);
      }
      try {

        // just before we try to send the message, fire off the compose-send-message event for listeners
        // such as smime so they can do any pre-security work such as fetching certificates before sending
        var event = document.createEvent('Events');
        event.initEvent('compose-send-message', false, true);
        document.getElementById("msgcomposeWindow").dispatchEvent(event);
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
        //msgWindow.domWindow = window;
        //msgWindow.rootDocShell.allowAuth = true; Dont know why ?
		
		gMsgCompose.SendMsg(msgType, getCurrentIdentity(), currentAccountKey, msgWindow, progress);
      }
      catch (ex) {
        dump("failed to SendMsg: " + ex + "\n");
        gWindowLocked = false;
        enableEditableFields();
        updateComposeItems();
      }
    }
  }
  else
    dump("###SendMessage Error: composeAppCore is null!\n");
}

function ContinueSendLater()
{
	setTimeout("goDoCommand('cmd_sendLater')",500);
}

function ReallySendAt(sendatstring)
{
var sendat = new Date(sendatstring);

gCloseWindowAfterSave = true;
MyGenericSendMessage(nsIMsgCompDeliverMode.SaveAsDraft,sendat);
defaultSaveOperation = "draft";

}

function SendAtTime(sendat)
{

   setTimeout("ReallySendAt('"+sendat.toString()+"')",500);
}

function CancelSendLater()
{
}

function CheckSendAt()
{
window.openDialog("chrome://sendlater3/content/sendlater3prompt.xul", "Send at ?", "modal,chrome,centerscreen", 
                  {finishCallback: SendAtTime, continueCallback : ContinueSendLater, cancelCallback: CancelSendLater,previouslyTimed : prevXSendLater });
}



var mysleventListener = { handleEvent : function(event) { 
			CheckForXSendLater(); 
			if (SENDLATER3_TOOLBAR_SetOnLoad)
			{
				SENDLATER3_TOOLBAR_SetOnLoad();
			}
		} 
}


document.getElementById("msgcomposeWindow").addEventListener("compose-window-init",mysleventListener,false);
