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
          reg: '^#发言榜$', // 这里缺失了结束引号和$
          fnc: 'showMessageRanking'
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
    
    // 排序并截取前30名
    data.sort((a, b) => b.number - a.number);
    const topUsers = data.slice(0, 30);

    let msg = ['本群发言榜如下:\n--------'];
    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      // 计算发言比例，并保留两位小数
      const percentage = ((user.number / totalMessages) * 100).toFixed(2);
      msg.push(`\n第${i + 1}名：${user.nickname}·${user.number}次（占比${percentage}%）`);
    }

    await e.reply(msg.join(''));
    return true;
  }

  async recordMessageCount(e) {
    const filePath = `./data/${e.group_id}_snots.json`;
    
    // 确保数据目录存在
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data');
    }

    let data = this.readData(e.group_id);

    // 查找当前用户是否已经有记录
    let userRecord = data.find(item => item.user_id === e.user_id);
    
    if (userRecord) {
      // 如果有记录，则增加发言次数
      userRecord.number++;
      
      // 检查昵称是否一致，若不一致则更新
      if (userRecord.nickname !== e.nickname) {
        userRecord.nickname = e.nickname;
      }
      
    } else {
      // 如果没有记录，则添加新用户记录
      userRecord = { user_id: e.user_id, nickname: e.nickname, number: 1 };
      data.push(userRecord);
    }

    // 将更新后的数据写回到文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 3), 'utf-8');

    return false;
  }

  readData(groupId) {
    const filePath = `./data/${groupId}_snots.json`;

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
}
