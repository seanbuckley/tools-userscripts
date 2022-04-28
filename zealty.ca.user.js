// ==UserScript==
// @name         Zealty.ca remove scroll bar
// @version      0.2.1
// @namespace    https://github.com/seanbuckley/userscripts
// @license      MIT
// @description  Remove redundant scroll bar from Zealty.ca pages
// @author       Sean Buckley
// @match        *://www.zealty.ca/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zealty.ca
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/seanbuckley/userscripts/master/zealty.ca.user.js
// @downloadURL  https://raw.githubusercontent.com/seanbuckley/userscripts/master/zealty.ca.user.js
// @supportURL   https://github.com/seanbuckley/userscripts/issues
// ==/UserScript==

(function () {
  'use strict';
  console.log('Userscript - Removing the .scroll class from Zealty site');

  waitForKeyElements('#container', removeClass);

  function removeClass(targetNode) {
    targetNode.removeClass('scroll');
    console.log('Cleaned node: ', targetNode);
  }
})();
