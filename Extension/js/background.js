chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.executeScript(null, {file: "js/declutter.js"});
  chrome.tabs.executeScript(null, {file: "js/frontend.js"});
});
