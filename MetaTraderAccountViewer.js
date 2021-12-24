// metaTrader account info viewer
// author: xushunke

const ACCOUNT_ID_KEY = 'MetaTraderAccountViewer_AccountId';
const AUTH_TOKEN_KEY = 'MetaTraderAccountViewer_Token';

class MetaTraderAccountViewer {

    constructor() {
        this.accountId = Keychain.contains(ACCOUNT_ID_KEY) ? Keychain.get(ACCOUNT_ID_KEY) : null;
        this.authToken = Keychain.contains(AUTH_TOKEN_KEY) ? Keychain.get(AUTH_TOKEN_KEY) : null;
        this.widgetSize = config.widgetFamily
    }

    async init() {
        if (!config.runsInWidget) {
            let mainMenu = new Alert();
            mainMenu.addAction("sign in [metaapi]")
            mainMenu.addAction("sign up [metaapi]")
            mainMenu.addAction("logout")
            mainMenu.addAction("preview")
            mainMenu.addCancelAction("cancel")
            const retId = await mainMenu.presentSheet()
            switch (retId) {
                case 0:
                    let configAlert = new Alert();
                    configAlert.title = 'auth info';
                    configAlert.message = 'input auth info of app.metaapi.cloud';
                    configAlert.addTextField('input account id')
                    configAlert.addTextField('input auth-token')

                    configAlert.addAction('confirm');
                    configAlert.addCancelAction('cancel');

                    const id = await configAlert.presentAlert();
                    if (id === -1) {
                        return;
                    }
                    Keychain.set(ACCOUNT_ID_KEY, configAlert.textFieldValue(0));
                    Keychain.set(AUTH_TOKEN_KEY, configAlert.textFieldValue(1));
                    return;
                case 1:
                    let url = "https://app.metaapi.cloud/sign-up"
                    Safari.open(url)
                    break;
                case 2:
                    Keychain.remove(ACCOUNT_ID_KEY);
                    Keychain.remove(AUTH_TOKEN_KEY);
                    return;
                case 3:
                    this.test();
                    return;
                default:
                    return
            }
        }
        let widget = await this.render();
        Script.setWidget(widget);
        Script.complete();
    }

    async render() {
        if (!this.accountId || !this.authToken) {
            return await this.renderMsg('auth not found');
        }
        let info = await this.fetchAccountInfo();
        if (info['error'] === "TimeoutError") {
            let code = await this.deployMetaApi();
            console.log("MetaTraderAccountViewer:render:" + code);
            info = await this.fetchAccountInfo();
        }
        console.log("MetaTraderAccountViewer:render:" + JSON.stringify(info));
        if (this.widgetSize === 'medium') {
            return await this.renderSmall(info)
        } else if (this.widgetSize === 'large') {
            return await this.renderLarge(info)
        } else {
            return await this.renderSmall(info)
        }
    }

    async renderMsg(msg) {
        let w = new ListWidget()
        let t = w.addText(msg);
        t.centerAlignText()
        return w
    }

    async renderSmall(info) {
        let balance = info['balance'];
        let equity = info['equity'];
        let remain = equity - balance;
        let login = info['login'];
        let server = info['server'];
        let currency = info['currency'];
        let w = new ListWidget();
        {
            let header = w.addStack();
            {
                let icon = header.addImage(await this.loadFavicon());
                icon.imageSize = new Size(15, 15);
            }
            header.addSpacer(10)
            {
                let title = header.addText(`${server}:${login}`);
                title.textOpacity = 0.9
                title.font = Font.systemFont(14)
            }
        }
        w.addSpacer(20)
        {
            let flTxt = w.addText(`${Number(remain).toFixed(2)}${currency}`)
            if (remain > 0)
                flTxt.textColor = new Color("#1a08ee")
            else
                flTxt.textColor = new Color("#de0f0f")
            flTxt.centerAlignText()
            flTxt.font = Font.boldRoundedSystemFont(this.getFontsize(remain))
        }
        w.addSpacer(20)
        {
            let utTxt = w.addText(`update at: ${this.nowTime()}`)
            utTxt.font = Font.systemFont(12)
            utTxt.centerAlignText()
            utTxt.textOpacity = 0.5
        }

        return w;
    }

    getFontsize(num) {
        if (num < 99) {
            return 21
        } else if (num < 9999 && num > 100) {
            return 19
        } else if (num < 99999 && num > 10000) {
            return 17
        } else if (num < 999999 && num > 100000) {
            return 15
        } else if (num < 9999999 && num > 1000000) {
            return 13
        } else {
            return 11
        }
    }

    nowTime() {
        let date = new Date()
        return date.toLocaleTimeString('chinese', {hour12: false})
    }

    async renderLarge(info) {
        return await this.renderSmall(info);
    }

    async checkMetaApiStatus() {
        let api = `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts`
        let req = new Request(api)
        req.method = 'GET'
        req.headers = {"auth-token": this.authToken};
        let res = await req.loadJSON()
        return res[0]['connectionStatus'] === "CONNECTED";
    }

    async deployMetaApi() {
        let api = `https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${this.accountId}/deploy?executeForAllReplicas=true`
        let req = new Request(api)
        req.method = 'POST'
        req.headers = {"auth-token": this.authToken};
        await req.load();
        return req.response['statusCode'];
    }

    async fetchAccountInfo() {
        let api = `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${this.accountId}/accountInformation`
        let req = new Request(api)
        req.method = 'GET'
        req.headers = {"auth-token": this.authToken};
        return await req.loadJSON();
    }

    async loadFavicon() {
        if (MetaTraderAccountViewer.icon)
            return MetaTraderAccountViewer.icon;
        let req = new Request('https://raw.githubusercontent.com/xushunke/MetaTraderAccountViewer/master/resource/favicon.ico')
        let loadImage = await req.loadImage();
        MetaTraderAccountViewer.icon = loadImage;
        console.log("MetaTraderAccountViewer:loadFavicon:" + req.response['statusCode'])
        return loadImage;
    }


    async test() {
        if (config.runsInWidget) return
        this.widgetSize = 'small'
        let w1 = await this.render()
        await w1.presentSmall()
        this.widgetSize = 'medium'
        let w2 = await this.render()
        await w2.presentMedium()
        this.widgetSize = 'large'
        let w3 = await this.render()
        await w3.presentLarge()
    }
}

module.exports = MetaTraderAccountViewer;
await new MetaTraderAccountViewer().init()