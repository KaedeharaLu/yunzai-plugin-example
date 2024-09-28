import fs from 'fs/promises';

// 定义数据目录和备份目录
const DATA_DIR = './data/snots/';

// 定义错误信息
const ERROR_NOT_MASTER = '你可不是主人，我才不听你的呢！';

export class Example2 extends plugin {
    constructor() {
        super({
            name: '发言次数统计',
            dsc: '统计并显示群成员的总发言次数。',
            event: 'message',
            priority: -1,
            rule: [
                {
                    reg: '',
                    fnc: 'recordMessageCount'
                },
                {
                    reg: '^#?水群榜$',
                    fnc: 'showMessageRanking'
                },
                {
                    reg: '^#清除所有水群榜单$',
                    fnc: 'clearMessageRankingA'
                },
                {
                    reg: '^#清除水群榜单(?:\\s*(\\d+))?$',
                    fnc: 'clearMessageRankingG'
                },
                {
                    reg: '^#水群榜设置$',
                    fnc: 'showSettings'
                },
                {
                    reg: '^#水群榜设置排行$',
                    fnc: 'setRand'
                },
                {
                    reg: '^#水群榜设置转发$',
                    fnc: 'setArr'
                },
                {
                    reg: '^#水群榜帮助$',
                    fnc: 'help'
                }
            ]
        });
        // 默认设置
        this.settings = {
            isArr: 1,
            rand: 10
        };
    }

    async help(e) {
        let msg = '';
        msg += `********************\n`;
        msg += `欢迎使用由QingYing修改的水群榜插件\n`;
        msg += `********************\n`;
        msg += `使用方法:\n`;
        msg += `----------\n`;
        msg += `所有人:\n`;
        msg += `1.每次发言都会记录\n`;
        msg += `2.使用"#水群榜"来查看当前群聊的发言榜单\n`;
        msg += `(看看谁是B话王)\n`;
        msg += `----------\n`;
        msg += `主人可用:\n`;
        msg += `1."#清除水群榜单" : 清除当前群聊的发言记录\n`;
        msg += `2."#清除水群榜单 群组ID" : 清除指定群组的发言榜单，并备份至backup_snots_G文件夹，重复备份为直接覆盖\n`;
        msg += `3."#清除所有水群榜单" : 清除所有群组的发言榜单，并备份至backup_snots_A文件夹，重复备份为直接覆盖\n`;
        msg += `4."#水群榜设置" : 查看当前群聊的设置\n`;
        msg += `5."#水群榜设置排行+大于0的数字" : 设置最后显示的榜单人数\n`;
        msg += `6."#水群榜设置转发+0/1" : 设置是否以转发消息的形式发送，防止刷屏\n`;
        msg += `********************\n`;
        msg += `注意：此统计插件为二创版本！\n原作者为：KaedeharaLu\n`;
        msg += `********************`;
        await e.reply(msg);
    }

    // 确保群组目录存在
    async ensureDirExists(groupId) {
        const dirPath = `${DATA_DIR}${groupId}`;
        try {
            await fs.mkdir(dirPath, { recursive: true });
            const settingsFilePath = `${dirPath}/settings.json`;
            try {
                await fs.access(settingsFilePath);
            } catch {
                await fs.writeFile(settingsFilePath, JSON.stringify(this.settings, null, 4), 'utf-8');
            }

            const snotsFilePath = `${dirPath}/snots.json`;
            try {
                await fs.access(snotsFilePath);
            } catch {
                await fs.writeFile(snotsFilePath, JSON.stringify([], null, 4), 'utf-8');
            }
        } catch (error) {
            console.error('创建目录时出错:', error);
        }
    }

    // 显示当前设置
    async showSettings(e) {
        await this.ensureDirExists(e.group_id);
        const settingsData = await this.getSettings(e.group_id);
        const settingsMessage = `当前设置:\n榜单人数: ${settingsData.rand}\n是否以转发形式发送: ${settingsData.isArr === 1 ? '是' : '否'}`;
        await e.reply(settingsMessage);
    }

    // 设置转发方式
    async setArr(e) {
        if (!e.isMaster) {
            e.reply(ERROR_NOT_MASTER, true);
            return;
        }

        const settingArr = e.raw_message.slice(8).trim();
        if (!settingArr) {
            e.reply(`未设置，请重新设置！`, true);
            return;
        }
        this.settings.isArr = parseInt(settingArr) === 1 ? 1 : 0;
        await this.saveSettings(e.group_id);
        e.reply(`成功设置转发消息${this.settings.isArr === 1 ? '开启' : '关闭'}`);
    }

    // 设置榜单人数
    async setRand(e) {
        if (!e.isMaster) {
            e.reply(ERROR_NOT_MASTER, true);
            return;
        }

        const settingRand = e.raw_message.slice(8).trim();
        if (!settingRand || isNaN(settingRand) || settingRand <= 0) {
            e.reply(`设置失败，请输入大于0的数字。`, true);
            return;
        }
        this.settings.rand = parseInt(settingRand);
        await this.saveSettings(e.group_id);
        e.reply(`成功设置排行榜单人数为${this.settings.rand}`);
    }

    // 获取排名榜单
    async showMessageRanking(e) {
        const data = await this.readData(e, e.group_id);

        if (data.length === 0) {
            e.reply('本群好像还没人说过话呢~');
            return true;
        }

        const totalMessages = data.reduce((sum, user) => sum + user.number, 0);
        const info = await this.e.group.getInfo();
        const groupname = info.group_name;
        const groupid = e.group_id;

        let msg = [`群名: ${groupname}\n群号: ${groupid}\n发言总数: ${totalMessages}\n榜单每月1日0点自动重置\n━━━━━━━━━━━━━━\n本群发言榜:`];

        data.sort((a, b) => b.number - a.number);
        const topUsers = data.slice(0, this.settings.rand);

        let userRank = -1;
        let userMessages = 0;
        let userPercentage = '0.00%';

        const userRecord = data.find(item => item.user_id === e.user_id);
        if (userRecord) {
            userMessages = userRecord.number;
            userRank = data.indexOf(userRecord) + 1;
            if (totalMessages > 0) {
                userPercentage = ((userMessages / totalMessages) * 100).toFixed(2) + '%';
            }
        }

        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];
            const percentage = ((user.number / totalMessages) * 100).toFixed(2);
            msg.push(`\n第${i + 1}名：${user.nickname || `(${user.user_id})`}·${user.number}次（占比${percentage}%）`);
        }

        if (userRank !== -1) {
            msg.push(`\n━━━━━━━━━━━━━━\n你的排名：第${userRank}名\n你的发言次数：${userMessages}次\n你的发言占比：${userPercentage}`);
        } else {
            msg.push(`\n━━━━━━━━━━━━━━\n你还没有发言记录。`);
        }

        if (!this.settings.isArr) {
            await e.reply(msg.join(''));
        } else {
            await e.reply(Bot.makeForwardArray([msg]));
        }
    }

    // 获取群组的发言数据
    async getMessageData(groupId) {
        return await this.readData({}, groupId);
    }

    // 记录发言次数
    async recordMessageCount(e) {
        const userId = e.user_id;
        const filePath = `./data/snots/${e.group_id}/snots.json`;

        await this.ensureDirExists(e.group_id);

        let data = await this.getMessageData(e.group_id);
        let nickname = e.member ? e.member.card || e.member.nickname || userId : userId;

        let userRecord = data.find(item => item.user_id === userId);
        if (!userRecord) {
            userRecord = { user_id: userId, nickname, number: 1 };
            data.push(userRecord);
        } else {
            userRecord.number += 1;
        }

        await fs.writeFile(filePath, JSON.stringify(data, null, 3), 'utf-8');
        return false;
    }

    // 读取群组数据
    async readData(e, groupId) {
        const filePath = `./data/snots/${groupId}/snots.json`;
        await this.ensureDirExists(groupId);

        try {
            const data = await fs.readFile(filePath, 'utf-8');
            if (data.trim() === "") {
                console.warn(`文件为空: ${filePath}`);
                return []; // 返回空数组
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('读取数据时出错:', error);
            return []; // 返回空数组
        }
    }

    // 获取群组设置
    async getSettings(groupId) {
        const filePath = `${DATA_DIR}${groupId}/settings.json`;
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            if (data.trim() === "") {
                console.warn(`设置文件为空: ${filePath}`);
                return { isArr: 1, rand: 10 };
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('设置文件不存在或读取错误', error);
            return { isArr: 1, rand: 10 };
        }
    }

    // 备份文件
    async backupFile(srcFilePath, destFilePath) {
        try {
            await fs.copyFile(srcFilePath, destFilePath);
            return true;
        } catch (error) {
            console.error(`备份文件 ${srcFilePath} 时出错:`, error);
            return false;
        }
    }

    // 清理并备份文件
    async clearAndBackup(targetFilePath, backupFilePath) {
        if (await this.backupFile(targetFilePath, backupFilePath)) {
            try {
                await fs.unlink(targetFilePath);
                return true;
            } catch (error) {
                console.error(`清空文件 ${targetFilePath} 时出错:`, error);
                return false;
            }
        }
        return false;
    }

    // 备份整个目录
    async backupDirectory(sourceDir, backupDir) {
        const today = new Date();
        const dateString = today.toISOString().slice(0, 10);
        const backupFolderPath = `${backupDir}/${dateString}`;

        await fs.mkdir(backupFolderPath, { recursive: true });

        const files = await fs.readdir(sourceDir);
        for (const file of files) {
            await this.backupFile(`${sourceDir}/${file}`, `${backupFolderPath}/${file}`);
        }
        return backupFolderPath;
    }

    // 清除所有群组发言榜单并备份
    async clearMessageRankingA(e) {
        const snotsDir = './data/snots/';
        const backupDir = './data/backup_snots_A';

        if (await this.getSettings(snotsDir)) {
            const backupFolderPath = await this.backupDirectory(snotsDir, backupDir);
            e.reply(`已备份发言榜数据至 \`${backupFolderPath}\` 文件夹。`);

            try {
                await fs.rmdir(snotsDir, { recursive: true });
                e.reply('所有群组的发言榜单已清除。');
            } catch (error) {
                console.error('清除所有群组水群榜时出错:', error);
                e.reply('清空所有群组发言榜单失败，请检查日志。');
            }
        } else {
            e.reply('发言榜数据目录不存在。');
        }
    }

    // 清除指定群组的发言榜单并备份
    async clearMessageRankingG(e) {
        let groupIdMatch = e.raw_message.match(/^#清除水群榜单(?:\s*(\d+))?$/);
        let groupId = groupIdMatch ? groupIdMatch[1] : e.group_id;

        const targetFilePath = `./data/snots/${groupId}/snots.json`;
        const backupDir = `./data/backup_snots_G/${groupId}`;
        const today = new Date();
        const dateString = today.toISOString().slice(0, 10);
        const backupFilePath = `${backupDir}/snots_${dateString}.json`;

        try {
            await fs.access(targetFilePath);
            await fs.mkdir(backupDir, { recursive: true });

            if (await this.clearAndBackup(targetFilePath, backupFilePath)) {
                e.reply(`指定群组的发言榜单已清除，并备份至：\`${backupFilePath}\`。`);
            } else {
                e.reply('清空指定群组发言榜单失败，请检查日志。');
            }
        } catch {
            e.reply('指定群组的发言榜单文件不存在。');
        }
    }
}