import { Schema } from 'koishi'

interface Config {
  uploadPC: string
  normalRule: string
  logSaveDir: string
  netcutPwd: string
  netcutOn: boolean
  autoDelLog: number
  useRollVM: string
  newPcPre: boolean
  // webdav
  isWebdav: boolean
  webdavLink: string
  webdavUsername: string
  webdavPasswoed: string
}

const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    useRollVM: Schema.union(['diceScript', 'oneDice']).default('diceScript').description('使用那种骰点解析方式：'),
    newPcPre: Schema.boolean().default(true).description('是否在每个群都创建一张角色卡并绑定：')
  }).description('基本配置'),

  Schema.object({
    uploadPC: Schema.string().description('上传空白人物卡绝对路径'),
    normalRule: Schema.string().default('coc7').description('全局默认规则，现已支持：coc7'),
    logSaveDir: Schema.string().default('circledice-log').description('保存log的目录'),
    autoDelLog: Schema.number().default(259200).description('定时删除多少秒前的log'),
    //
    netcutOn: Schema.boolean().default(false).description('是否上传到 netcut 方便分享？'),
    netcutPwd: Schema.string().default('pwd').description('分享到 netcut 时的密码'),
    //
    isWebdav: Schema.boolean().default(false).description('是否上传到支持 webdav 协议的网盘'),
    webdavLink: Schema.string().description('webdav 网址'),
    webdavUsername: Schema.string().description('webdav 账号'),
    webdavPassword: Schema.string().description('webdav 密码'),
    webdavShare: Schema.string().description('是否返回分享链接？')
  }).description('Log 日志配置')
])

export { Config }
