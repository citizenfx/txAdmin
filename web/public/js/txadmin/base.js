/* eslint-disable no-unused-vars */
//================================================================
//============================================= Settings & Helpers
//================================================================
//Settings & constants
const REQ_TIMEOUT_SHORT = 1_500;
const REQ_TIMEOUT_MEDIUM = 5_000;
const REQ_TIMEOUT_LONG = 9_000;
const REQ_TIMEOUT_REALLY_LONG = 15_000;
const REQ_TIMEOUT_REALLY_REALLY_LONG = 30_000;
const SPINNER_HTML = '<div class="txSpinner">Loading...</div>';

//Helpers
const anyUndefined = (...args) => { return [...args].some((x) => (typeof x === 'undefined')); };
const xss = (x) => {
    let tmp = document.createElement('div');
    tmp.innerText = x;
    return tmp.innerHTML;
};
const convertMarkdown = (input, inline = false) => {
    const toConvert = xss(input)
        .replaceAll(/\n/g, '  \n')
        .replaceAll(/\t/g, '&emsp;');
    const markedOptions = {
        breaks: true,
    };
    const func = inline ? marked.parseInline : marked.parse;
    return func(toConvert, markedOptions)
        .replaceAll('&amp;lt;', '&lt;')
        .replaceAll('&amp;gt;', '&gt;');
};

//Navigates parent without refreshing the page
const navigateParentTo = (href) => {
    return window.parent.postMessage({ type: 'navigateToPage', href});
};

//================================================================
//================================================= Event Handlers
//================================================================
//Page load
document.addEventListener('DOMContentLoaded', function(event) {
    if (typeof $.notifyDefaults !== 'undefined') {
        $.notifyDefaults({
            z_index: 2000,
            mouse_over: 'pause',
            placement: {
                align: 'center',
            },
            offset: {
                y: 8,
            },
        });
    }

    if (typeof jconfirm !== 'undefined') {
        jconfirm.defaults = {
            title: 'Confirm:',

            draggable: false,
            escapeKey: true,
            closeIcon: true,
            backgroundDismiss: true,

            typeAnimated: false,
            animation: 'scale',

            type: 'red',
            columnClass: 'medium',
            theme: document.body.classList.contains('theme--dark') ? 'dark' : 'light',
        };
    }
});


//================================================================
//================================================= Helper funcs
//================================================================
const checkApiLogoutRefresh = (data) => {
    if (data.logout === true) {
        window.parent.postMessage({ type: 'logoutNotice' });
        return true;
    } else if (data.refresh === true) {
        window.location.reload(true);
        return true;
    }
    return false;
};
//usage: if (checkApiLogoutRefresh(data)) return;


/**
 * To display the markdown errors.
 * NOTE: likely deprecate when creating default api response handlers
 * @param {object} data
 * @param {object} notify
 * @returns
 */
const updateMarkdownNotification = (data, notify) => {
    if (data.markdown === true) {
        let msgHtml = convertMarkdown(data.message, true);
        if (data.type === 'danger') {
            msgHtml += `<div class="text-right">
                <small>
                    For support, visit <strong><a href="http://discord.gg/txAdmin" target="_blank" class="text-dark">discord.gg/txAdmin</a></strong>.
                </small>
            </div>`;
        }

        notify.update('progress', 0);
        notify.update('type', data.type);
        notify.update('message', msgHtml);

        //since we can't change the duration with an update
        setTimeout(() => {
            notify.update('progress', 0);
        }, 5000);
    } else {
        notify.update('progress', 0);
        notify.update('type', data.type);
        notify.update('message', data.message);
    }
    return false;
};

//Must be as close to a JQuery $.ajax() as possible
//TODO: abstract a little bit more and use fetch
//TODO: use the function above for all calls
//NOTE: datatype is the expected return, we can probably remove it
//NOTE: still one $.ajax at setup.html > setFavTemplatesCards
//NOTE: to send json:
//  data: JSON.stringify(data)
//  contentType: 'application/json'
const txAdminAPI = ({type, url, data, dataType, timeout, success, error}) => {
    if (anyUndefined(type, url)) return false;

    url = TX_BASE_PATH + url;
    timeout = timeout ?? REQ_TIMEOUT_MEDIUM;
    dataType = dataType ?? 'json'; //This is the expected return type, not request type
    let contentType;
    if (typeof data === 'object') {
        if (data === null) throw new TypeError('txAdminAPI data cannot be null');
        if (Object.prototype.toString.call(data) === '[object Object]') {
            data = JSON.stringify(data);
            contentType = 'application/json';
        }
    }
    success = success || (() => {});
    error = error || (() => {});
    const headers = {'X-TxAdmin-CsrfToken': (csrfToken) ? csrfToken : 'not_set'}
    // console.log(`txAdminAPI Req to: ${url}`);
    return $.ajax({type, url, timeout, data, dataType, contentType, success, error, headers});
};

const txAdminAlert = ({content, modalColor, title}) => {
    $.confirm({
        title,
        content: content,
        type: modalColor || 'green',
        buttons: {
            close: {
                text: 'Close',
                keys: ['enter'],
            }
        },
    });
};

const txAdminConfirm = ({content, confirmBtnClass, modalColor, title}) => {
    return new Promise((resolve, reject) => {
        $.confirm({
            title,
            content: content,
            type: modalColor || 'red',
            buttons: {
                cancel: () => {resolve(false);},
                confirm:  {
                    btnClass: confirmBtnClass || 'btn-red',
                    keys: ['Enter', 'NumpadEnter'],
                    action: () => {resolve(true);},
                },
            },
            onClose: () => {resolve(false);},
        });
    });
};

const txAdminPrompt = ({
    confirmBtnClass = 'btn-blue',
    modalColor = 'blue',
    title = '',
    description = '',
    placeholder = '',
    required = true,
}) => {
    return new Promise((resolve, reject) => {
        $.confirm({
            title,
            type: modalColor,
            content: `
                <form action="">
                    <div class="form-group">
                        <label>${description}</label>
                        <input type="text" placeholder="${placeholder}" class="inputField form-control" ${required && 'required'} />
                    </div>
                </form>`,
            buttons: {
                cancel: () => {resolve(false);},
                formSubmit: {
                    text: 'Submit',
                    btnClass: confirmBtnClass,
                    action: function () {
                        resolve(this.$content.find('.inputField').val());
                    },
                },
            },
            onClose: () => {
                resolve(false);
            },
            onContentReady: function () {
                const jc = this;
                this.$content.find('form').on('submit', function (e) {
                    e.preventDefault();
                    jc.$$formSubmit.trigger('click');
                });
                this.$content.find('input').focus();
            },
        });
    });
};

//Starts a notify which is expected to take long
//This notify will keep being updated by adding dots at the end
const startHoldingNotify = (awaitingMessage) => {
    const holdingHtml = (secs) => {
        const extraDots = '.'.repeat(secs);
        return `<p class="text-center">${awaitingMessage}${extraDots}</p>`;
    }

    const notify = $.notify({ message: holdingHtml(0) }, {});
    let waitingSeconds = 0;
    const progressTimerId = setInterval(() => {
        waitingSeconds++;
        notify.update('message', holdingHtml(waitingSeconds));
        notify.update('progress', 0);
    }, 1000);

    return {notify, progressTimerId};
} 
