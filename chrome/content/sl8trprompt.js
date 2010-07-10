var sl8tr_prefservice = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);



var shortcut1value = sl8tr_prefservice.getIntPref("extensions.sl8tr.quickoptions.1.value");
var shortcut2value = sl8tr_prefservice.getIntPref("extensions.sl8tr.quickoptions.2.value");
var shortcut3value = sl8tr_prefservice.getIntPref("extensions.sl8tr.quickoptions.3.value");

var shortcut1label = sl8tr_prefservice.getComplexValue("extensions.sl8tr.quickoptions.1.label",
														Components.interfaces.nsISupportsString).data;
var shortcut2label = sl8tr_prefservice.getComplexValue("extensions.sl8tr.quickoptions.2.label",	
														Components.interfaces.nsISupportsString).data;

var shortcut3label = sl8tr_prefservice.getComplexValue("extensions.sl8tr.quickoptions.3.label",
														Components.interfaces.nsISupportsString).data;
			

function DZFormat(val)
{
   if (val < 10) return "0" + val; else return val;
}

function populateHours()
{

  var container = document.getElementById("hours");
  var i;
  for (i=0;i<24;i++)
  {
	var newitem = document.createElement("menuitem");
	newitem.setAttribute("label",DZFormat(i));
	newitem.setAttribute("value",i.toString());
	container.appendChild(newitem);
  }
   

}
function populateMins()
{

  var container = document.getElementById("mins");
  var i;
  for (i=0;i<60;i++)
  {
	var newitem = document.createElement("menuitem");
	newitem.setAttribute("label",DZFormat(i));
	newitem.setAttribute("value",i.toString());
	container.appendChild(newitem);
  }
   

}


function populateYears()
{
  var today = new Date();
  var container = document.getElementById("years");
  var i;
  for (i=0;i<5;i++)
  {
	var newitem = document.createElement("menuitem");
	newitem.setAttribute("label",(today.getFullYear()+i).toString());
	newitem.setAttribute("value",(today.getFullYear()+i).toString());
	container.appendChild(newitem);
  }
   
   document.getElementById("yearvalue").selectedIndex = 0;
}
function clearChildren(element)
{
while (element.childNodes.length>0)
{
   element.removeChild(element.childNodes[0]);
}

}

function populateMonths()
{
  var selectedyear =  document.getElementById("yearvalue").value;
  var today = new Date();
  var strbundle = document.getElementById("sl8trpromptstrings");
  var monthStr = [ strbundle.getString("January") ,strbundle.getString("February"),strbundle.getString("March"),strbundle.getString("April"),strbundle.getString("May"),strbundle.getString("June"),
					strbundle.getString("July"),strbundle.getString("August"),strbundle.getString("September"),strbundle.getString("October"),strbundle.getString("November"),strbundle.getString("December") ];
  var container = document.getElementById("months");
  clearChildren(container);
  var i = 0;
if (selectedyear == today.getFullYear())
{  
   i = today.getMonth();
}
  for (;i<12;i++)
  {
	var newitem = document.createElement("menuitem");
	newitem.setAttribute("label",monthStr[i]);
	newitem.setAttribute("value",i);
	container.appendChild(newitem);
  }
   document.getElementById("monthvalue").selectedIndex = 0;

}

function getMaxDays(year,month)
{
 var oneDay = (1000 * 60 * 60 * 24);
  var today = new Date();
today.setFullYear(parseInt(year));
today.setDate(1);
month++;
today.setMonth(month);
var bt = today.toString();
today.setTime(today.valueOf() - oneDay);
return today.getDate();

}
function populateDays()
{
var today = new Date();

  var selectedyear =  document.getElementById("yearvalue").value;
  var selectedmonth =  document.getElementById("monthvalue").value;

  var container = document.getElementById("days");
  clearChildren(container);
  var i=0;
if ( (selectedyear == today.getFullYear()) && (selectedmonth == today.getMonth()) )
{  
   i = today.getDate() - 1;
}
  for (;i<getMaxDays(selectedyear,selectedmonth);i++)
  {
	var newitem = document.createElement("menuitem");
	newitem.setAttribute("label",(i+1).toString());
	newitem.setAttribute("value",(i+1).toString());
	container.appendChild(newitem);
  }
   document.getElementById("dayvalue").selectedIndex = 0;
}

function updateSummary()
{

var sendat = new Date();
  var selectedyear =  document.getElementById("yearvalue").value;
  var selectedmonth =  document.getElementById("monthvalue").value;
  var selecteddate =  document.getElementById("dayvalue").value;
  var selectedhour =  document.getElementById("hourvalue").value;
  var selectedmin =  document.getElementById("minvalue").value;
  sendat.setFullYear(parseInt(selectedyear));
sendat.setMonth(parseInt(selectedmonth));
sendat.setDate(parseInt(selecteddate));
sendat.setHours(parseInt(selectedhour));
sendat.setMinutes(parseInt(selectedmin));

	var strbundle = document.getElementById("sl8trpromptstrings");
    document.getElementById("summary").value = strbundle.getString("willsendat") + " " + sendat.toLocaleString();
    

}

function CallSendAt()
{
var sendat = new Date();
  var selectedyear =  document.getElementById("yearvalue").value;
  var selectedmonth =  document.getElementById("monthvalue").value;
  var selecteddate =  document.getElementById("dayvalue").value;
  var selectedhour =  document.getElementById("hourvalue").value;
  var selectedmin =  document.getElementById("minvalue").value;
 
sendat.setFullYear(parseInt(selectedyear));
sendat.setMonth(parseInt(selectedmonth));
sendat.setDate(parseInt(selecteddate));
sendat.setHours(parseInt(selectedhour));
sendat.setMinutes(parseInt(selectedmin));

window.arguments[0].finishCallback(sendat);

}

function CallSendAfter(mins)
{
var sendat = new Date();
sendat.setTime(sendat.getTime()+mins*60*1000);
window.arguments[0].finishCallback(sendat);
}

function SetOnLoad()
{
document.getElementById("yearvalue").addEventListener("ValueChange", populateMonths, false);
document.getElementById("monthvalue").addEventListener("ValueChange", populateDays, false);
document.getElementById("dayvalue").addEventListener("ValueChange", updateSummary , false);
document.getElementById("hourvalue").addEventListener("ValueChange", updateSummary , false);
document.getElementById("minvalue").addEventListener("ValueChange", updateSummary , false);
populateYears();
populateHours();
populateMins();
var hhmm = new Date();
document.getElementById("hourvalue").value = hhmm.getHours();
document.getElementById("minvalue").value = hhmm.getMinutes();
document.getElementById("shortcutbtn_1").label = shortcut1label;
document.getElementById("shortcutbtn_2").label = shortcut2label;
document.getElementById("shortcutbtn_3").label = shortcut3label;
document.getElementById("shortcutbtn_1").setAttribute("oncommand","CallSendAfter(" + shortcut1value + ");close();");
document.getElementById("shortcutbtn_2").setAttribute("oncommand","CallSendAfter(" + shortcut2value + ");close();");
document.getElementById("shortcutbtn_3").setAttribute("oncommand","CallSendAfter(" + shortcut3value + ");close();");
document.getElementById("quickbutton1-key").setAttribute("oncommand","CallSendAfter(" + shortcut1value + ");close();");
document.getElementById("quickbutton2-key").setAttribute("oncommand","CallSendAfter(" + shortcut2value + ");close();");
document.getElementById("quickbutton3-key").setAttribute("oncommand","CallSendAfter(" + shortcut3value + ");close();");

var prevXSendLater = window.arguments[0].previouslyTimed;
	if (prevXSendLater)
	{
	   document.getElementById("yearvalue").value = prevXSendLater.getFullYear();
	   document.getElementById("monthvalue").value = prevXSendLater.getMonth();
	   document.getElementById("dayvalue").value = prevXSendLater.getDate();
	   document.getElementById("hourvalue").value = prevXSendLater.getHours();
	   document.getElementById("minvalue").value = prevXSendLater.getMinutes();
	}
document.getElementById("cancelButton").focus();
}