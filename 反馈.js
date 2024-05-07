import fs from 'fs';
export class FeedbackPlugin extends plugin {
  constructor() {
    super({
      name: '记录反馈',
      dsc: '记录反馈',
      event: 'message',
      priority: -1,
      rule: [
        {
          reg: '^#反馈',
          fnc: 'recordFeedback',
        },
        {
          reg: '^#查看反馈$',
          fnc: 'viewFeedback',
        },
        {
          reg: '^#清除反馈记录',
          fnc: 'clearFeedback',
        }
      ]
    });
  }

  async recordFeedback(e) {
    const dirPath = './data';
  const filePath = './data/feedback.json';
  
  // 判断data目录是否存在，不存在则创建
  if (!fs.existsSync(dirPath)){
      fs.mkdirSync(dirPath);
  }

  // 读取反馈内容
  let temp=e.raw_message.trim()
  const feedback = temp.slice(3).trim()

  let feedbackArray = [];
  // 如果feedback.json文件已经存在，读取其内容
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    feedbackArray = JSON.parse(data);
  }
  
  // 添加新的反馈到数组中
  feedbackArray.push(feedback);

  // 将更新后的数组写回feedback.json文件
  fs.writeFileSync(filePath, JSON.stringify(feedbackArray, null, 3), 'utf-8');

  // 通知用户反馈已记录
  await e.reply('反馈已记录，感谢您的反馈！');
  return false;
  }


  async viewFeedback(e) {
    if(!e.isMaster){
      await e.reply('你不是主人，不可以查看反馈记录!')
      return
    }

    const filePath = './data/feedback.json';
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)){
      await e.reply('暂无反馈记录！');
      return;
    }
  
    const data = fs.readFileSync(filePath, 'utf-8');
    const feedbackArray = JSON.parse(data);
    let msg = '反馈记录如下：\n';
  
    feedbackArray.forEach((feedback, index) => {
      msg += `${index + 1}. ${feedback}\n`;
    });
  
    await e.reply(msg);
    return;
  }


  async clearFeedback(e) {
    if (!e.isMaster) {
      await e.reply('你不是主人，不可以清除反馈记录!');
      return;
    }
    const filePath = './data/feedback.json';
    
    // 检查文件是否存在，如果存在则直接删除
    if (fs.existsSync(filePath)){
      fs.unlinkSync(filePath)
      await e.reply('反馈记录已清除！')
    } else {
      await e.reply('反馈记录为空，无需清除！')
    }
    return;
  }
}
