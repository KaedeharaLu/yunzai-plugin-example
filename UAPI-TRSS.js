/*
调用api来自TechCat提供的免费api接口：UAPI
地址：https://uapis.cn/
*/

import axios from 'axios'
import fs from 'fs'

const api = 'https://uapis.cn/api/'

export class UAPI extends plugin {
    constructor() {
        super({
            name: 'UAPI调用',
            dsc: 'TechCat旗下免费UAPI的调用',
            event: 'message',
            priority: -1,
            rule: [
                {
                    reg: '^(#?UAPI帮助|#?uapi帮助)$',
                    fnc: 'UAPIHelp'
                }, {
                    reg: '^#天气',
                    fnc: 'weather'
                }, {
                    reg: '^#ping ',
                    fnc: 'ping'
                }, {
                    reg: '^(#?ua一言|#?UA一言|#?Ua一言|#?uA一言)',
                    fnc: `yiyan`
                }, {
                    reg: '^#?热搜$',
                    fnc: 'hotSearch'
                }, {
                    reg: '^#随机表情',
                    fnc: 'randomEmo'
                }
            ]
        })
    }

    async UAPIHelp(e) {
        let msg = ''
        msg += `该插件调用API来自TechCat旗下的UAPI\n`
        msg += `API地址: https://uapis.cn/\n`
        msg += `----------\n`
        msg += `#天气+查询的地区中文名(例如北京市，一定要带“市“，可精确至县): 查询某地天气(不要出现空格)\n`
        msg += `#ping+空格+ip/域名: ping某个域名/ip的延迟。api服务器地址默认湖北，结果仅作参考\n`
        msg += `#ua一言: 获取UAPI提供的一言\n`
        msg += `#热搜：查看多平台热搜榜\n`
        msg += `#随机表情+有兽焉/猫猫/二次元/坤坤/熊猫/外国人：获取对应的随机表情`
        await e.reply(msg)
        return
    }

    async weather(e) {
        let tip = 'weather';
        const city = e.raw_message.slice(3).trim(); //获得城市名称
        const url = `${api}${tip}?name=${city}`; //拼接api地址
        let data = {}; //定义返回数据为空
        let ifStop=0

        //发起Get请求
        await axios.get(url).then(response => {
            data = response.data;
        }).catch(error => {
            e.reply(`查询天气遇到错误:${error}`)
            logger.warn(`查询天气遇到错误:${error}`)
            ifStop=1
        })

        if(ifStop){
            return
        }

        //处理数据
        if (data.code != 200) { //返回码不为200，即查询遇到错误
            await e.reply(`查询遇到错误，返回以下信息:\n----------\n错误码:${data.code}\n错误信息:${data.msg}`)
            logger.warn(`查询遇到错误，返回以下信息:\n----------\n错误码:${data.code}\n错误信息:${data.msg}`)
            return
        }

        let msg = '' //定义即将发送的信息，并开始合并信息
        msg += `查询成功！结果如下:\n`
        msg += `----------\n`
        msg += `省份：${data.province}\n`
        msg += `城市: ${data.city}\n`
        msg += `天气：${data.weather}\n`
        msg += `温度：${data.temperature}℃\n`
        msg += `----------\n`
        msg += `风向：${data.wind_direction}\n`
        msg += `风速：${data.wind_power}m/s\n`
        msg += `湿度：${data.humidity}%\n`
        msg += '----------\n'
        msg += `报道时间：${data.reporttime}\n`

        await e.reply(msg, true)
        return
    }

    async ping(e) {
        let tip = 'ping'
        const host = e.raw_message.slice(6) //获得ping的host
        const url = `${api}${tip}?host=${host}` //拼接api地址
        let data = {} //定义返回数据为空
        let ifStop=0

        // await e.reply(url)

        await axios.get(url).then(response => { //发起get请求
            data = response.data
        }).catch(error => {
            e.reply(`ping错误：${error}`)
            logger.warn(`ping错误：${error}`)
            ifStop=1
        })

        await logger.warn(data)

        if(ifStop){
            return
        }

        // 处理数据

        if (data.code != 200) {
            await e.reply(`查询遇到错误，返回以下信息:\n----------\n错误码:${data.code}\n错误信息:${data.msg}`)
            logger.warn(`查询遇到错误，返回以下信息:\n----------\n错误码:${data.code}\n错误信息:${data.msg}`)
            return
        }

        let msg = '' //定义即将发送的信息，并开始合并信息
        msg += `查询成功！结果如下:\n`
        msg += `----------\n`
        msg += `host: ${data.host}\n`
        msg += ` ip : ${data.ip}\n`
        msg += `----------\n`
        msg += `最大延迟: ${data.max}\n`
        msg += `最小延迟: ${data.min}\n`
        msg += `平均延迟: ${data.avg}\n`

        await e.reply(msg, true)
    }

    async yiyan(e) {
        let tip = 'say'
        let url = `${api}${tip}`
        let msg = ''

        await axios.get(url).then(response => {
            msg = response.data
        }).catch(error => {
            e.reply(`获取一言遇到错误: ${error}`)
            logger.warn(`获取一言遇到错误: ${error}`)
            return
        })

        await e.reply(msg)
        retirn
    }

    async hotSearch(e) {
        let tip = 'hotlist'
        let url = `${api}${tip}?type=`
        let type = ['bilibili', 'bilihot', 'zhihu', 'weibo', 'douyin', 'history'] //定义type类别
        let data = []

        let promise = type.map(p => this.getHotSearch(`${url}${p}`))

        try { //获得data
            data = await Promise.all(promise)
            // logger.info(JSON.stringify(data, null, 2))
        } catch (error) {
            logger.warn(`遇到错误: ${error}`)
        }

        //开始处理data
        let msg = ['当前查询热搜榜如下:\n']

        for (let i = 1; i <= data.length; i++) {
            // e.reply('1')
            let temp = data[i - 1]
            // logger.warn(temp)

            // if (temp.success != true || temp.code != 200) { //不为true即获取失败
            //     msg.push(`${type[i - 1]}获取失败`)
            //     continue
            // }

            let tempMsg = `来源: ${temp.title}\n标题: ${temp.subtitle}\n更新时间: ${temp.update_time}\n----------\n`

            temp = temp.data
            if (temp.length > 10) temp = temp.slice(0, 10) //超出10个只取前十

            for (let i = 1; i <= temp.length; i++) {
                tempMsg += `${i}: ${temp[i - 1].title}\n`
            }

            msg.push(tempMsg)
        }

        await e.reply(Bot.makeForwardArray([...msg]))
        return
    }

    async getHotSearch(url) {
        try {
            let response = await axios.get(url)
            return response.data
        } catch (error) {
            logger.warn(`遇到错误: ${error}`)
            return null
        }
    }

    async randomEmo(e) {
        let tip = 'imgapi/bq/'
        let emo = e.raw_message.slice(5).trim()
        var type
        switch (emo) { //匹配表情
            case '有兽焉':
                type = 'youshou'
                break
            case '猫猫':
                type = 'maomao'
                break
            case '二次元':
                type = 'eciyuan'
                break
            case '坤坤':
                type = 'ikun'
                break
            case '熊猫':
                type = 'xiongmao'
                break
            case '外国人':
                type = 'waiguoren'
                break
            default:
                e.reply(`未知表情类型!`)
                return
        }

        let url = `${api}${tip}${type}.php`
        let filePath = `./data/${type}.webp`

        try { //请求表情
            let response = await axios.get(url, { responseType: 'arraybuffer' })
            fs.writeFileSync(filePath, response.data)
        } catch (error) {
            await logger.warn(`遇到错误: ${error}`)
            await e.reply(`遇到错误: ${error}`)
            return
        }
        await e.reply(segment.image(filePath))

        //删除下载的表情
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) => {
                if (err) {
                    logger.error('删除截图文件时出错:', err);
                } else {
                    logger.mark('截图文件删除成功');
                }
            })
        }
    }
}