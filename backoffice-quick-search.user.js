// ==UserScript==
// @name        Backoffice Quick Search
// @name:ja-JP  バックオフィスクイック検索
// @namespace   capsule-co.jp
// @match       https://backoffice.sps-system.com/*
// @match       https://*@backoffice.sps-system.com/*
// @require     https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js
// @require     https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/l10n/ja.js
// @resource    flatpickr_css https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_getResourceText
// @grant       GM_addStyle
// @version     1.0
// @author      tako2487
// @description 2023/10/11 0:19:27
// ==/UserScript==
(function () {
    "use strict";

    const $ = document.querySelector.bind(document);

    const billNoTypes = {
        docomo: {
            length: 12,
            settlementWay: "401",
            inputName: "docomoSettlementCd"
        },
        au: {
            length: 16,
            settlementWay: "402",
            inputName: "payInfoNo"
        },
        softbank: {
            length: 14,
            settlementWay: "405",
            inputName: "spsBillSequence",
        },
        custCode: {
            length: 6,
            settlementWay: "",
            inputName: "custNo",
        },
    };

    GM_addStyle(GM_getResourceText("flatpickr_css"));
    GM_addStyle(`
        #quick-search div {
            margin-top: 0.5em; margin-bottom: 0.5em;
        }

        #quick-search-config-modal {
            display: none;
            position: fixed;
            z-index: 999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
        }

        #quick-search-config-modal.show {
            display: block;
        }

        #quick-search-config-modal .modal-content {
            background-color: #fefefe;
            margin: 20% auto;
            padding: 16px;
            border: 2px solid black;
            width: 80%;
        }

        #quick-search-config-modal textarea {
            width: 100%;
        }

        #quick-search-config-modal .modal-footer {
            display: flex;
            justify-content: end;
            margin-top: 1em;
        }
    `);


    const modalHtml = `
        <div id="quick-search-config-modal" class="modal">
            <div class="modal-content">
            <div class="modal-body">
                <textarea id="quick-search-config-sites" rows="16"></textarea>
            <div>
            <div class="modal-footer">
                <button id="quick-search-config-modal-save-btn">保存</button>
            </div>
            </div>
        </div>
    `;

    $("#sidemenu").insertAdjacentHTML("beforeend", `<button id="quick-search-config-btn">&#9881;</button>`);
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modal = $("#quick-search-config-modal");
    const sitesConfigTextArea = $("#quick-search-config-sites");
    $("#quick-search-config-btn").addEventListener("click", e => {
        const sites = GM_getValue("sites");
        sitesConfigTextArea.value = JSON.stringify(sites, null, 2);
        modal.classList.add("show");
    });

    $("#quick-search-config-modal-save-btn").addEventListener("click", e => {
        try {
            const json = JSON.parse(sitesConfigTextArea.value);
            GM_setValue("sites", json);
            modal.classList.remove("show");
        } catch (e) {
            alert("設定をJSON形式で入力してください。");
        }
    });


    //quick search
    if (location.href.match("bill/ref.do")) {
        const billForm = $("[name=BillSearchForm]");
        const quickSearchHtml = `
            <div id="quick-search">
            <div>
                <label for="quick-bill-no">決済番号</label>
                <input id="quick-bill-no">
            </div>
            <div>
                <label for="quick-from-date">受注日時</label>
                <input id="quick-from-date" data-input-name="merchantProcessingDatetimeFr">
            </div>
            <div>
                <button type="button" id="quick-search-btn">クイック検索</button>
            </div>
            </div>
        `;

        billForm.insertAdjacentHTML("afterbegin", quickSearchHtml);
        const quickSearch = $("#quick-search");
        const quickBillNo = quickSearch.querySelector("#quick-bill-no");
        const quickFromDate = quickSearch.querySelector("#quick-from-date");
        const quickSearchBtn = quickSearch.querySelector("#quick-search-btn");
        const pickr = flatpickr(quickFromDate, {
            dateFormat: "Ymd",
            defaultDate: "20140101",
            locale: "ja",
        });

        pickr.jumpToDate(new Date);
        pickr.redraw();

        quickSearchBtn.addEventListener("click", e => {
            let type = null;
            for (const typeName in billNoTypes) {
                if (quickBillNo.value.length === billNoTypes[typeName].length) {
                    type = billNoTypes[typeName];
                    break;
                }
            }

            billForm.querySelector(`[name=${quickFromDate.dataset.inputName}]`).value = quickFromDate.value;

            if (type) {
                billForm.querySelector("[name=settlementWay]").value = type.settlementWay;
                billForm.querySelector(`[name=${type.inputName}]`).value = quickBillNo.value.replace(/[\s　-]/g);
                $("#kensaku").click();
            }
        });

    }


    //user search
    if (location.href.match("bill/list.do")) {
        const sites = GM_getValue("sites");
        const serviceName = $("h1").innerHTML.trim().replace("　｜", "");
        const site = sites[serviceName] || null;

        if (site) {
            const domain = site.domain;
            let urlFunc;
            switch (site.type) {
                case "mcps":
                    urlFunc = uid => `https://${domain}/manage_users/index/uid:${uid}`;
                    break;
                case "ibis":
                    urlFunc = uid => `https://${domain}/manage?temp_account=${uid}`;
                    break;
            }

            const snapshot = document
                .evaluate(
                    "//td[span[text()=\"顧客ID：\"]]/following-sibling::td",
                    document,
                    null,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                    null,
                );

            for (let i = 0; i < snapshot.snapshotLength; i++) {
                const el = snapshot.snapshotItem(i);
                const uid = el.innerHTML;
                const url = urlFunc(uid);
                el.insertAdjacentHTML("beforeend", `<div><a href="${url}" target="_blank">検索</a></div>`);
            }
        }
    }
})();
