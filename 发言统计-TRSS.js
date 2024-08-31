import fs from 'fs';

let settings=[]

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
          reg: '^#清除发言榜单*$',
          fnc: 'clearMessageRanking'
        },
        {
          reg: '^#发言榜设置排行',
          fnc:'setRand'
        },{
          reg: '^#发言榜设置转发',
          fnc:'setArr'
        },{
          reg:'^#发言榜帮助',
          fnc:'help'
        }
      ]
    });
  }

  async help(e){
    let msg=''
    msg+=`********************\n`
    msg+=`欢迎使用由KaedeharaLu开发的发言榜插件\n`
    msg+=`********************\n`
    msg+=`使用方法:\n`
    msg+=`----------\n`
    msg+=`所有人:\n`
    msg+=`1.每次发言都会记录\n`
    msg+=`2.使用"#发言榜"来查看当前群聊的发言榜单\n`
    msg+=`(看看谁是B话王)\n`
    msg+=`----------\n`
    msg+=`主人可用:\n`
    msg+=`1."#清除发言榜单*":清除当前群聊的发言记录\n`
    msg+=`2."#发言榜设置排行+大于0的数字":设置最后显示的榜单人数\n`
    msg+=`3."#发言榜设置转发+0/1":设置是否以转发消息的形式发送，防止刷屏\n`
    msg+=`********************`
    await e.reply(msg)
    return
  }

  async setArr(e){
    let filePath=`./data/snots/${e.group_id}/settings.json`
    if(!e.isMaster){
      e.reply(`你不是主人，不可以设置！`,true)
      return
    }
    this.check(e)
    let rand=this.readData(e,e.group_id) //无用，只是保证接受返回数组，防止报错
    let settingArr=e.raw_message.slice(8).trim()
    if(!settingArr){ //没有设置
      e.reply(`未设置，请重新设置！`,true)
      return
    }
    if(settingArr==0){
      settingArr=0
    }else{
      settingArr=1
    }
    settings.isArr=settingArr
    fs.writeFileSync(filePath,JSON.stringify(settings,null,4),'utf-8',(err)=>{
      if(err){
        logger.warn(`Catch error: ${err}`)
        e.reply(`Catch error: ${err}`)
      }else{
        if(settingArr==1){
          logger.info((`成功设置转发消息开启`))
        }else{
          logger.info((`成功设置转发消息关闭`))
        }
      }
    })
    if(settingArr==1){
      e.reply((`成功设置转发消息开启`))
    }else{
      e.reply((`成功设置转发消息关闭`))
    }
    return
  }

  async setRand(e){
    let filePath=`./data/snots/${e.group_id}/settings.json`
    if(!e.isMaster){
      e.reply(`你不是主人，不可以设置！`,true)
      return
    }
    this.check(e)
    let rand=this.readData(e,e.group_id) //无用，只是保证接受返回数组，防止报错
    let settingRand=e.raw_message.slice(8).trim()
    if(!settingRand){ //没有设置
      e.reply(`未设置，请重新设置！`,true)
      return
    }
    if(settingRand>0){
      settings.rand=settingRand
    }else{
      e.reply(`你在设置什么？`,true)
      return
    }
    settings.rand=settingRand
    fs.writeFileSync(filePath,JSON.stringify(settings,null,4),'utf-8',(err)=>{
      if(err){
        logger.warn(`Catch error: ${err}`)
        e.reply(`Catch error: ${err}`)
      }else{
        logger.info(`成功设置排行榜单人数为${settingRand}`)
      }
    })
    e.reply(`成功设置排行榜单人数为${settingRand}`)
    return
  }

  check(e){// 确保数据目录存在
    let filePath=`./data/snots/${e.group_id}`
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath);
      settings={
        "isArr" : 0,
        "rand" : 20
      }
      fs.writeFileSync(`${filePath}/settings.json`,JSON.stringify(settings,null,4),'utf-8')
    }else if (!fs.existsSync(`${filePath}/settings.json`)) { //迁移时无settings.json文件自动创建
      settings={
        "isArr" : 0,
        "rand" : 20
      }
      fs.writeFileSync(`${filePath}/settings.json`,JSON.stringify(settings,null,4),'utf-8')
    }
  }

  async showMessageRanking(e) {
    const data = this.readData(e,e.group_id);

    if (data.length === 0) {
      e.reply('本群好像还没人说过话呢~');
      return true;
    }

    // 计算总消息数
    const totalMessages = data.reduce((sum, user) => sum + user.number, 0);
    const info = await this.e.group.getInfo()
    const groupname = info.group_name
    let groupid = e.group_id
    let msg = [`群名: ${groupname}\n群号: ${groupid}\n发言总数: ${totalMessages}\n━━━━━━━━━━━━━━\n本群发言榜:\n`];

    // 排序并截取前30名
    data.sort((a, b) => b.number - a.number);
    var topUsers
    topUsers = data.slice(0, settings.rand);
    

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      // 计算发言比例，并保留两位小数
      const percentage = ((user.number / totalMessages) * 100).toFixed(2);
      if ((!user.nickname)||(user.nickname.trim()==' ')) {
        msg.push(`\n第${i + 1}名：(${user.user_id})·${user.number}次（占比${percentage}%）`);
      } else {
        msg.push(`\n第${i + 1}名：${user.nickname}·${user.number}次（占比${percentage}%）`);
      }
    }
    if(!settings.isArr){
      await e.reply(msg.join(''));
    }else{
      await e.reply(Bot.makeForwardArray([msg]));
    }
    return
  }

  async recordMessageCount(e) {
    if(e.raw_message==6){
      e.reply('7')
    }else if(e.raw_message==666){
      e.reply('777')
    }

    const filePath = `./data/snots/${e.group_id}/snots.json`;

    this.check(e)
    
    let data = this.readData(e,e.group_id);

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
      if (userRecord.nickname != nickname) {
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

  readData(e,groupId) {
    const filePath = `./data/snots/${groupId}`;
    this.check(e)

    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(`${filePath}/snots.json`, 'utf-8');
        settings=JSON.parse(fs.readFileSync(`${filePath}/settings.json`, 'utf-8'))
        return JSON.parse(fileContent);
      }else{
        fs.mkdirSync(filePath)
        settings={
          "isArr" : 0,
          "rand" : 20
        }
        fs.writeFileSync(`${filePath}/settings.json`,JSON.stringify(settings,null,4),'utf-8')
      }

      return []; // 文件不存在则返回空数组

    } catch (error) {
      console.error('Error reading the data file:', error);
      return [];
    }
  }

  async clearMessageRanking(e) {
    if (!e.isMaster) {
      await e.reply('你不是主人，不可以清除发言榜单!');
      return;
    }

    const filePath = `./data/snots/${e.group_id}`;

    // 检查文件是否存在，如果存在则直接删除
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(`${filePath}/snots.json`)
      await e.reply('当前群聊发言榜单已清除！')
    } else {
      await e.reply('当前群聊发言榜单为空，无需清除！')
    }
    return;
  }
}
