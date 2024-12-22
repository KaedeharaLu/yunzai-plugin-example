import openai from 'openai'
import axios from 'axios'
import fs, { existsSync } from 'fs'
import he from 'he'

const version='3.0.0'
let key = ''
const url = 'https://api.moonshot.cn/v1'
const userConsole='https://platform.moonshot.cn/console/api-keys'
const helpUrl='https://pic.imgdb.cn/item/673978aed29ded1a8c577edf.png'

const setpath='./data/kimi/settings.json'
let dirpath = `./data/kimi/`

let presetting = "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你的所有回答必须经过联网搜索，你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI和KimiAi 为专有名词，不可翻译成其他语言。"
let settings
let defaultSetiings = {
    "key": "",
    "history": [],
    "preset": 0,
    "presetList": [
        {
            "place": "default",
            "content": presetting
        }
    ]
}

let defaultGroupSettings={
    "arraySending":[],
    "presettingCheck":[],
    "presettingCheckKey":"",
    "blackList":[]
}

let checkPromote=`你是一个检验预设内容是否符合规定的机器，你需要检验发送的内容和下面的预设是否符合。你的回答必须是一个json格式，按照下面的格式进行回复，不得有任何其他内容。
回复格式：
{
    "ifOK":num,
    "msg":content
}
num为数字1或0，代表是否满足要求预设的要求；msg当num==1时，可以为空，当num==0时，则需要说明哪里不满足预设要求

预设要求：
`

export class KimiAI extends plugin {
    constructor() {
        super({
            name: 'KimiAI',
            dsc: 'KimiAI对话插件',
            event: 'message',
            priority: '-1',
            rule: [
                {
                    reg: '^#kimi',
                    fnc: 'KimiAI'
                }, {
                    reg: '^#设置kimi秘钥',
                    fnc: 'KimiKey'
                }, {
                    reg: '^#?(km清空对话|km清空记录|km清除对话|km对话清空|km对话清除)$',
                    fnc: 'KimiClear'
                }, {
                    reg: '^#?km帮助',
                    fnc: 'KimiHelp'
                }, {
                    reg: '^#km预设',
                    fnc: 'KimiPreset'
                },{
                    reg:'^#?(km对话历史|km对话记录|km历史记录)',
                    fnc:'KimiHistory'
                },{
                    reg:'^#km设置',
                    fnc:'KimiSetting'
                },{
                    reg:'^#km拉黑',
                    fnc:'KimiAddBlack'
                },{
                    reg:'^#km取消拉黑',
                    fnc:'KimiCancelBlack'
                },{
                    reg:'^#km黑名单$',
                    fnc:'KimiBlackList'
                }
            ]
        })
    }

    checkBlack(e){
        let filepath=`${dirpath}settings.json`
        if(!fs.existsSync(dirpath)){ //文件夹/设置文件不存在就不用检查了，直接返回0
            fs.mkdir(dirpath)
            return false
        }

        let existBlackList=JSON.parse(fs.readFileSync(filepath,'utf-8')).blackList //读取数据
        let index=existBlackList.findIndex(item=>item.userid==e.user_id)
        logger.mark(`拉黑用户[${e.user_id}]尝试使用Kimi`)

        if(index==-1) {//没有被拉黑
            return false
        }else{ //被拉黑了 
            return true
        }
    }

    async KimiCancelBlack(e) {
        if (!e.isMaster) {
            return e.reply("你不是主人，不可以进行设置!", true);
        }

        let filepath = `${dirpath}settings.json`;
        let blackid;
        if (Array.isArray(e.message) == true && e.message.length == 2) { //检测是否为数组且长度==2
            let pre = e.message.find(item => item.type == 'at');
            blackid = String(pre.qq);
        } else { //否则为携带qq号取消拉黑
            blackid = e.raw_message.trim().slice(5).trim();
        }
    
        if (!blackid) { //未提供qq号
            e.reply("请通过艾特或加上qq号的方式提供被取消拉黑用户的QQ号", true);
            return;
        }
    
        if (!fs.existsSync(dirpath)) { //判断文件夹是否存在
            fs.mkdirSync(dirpath);
            e.reply("第一次使用，无黑名单用户!",true)
            return
        }
    
        if (!existsSync(filepath)) {
            fs.writeFileSync(filepath, JSON.stringify(defaultGroupSettings, null, 4), 'utf-8');
            e.reply("设置文件不存在，无黑名单用户",true)
            return
        }
    
        let existSettings = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        if (!existSettings.blackList) { //没有黑名单这个数组
            existSettings.blackList = [];
            e.reply("无黑名单用户",true)
            return
        }
    
        let existBlackList = existSettings.blackList;
        let index = existBlackList.findIndex(item => item.userid == blackid);
    
        if (index==-1) { //用户不在黑名单中
            e.reply(`用户[${blackid}]不在黑名单中，无需取消拉黑`, true);
            return;
        } else { //取消拉黑
            existBlackList.splice(index, 1);
            fs.writeFileSync(filepath, JSON.stringify(existSettings, null, 4), 'utf-8');
            e.reply(`已将[${blackid}]从黑名单中移除`, true);
            return;
        }
    }
    
    async KimiBlackList(e) {
        if(!e.isMaster){
            return
        }
        let filepath = `${dirpath}settings.json`;
        if (!fs.existsSync(dirpath)) { //判断文件夹是否存在
            fs.mkdirSync(dirpath);
        }
    
        if (!existsSync(filepath)) {
            fs.writeFileSync(filepath, JSON.stringify(defaultGroupSettings, null, 4), 'utf-8');
            e.reply("当前黑名单为空", true);
            return;
        }
    
        let existSettings = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        if (!existSettings.blackList || existSettings.blackList.length === 0) {
            e.reply("当前黑名单为空", true);
            return;
        }
    
        let msg = "当前黑名单如下:";
        existSettings.blackList.forEach((item, index) => {
            msg += `\n${index + 1}: 用户ID[${item.userid}] - 时间[${item.time}]`;
        });
        e.reply(msg, true);
        return;
    }

    async KimiAddBlack(e){
        if(!e.isMaster){
            return
        }
        var blackid
        logger.warn(e.message)
        let filepath=`${dirpath}settings.json`
        
        if(Array.isArray(e.message)==true && e.message.length==2){ //检测是否为数组且长度==2
            //长度==2说明是通过艾特拉黑
            let pre=e.message.find(item=>item.type=='at')
            blackid=String(pre.qq)
        }else{//否则为携带qq号拉黑
            blackid=e.raw_message.trim().slice(5).trim()
        }

        if(!blackid){ //未提供qq号
            e.reply("请通过艾特或加上qq号的方式提供被拉黑用户的QQ号",true)
            return
        }

        //新的拉黑信息
        let newBlack={
            "time":this.getTime(),
            "userid":blackid
        }

        if (!fs.existsSync(dirpath)) { //判断文件夹是否存在
            fs.mkdirSync(dirpath)
        }

        //文件不存在则先写入默认设置，方便下一步操作
        if(!existsSync(filepath)){
            fs.writeFileSync(filepath,JSON.stringify(defaultGroupSettings,null,4),'utf-8')
        }

        let existSettings=JSON.parse(fs.readFileSync(filepath,'utf-8'))
        if(!existSettings.blackList){ //没有黑名单这个数组
            existSettings.blackList=[]
        }

        let existBlackList=existSettings.blackList
        let existUser=existBlackList.find(item=>item.userid==blackid)

        if(existUser){ //已经拉黑
            e.reply(`已经在[${existUser.time}]拉黑[${existUser.userid}]`,true)
            return
        }else{ //拉黑
            existSettings.blackList.push(newBlack)
            fs.writeFileSync(filepath,JSON.stringify(existSettings,null,4),'utf-8')
            e.reply(`已将[${blackid}]拉黑`,true)
            return
        }
    }

    async settingPresetting(e){
        let cmd=e.raw_message.slice(7)
        let list=settings.presettingCheck
        let content=list.find(item=>item.groupid==e.group_id)
        if(cmd.length==1){ //为1或0
            switch (cmd){
                case '1':
                    if(content){
                        content.ifOpen=1
                    }else{
                        let defaultCheck={
                            "groupid":e.group_id,
                            "ifOpen":1,
                            "checkSetting":""
                        }
                        settings.presettingCheck.push(defaultCheck)
                    }
                    e.reply(`成功开启预设检查!${settings.presettingCheckKey?'':`\n预设检验暂未设置apiKey!请前往https://platform.moonshot.cn/console/api-keys创建后，发送#km设置预设秘钥+apikey进行设置，否则该群用户无法添加新预设`}`,true)
                    break
                case '0':
                    if(content){
                        content.ifOpen=0
                        e.reply('关闭预设检查成功',true)
                    }else{
                        e.reply('暂未开启预设检查，无需关闭',true)
                        break
                    }
                    break
                default:
                    e.reply('瞎设置',true)
                    return
            }

            fs.writeFileSync(setpath,JSON.stringify(settings,null,4),'utf-8')
        }else{
            let flag=cmd.slice(0,2)
            if(flag=='秘钥'){ //设置预设检验秘钥
                key=cmd.slice(2)
                settings.presettingCheckKey=key
                fs.writeFileSync(setpath,JSON.stringify(settings,null,4),'utf-8')
                e.reply('设置成功!',true)

            }else if(flag=='查看'){
                if(content){ //存在该群数据
                    let msg=`当前状态: ${content.ifOpen?'开启':'关闭'}\n`
                    msg+=`预设检查内容: ${content.checkSetting?`${content.checkSetting}`:'空'}`
                    e.reply(msg,true)
                }else{
                    e.reply('该群无预设检查',true)
                }

            }else if(flag=='设置'){
                let checkContent=cmd.slice(2) //预设检查内容
                if(content){ //存在则直接写入，不存在要创建
                    content.checkSetting=checkContent
                    await e.reply(`添加成功!默认开启预设检查!${settings.presettingCheckKey?'':`\n预设检验暂未设置apiKey!请前往https://platform.moonshot.cn/console/api-keys创建后，发送#km设置预设秘钥+apikey进行设置，否则该群用户无法添加新预设`}`,true)
                }else{
                    let defaultCheck={
                        "groupid":e.group_id,
                        "ifOpen":1,
                        "checkSetting":checkContent
                    }
                    settings.presettingCheck.push(defaultCheck)
                    await e.reply(`添加成功!默认开启预设检查!${settings.presettingCheckKey?'':`\n预设检验暂未设置apiKey!请前往https://platform.moonshot.cn/console/api-keys创建后，发送#km设置预设秘钥+apikey进行设置，否则该群用户无法添加新预设`}`,true)
                }

                fs.writeFileSync(setpath,JSON.stringify(settings,null,4),'utf-8') //写回数据
            }else if(flag=='清除' || flag=='删除'){
                if(content){ //存在数据则需要删除
                    list=list.filter(item=>item.groupid!=e.group_id) //过滤该群数据
                    settings.presettingCheck=list
                    fs.writeFileSync(setpath,JSON.stringify(settings,null,4),'utf-8') //写回数据
                    e.reply('删除成功!',true)
                }else{ //不存在数据不删除
                    e.reply('该群不存在预设检查!',true)
                }
            }else{
                e.reply('瞎设置',true)
            }
        }
    }

    async settingArray(e,flag){
        let list=settings.arraySending
        let content=list.find(item=>item.groupid==e.group_id) //查找是否存在已有设置
        switch (flag){
            case '1':
            case 'true': //开启转发
                if(content){
                    content.ifOpen=1
                }else{
                   content={
                        "groupid":e.group_id,
                        "ifOpen":1
                    }
                    settings.arraySending.push(content)
                }
                e.reply('设置转发开启成功!超过100字则使用转发消息',true)
                break

            case '0':
            case 'false': //开启转发
                if(content){
                    content.ifOpen=0
                }else{
                    content={
                        "groupid":e.group_id,
                        "ifOpen":0
                    }
                    settings.arraySending.push(content)
                    }
                e.reply('设置转发关闭成功!小心被警告刷屏!',true)
                break
            default:
                e.reply('瞎设置',true)
                return
        }
        
        fs.writeFileSync(setpath,JSON.stringify(settings,null,4),'utf-8')

        return
    }

    async KimiSetting(e){
        if(!e.isMaster){
            e.reply(`你不是主人，不可以进行设置!`,true)
            return
        }

        if(!fs.existsSync(setpath)){
            fs.writeFileSync(setpath,JSON.stringify(defaultGroupSettings,null,4),'utf-8')
        }

        let content = fs.readFileSync(setpath, 'utf-8')
        settings = JSON.parse(content)

        let tip=e.raw_message.slice(5,7).trim()

        let flag
        switch (tip){
            case '转发':
                flag=e.raw_message.slice(7).trim()
                this.settingArray(e,flag)
                break
            case '预设':
                flag=e.raw_message.slice(7).trim()
                this.settingPresetting(e)
                break
            default:
                e.reply('瞎设置',true)
                return
        }

        return
    }

    async KimiHistory(e){ //对话历史
        if(this.checkBlack(e)==true) return
        let data=await this.readData(e,e.user_id)
        if(Object.keys(data).length==0||data.key==''){ //必须有数据且绑定了key才可以查看
            return
        }

        if(data.history.length==0){
            await e.reply(`对话历史为空!`,true)
            return
        }

        let history=[`当前共有${data.history.length}条对话历史，如下: `]
        for(let i=0;i<=data.history.length-1;i++){
            history.push(`${i+1}: ${data.history[i].content}`)
        }
        history.push(`——————————\n发送 #km清空对话 可以清空对话历史记录`)
        await e.reply([Bot.makeForwardArray([...history])])
        return
    }

    async checkPresetting(e,content,check){
        const client = new openai({ //创建client
            apiKey: key,
            baseURL: url
        });

        let msg=`${checkPromote}${check.checkSetting}`

        let message = [
            {
                role: "system", content: msg,
            },{
                role: "user" , content: content
            }
        ]

        try {
            const completion = await client.chat.completions.create({
                model: "moonshot-v1-8k",
                messages: message,
                temperature: 0.3
            });

            logger.mark(`回答内容: ==>\n` + completion)
            let kimiAns = completion.choices[0].message.content
            // e.reply(kimiAns)
            return JSON.parse(kimiAns)
        } catch (err) {
            err=JSON.stringify(err)
            err=JSON.parse(err)
            if(err.status==429){
                await e.reply(`请求频率过高，请等待30s后重新发送重试!`,true)
                await logger.warn(err)
            }else if(err.status==401){
                await e.reply(`错误的api秘钥!`,true)
                await logger.warn(err)
            }else{
                await e.reply(`遇到未知错误!请联系云崽主人查看控制台日志输出!`,true)
                await logger.warn(err)
            }
            return false
        }
    }

    async addPresetting(e, data) {
        let filepath = `${dirpath}${e.user_id}.json`
        let content = he.decode(e.raw_message.slice(7).trim()) //获得预设内容

        if(!fs.existsSync(setpath)){
            fs.writeFileSync(setpath,JSON.stringify(defaultGroupSettings,null,4),'utf-8')
        }
        settings = JSON.parse(fs.readFileSync(setpath, 'utf-8')) //读取设置
        let list=settings.presettingCheck
        let check=list.find(item=>item.groupid=e.group_id)
        
        if(check && check.ifOpen==1 && check.checkSetting!=""){
            if(settings.presettingCheckKey==""){
                e.reply(`云崽未设置预设检查秘钥，阻断所有预设添加`,true)
                return
            }
            e.reply(`开始通过Kimi检查预设是否合规，请稍等`,true)
            key=settings.presettingCheckKey
            let result=await this.checkPresetting(e,content,check)

            if(result.ifOK==0){ //校验不通过
                e.reply(result.msg,true)
                return
            }
        }

        let precontent = {
            "place": "user",
            "content": content
        }

        // await logger.mark(data)
        data.presetList.push(precontent) //填入预设
        fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf-8') //写回数据
        await e.reply(`添加成功!如果需要使用该预设，请发送#km预设使用${data.presetList.length - 1}`, true)
        return
    }

    async deletePresetting(e, data) {
        let filepath = `${dirpath}${e.user_id}.json`
        let list = data.presetList
        let num = e.raw_message.slice(7).trim()
        logger.info(`删除第${num}条预设`)

        if (num > 0 && num <= list.length - 1) { //在范围内，则删除
            list.splice(num, 1) //删掉
            data.presetList = list
            if (num == data.preset) { //删掉的是正在使用的预设则回到默认
                data.preset = 0
                await e.reply('回到默认预设!', true)
            } else if (num < data.preset) { //删掉的是在预设前的，那么预设的数字需要减1
                data.preset--
                await e.reply('删除成功!其余预设不受影响', true)
            } else {//剩下一种删掉的在当前预设后面的，则只需要提示用户
                await e.reply(`删除成功!`, true)
            }
        } else {
            await e.reply('你故意找茬是不是', true)
            return
        }
        fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf-8') //写回数据
        return
    }

    async setPresetting(e, data) {
        // logger.info(data)
        if (data.presetList.length - 1 == 0) { //只有默认预设
            await e.reply(`当前只有一个默认预设，无法调整`, true)
            return
        }

        let filepath = `${dirpath}${e.user_id}.json`
        let num = e.raw_message.slice(7).trim()
        if (num.length == 0 || num == 0) { //设置的是空||0 => 恢复默认
            data.preset = 0
            await e.reply(`已将预设恢复默认!请注意是否清空对话历史!`, true)
        } else if (num > 0 && num <= data.presetList.length - 1) { //在预设范围内设置
            data.preset = num
            await e.reply(`已将预设设置为第${num}个!请注意是否清空对话历史!`, true)
        } else {//不在上面两种情况就说明不是正确情况
            await e.reply(`不正确的输入!`, true)
            return
        }

        fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf-8') //写回数据
        return
    }

    async viewPresetting(e, data) {
        let list = data.presetList, msg = ''
        msg += `当前用户正在使用预设${data.preset}\n`
        msg += `当前用户保存的预设如下:\n`
        msg += `默 认: ${presetting}\n`
        for (let i = 1; i <= list.length - 1; i++) {
            msg += `预设${i}: ${list[i].content}\n`
        }
        await e.reply(msg, true)
        return
    }

    async clearPresetting(e, data) {
        let filepath = `${dirpath}${e.user_id}.json`
        let defaultPreset = [ //默认预设
            {
                "place": "default",
                "content": presetting
            }
        ]

        data.preset = 0 //重置到指定为0
        data.presetList = defaultPreset //只剩下默认预设-->变相清空预设
        fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf-8') //写回数据
        await e.reply(`清除清除成功!自动切换回默认预设!请注意是否清空对话历史!`, true)
        return
    }

    async KimiPreset(e) {
        if(this.checkBlack(e)==true) return
        let data = await this.readData(e, e.user_id) //先读取数据，如果token都没有，那就什么都不用干了
        if (data.length == 0) {
            await e.reply(`当前用户无KimiAI的APIkey，请前往https://platform.moonshot.cn/console/api-keys创建后，发送#设置kimi秘钥+apikey设置，设置完成后，再来调整预设`, true)
            return
        }

        if (e.raw_message.length < 7) {
            await e.reply('字数小于7，不符合操作! ', true)
            return
        }
        let tip = e.raw_message.slice(5, 7).trim()
        logger.info(`获得关键词: ${tip}预设`)
        switch (tip) {
            case '删除':
                this.deletePresetting(e, data)
                break

            case '添加':
            case '增加':
                this.addPresetting(e, data)
                break

            case '设置':
            case '使用':
                this.setPresetting(e, data)
                break

            case '清除':
            case '清空':
                this.clearPresetting(e, data)
                break

            case '查看':
            case '列表':
                this.viewPresetting(e, data)
                break

            default:
                e.reply('未知操作!', true)
                break
        }
        return
    }

    async KimiHelp(e) {
        if(this.checkBlack(e)==true) return

        let filepath=`${dirpath}/help_${version}.jpg`
        if(!existsSync(filepath)){ //照片不存在则下载
            await e.reply("第一次使用Kimi帮助，正在下载帮助图片，请稍等")
            try {
                let response = await axios.get(helpUrl, { responseType: 'arraybuffer' })
                fs.writeFileSync(filepath, response.data)
            } catch (error) {
                await logger.warn(`遇到错误: ${error}`)
                await e.reply(`下载帮助图片失败，遇到错误: ${error}`)
                return
            }
        }
        await e.reply([segment.image(filepath),`用户控制台: ${userConsole}`])
        return
    }

    async readData(e, userid) {
        let filepath = `${dirpath}${userid}.json`

        if (!fs.existsSync(dirpath)) { //判断文件夹是否存在
            fs.mkdirSync(dirpath)
        }
        if (!fs.existsSync(filepath)) { //检查用户文件
            fs.writeFileSync(filepath, JSON.stringify(defaultSetiings, null, 4), 'utf-8')
            await e.reply(`当前用户无KimiAI的APIkey，请前往https://platform.moonshot.cn/console/api-keys创建后，发送#设置kimi秘钥+apikey设置`, true)
            return {}
        }

        if (fs.existsSync(filepath)) {
            let content = fs.readFileSync(filepath, 'utf-8')
            let JSONdata = JSON.parse(content)
            return JSONdata || {}
        } else {
            return {}
        }
    }

    async KimiClear(e) {
        if(this.checkBlack(e)==true) return
        let userid = e.user_id
        let filepath = `${dirpath}${userid}.json`

        let data = await this.readData(e, userid)

        if (data.history.length == 0) {
            await e.reply(`当前用户记录为空，不需要清空`, true)
        } else {
            let num = data.history.length
            data.history = []
            fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf-8')
            await e.reply(`成功清除${num}条历史记录`, true)
        }

        return
    }

    async KimiAI(e) {
        if(this.checkBlack(e)==true) return
        let userid = e.user_id
        let question = he.decode(e.raw_message.slice(5).trim())
        if (question.length == 0) {
            await e.reply(`请输入要和Kimi对话的内容`, true)
            return
        }
        let filepath = `${dirpath}${userid}.json`

        logger.info(`得到问题:${question}`)

        let data = await this.readData(e, userid) //读取信息
        // logger.mark(data)
        let history = data.history
        key = data.key

        if (!key) {
            // await e.reply(`当前用户无KimiAI的APIkey，请前往https://platform.moonshot.cn/console/api-keys创建后，发送#设置kimi秘钥+apikey设置`)
            return
        }

        const client = new openai({ //创建client
            apiKey: key,
            baseURL: url
        });

        let newhistory = {
            role: "user",
            content: question
        }
        history.push(newhistory)
        data.history = history

        let message = [{
            role: "system", content: data.presetList[data.preset].content,
        }]

        if (history.length) {
            for (let i = 0; i <= history.length - 1; i++) {
                message.push({
                    role: history[i].role, content: history[i].content
                })
            }
        }

        try {
            const completion = await client.chat.completions.create({
                model: "moonshot-v1-8k",
                messages: message,
                temperature: 0.3
            });

            logger.mark(`回答内容: ==>\n` + completion)
            let kimiAns = completion.choices[0].message.content

            if (fs.existsSync(setpath)) { //读取设置
                let content = fs.readFileSync(setpath, 'utf-8')
                settings = JSON.parse(content)
            }

            let list=settings.arraySending
            let content=list.find(item=>item.groupid==e.group_id)

            if(content && content.ifOpen==1 && kimiAns.length>100){
                e.reply(Bot.makeForwardArray([`@${e.member.card || e.member.nickname}`,`[第${history.length}条对话]\n${kimiAns}`]));
            }else{
                e.reply(`[第${history.length}条对话]\n${kimiAns}`, true);
            }
        } catch (err) {
            err=JSON.stringify(err)
            err=JSON.parse(err)
            if(err.status==429){
                await e.reply(`请求频率过高，超出用户组别限制!请等待30s重试!`,true)
                await logger.warn(err)
            }else if(err.status==401){
                await e.reply(`错误的api秘钥!`,true)
                await logger.warn(err)
            }else{
                await e.reply(`遇到未知错误!请联系云崽主人查看控制台日志输出!`,true)
                await logger.warn(err)
            }
            return false
        }

        fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf-8', (err) => {
            if (err) {
                console.error('Error writing file:', err);
            } else {
                console.log('历史记录记录成功！');
            }
        })


        return
    }

    async KimiKey(e) {
        if(this.checkBlack(e)==true) return
        if (e.message.length == 9) {
            await e.reply(`你的秘钥呢？`)
            return
        }

        let userkey = e.raw_message.slice(9).trim()
        let userid = e.user_id
        let filepath = `${dirpath}${userid}.json`

        if (!fs.existsSync(dirpath)) { //判断文件夹是否存在
            fs.mkdirSync(dirpath)
        }

        if (!fs.existsSync(filepath)) { //检查用户文件=>不存在，则创建
            defaultSetiings.key = userkey
            fs.writeFileSync(filepath, JSON.stringify(defaultSetiings, null, 4), 'utf-8')
            await e.reply(`设置成功！`, true)
        } else {//存在则覆盖旧的
            let data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
            data.key = userkey
            await e.reply(`设置成功`, true)
            fs.writeFileSync(filepath, JSON.stringify(data, null, 4), 'utf-8')
        }

        return
    }

    getTime() {
        let currentDate = new Date();
        let year = currentDate.getFullYear();
        let month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
        let day = ('0' + currentDate.getDate()).slice(-2);
        let hours = ('0' + currentDate.getHours()).slice(-2);
        let minutes = ('0' + currentDate.getMinutes()).slice(-2);
        let seconds = ('0' + currentDate.getSeconds()).slice(-2);

        let formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        return formattedDate
    }
}