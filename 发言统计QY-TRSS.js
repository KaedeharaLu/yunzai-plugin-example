/**
 * 作者QingYing 原作者KaedeharaLu
 * 最后更新时间：2024/10/6
 * 问题反馈:  QQ: 2621529331
 */

import fs from 'fs';
import path from 'path';
import schedule from 'node-schedule';

export class Example2 extends plugin {
    constructor() {
        super({
            name: '水群次数统计',
            dsc: '统计并显示群成员的总水群次数。',
            event: 'message',
            priority: -1,
            rule: [
                {
                    reg: '',
                    fnc: 'updateMessageCount'
                },
                {
                    reg: '^#?水群榜$',
                    fnc: 'displayWaterRanking'
                },
                {
                    reg: '^#清除水群榜单$',
                    fnc: 'clearRankings'
                },
                {
                    reg: '^#清除水群榜单 (\\d+)$',
                    fnc: 'clearRankings'
                },
                {
                    reg: '^#清除所有水群榜单$',
                    fnc: 'clearRankings'
                },
                {
                    reg: '^#查看所有水群榜单设置$',
                    fnc: 'displayAllSettings'
                },
                {
                    reg: '^#水群榜设置排行',
                    fnc: 'setRankingLimit'
                },
                {
                    reg: '^#水群榜设置转发',
                    fnc: 'setForwardMessage'
                },
                {
                    reg: '^#水群榜帮助',
                    fnc: 'displayHelp'
                }
            ]
        });

        this.settings = {
            isArr: 1,
            rand: 10,
            resetCycle: 'monthly'
        };
        this.scheduleMonthlyReset();
    }

    /**
     * 每月的第一次定时任务，重置所有群的水群榜单。
     */
    scheduleMonthlyReset() {
        schedule.scheduleJob('0 0 1 * *', async () => {
            const snotsDir = './data/snots';
            const groupDirs = fs.readdirSync(snotsDir);

            for (const id of groupDirs) {
                const filePath = path.join(snotsDir, id, 'snots.json');
                if (fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, JSON.stringify([], null, 4), 'utf-8');
                    console.log(`群号 ${id} 的水群榜单已重置。`);
                }
            }
        });
    }

    /**
     * 显示使用帮助信息。
     */
    async displayHelp(e) {
        let msg = '********************\n';
        msg += '欢迎使用由QingYing修改的水群榜插件\n';
        msg += '********************\n';
        msg += '使用方法:\n';
        msg += '----------\n';
        msg += '所有人:\n';
        msg += '1.每次水群都会记录\n';
        msg += '2.使用"#水群榜"来查看当前群聊的水群榜单\n';
        msg += '(看看谁是水群王)\n';
        msg += '----------\n';
        msg += '主人可用:\n';
        msg += '1."#清除水群榜单":清除当前群聊的水群记录并备份\n';
        msg += '2."#清除水群榜单 <群号>":清除指定群号的水群榜单并备份至 backup_snots_G 文件夹\n';
        msg += '3."#清除所有水群榜单": 清除所有群组的发言榜单，并备份至 backup_snots_A 文件夹\n';
        msg += '----------\n';
        msg += '设置:\n';
        msg += '1."#查看所有水群榜单设置": 查看所有群聊的设置信息\n';
        msg += '2."#水群榜设置排行+大于0的数字":设置最后显示的榜单人数\n';
        msg += '3."#水群榜设置转发+0/1":设置是否以转发消息的形式发送，防止刷屏\n';
        msg += '********************\n';
        msg += '注意：此统计插件为二创版本！\n原作者为：KaedeharaLu\n';
        msg += '********************';
        await e.reply(msg);
    }

    /**
     * 一键查询所有群聊榜单设置信息
     */
    async displayAllSettings(e) {
        if (!e.isMaster) {
            await e.reply('你不是主人，无法执行此操作！');
            return;
        }

        const snotsDir = './data/snots';
        const groupDirs = fs.readdirSync(snotsDir);
        let msg = ['所有群水群榜单设置：\n'];

        for (const id of groupDirs) {
            const settingsPath = path.join(snotsDir, id, 'settings.json');
            if (fs.existsSync(settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
                msg.push(`群号: ${id} | 排名人数: ${settings.rand} | 转发消息: ${settings.isArr === 1 ? '开启\n' : '关闭\n'}`);
            } else {
                msg.push(`群号: ${id} | 未找到设置文件`);
            }
        }

        if (!this.settings.isArr) {
            await e.reply(msg.join(''));
        } else {
            await e.reply(Bot.makeForwardArray([msg]));
        }
    }

    /**
     * 清除当前群的水群榜单或所有群的水群榜单并进行备份。
     */
    async clearRankings(e) {
        if (!e.isMaster) {
            await e.reply('你不是主人，无法执行此操作！');
            return;
        }

        const isClearAll = e.raw_message.includes('所有');
        const match = e.raw_message.match(/(\d+)/);
        const groupId = isClearAll ? null : (match ? match[1] : e.group_id);
        const backupDir = isClearAll ? './data/backup_snots_A' : './data/backup_snots_G';

        this.ensureDirectory(backupDir);

        const snotsDir = './data/snots';
        const groupDirs = groupId ? [groupId] : fs.readdirSync(snotsDir);

        for (const id of groupDirs) {
            const filePath = path.join(snotsDir, id, 'snots.json');
            if (fs.existsSync(filePath)) {
                const backupFilePath = path.join(backupDir, `snots_${id}.json`);
                try {
                    fs.copyFileSync(filePath, backupFilePath);
                    fs.unlinkSync(filePath);
                    await e.reply(`群号 ${id} 的水群榜单已清除并备份至 ${backupFilePath}！`);
                } catch (error) {
                    console.error(`处理群号 ${id} 时出错:`, error);
                    await e.reply(`处理群号 ${id} 时出错。`);
                }
            } else if (!isClearAll) {
                await e.reply(`群号 ${id} 的水群榜单不存在！`);
            }
        }

        if (isClearAll) {
            await e.reply(`所有群组的水群榜单已清除并备份至 ${backupDir}！`);
        }
    }

    /**
     * 设置是否以转发消息的形式发送水群榜单。
     */
    async setForwardMessage(e) {
        if (!e.isMaster) {
            await e.reply(`你不是主人，不可以设置！`, true);
            return;
        }

        const filePath = `./data/snots/${e.group_id}/settings.json`;
        this.ensureDataDirectory(e);
        const settingArr = e.raw_message.slice(8).trim();

        if (!settingArr) {
            await e.reply(`未设置，请重新设置！`, true);
            return;
        }

        this.settings.isArr = settingArr == 0 ? 0 : 1;
        fs.writeFileSync(filePath, JSON.stringify(this.settings, null, 4), 'utf-8');
        await e.reply(this.settings.isArr == 1 ? `成功设置转发消息开启` : `成功设置转发消息关闭`);
    }

    /**
     * 设置水群榜单显示的排名人数限制。
     */
    async setRankingLimit(e) {
        if (!e.isMaster) {
            await e.reply(`你不是主人，不可以设置！`, true);
            return;
        }

        const filePath = `./data/snots/${e.group_id}/settings.json`;
        this.ensureDataDirectory(e);
        const settingRand = e.raw_message.slice(8).trim();

        if (!settingRand || settingRand <= 0) {
            await e.reply(`未设置，请重新设置！`, true);
            return;
        }

        this.settings.rand = settingRand;
        fs.writeFileSync(filePath, JSON.stringify(this.settings, null, 4), 'utf-8');
        await e.reply(`成功设置水群榜单人数为 ${settingRand}`);
    }

    /**
     * 确保指定群体的设置文件和数据目录存在。
     */
    ensureDataDirectory(e) {
        const groupDir = `./data/snots/${e.group_id}`;
        this.ensureDirectory(groupDir);

        const settingsPath = path.join(groupDir, 'settings.json');
        if (!fs.existsSync(settingsPath)) {
            fs.writeFileSync(settingsPath, JSON.stringify(this.settings, null, 4), 'utf-8');
        }
    }

    /**
     * 确保指定目录存在，如果不存在则创建。
     */
    ensureDirectory(directory) {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
    }

    /**
     * 读取指定群组的数据。
     */
    async readData(e, groupId) {
        return this.fetchData(e, groupId);
    }

    /**
     * 显示当前群组的水群排名。
     */
    async displayWaterRanking(e) {
        const data = await this.readData(e, e.group_id);
        if (data.length === 0) {
            await e.reply('本群好像还没人说过话呢~');
            return;
        }

        const totalMessages = data.reduce((sum, user) => sum + user.number, 0);
        const info = await e.group.getInfo();
        const groupname = info.group_name;
        const groupid = e.group_id;

        let msg = [`群名: ${groupname}\n群号: ${groupid}\n发言总数: ${totalMessages}\n榜单每月1日0点自动重置\n━━━━━━━━━━━━━━`];

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

    /**
     * 更新当前群组成员的发言次数。
     */
    async updateMessageCount(e) {
        const filePath = `./data/snots/${e.group_id}/snots.json`;
        const data = await this.fetchData(e, e.group_id);

        // 检查 e.member 是否存在
        const nickname = (e.member && e.member.card) || (e.member && e.member.nickname) || e.user_id;
        let userRecord = data.find(item => item.user_id === e.user_id);

        if (userRecord) {
            userRecord.number++;
            if (userRecord.nickname !== nickname) {
                userRecord.nickname = nickname;
            }
        } else {
            userRecord = { user_id: e.user_id, nickname, number: 1 };
            data.push(userRecord);
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 3), 'utf-8');
        return false;
    }

    /**
     * 从指定群组的文件中获取数据。
     */
    fetchData(e, groupId) {
        const filePath = `./data/snots/${groupId}`;
        this.ensureDataDirectory(e);

        try {
            const snotsFilePath = path.join(filePath, 'snots.json');
            if (!fs.existsSync(snotsFilePath)) {
                fs.writeFileSync(snotsFilePath, JSON.stringify([], null, 4), 'utf-8');
                return [];
            }

            const fileContent = fs.readFileSync(snotsFilePath, 'utf-8');
            const localSettings = JSON.parse(fs.readFileSync(path.join(filePath, 'settings.json'), 'utf-8'));

            this.settings.isArr = localSettings.isArr;
            this.settings.rand = localSettings.rand;

            return JSON.parse(fileContent);
        } catch (error) {
            console.error('读取数据文件时出错:', error);
            return [];
        }
    }
}