// ==UserScript==
// @name         Zealty.ca - remove extra 'scroll' class
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        *://www.zealty.ca/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zealty.ca
// @grant        GM_addStyle
//- The @grant directive is needed to restore the proper sandbox
// @updateURL    TBD
// @downloadURL  TBD
// ==/UserScript==

(function () {
  'use strict';

  console.log('Userscript - Remove scroll class for Zealty');

  waitForKeyElements('#container', removeClass);

  function removeClass(jNode) {
    console.log('Cleaned node: ', jNode);
    jNode.removeClass('scroll');
  }
})();
