import { Context, Logger, Session, h } from 'koishi'
import { Config } from './config'
import * as fs from 'fs'
import * as path from 'path'

const log = new Logger('CiecleDice/log:')

declare module 'koishi' {
  interface Channel {
    logInfo: LogInfo
  }
  interface Tables {
    msg_log: LogIt
  }
}

type LogInfo = {
  isOn: boolean
  nowLogName: string
  logList: string[]
}

type LogIt = {
  id?: number
  /** 清理无用日志时使用*/
  isLog: boolean
  /** 针对多个 bot 在一个群情况, 防止输出日志重复 */
  botId: string
  /** 用户帐号ID */
  uid: string
  /** 群组ID`*/
  cid: string
  /** 处理撤回消息时使用 */
  mid: string
  /** 提取特定日志使用*/
  logName: string
  /** 时间戳 根据时间 提取特定群日志&清理日志 时使用*/
  time: number
  /** 角色名 */
  ChName: string
  /** 发言，如有图片，为`![](link)`格式 */
  context: string
  /** 平台 */
  platform: string
}

export function apply(ctx: Context, Config: Config) {
  ctx.i18n.define('zh', {
    "circledice": {
      "log": {
        "pormptNot": "已取消相关操作",
        "timeout": "看起来您还没考虑好\n[等待消息时间过长]",
        "logNew": "新建日志《{0}》",
        "logOn": "开启日志《{0}》",
        "logOff": "关闭日志《{0}》",
        "logGet": "将进行获取日志《{0}》操作。\n首先尝试上传文件，失败将尝试其他方式……",
        "getEnd": "已经尝试过一切可行操作。",
        "logList": "本群日志列表：{0}",
        "logNewButIsOn": "已有开启的Log:{0} ，是否要关闭它后新建日志？发送 n 取消操作，其他字符将关闭原有 log。",
        "logNewButNotName": "您似乎没有输入名字？发送 n 取消操作，其他字符视为日志名。",
        "saveEnd": '已从数据库转到文本文件：{1}\n目录：{0}',
        'saveFail': '从数据库转到文本文件失败！',
        'clrWarn': '你确定？这将清除数据库的日志记录，发送 n 取消操作，其他字符继续流程……',
        'upLogNetcut': '上传文本分享网站 netcut 成功。\nlink：{0}\n密码：{1}',
        'upLogNetcutNot': '上传文本分享网站 netcut 失败！',
      }
    }
  })

  ctx = ctx.guild()

  // 数据模型扩展
  ctx.model.extend('msg_log', {
    'id': 'unsigned',
    'isLog': 'boolean',
    'botId': 'string',
    'mid': 'string',
    'cid': 'string',
    'uid': 'string',
    'logName': 'string',
    'ChName': 'string',
    'context': 'string',
    'platform': 'string',
    'time': 'unsigned'
  }, {
    autoInc: true
  })

  ctx.model.extend('channel', {
    logInfo: {
      type: 'json', initial: {
        isOn: false,
        nowLogName: 'recall',
        logList: []
      }
    },
  })

  // 记录自己发的消息
  ctx.on('send', async (session) => {
    let data = await ctx.database.getChannel(session.platform, session.channelId, ['logInfo'])
    let logInfo = data.logInfo
    //let ch = dice.getCurrentPC(session)
    //session.username = ch.name
    let logIt = createLogIt(session, logInfo)
    if (logIt) {
      await ctx.database.create('msg_log', logIt)
      log.debug(logIt)
    }
  })

  // 记录自己收到的消息
  ctx.on('message', async (session) => {
    let data = await ctx.database.getChannel(session.platform, session.channelId, ['logInfo'])
    let logInfo = data.logInfo
    //let ch = dice.getCurrentPC(session)
    //session.username = ch.name
    let logIt = createLogIt(session, logInfo)
    if (logIt) {
      await ctx.database.create('msg_log', logIt)
      log.info(logIt)
    }
  })

  // 删除被撤回的日志
  ctx.on('message-deleted', (session) => {
    ctx.database.remove('msg_log', {
      mid: session.messageId,
      cid: session.channelId,
      platform: session.platform
    }).then(() => { log.info('已经删除被撤回的日志消息') })
  })

  // 指令实现
  ctx.command('log')
    .option('new', '-n [name] 新建名为[name]的log')
    .option('on', '-o [id] 开启之前关闭或者指定的log')
    .option('off', '-s 关闭开启的log')
    .option('list', '-l 查看本群所有log')
    .option('get', '-g [id] ')
    .usage('游戏日志相关指令')
    .channelFields(['logInfo'])
    .action(async (argv) => {
      // 兼容常见语法
      if (argv.options.new) argv.args = ['new', argv.options.new];
      if (argv.options.on) argv.args = ['on', argv.options.on];
      if (argv.options.get) argv.args = ['get', argv.options.get];

      const { session, args } = argv
      let logInfo = session.channel.logInfo
      function i18(text: string, arr?: string[]) {
        return arr ? session.text('circledice.log.' + text, arr) : session.text('circledice.log.' + text)
      }
      log.info(args, logInfo)

      switch (args[0]) {
        case 'new':
          //
          if (typeof args[1] != 'string') {
            session.send(i18('logNewButNotName'))
            let prompt = await session.prompt()
            if (prompt != null) {
              if (prompt == 'n') {
                return i18('pormptNot')
              } else {
                args[1] = prompt
              }
            } else {
              return i18('timeout')
            }
          }
          //
          if (logInfo.isOn == true) {
            session.send(i18('logNewButIsOn', [logInfo.nowLogName]))
            let prompt = await session.prompt()
            if (prompt != null) {
              if (prompt == 'n') return i18('.prompt=n')
            } else {
              return i18('timeout')
            }
          }
          // 自动防重名
          let newName = addName(args[1], logInfo.logList)
          logInfo.isOn = true
          logInfo.nowLogName = newName
          return i18('logNew', [logInfo.nowLogName])
        case 'on':
          if (args[1]) logInfo.nowLogName = args[1]
          logInfo.isOn = true
          return i18('logOn', [logInfo.nowLogName])
        case 'off':
          logInfo.isOn = false
          return i18('logOff', [logInfo.nowLogName])
        case 'list':
          return i18('logList', [logInfo.logList.join('\n')])
        case 'get':
          let name = args[1] ?? logInfo.nowLogName
          session.sendQueued(i18('logGet', [logInfo.nowLogName]))
          let data = await ctx.database.get('msg_log', {
            botId: session.selfId,
            cid: session.channelId,
            platform: session.platform,
            isLog: true,
            logName: name
          })
          let text = '# ' + logInfo.nowLogName + '\n'
          data.forEach(It => {
            text += `<${It.ChName}>（${new Date(It.time).toLocaleString()}）：${It.context}\n`
          })
          data = null
          let t2 = { text: text, pwd: Config.netcutPwd } // 使用引用传递
          let fileName = `${session.platform}-${session.channelId}-${logInfo.nowLogName}-${randomString(6)}.txt`
          let filePath = path.join(ctx.baseDir, /*Config.logSaveDir, */fileName)
          let isOk = await logSave(filePath, text)
          // 上传文件
          if (isOk == 'ok') {
            session.sendQueued(i18('saveEnd', [Config.logSaveDir, fileName]))
            if(session.platform == 'onebot'){
              var url = filePath
              await session.onebot.uploadGroupFile(session.guildId,url,fileName)
            }else{
              session.sendQueued(h.file('file:///' + filePath))
            }
            // todo webdav 协议 
          } else {
            return i18('saveFail')
          }
          // 上传文本分享网站
          // todo 
          if (Config.netcutOn) {
            let link = await upLogNetcut(ctx, t2)
            if (link != null) {
              log.info(link)
              session.sendQueued(i18('upLogNetcut', [link,Config.netcutPwd]))
            } else {
              session.sendQueued(i18('upLogNetcutNot'))
            }
          }
          session.sendQueued(i18('getEnd'))
          break;
        case 'rm':
          session.send(i18('clrWarn'))
          let warn = await session.prompt()
          if (warn == null) return i18('timeout')
          if (warn == 'n') {
            return i18('pormptNot')
          }

        default:
          session.send('请注意空格')
      }
    })
}


// 生产一条 log 对象
function createLogIt(session: Session, logInfo: LogInfo) {
  let text = formatMsgContent(session)
  if (text != '') {
    let logIt: LogIt = {
      isLog: logInfo.isOn,
      botId: session.bot.selfId,
      uid: session.userId,
      cid: session.channelId,
      mid: session?.messageId,
      platform: session.platform,
      logName: logInfo?.nowLogName ?? 'recall',
      time: Date.now(),
      ChName: session.username,
      context: text
    }
    return logIt
  }
  return false
}

function formatMsgContent(session: Session) {
  let text = ''
  session.elements.forEach(ele => {
    if (ele.type == 'text') {
      text += ele.attrs.content
    }
    if (ele.type == 'image') {
      text += `![](${ele.attrs.url})`
    }
  })
  return text
}

function addName(name: string, arr: string[], num = 1) {
  if (arr.indexOf(name) == -1) {
    arr.push(name)
    return name
  } else {
    if (num != 1) {
      name = name.slice(0, name.lastIndexOf('.'))
      name += '-' + num
    } else {
      name += '-' + num
    }
    num++
    addName(name, arr, num)
  }
}

async function logSave(filePath: string, text: string) {
  fs.writeFile(filePath, text, (err) => {
    if (err) {
      log.warn('保存 log 文件失败！', err)
      return 'not'
    }
  })
  return 'ok'
}

function randomString(length: number) {
  let str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i)
    result += str[Math.floor(Math.random() * str.length)];
  return result;
}

async function upLogNetcut(ctx: Context, text: { text: string, pwd: string }, num = 1) {
  if (num > 10) {
    log.warn('超出上限，停止请求！')
    return null
  }
  let rand = randomString(10)
  let headers = {
    "accept": "enote_app/json, text/javascript, */*; q=0.01",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "sec-ch-ua": "\"Not_A Brand\";v=\"99\", \"Microsoft Edge\";v=\"109\", \"Chromium\";v=\"109\"",
  }
  let body = {
    note_name: rand,
    note_content: text.text,
    note_pwd: text.pwd,
    expire_time: 2592000,
  }
  let data = await ctx.http.post("https://netcut.cn/api/note/create/", body, { headers: headers })
  switch (data.status) {
    case 0:
      log.warn('剪贴板已存在！\n更换换一个随机数……')
      num++
      return upLogNetcut(ctx, text, num)
    case 1:
      // 创建成功
      return 'https://netcut.cn/' + rand
    case 2:
      log.warn('无效名？似乎和请求头填写有关，那就少试验几次')
      num += 5
      return upLogNetcut(ctx, text, num)
    default:
      log.warn('未知情形', data)
      return null
  }
}

