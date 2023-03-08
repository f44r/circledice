import { Context, Logger, Session, h, Channel, Schema } from 'koishi'
import * as fs from 'fs/promises'
import { createClient } from 'webdav'
import * as path from 'path'
import { Config, randomString, circle } from '.'
import { config } from 'process'

const log = new Logger('CiecleDice/log:')

declare module 'koishi' {
  interface Channel {
    logInfo: LogInfo
  }
  interface Tables {
    msg_log: LogIt
  }
  interface Session {
    onebot: any
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
export const using = ['database', 'cron'] as const

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh', require('./locales/zh.yml'))

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
    let logIt = createLogIt(session, data.logInfo)
    if (logIt) {
      await ctx.database.create('msg_log', logIt)
      log.info(logIt)
    }
  })

  // 记录自己收到的消息
  ctx.on('message', async (session) => {
    let data = await ctx.database.getChannel(session.platform, session.channelId, ['logInfo', 'gameSpace'])
    let user = await ctx.database.getUser(session.platform, session.userId, ['id'])
    let a: [LogInfo, number] = [] as any // 因为数据库初始化也是在 message 事件下，有时获取不到数据，需要临时造一个
    if (!data) {
      a[0] = { isOn: false, nowLogName: 'recall', logList: [] }
      a[1] = 2
    } else {
      a[0] = data.logInfo
      a[1] = data.gameSpace.team[user?.id ?? 2] ?? 2 // gocq 可以上报自身事件，此时 user 为 undefined
    }
    session.username = circle.knight.get(`ID:${a[1]}`)
    let logIt = createLogIt(session, a[0])
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

  // 定时删除一定时间前的log
  ctx.using(['cron'], (ctx) => {
    ctx.cron('* * */1 * *', () => {
      let timestamp1 = (new Date()).valueOf()
      timestamp1 -= config.GameLog.autoDelLog * 1000
      ctx.database.remove('msg_log', {
        isLog: false,
        time: { $lt: timestamp1 }
      })
    })
  })

  // 指令实现
  ctx.command('log')
    .option('new', '-n [name]')
    .option('on', '-o [name]')
    .option('off', '-f')
    .option('list', '-l')
    .option('rm', '-r [name]')
    .option('get', '-g [name]')
    .usage('游戏日志相关指令')
    .channelFields(['logInfo'])
    .action(async (argv) => {
      // 兼容常见语法
      if (argv.options.new) argv.args = ['new', argv.options.new];
      if (argv.options.on) argv.args = ['on', argv.options.on];
      if (argv.options.get) argv.args = ['get', argv.options.get];
      if (argv.options.rm) argv.args = ['rm', argv.options.rm];

      const { session, args } = argv
      let logInfo = session.channel.logInfo
      let i18 = function (text: string, arr?: string[]) {
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
              if (prompt == 'n') return i18('.promptNot')
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
          if (args[1]) logInfo.nowLogName = args[1];
          if (logInfo.nowLogName == 'recall') {

          }
          logInfo.isOn = true
          return i18('logOn', [logInfo.nowLogName])
        case 'off':
          logInfo.isOn = false
          session.send(i18('logOff', [logInfo.nowLogName]))
          logInfo.nowLogName = 'recall'
          break;
        case 'list':
          return i18('logList', [logInfo.logList.join('\n')])
        case 'get':
          let name = args[1] ?? logInfo.nowLogName
          session.sendQueued(i18('logGet', [args[1] ?? logInfo.nowLogName]))
          let data = await ctx.database.get('msg_log', {
            botId: session.selfId,
            cid: session.channelId,
            platform: session.platform,
            isLog: true,
            logName: name
          })
          upLog(ctx, session, data, i18, config.GameLog, logInfo)
            .then(() => {
              session.sendQueued(i18('getEnd'))
            })
            .catch(() => {
              session.sendQueued(i18('upLogFail'))
            })
          break;
        case 'rm':
          ctx.database.remove('msg_log', {
            isLog: false,
            cid: session.channelId,
            logName: argv.args[1],
            platform: session.platform
          })
          ctx.database.remove('msg_log', {
            mid: session.messageId,
            cid: session.channelId,
            platform: session.platform
          })
          logInfo.isOn = false
          logInfo.nowLogName = 'recall'
          let index = logInfo.logList.indexOf(argv.args[1])
          if (index > -1) { logInfo.logList.splice(index, 1) }
          await ctx.database.setChannel(session.platform, session.channelId, { logInfo: logInfo })
          session.sendQueued(i18('logRm', [session.channelId, argv.args[1]]))
          break;
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

async function upLogNetcut(ctx: Context, text: { text: string, pwd: string }, num = 1) {
  if (num > 10) {
    throw Error('超出上限，停止请求！')
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
      log.warn('剪贴板已存在！\n更换一个随机数……')
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
      throw Error('未知情形')
  }
}

async function upLogWebdav(obj: { 'text': string, config: Config['GameLog'],name:string }) {
  const cli = createClient(obj.config.webdavLink, {
    'username': obj.config.webdavUsername,
    'password': obj.config.webdavPassword
  })
  const mpath = '/circledice/log/'
  let b = await cli.exists(mpath+obj)
  if(!b){
    await cli.createDirectory(mpath)
  }
  cli.putFileContents(mpath+obj.name,obj.text)
  .then(()=>log.info('webdav 上传完成'))
  .catch(()=>log.info('webdav 上传失败'))
}

async function upLog(ctx: Context, session: Session, data: LogIt[], i18: (text: string, arr?: string[]) => string, config: Config['GameLog'], logInfo: LogInfo) {
  // 整理为 md 格式
  let text = '# '
  text += session.argv.args[1] ?? logInfo.nowLogName
  text += '\n\n'
  let ls = {}
  data.forEach(It => {
    ls[It.uid] = null
    text += `*${It.ChName}（${It.uid}|${new Date(It.time).toLocaleString()}）*\n\n> ${It.context}\n\n`
  })

  // 创建本地文件并上传
  let fileName = `${session.platform}-${session.channelId}-${session.argv.args[1] ?? logInfo.nowLogName}-${randomString(6)}.txt`
  let filePath = path.join(ctx.baseDir, config.logSaveDir, fileName)

  // 上传文件
  fs.writeFile(filePath, text)
    .then(() => {
      session.send(i18('saveEnd', [config.logSaveDir, fileName]))
      // 所在平台的资源系统
      if (session.platform == 'onebot') {
        session.onebot.uploadGroupFile(session.guildId, filePath, fileName)
      } else {
        session.send(h.file('file:///' + filePath))
      }
    })
    .catch(e => {
      log.warn(e)
      session.send(i18('saveFail'))
    })

  // 上传一份原始数据文件，便于解析
  //fs.writeFile(filePath + '.json', JSON.stringify({ 'ls': ls, 'data': data }))

  // 上传文本分享网站
  if (config.netcutOn) {
    try {
      let link = await upLogNetcut(ctx, { 'text': text, 'pwd': config.netcutPwd })
      session.send(i18('upLogNetcut', [link, config.netcutPwd]))
    } catch {
      session.send(i18('upLogNetcutNot'))
    }
  }

  // webDav
  if(config.isWebdav){
      upLogWebdav({ 'text': text, 'config': config,'name':fileName })
      .then(()=>{
        session.send('上传完成'+config.webdavShare)
      })
      .catch(()=>{
        session.send('上传失败！')
      })
  }

  // todo 上传语雀文档
}

namespace con {

  export interface Config {
    logSaveDir: string
    autoDelLog: number
    // netcut
    netcutPwd: string
    netcutOn: boolean
    // webdav
    isWebdav: boolean
    webdavLink: string
    webdavUsername: string
    webdavPassword: string
    webdavShare: string
  }

  export const Config: Schema<Config> = Schema.object({
    logSaveDir: Schema.string().default('circledice-log').description('保存log的目录'),
    autoDelLog: Schema.number().default(259200).description('定时删除多少秒前的log'),
    //
    netcutOn: Schema.boolean().default(false).description('是否上传到 netcut 方便分享？'),
    netcutPwd: Schema.string().default('pwd').description('分享到 netcut 时的密码'),
    // webdav
    isWebdav: Schema.boolean().default(false).description('是否上传到支持 webdav 协议的网盘'),
    webdavLink: Schema.string().description('webdav 网址'),
    webdavUsername: Schema.string().description('webdav 账号'),
    webdavPassword: Schema.string().description('webdav 密码'),
    webdavShare: Schema.string().description('返回分享链接的分享链接？'),
  }).description('Log 日志配置')

}

export default con
