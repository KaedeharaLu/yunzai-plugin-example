import fs from 'fs';

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
          reg: '^#?发言榜$',
          fnc: 'showMessageRanking'
        },
        {
          reg: '^#清除发言榜单$',
          fnc: 'clearMessageRanking'
        }
      ]
    });
  }

  async showMessageRanking(e) {
    const data = this.readData(e.group_id);

    if (data.length === 0) {
      e.reply('本群好像还没人说过话呢~');
      return true;
    }

    // 计算总消息数
    const totalMessages = data.reduce((sum, user) => sum + user.number, 0);
    const info = await this.e.group.getInfo()
    const groupname = info.group_name
    let groupid = e.group_id
    let msg = [`群名: ${groupname}`,`\n群号: ${groupid}`,'\n━━━━━━━━━━━━━━\n本群发言榜:\n'];

    // 排序并截取前30名
    data.sort((a, b) => b.number - a.number);
    const topUsers = data.slice(0, 30);

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      // 计算发言比例，并保留两位小数
      const percentage = ((user.number / totalMessages) * 100).toFixed(2);
      if (!user.nickname||user.nickname.trim()==' ') {
        msg.push(`\n第${i + 1}名：(${user.user_id})·${user.number}次（占比${percentage}%）`);
      } else {
        msg.push(`\n第${i + 1}名：${user.nickname}·${user.number}次（占比${percentage}%）`);
      }
    }
    if (groupid == "992067118" || groupid == "592908249") {
      await e.reply(Bot.makeForwardArray([msg]));
    } else {
      await e.reply(msg.join(''));
    }
    return true;
  }

  async recordMessageCount(e) {
    const filePath = `./data/snots/${e.group_id}_snots.json`;

    // 确保数据目录存在
    if (!fs.existsSync('./data/snots')) {
      fs.mkdirSync('./data/snots');
    }

    let data = this.readData(e.group_id);

    let nickname = ''
    if (e.group_id) {
      nickname = e.member.card || e.member.nickname
    } else {
      nickname = e.user_id
    }

    // 查找当前用户是否已经有记录
    let userRecord = data.find(item => item.user_id === e.user_id);

    if (userRecord) {
      // 如果有记录，则增加发言次数
      userRecord.number++;

      // 检查昵称是否一致，若不一致则更新
      if (userRecord.nickname !== nickname) {
        userRecord.nickname = nickname;
      }

    } else {
      // 如果没有记录，则添加新用户记录
      userRecord = { user_id: e.user_id, nickname: nickname, number: 1 };
      data.push(userRecord);
    }

    // 将更新后的数据写回到文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 3), 'utf-8');

    return false;
  }

  readData(groupId) {
    const filePath = `./data/snots/${groupId}_snots.json`;

    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
      }

      return []; // 文件不存在则返回空数组

    } catch (error) {
      console.error('Error reading the data file:', error);
      return [];
    }
  }

  async clearMessageRanking(e) {
    const filePath = `./data/snots/${e.group_id}_snots.json`;
    if (!e.isMaster) {
      await e.reply('你不是主人，不可以清除发言榜单!');
      return;
    }

    // 检查文件是否存在，如果存在则直接删除
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      await e.reply('当前群聊发言榜单已清除！')
    } else {
      await e.reply('当前群聊发言榜单为空，无需清除！')
    }
    return;
  }
}
