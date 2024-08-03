import fs from 'fs'

export class Example extends plugin {
    constructor() {
        super({
            name: '彩票',
            dsc: '娱乐购买（白嫖）彩票代码',
            event: 'message',
            priority: '-10',
            rule: [
                {
                    reg: '^#购买彩票',
                    fnc: 'buyLottery'
                }, {
                    reg: '^(#出卖彩票|#出售彩票|#售出彩票|#卖彩票)$',
                    fnc: 'sellLottery'
                }, {
                    reg: '^#彩票开奖$',
                    fnc: 'draw'
                }, {
                    reg: '^#彩票历史$',
                    fnc: 'lotteryHistory'
                }, {
                    reg: '^#我的历史$',
                    fnc: 'myHistory'
                }, {
                    reg: '^#我的彩票$',
                    fnc: 'myLottery'
                }
            ]
        });
    }

    async buyLottery(e) {
        //获取群聊信息
        const groupInfo = await this.e.group.getInfo()
        const groupName = groupInfo.group_name
        const groupId = e.group_id
        const userId = e.user_id
        const nickname = e.member.card || e.member.nickname

        let info = this.readInfo(0)
        let turns = info.length

        let data = this.readData(`./data/lottery/user/${userId}.json`)
        let userLottery = {}

        if (data[data.length - 1] && turns == data[data.length - 1].turns) { //买过彩票则输出彩票信息
            userLottery = data[data.length - 1]
            await e.reply(this.formatLottery(`您已经购买过彩票了，信息如下：`, nickname, userId, userLottery.lotteryNum, userLottery.groupId, userLottery.groupName, userLottery.time, groupId == userLottery.groupId), true)
            return
        }

        let lotteryNum = 0
        if (e.raw_message.length == 5) { //随机
            let flag = 0
            for (; flag == 0;) {
                let num = this.getRandomNum()
                let temp = info[turns - 1].used
                if (!temp || !temp.find(item => item.lotteryNum == num)) {
                    lotteryNum = num
                    break
                }
            }
            userLottery = {
                "turns": turns,
                "lotteryNum": lotteryNum,
                "groupId": groupId,
                "groupName": groupName,
                "time": this.getTime()
            }
            data.push(userLottery)
            fs.writeFileSync(`./data/lottery/user/${userId}.json`, JSON.stringify(data, null, 4), 'utf-8')
            await e.reply(this.formatLottery(`购买成功!信息如下`, nickname, userId, userLottery.lotteryNum, userLottery.groupId, userLottery.groupName, userLottery.time, 1), true)
        } else if (e.raw_message.length != 8) { //购买彩票号码大于3位数字
            await e.reply("彩票号码为3位数，请重新购买，此次不做记录", 1)
        } else { //指定
            lotteryNum = e.raw_message.slice(5).trim()
            if (lotteryNum < 100) {
                await e.reply(`号码应在100-999之间`, true)
                return
            }
            let temp = info[turns - 1].used
            if (!temp || !temp.find(item => item.lotteryNum == lotteryNum)) { //或运算前为used数组为空，直接添加；或运算后为在temp中寻找相同的lotteryNum，买找到返回0，则可以添加
                userLottery = {
                    "turns": turns,
                    "lotteryNum": lotteryNum,
                    "groupId": groupId,
                    "groupName": groupName,
                    "time": this.getTime()
                }
                data.push(userLottery)
                fs.writeFileSync(`./data/lottery/user/${userId}.json`, JSON.stringify(data, null, 4), 'utf-8')
                await e.reply(this.formatLottery(`购买成功!信息如下`, nickname, userId, userLottery.lotteryNum, userLottery.groupId, userLottery.groupName, userLottery.time, 1), true)
            } else {
                await e.reply(`该号码(${lotteryNum})已经被其他人购买,请换一个号码`, true)
                return
            }
        }
        let buying = {
            "userId": userId,
            "nickname": nickname,
            "lotteryNum": lotteryNum
        }

        let temp = info[turns - 1].used || [];
        temp.push(buying);
        info[turns - 1].used = temp;

        fs.writeFileSync(`./data/lottery/info.json`, JSON.stringify(info, null, 4), 'utf-8')
        return
    }

    async sellLottery(e) {
        const groupInfo = await this.e.group.getInfo()
        const groupName = groupInfo.group_name
        const groupId = e.group_id
        const userId = e.user_id
        const nickname = e.member.card || e.member.nickname

        let info = this.readInfo(0)

        if (!fs.existsSync(`./data/lottery/user/${userId}.json`)) { //未购买彩票
            await e.reply(`您还未购买过彩票，无法售出`, true)
            return
        }

        let data = this.readData(`./data/lottery/user/${userId}.json`)

        if (!data.length) { //数据长度为0，即没有购买过
            await e.reply(`您还未购买过彩票，无法售出`, true)
            return
        }

        let userLottery = data[data.length - 1]

        if (userLottery.turns != info.length) { //最后的轮次与当前轮次不同，无法卖出
            await e.reply(`您还未在本轮次购买过彩票，无法售出`, true)
            return
        }

        await e.reply(this.formatLottery(`已经售出信息如下的彩票`, nickname, userId, userLottery.lotteryNum, userLottery.groupId, userLottery.groupName, userLottery.time, groupId == userLottery.groupId), true)

        let newData = data.slice(0, data.length - 2) //过滤掉user 的 json中的购买记录

        //过滤掉info.json中used的数据

        let filt = info[info.length - 1].used
        let newFilt = filt.filter(item => item.userId != userId)
        info[info.length - 1].used = newFilt
        fs.writeFileSync(`./data/lottery/user/${userId}.json`, JSON.stringify(newData, null, 4), 'utf-8')
        fs.writeFileSync(`./data/lottery/info.json`, JSON.stringify(info, null, 4), 'utf-8')
    }

    async draw(e) {
        if (!e.isMaster) {
            await e.reply("你不是主人，不可开奖", true)
            return
        }
        let info = this.readInfo(0)
        let thisTurn = info[info.length - 1]
        let person = thisTurn.used.find(item => item.lotteryNum == thisTurn.award)
        let history = this.readData(`./data/lottery/history.json`)
        let historyContent = {}

        if(!info || !thisTurn){
            await e.reply('错误!可能是从未运行过该插件导致文件缺失，请尝试执行以下指令“#购买彩票”',true)
            return
        }

        if (!person) { //person数组不存在，无人中奖
            await e.reply(`很遗憾，本轮无人买中，本次中奖号码为${info[info.length - 1].award}`)
            historyContent = { //记录历史
                "turns": thisTurn.turns,
                "userId": "",
                "nickname": "",
                "award": thisTurn.award,
                "buyTime": "",
                "drawTime": this.getTime()
            }
        } else {
            await e.reply(`恭喜${person.nickname}(${person.userId})中奖!中奖号码为${person.lotteryNum}`)
            let user = this.readData(`./data/lottery/user/${person.userId}.json`)
            historyContent = { //记录历史
                "turns": thisTurn.turns,
                "userId": person.userId,
                "nickname": person.nickname,
                "award": thisTurn.award,
                "buyTime": user[user.length - 1].time,
                "drawTime": this.getTime()
            }
        }

        history.push(historyContent)
        fs.writeFileSync(`./data/lottery/history.json`, JSON.stringify(history, null, 4), 'utf-8')
        await e.reply(`新的一轮已经开启，欢迎参与！`)
        this.readInfo(1)
    }

    async lotteryHistory(e) {
        const tip = '彩票历史记录如下:'
        let history = this.readData('./data/lottery/history.json')
        let info = this.readData('./data/lottery/info.json')
        let replyInfo = {}
        let msg = ``
        if (!history.length) {
            await e.reply("暂无彩票记录(也可能为第一轮且未开奖)",true)
            return
        }

        if (history.length > 20) { //长度大于20则截取最后20个
            history = history.slice(history.length - 20, history.length)
        }

        for (let i = 1; i <= history.length; i++) {
            replyInfo = {
                "turns": history[i - 1].turns,
                "personNum": info[i - 1].used.length,
                "userId": history[i - 1].userId || "", //中奖为中奖人的信息，没中则为空
                "nickname": history[i - 1].nickname || "",
                "award": history[i - 1].award,
                "buyTime": history[i - 1].buyTime || "",
                "drawTime": history[i - 1].drawTime
            }
            // msg=`轮次:${replyInfo.turns}\n中奖人:${replyInfo.nickname||'无人中奖'}(${replyInfo.userId || 'NULL'})\n中奖号码:${replyInfo.award}\n购买时间:${replyInfo.buyTime || 'NULL'}\n开奖时间:${replyInfo.drawTime}`
            // await e.reply(Bot.makeForwardArray([tip,msg]));
            msg += `轮次: ${replyInfo.turns}\n`;
            msg += `参与人数: ${replyInfo.personNum}\n`;
            msg += `中奖人: ${replyInfo.nickname || '无人中奖'} (${replyInfo.userId || 'NULL'})\n`;
            msg += `中奖号码: ${replyInfo.award}\n`;
            msg += `购买时间: ${replyInfo.buyTime || 'NULL'}\n`;
            msg += `开奖时间: ${replyInfo.drawTime}\n`;
            msg += '-------------\n';

        }
        await e.reply(Bot.makeForwardArray([`${tip}\n-------------\n${msg}`]));
        // e.reply(msg)

        return
    }

    async myHistory(e) {
        let userId = e.user_id
        let nickname = e.member.card || e.member.nickname
        let userHistory = this.readData(`./data/lottery/user/${userId}.json`)
        let lotteryInfo = this.readData(`./data/lottery/info.json`)
        let msg = ''

        if (!userHistory.length) {
            await e.reply(`${nickname}(${userId})还未购买过彩票`, true)
            return
        }

        if (userHistory.length > 20) { //长度大于20则截取最后20个
            userHistory = userHistory.slice(userHistory.length - 20, userHistory.length)
        }

        let replyInfo = {}

        for (let i = 1; i <= userHistory.length; i++) {
            if (lotteryInfo.length == userHistory[i - 1].turns) { //记录的最后一轮和用户的轮次一样，说明是最后一轮且未开奖，不能告知是否中奖
                replyInfo = {
                    "turns": userHistory[i - 1].turns,
                    "lotteryNum": userHistory[i - 1].lotteryNum,
                    "time": userHistory[i - 1].time,
                    "isDraw": "未开奖"
                }
            } else {
                replyInfo = {
                    "turns": userHistory[i - 1].turns,
                    "lotteryNum": userHistory[i - 1].lotteryNum,
                    "time": userHistory[i - 1].time,
                    "isDraw": lotteryInfo[userHistory[i - 1].turns - 1].award == userHistory[i - 1].lotteryNum
                }
            }

            msg += `轮次: ${replyInfo.turns}\n`;
            msg += `彩票号码: ${replyInfo.lotteryNum}\n`;
            msg += `购买时间: ${replyInfo.time}\n`;
            msg += `是否中奖: ${replyInfo.isDraw == "未开奖" ? '未开奖' : (replyInfo.isDraw ? '是' : '否')}\n`;
            msg += '-------------\n';

        }

        let tip = `${nickname}(${userId})彩票记录如下:`
        await e.reply(Bot.makeForwardArray([`${tip}\n-------------\n${msg}`]));
    }

    async myLottery(e) {
        const groupInfo = await this.e.group.getInfo()
        const groupName = groupInfo.group_name
        const groupId = e.group_id
        const userId = e.user_id
        const nickname = e.member.card || e.member.nickname

        let info = this.readInfo(0)
        let turns = info.length

        let data = this.readData(`./data/lottery/user/${userId}.json`)
        let userLottery = {}

        if (!data.length) {
            await e.reply(`您还从未购买过彩票`, true)
            return
        }

        if (turns == data[data.length - 1].turns) { //当前轮次买过彩票则输出彩票信息
            userLottery = data[data.length - 1]
            await e.reply(this.formatLottery(`您的彩票信息如下：`, nickname, userId, userLottery.lotteryNum, userLottery.groupId, userLottery.groupName, userLottery.time, groupId == userLottery.groupId), true)
            return
        } else { //没买过则输出当前轮次未购买
            await e.reply(`您在当前轮次未购买过彩票`, true)
            return
        }
    }

    readInfo(flag) {
        const rootPath = `./data/lottery`;
        if (!fs.existsSync(rootPath)) {
            fs.mkdirSync(rootPath);
            fs.mkdirSync(rootPath + '/user')
        }

        const path = `./data/lottery/info.json`;
        if (flag == 0) { //flag=0为读取info
            const defaultInfo = [{
                turns: 1,
                award: this.getRandomNum(),
                used: []
            }]

            if (!fs.existsSync(path)) {
                fs.writeFileSync(path, JSON.stringify(defaultInfo, null, 4), 'utf-8')
            }


        }

        let info = this.readData(path)
        if (flag == 1) { //flag=1则说明要读取info且开始了新的轮次
            const newInfo = {
                turns: info.length + 1,
                award: this.getRandomNum(),
                used: []
            }
            info.push(newInfo)
            fs.writeFileSync(path, JSON.stringify(info, null, 4), 'utf-8')
        }

        let infoContent = fs.readFileSync(path, 'utf-8')
        return JSON.parse(infoContent)
    }

    readData(filePath) {
        try {
            if (fs.existsSync(filePath)) { //判断是否存在
                const fileContent = fs.readFileSync(filePath, 'utf-8')
                return JSON.parse(fileContent)
            }
            return [] //不存在则返回空数组
        } catch (error) {
            logger.warn('Error reading the data file:', error); //返回错误
            return [];
        }
    }

    getRandomNum() {
        let randomNumber = Math.floor(Math.random() * 900) + 100;
        return randomNumber
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

    formatLottery(tip, nickname, userId, lotteryNum, groupId, groupName, time, isThisGroup) {
        if (isThisGroup) {
            return `${tip}\n-------------\n用户信息: ${nickname}(${userId})\n彩票号码: ${lotteryNum}\n购买群号: ${groupId}\n购买群名: ${groupName}\n购买时间: ${time}\n-------------`
        } else {
            return `${tip}\n-------------\n用户信息: ${nickname}(${userId})\n彩票号码: ${lotteryNum}\n购买群号: 非当前群聊购买\n购买群名: 非当前群聊购买\n购买时间: ${time}\n-------------`
        }

    }
}