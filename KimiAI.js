import openai from 'openai'
import fs from 'fs'

let key = ''
const url = 'https://api.moonshot.cn/v1'

let dirpath = `./data/kimi/`

let presetting = "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你的所有回答必须经过联网搜索，你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI和KimiAi 为专有名词，不可翻译成其他语言。"

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
                }
            ]
        })
    }

    async KimiHistory(e){ //对话历史
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

    async addPresetting(e, data) {
        let filepath = `${dirpath}${e.user_id}.json`
        let content = e.raw_message.slice(7).trim() //获得预设内容

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
        let msg = ``
        msg += `********************\n`
        msg += `该插件由KaedeharaLu编写(注:所有命令不要加空格)\n`
        msg += `********************\n`
        msg += `使用方法:\n`
        msg += `#kimi+问题 : 向Kimi提问\n`
        msg += `#设置kimi秘钥 : 设置自己的ApiKey(一定私聊机器人)\n`
        msg += `#km清空对话 : 清除自己和Kimi的对话记录\n`
        msg += `#km对话历史 : 查看与Kimi的对话历史\n`
        msg += `——————————\n`
        msg += `预设设置:\n`
        msg += `#km预设查看/#km预设列表 : 查看存储的预设列表\n`
        msg += `#km预设删除+数字(不包括+号) : 删除对应编号的预设\n`
        msg += `#km预设使用+数字(不包括+号) : 使用对应编号的预设\n`
        msg += `#km预设添加+内容(不包括+号) : 将对应预设内容添加到记录\n`
        msg += `#km预设清空 : 清空自己的预设历史(自动恢复到默认预设)\n`
        msg += `——————————\n`
        msg += `没有ApiKey无法调用KimiAI。要获取ApiKey请前往https://platform.moonshot.cn/console/api-keys`
        await e.reply(msg)
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
        let userid = e.user_id
        let question = e.raw_message.slice(5).trim()
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
            await e.reply(`当前用户无KimiAI的APIkey，请前往https://platform.moonshot.cn/console/api-keys创建后，发送#设置kimi秘钥+apikey设置`)
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

            e.reply(`[第${history.length}条对话]\n${kimiAns}`, true);
        } catch (err) {
            err=JSON.stringify(err)
            err=JSON.parse(err)
            if(err.status==429){
                await e.reply(`请求频率过高，超出用户组别限制!请等待30s重试!`,true)
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
            if (data.key == "") { //本身无则添加
                data.key = userkey
                await e.reply(`添加成功`, true)
            } else { //本身有则覆盖
                data.key = userkey
                await e.reply(`成功覆盖旧的key`, true)
            }
            fs.writeFileSync(filepath, JSON.stringify(defaultSetiings, null, 4), 'utf-8')
        }

        return
    }
}