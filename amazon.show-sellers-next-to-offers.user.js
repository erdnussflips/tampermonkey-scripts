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
// @connect      archive.org
// @require      https://blissfuljs.com/bliss.shy.min.js
// ==/UserScript==

// See https://www.tampermonkey.net/documentation.php for Tampermonkey Documentation

(async function() {
    'use strict';

    let AMAZON_BASE_URL = window.location.origin;

    function HTMLParser(html){
        var document = window.document.implementation.createHTMLDocument();
        document.documentElement.innerHTML = html;
        return document;
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
        return Bliss.fetch(sellerUrlString)
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
                        console.log("Could not collect seller address for: " + sellerId, error)

                        try {
                            let sellerAbout = Bliss.$("#about-seller", document)[0]
                            sellerInformation.sellerAbout = sellerAbout
                        }
                        catch(error) {
                            console.log("Could not collect seller sellerAbout for: " + sellerId, error)
                        }
                    }
                }
                catch (error) {
                    console.log("Could not collect seller business information for: " + sellerId, error)
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

    function injectSellersInformation(offer, sellersInformation) {
        let presentingContainer = Bliss.$(".a-price:first-of-type", offer.node)[0].parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode
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

    function extendSearchResults() {
        if (window.location.pathname !== "/s") {
            return
        }

        let offers = collectOffers()
        offers.forEach(async function(offer){
            // console.log("Offer:", offer)

            let sellers = await collectSellersForOffer(offer.asin)
            // console.log("Seller IDs for offer: " + offer.asin, sellers)

            let sellersInformation = await Promise.all(sellers.map(function(seller){
                if (seller.sellerIsAmazon) {
                    console.log("Seller is Amazon")
                    return null
                }

                let sellerInformation = collectSellerInformation(seller.sellerId);
                return sellerInformation
            }))
            // console.log("Sellers information:", sellersInformation)

            injectSellersInformation(offer, sellersInformation)
        })
    }

    console.log("Hello from 'Amazon show sellers in search'")

    extendSearchResults()

})();