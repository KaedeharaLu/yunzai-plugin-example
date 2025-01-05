import fs from 'fs';

let settings=[]

Bot.on("message.group", e => {
  if (e.message) { (new Rank()).recordMessageCount(e) }
})

export class Rank extends plugin {
  constructor() {
    super({
      name: '发言次数统计',
      dsc: '统计并显示群成员的总发言次数。',
      event: 'message',
      priority: -100000,
      rule: [
        {
          reg: '^(#?水群榜|#?发言榜|#?B话榜)$',
          fnc: 'fullRank'
        },
        {
          reg: '^#清除发言榜单$',
          fnc: 'clearMessageRanking'
        },
        {
          reg: '^(#水群榜|#发言榜|#B话榜)设置排行',
          fnc:'setRand'
        },
        {
          reg: '^(#水群榜|#发言榜|#B话榜)设置转发',
          fnc:'setArr'
        },
        {
          reg:'^(#?水群榜|#?发言榜|#?B话榜)帮助',
          fnc:'help'
        },
        // {
        //   reg:'^#更新发言榜结构$',
        //   fnc:'updateStructure'
        // },
        {
          reg:'^(#?水群榜|#?发言榜|#?B话榜)日榜$',
          fnc:'dailyRank'
        },
        {
          reg:'^(#?水群榜|#?发言榜|#?B话榜)月榜$',
          fnc:'monthlyRank'
        },
        {
          reg:'^(#?水群榜|#?发言榜|#?B话榜)周榜$',
          fnc:'weeklyRank'
        }
      ]
    });
  }

  getWeekOfMonth(year,month,day){
    // 月份需要减去1，因为 JavaScript 中的月份是从0开始的（0表示1月，1表示2月，以此类推）
    const currentDate = new Date(year, month - 1, day);

    // 获取本月的第一天
    const firstDayOfMonth = new Date(year, month - 1, 1);
 
    // 获取本月第一天是星期几 (0 是周日，1 是周一，...，6 是周六)
    const dayOfWeek = firstDayOfMonth.getDay();
 
    // 计算当前日期是本月的第几周
    // 通过计算当前日期距离本月第一天的天数差，再除以 7 得到周数
    const dayOfMonth = currentDate.getDate();
    const weekNumber = Math.ceil((dayOfMonth + dayOfWeek) / 7);
 
    return weekNumber;
  }

  autoGetWeekOfMonth(date) { //计算当前的周数
    // 获取当前日期
    const currentDate = new Date(date);

    // 获取本月的第一天
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // 获取本月第一天是星期几 (0 是周日，1 是周一，...，6 是周六)
    const dayOfWeek = firstDayOfMonth.getDay();

    // 计算当前日期是本月的第几周
    // 通过计算当前日期距离本月第一天的天数差，再除以 7 得到周数
    const dayOfMonth = currentDate.getDate();
    const weekNumber = Math.ceil((dayOfMonth + dayOfWeek) / 7);

    return weekNumber;
  }

  async weeklyRank(e){
    const data = this.readData(e,e.group_id);

    if (data.length === 0) {
      e.reply('本群好像还没人说过话呢~');
      return true;
    }

    let weeklyData=[]
    let time=this.getTime()
    for(let i=0;i<=data.length-1;i++){ //整理数据
      let sum=0
      for(let j=0;j<=data[i].history.length-1;j++){
        let thisData=data[i].history[j]
        if(thisData.month==time.month&&thisData.year==time.year&&thisData.week==time.week){ //是本周数据
          sum+=thisData.number
        }
      }
      if(sum>0){ //本周榜单存在
        let temp={
          "nickname":"",
          "number":sum
        }
        if ((!data[i].nickname)||(data[i].nickname.trim()=='')) {
          temp.nickname=`[${data[i].user_id}]`
        } else {
          temp.nickname=`『${data[i].nickname}』`
        }
        weeklyData.push(temp)
      }
    }

    if(!weeklyData){
      e.reply("你是本群本周第一个发言的~",true)
      return
    }
    // 计算总消息数
    const totalMessages = weeklyData.reduce((sum, user) => sum + user.number, 0);
    const info = await this.e.group.getInfo()
    const groupname = info.group_name
    let groupid = e.group_id
    let msg = [`群名: ${groupname}\n群号: ${groupid}\n本周发言总数: ${totalMessages}\n${time.year}年${time.month}月第${time.week}周\n━━━━━━━━━━━━━━\n本群发言榜:\n`];

    // 排序并截取
    weeklyData.sort((a, b) => b.number - a.number);
    var topUsers
    topUsers = weeklyData.slice(0, settings.rand);
    

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      // 计算发言比例，并保留两位小数
      const percentage = ((user.number / totalMessages) * 100).toFixed(2);
      msg.push(`\n第${i + 1}名：${user.nickname}·${user.number}次（占比${percentage}%）`);
    }
    if(!settings.isArr){
      await e.reply(msg.join(''));
    }else{
      await e.reply(Bot.makeForwardArray([msg]));
    }
    return
  }

  async monthlyRank(e){
    const data = this.readData(e,e.group_id);

    if (data.length === 0) {
      e.reply('本群好像还没人说过话呢~');
      return true;
    }

    let monthlyData=[]
    let time=this.getTime()
    for(let i=0;i<=data.length-1;i++){ //整理数据
      let sum=0
      for(let j=0;j<=data[i].history.length-1;j++){
        let thisData=data[i].history[j]
        if(thisData.month==time.month&&thisData.year==time.year){ //是本月数据
          sum+=thisData.number
        }
      }
      if(sum>0){ //当月榜单存在
        let temp={
          "nickname":"",
          "number":sum
        }
        if ((!data[i].nickname)||(data[i].nickname.trim()=='')) {
          temp.nickname=`[${data[i].user_id}]`
        } else {
          temp.nickname=`『${data[i].nickname}』`
        }
        monthlyData.push(temp)
      }
    }

    if(!monthlyData){
      e.reply("你是本群本月第一个发言的~",true)
      return
    }
    // 计算总消息数
    const totalMessages = monthlyData.reduce((sum, user) => sum + user.number, 0);
    const info = await this.e.group.getInfo()
    const groupname = info.group_name
    let groupid = e.group_id
    let msg = [`群名: ${groupname}\n群号: ${groupid}\n本月发言总数: ${totalMessages}\n月份: ${time.year}年${time.month}月\n━━━━━━━━━━━━━━\n本群发言榜:\n`];

    // 排序并截取
    monthlyData.sort((a, b) => b.number - a.number);
    var topUsers
    topUsers = monthlyData.slice(0, settings.rand);
    

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      // 计算发言比例，并保留两位小数
      const percentage = ((user.number / totalMessages) * 100).toFixed(2);
      msg.push(`\n第${i + 1}名：${user.nickname}·${user.number}次（占比${percentage}%）`);
    }
    if(!settings.isArr){
      await e.reply(msg.join(''));
    }else{
      await e.reply(Bot.makeForwardArray([msg]));
    }
    return
  }

  async dailyRank(e){
    const data = this.readData(e,e.group_id);

    if (data.length === 0) {
      e.reply('本群好像还没人说过话呢~');
      return true;
    }

    let dailyData=[]
    let time=this.getTime()
    for(let i=0;i<=data.length-1;i++){ //整理数据
      let thisHistory=data[i].history.find(item=>(item.year==time.year&&item.month==time.month&&item.day==time.day)) //匹配当天的榜单
      if(thisHistory){ //当天榜单存在
        let temp={
          "nickname":"",
          "number":thisHistory.number
        }
        if ((!data[i].nickname)||(data[i].nickname.trim()=='')) {
          temp.nickname=`[${data[i].user_id}]`
        } else {
          temp.nickname=`『${data[i].nickname}』`
        }
        dailyData.push(temp)
      }
    }

    if(!dailyData){
      e.reply("你是本群本日第一个发言的~",true)
      return
    }
    // 计算总消息数
    const totalMessages = dailyData.reduce((sum, user) => sum + user.number, 0);
    const info = await this.e.group.getInfo()
    const groupname = info.group_name
    let groupid = e.group_id
    let msg = [`群名: ${groupname}\n群号: ${groupid}\n当日发言总数: ${totalMessages}\n日期: ${time.year}年${time.month}月${time.day}日\n━━━━━━━━━━━━━━\n本群发言榜:\n`];

    // 排序并截取
    dailyData.sort((a, b) => b.number - a.number);
    var topUsers
    topUsers = dailyData.slice(0, settings.rand);
    

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      // 计算发言比例，并保留两位小数
      const percentage = ((user.number / totalMessages) * 100).toFixed(2);
      msg.push(`\n第${i + 1}名：${user.nickname}·${user.number}次（占比${percentage}%）`);
    }
    if(!settings.isArr){
      await e.reply(msg.join(''));
    }else{
      await e.reply(Bot.makeForwardArray([msg]));
    }
    return
  }

  updateStructure(e){
    this.check(e)
    let data = this.readData(e,e.group_id);
    const filePath = `./data/snots/${e.group_id}/snots.json`;
    // logger.info(data)
    let time=this.getTime()
    let newData=[]
    for(let i=0;i<data.length-1;i++){
      let newArray={
        "user_id":data[i].user_id,
        "nickname":data[i].nickname,
        "total":data[i].number,
        "history":[
          {
            "year":time.year,
            "month":time.month,
            "day":time.day,
            "week":time.week,
            "number":data[i].number
          }
        ]
      }
      newData.push(newArray)
    }
    fs.writeFileSync(filePath,JSON.stringify(newData,null,4),'utf-8')

    e.reply("发言榜数据成功更新到新结构！")
  }

  async help(e){
    let msg=''
    msg+=`**********************************\n`
    msg+=`欢迎使用由KaedeharaLu开发的发言榜插件\n`
    msg+=`**********************************\n`
    msg+=`使用方法:\n`
    msg+=`----------\n`
    msg+=`所有人:\n`
    msg+=`1.每次发言都会记录\n`
    msg+=`2.#发言榜 : 查看当前群聊的发言总榜单\n`
    msg+=`3.#发言榜月榜 : 查看当前群聊本月的发言榜单\n`
    msg+=`4.#发言榜周榜 : 查看当前群聊本周的发言榜单\n`
    msg+=`5.#发言榜日榜 : 查看当前群聊本日的发言榜单\n`
    msg+=`----------\n`
    msg+=`主人可用:\n`
    msg+=`1."#清除发言榜单":清除当前群聊的发言记录\n`
    msg+=`2."#发言榜设置排行+大于0的数字":设置最后显示的榜单人数\n`
    msg+=`3."#发言榜设置转发+0/1":设置是否以转发消息的形式发送，防止刷屏\n`
    msg+=`注: 设置时请去除加号`
    msg+=`**********************************`
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
    if(!fs.existsSync(`./data/snots`)){
      fs.mkdirSync(`./data/snots`);
    }
    let filePath=`./data/snots/${e.group_id}`
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath);
      settings={
        "isArr" : 0,
        "rand" : 20
      }
      fs.writeFileSync(`${filePath}/settings.json`,JSON.stringify(settings,null,4),'utf-8')
      fs.writeFileSync(`${filePath}/snots.json`,JSON.stringify([],null,4),'utf-8')
    }else if (!fs.existsSync(`${filePath}/settings.json`)) { //迁移时无settings.json文件自动创建
      settings={
        "isArr" : 0,
        "rand" : 20
      }
      fs.writeFileSync(`${filePath}/settings.json`,JSON.stringify(settings,null,4),'utf-8')
    }
  }

  async fullRank(e) {
    const data = this.readData(e,e.group_id);

    if (data.length === 0) {
      e.reply('本群好像还没人说过话呢~');
      return true;
    }

    // 计算总消息数
    const totalMessages = data.reduce((sum, user) => sum + user.total, 0);
    const info = await this.e.group.getInfo()
    const groupname = info.group_name
    let groupid = e.group_id
    let msg = [`群名: ${groupname}\n群号: ${groupid}\n发言总数: ${totalMessages}\n━━━━━━━━━━━━━━\n本群发言榜:\n`];

    // 排序并截取前30名
    data.sort((a, b) => b.total - a.total);
    var topUsers
    topUsers = data.slice(0, settings.rand);
    

    for (let i = 0; i < topUsers.length; i++) {
      const user = topUsers[i];
      // 计算发言比例，并保留两位小数
      const percentage = ((user.total / totalMessages) * 100).toFixed(2);
      if ((!user.nickname)||(user.nickname.trim()=='')) {
        msg.push(`\n第${i + 1}名：[${user.user_id}]·${user.total}次（占比${percentage}%）`);
      } else {
        msg.push(`\n第${i + 1}名：『${user.nickname}』·${user.total}次（占比${percentage}%）`);
      }
    }
    if(!settings.isArr){
      await e.reply(msg.join(''));
    }else{
      await e.reply(Bot.makeForwardArray([msg]));
    }
    return
  }

  async recordMessageCount(e){
    const filePath = `./data/snots/${e.group_id}/snots.json`;

    this.check(e)
    
    let data = this.readData(e,e.group_id);

    if(data.length>0&&(!data[0].total)){ //旧结构，需要更新
      this.updateStructure(e)
    }

    let nickname = ""
    if (e.group_id) {
      nickname = e.member.card || e.member.nickname
    } else {
      nickname = e.user_id
    }

    // 查找当前用户是否已经有记录
    let userRecord = data.find(item => item.user_id === e.user_id);
    const time=this.getTime()

    if (userRecord) {
      let history=userRecord.history.find(item => (item.year==time.year&&item.month==time.month&&item.day==time.day)) //日期匹配
      userRecord.total+=1 //发言总数

      if(history){ //当天有记录
        history.number+=1
      }else{ //当天未发言，则创建
        let newHistory={
          "year": time.year,
          "month": time.month,
          "day": time.day,
          "week": time.week,
          "number": 1
        }
        userRecord.history.push(newHistory)
      }

      // 检查昵称是否一致，若不一致则更新
      if (userRecord.nickname != nickname || !userRecord.nickname) {
        userRecord.nickname = nickname;
      }
    } else {
      // 如果没有记录，则添加新用户记录
      userRecord = {
        "user_id": e.user_id,
        "nickname": nickname,
        "total":1,
        "history":[
          {
            "year":time.year,
            "month":time.month,
            "day":time.day,
            "week":time.week,
            "number":1
          }
        ] 
      };
      data.push(userRecord);
    }

    // 将更新后的数据写回到文件
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf-8');

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
      fs.writeFileSync(`${filePath}/snots.json`,JSON.stringify([],null,4),'utf-8') //复原
      await e.reply('当前群聊发言榜单已清除！')
    } else {
      await e.reply('当前群聊发言榜单为空，无需清除！')
    }
    return;
  }

  getTime() {
    let currentDate = new Date();
    let year = currentDate.getFullYear();
    let month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
    let day = ('0' + currentDate.getDate()).slice(-2);
    let hours = ('0' + currentDate.getHours()).slice(-2);
    let minutes = ('0' + currentDate.getMinutes()).slice(-2);
    let seconds = ('0' + currentDate.getSeconds()).slice(-2);
    let week= this.autoGetWeekOfMonth(currentDate) //获取第几周

    let time={
      "year":Number(year),
      "month":Number(month),
      "day":Number(day),
      "hours":Number(hours),
      "minutes":Number(minutes),
      "seconds":Number(seconds),
      "week":Number(week)
    }
    return time
  }
}
