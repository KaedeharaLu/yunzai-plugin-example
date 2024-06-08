# KaedeharaLu的云崽js插件仓库
本人为业余、喜好编程人士，仓库内js插件可以在喵崽使用，其它类型的崽请自行测试
发现bug或有好的建议，欢迎发起issue

# 插件列表
## 发言统计
### 使用
- 加载插件后自动运行，群友每发送一条消息会自动记录（不会过滤自己的消息）
- 发送 ``` #发言榜``` 可查看发言记录榜单，只会显示前30名的发言次数和发言次数占比
- 榜单记录文件在``` ./data/snots/```下，名称为```qq群号_snots.json```
- 可以修改代码中的```const topUsers = data.slice(0, 30);```中的“30”来改变榜单截取长度
- 发送 ``` #清除发言榜单 ```可清除当前群聊的记录文件
注：无判断是否超出qq发言长度限制，请自行判断

## 发言统计-TRSS
该js为“发言统计”插件的TRSS版本，使用方法和上面一样

## 反馈
### 使用
- 发送```#反馈+反馈内容```即可自动记录反馈内容
- 反馈记录文件在```./data/feedback.json```
### 主人操作
- 发送```#查看反馈```则输出记录的反馈内容
- 发送```#清除反馈记录```则删除存在的feedback.json文件
- 以上操作均有检查文件是否存在的操作，一般不会出bug
### 暂未完成
- 记录反馈人、反馈时间和反馈群聊（比较简单，但我是懒狗）

## 自动更新NapCat
- 本插件为[tianyisama](https://github.com/tianyisama)制作，用于自动更新NapCat
- 原项目地址：[yunzai-ncupdate](https://github.com/tianyisama/yunzai-ncupdate)
---------
以下为作者的[README.md](https://github.com/tianyisama/yunzai-ncupdate/blob/main/README.md)文件
### yunzai-ncupdate
适用于云崽的指令更新nc插件

#### 须知
- 本js仅适配1.5.2及以上版本的napcat

- 使用前请添加依赖pnpm add (axios，http-proxy-agent，https-proxy-agent，adm-zip) -w

  `pnpm add axios -w`
  `pnpm add http-proxy-agent -w`
  `pnpm add https-proxy-agent -w`
  `pnpm add adm-zip -w`
  
- 须在34行配置目录，例如：原先的运行目录是`E:\111\NapCat.win32.x64`，则填入`E:\\111`

- 目录的最后一级名称一定要为`NapCat.win32.x64`
#### 使用方法
放入plugins/example文件夹中即可
```
介绍一下NapCat吧
NapCat为云崽的适配器，可以通过ws反向连接的方式连接应用端，可以直接扫码登录
由于是直接使用的ntqq的文件，模拟用户操作，封号/冻结的概率低
项目地址：[NapCatQQ](https://github.com/NapNeko/NapCatQQ)
```