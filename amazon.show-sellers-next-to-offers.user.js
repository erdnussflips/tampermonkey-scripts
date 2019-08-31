// ==UserScript==
// @name         Amazon - Show sellers next to offers
// @version      0.1
// @description  Displays information about the seller in the search list and more places
// @author       erdnussflips
// @icon         https://www.amazon.com/favicon.ico
// @namespace    https://github.com/erdnussflips/tampermonkey-scripts
// @updateURL    https://raw.githubusercontent.com/erdnussflips/tampermonkey-scripts/master/amazon.show-sellers-next-to-offers.user.js
// @downloadURL  https://raw.githubusercontent.com/erdnussflips/tampermonkey-scripts/master/amazon.show-sellers-next-to-offers.user.js
// @supportURL   https://github.com/erdnussflips/tampermonkey-scripts/issues
// @include      /^https?:\/\/(www|smile)\.amazon\.(cn|in|co\.jp|sg|fr|de|it|nl|es|co\.uk|ca|com(\.(mx|au|br))?).*$/
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      self
// @connect      amazon.de
// @connect      amazon.com
// @connect      archive.org
// @connect      ust-id-pruefen.de
// @require      https://blissfuljs.com/bliss.shy.min.js
// @require      https://momentjs.com/downloads/moment.min.js
// ==/UserScript==

// See https://www.tampermonkey.net/documentation.php for Tampermonkey Documentation

(async function() {
    'use strict';

    const AMAZON_BASE_URL = window.location.origin;
    const AMAZON_NORMALIZED_BASE_URL = AMAZON_BASE_URL.replace(/^https?:\/\/(?:www|smile)\.amazon\.(.*)$/gm, "https://www.amazon.$1")

    String.prototype.isEmpty = function() {
        return (this.length === 0 || !this.trim());
    };

    function HTMLParser(htmlString){
        var document = window.document.implementation.createHTMLDocument();
        document.documentElement.innerHTML = htmlString;
        return document;
    }

    function JSONParser(jsonString) {
        return JSON.parse(jsonString);
    }

    function fetch(url, options = { method: "GET" }) {
        let GM_xmlhttpRequest_context = {
            url: url, // the destination URL
            // method: options.method, // one of GET, HEAD, POST
            // headers: options.headers, // ie. user-agent, referer, ... (some special headers are not supported by Safari and Android browsers)
            // data: options.data, // some string to send via a POST request
            // binary: options.binary, // send the data string in binary mode
            // timeout: options.timeout, // a timeout in ms
            // context: options.context, // a property which will be added to the response object
            // responseType: options.responseType, // one of arraybuffer, blob, json
            // overrideMimeType: options.overrideMimeType, // a MIME type for the request
            // anonymous: options.anonymous, // don't send cookies with the requests (please see the fetch notes)
            // fetch: options.fetch, // (beta) use a fetch instead of a xhr request (at Chrome this causes xhr.abort, details.timeout and xhr.onprogress to not work and makes xhr.onreadystatechange receive only readyState 4 events)
            // username: options.username, // a username for authentication
            // password: options.password, // a password
            onabort: function() {}, // callback to be executed if the request was aborted
            onerror: function() {}, // callback to be executed if the request ended up with an error
            onloadstart: function() {}, // callback to be executed if the request started to load
            onprogress: function() {}, // callback to be executed if the request made some progress
            onreadystatechange: function() {}, // callback to be executed if the request's ready state changed
            ontimeout: function() {}, // callback to be executed if the request failed due to a timeout
            // callback to be executed if the request was loaded. It gets one argument with the following attributes.
            onload: function(attributes = {
                finalUrl: undefined, // the final URL after all redirects from where the data was loaded
                readyState: undefined, // the ready state
                status: undefined, // the request status
                statusText: undefined, // the request status text
                responseHeaders: undefined, // the request response headers
                response: undefined, // the response data as object if details.responseType was set
                responseXML: undefined, // the response data as XML document
                responseText: undefined, // the response data as plain string
            }) {}
        };

        if (options && options.method) GM_xmlhttpRequest_context.method = options.method
        if (options && options.headers) GM_xmlhttpRequest_context.headers = options.headers
        if (options && options.data) GM_xmlhttpRequest_context.data = options.data
        if (options && options.binary) GM_xmlhttpRequest_context.binary = options.binary
        if (options && options.timeout) GM_xmlhttpRequest_context.timeout = options.timeout
        if (options && options.context) GM_xmlhttpRequest_context.context = options.context
        if (options && options.responseType) GM_xmlhttpRequest_context.responseType = options.responseType
        if (options && options.overrideMimeType) GM_xmlhttpRequest_context.overrideMimeType = options.overrideMimeType
        if (options && options.anonymous) GM_xmlhttpRequest_context.anonymous = options.anonymous
        if (options && options.fetch) GM_xmlhttpRequest_context.fetch = options.fetch
        if (options && options.username) GM_xmlhttpRequest_context.username = options.username
        if (options && options.password) GM_xmlhttpRequest_context.password = options.password


        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest_context.onload = (attributes) => {
                let callbackContext = {
                    responseURL: attributes.finalUrl,
                    response: attributes.response,
                    responseText: attributes.responseText,
                    responseType: attributes.responseType,
                    responseXML: attributes.responseXML,
                    status: attributes.status,
                    statusText: attributes.statusText,
                    headers: attributes.responseHeaders.split("\n")
                    /*
                    .map(item => {
                        let header = item.split(":")
                    }).reduce((map, header) => {
                        console.log(header)
                        if (header.length < 2) return map

                        map[header[0].trim()] = header[1].trim()
                        return map
                    }, {}),
                    */
                }

                if (attributes.status >= 200 && attributes.status < 300) {
                    resolve(callbackContext)
                } else {
                    reject(callbackContext)
                }
            }
            GM_xmlhttpRequest_context.onerror = (error) => {
                reject(error)
            }
            let gm_xhr = new GM_xmlhttpRequest(GM_xmlhttpRequest_context)
            return gm_xhr
        });
    }

    function archiveUrl(url) {
        const WEB_ARCHIVE_SAVE_BASE_URL = "https://web.archive.org/save/"
        const WEB_ARCHIVE_SAVE_URL = WEB_ARCHIVE_SAVE_BASE_URL + url

        let promise = fetch(WEB_ARCHIVE_SAVE_URL)
        promise.then(result => {
            // let contentLocation = result.headers["content-location"]
            let contentLocation = ""
            console.log("Archived:", url, "Archive:", "https://web.archive.org" + contentLocation)
        })
        promise.catch(error => {
            console.log("Failed to archive:", url, error)
        })
        return promise
    }

    async function fetchArchivedUrl(url) {
        const WEB_ARCHIVE_AVAILABLE_BASE_URL = "https://archive.org/wayback/available?url="
        const WEB_ARCHIVE_AVAILABLE_URL = WEB_ARCHIVE_AVAILABLE_BASE_URL + url

        let promise = fetch(WEB_ARCHIVE_AVAILABLE_URL)
        promise.then(result => {
            // console.log(result)
            let json = JSONParser(result.responseText)
            // console.log(json)

            if (json.archived_snapshots.closest) {
                let snapshot_timestamp = json.archived_snapshots.closest.timestamp
                let now = moment(new Date())
                let lastArchived = moment.utc(snapshot_timestamp, "YYYYMMDDHHmmss", true)
                let timeDifference = moment.duration(now.diff(lastArchived))
                let archiveOutdated = timeDifference.asDays() > 7

                if (!archiveOutdated) {
                    console.log("Archive up-to-date")
                    return
                }
            }

            console.log("Refresh archive of:", url)
            archiveUrl(url)
        })
        promise.catch(error => {
            archiveUrl(url)
        })

        let fetchResult = await promise
        // console.log(fetchResult)

        let json = JSONParser(fetchResult.responseText)

        if (json.archived_snapshots.closest && json.archived_snapshots.closest.available) {
            return json.archived_snapshots.closest.url
        }

        return null
    }

    async function fetchArchivableUrl(url) {
        let promiseForArchivedUrl = fetchArchivedUrl(url)

        let promise = Bliss.fetch(url)
        let fetchResult = await promise

        // Handle amazon ddos protection
        if (fetchResult.status === 503) {
            let archivedUrl = await promiseForArchivedUrl
            if (archivedUrl) {
                return fetch(archivedUrl)
            }
        }

        return promise
    }

    function collectOffers() {
        let searchResults = Bliss.$("[data-component-type=s-search-results] [data-asin]:not(.AdHolder)")
        let offers = searchResults.map(function(item){
            let offer = {
                node: item,
                asin: item.attributes["data-asin"].value
            }

            return offer
        })
        return offers
    }

    function collectSellersForOffer(offerId) {
        return Bliss.fetch(AMAZON_BASE_URL + "/gp/offer-listing/" + offerId)
        .then(function(request){
            let document = HTMLParser(request.response)
            let sellers = Bliss.$(".olpSellerName", document).map(function(item){
                let seller = {
                    sellerId: null,
                    sellerIsAmazon: false
                }

                let imgElement = Bliss.$("img", item)[0]
                if (imgElement && imgElement.alt.startsWith("Amazon")) {
                    seller.sellerIsAmazon = true
                    seller.sellerNameOfAmazon = imgElement.alt
                }

                let aElement = Bliss.$("a:first-child", item)[0]
                if (aElement) {
                    let url = new URL(aElement.href);
                    let sellerId = url.searchParams.get("seller");

                    if (sellerId == null) {
                        let matches = url.pathname.match(/\/shops\/([^\/]*)/)
                        sellerId = matches[1]
                    }

                    seller.sellerId = sellerId
                }

                return seller
            })

            return sellers
        })
        .catch(function(error){
            console.log(error)
        });
    }

    function collectSellerInformation(sellerId) {
        let sellerUrlString = AMAZON_BASE_URL + "/sp?seller=" + sellerId
        return fetchArchivableUrl(sellerUrlString)
        .then(function(request){
            let document = HTMLParser(request.response)

            let sellerInformation = {
                sellerId: sellerId,
                sellerUrl: new URL(sellerUrlString),
                sellerName: null,
                sellerBusinessName: null,
                sellerBusinessAddress: null,
                sellerAbout: null,
                sellerImpressAndInfos: null
            }

            try {
                let sellerName = Bliss.$("#sellerName", document)[0].innerText
                let sellerLogHint = sellerId + " ("+sellerName+")"
                sellerInformation.sellerName = sellerName

                try {
                    let sellerImpressAndInfos = Bliss.$("#-component-heading + ul", document)[0]
                    sellerInformation.sellerImpressAndInfos = sellerImpressAndInfos

                    let sellerBusinessName = Bliss.$("#-component-heading + ul > li:first-child > span", document)[0].childNodes[1].data
                    sellerInformation.sellerBusinessName = sellerBusinessName

                    try {
                        let sellerBusinessAddress = Array.from(Bliss.$("#-component-heading + ul > li:last-child ul", document)[0].childNodes)
                        .map(function(node){
                            return node.innerText
                        })

                        sellerInformation.sellerBusinessAddress = sellerBusinessAddress
                    }
                    catch (error) {
                        console.log("Could not collect seller address for: " + sellerLogHint, error)

                        try {
                            let sellerAbout = Bliss.$("#about-seller", document)[0]
                            sellerInformation.sellerAbout = sellerAbout
                        }
                        catch(error) {
                            console.log("Could not collect seller sellerAbout for: " + sellerLogHint, error)
                        }
                    }
                }
                catch (error) {
                    console.log("Could not collect seller business information for: " + sellerLogHint, error)
                }

                return sellerInformation
            }
            catch(error) {
                console.log("Could not collect seller information for: " + sellerId, error)
            }

        })
        .catch(function(error){
            console.log("Request failed for: " + sellerId, error)
        });
    }

    function collectVatIdCheck(vatId) {
        return fetch("https://api2.ust-id-pruefen.de/vat-id-check.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            data: "vatId=" + vatId
        })
        .then(response => {
            console.log(response)
        })
        .catch(function(error){
            console.log(error)
        })
    }

    function injectSellersInformation(presentingContainer, sellersInformation) {
        sellersInformation.forEach(function(sellerInformation) {
            // console.log(sellerInformation)
            Bliss.contents(presentingContainer, {
                tag: "p",
                className: "a-spacing-top-small a-spacing-small",
                contents: [
                    {
                        tag: "a",
                        href: sellerInformation.sellerUrl,
                        textContent: sellerInformation.sellerName + " (" + sellerInformation.sellerId + ")"
                    },
                    " | ",
                    [sellerInformation.sellerBusinessName, sellerInformation.sellerBusinessAddress].join(" | ")
                ]
            })
        })

    }

    async function loadAllSellerInformationForOffer(offerId) {
        // console.log("Offer:", offer)

        let sellers = await collectSellersForOffer(offerId)
        // console.log("Seller IDs for offer: " + offer.asin, sellers)

        let sellersInformation = await Promise.all(sellers.map(function(seller){
            if (seller.sellerIsAmazon) {
                // console.log("Seller is Amazon")
                return {
                    sellerId: seller.sellerNameOfAmazon,
                    sellerName: seller.sellerNameOfAmazon,
                    sellerBusinessName: seller.sellerNameOfAmazon,
                    sellerUrl: new URL(AMAZON_BASE_URL)
                }
            }

            let sellerInformation = collectSellerInformation(seller.sellerId);
            return sellerInformation
        }))

        return sellersInformation
    }

    function extendSearchResults() {
        if (window.location.pathname !== "/s") {
            return
        }

        let offers = collectOffers()
        offers.forEach(async function(offer){
            let sellersInformation = await loadAllSellerInformationForOffer(offer.asin)
            let presentingContainer = Bliss.$(".a-price:first-of-type", offer.node)[0].parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
            injectSellersInformation(presentingContainer, sellersInformation)
        })
    }

    async function extendOfferPage() {
        let matches = window.location.pathname.match(/(?:(?:\/[^\/]+)?\/dp\/([^\/?#]+))|(?:\/gp\/product\/([^\/?#]+))/)
        if (!matches || matches.length == 0) {
            return
        }

        let offerAsin = matches[1] || matches[2]

        let sellers = await collectSellersForOffer(offerAsin)
            let sellersInformation = await loadAllSellerInformationForOffer(offerAsin)
            let presentingContainer = Bliss.$("#olp_feature_div", window.document)[0]
            injectSellersInformation(presentingContainer, sellersInformation)
    }

    console.log("Hello from 'Amazon show sellers in search'")

    extendSearchResults()
    extendOfferPage()

})();