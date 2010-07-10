
var sendlater3columnHandler = {
   getCellText: function(row, col) {
    var key = gDBView.getKeyAt(row);
    var hdr = gDBView.db.GetMsgHdrForKey(key);
    var retval = hdr.getStringProperty("x-send-later-at");
	if (retval != "") 
	{
	var retdate = new Date(retval);
    var dateFormatService = Components.classes["@mozilla.org/intl/scriptabledateformat;1"]
                                    .getService(Components.interfaces.nsIScriptableDateFormat);
	return dateFormatService.FormatDateTime("",dateFormatService.dateFormatShort,dateFormatService.timeFormatNoSeconds,retdate.getFullYear(),retdate.getMonth()+1,retdate.getDate(),
							retdate.getHours(),retdate.getMinutes(),0);
	} else return null;
   },

   getSortStringForRow: function(hdr) {
    return null;
   },
   
   isString:            function() {return false;},
   getCellProperties:   function(row, col, props){},
   getImageSrc:         function(row, col) {return null;},
   getRowProperties: function(row,props){},
    getColumnProperties: function(colid,col,props){},
	getSortLongForRow:   function(hdr) {
	if (hdr.getStringProperty("x-send-later-at"))
	{
     var hdrdate = new Date(hdr.getStringProperty("x-send-later-at"));
	  return hdrdate.valueOf();
	}
	else
	{
		return 0;
	}
	}
}

function IsThisDraft(msgFolder)
{

	var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
	
	var thisisdraft = false;
	
	var fdrlocal = accountManager.localFoldersServer.rootFolder;
	if (fdrlocal.findSubFolder("Drafts").URI==msgFolder.URI) thisisdraft = true;
	

	var identities = accountManager.GetIdentitiesForServer(msgFolder.server);
	
	for (idindex = 0;idindex < identities.Count(); idindex++)
	{  
		if (identities.GetElementAt(idindex).QueryInterface(Components.interfaces.nsIMsgIdentity).draftFolder==msgFolder.URI)
			thisisdraft = true;
	}
	

    return(thisisdraft);

}

function addSENDLATER3ColumnHandler() {
	

   
  if ( IsThisDraft(gDBView.viewFolder) )
  {	
		if (sendlater3_prefservice.getBoolPref("extensions.sendlater3.showcolumn"))
			{
				document.getElementById("colXSendLaterAt").hidden = false;
			}
			else
			{
				document.getElementById("colXSendLaterAt").hidden = true;
			}
    gDBView.addColumnHandler("colXSendLaterAt",sendlater3columnHandler);
	
  }
  else
  {
   document.getElementById("colXSendLaterAt").hidden = true;
   
  }
    
}






var sendlater3_HeaderDisplay = 
{
dispHeader: function ()
{

	if (sendlater3_prefservice.getBoolPref("extensions.sendlater3.showheader"))
	{	
		if (IsThisDraft(gDBView.viewFolder))
		{	
			var msghdr = gDBView.hdrForFirstSelectedMessage;
			if (msghdr!=null)
			{
				if (msghdr.getStringProperty("x-send-later-at")!="")
				{
					var xsendlater = new Date(msghdr.getStringProperty("x-send-later-at"));
					
					document.getElementById("expandedx-send-later-atBox").headerValue = xsendlater.toLocaleString();
					document.getElementById("expandedx-send-later-atBox").hidden = false;
				}	
				else
				{
					document.getElementById("expandedx-send-later-atBox").headerValue = "Not scheduled";
					document.getElementById("expandedx-send-later-atBox").hidden = true;
				}
		
			}
			else
			{
				document.getElementById("expandedx-send-later-atBox").hidden = true;
			}
		}
		else
		{
			document.getElementById("expandedx-send-later-atBox").hidden = true;
		}
	}
	else
	{
		document.getElementById("expandedx-send-later-atBox").hidden = true;
	}
},
noop: function() { }

}

function sendlater3_HeaderView_SetupListener()
{

		var listener = {};
		listener.onStartHeaders	= sendlater3_HeaderDisplay.noop;
		listener.onEndHeaders	= sendlater3_HeaderDisplay.dispHeader;
		gMessageListeners.push(listener);
		window.document.getElementById('folderTree').addEventListener("select",addSENDLATER3ColumnHandler,false);

}

window.addEventListener("load",sendlater3_HeaderView_SetupListener,false);
