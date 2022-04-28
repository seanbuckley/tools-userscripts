// ==UserScript==
// @name         Zealty.ca remove scroll bar
// @version      0.2
// @namespace    https://github.com/seanbuckley/userscripts
// @license      MIT
// @description  Remove redundant scroll bar from Zealty.ca pages
// @author       Sean Buckley
// @match        *://www.zealty.ca/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zealty.ca
// @grant        GM_addStyle
//- The @grant directive is needed to restore the proper sandbox
// @updateURL    https://raw.githubusercontent.com/seanbuckley/userscripts/master/zealty.ca.user.js
// @downloadURL  https://raw.githubusercontent.com/seanbuckley/userscripts/master/zealty.ca.user.js
// @supportURL   https://github.com/seanbuckley/userscripts/issues
// ==/UserScript==

(function () {
  'use strict';
  console.log('Userscript - Remove scroll class for Zealty');

  waitForKeyElements('#container', removeClass);

  const removeClass = (jNode) => {
    console.log('Cleaned node: ', jNode);
    jNode.removeClass('scroll');
  };
})();
