import { Schema } from 'koishi'

export const name = 'config'

export interface Config {
  uploadPC: string
  normalRule: string
  logSaveDir:string
  netcutPwd:string
  netcutOn:boolean
}

export const Config = Schema.object({
  uploadPC: Schema.string().description('上传空白人物卡绝对路径'),
  normalRule: Schema.string().default('coc7').description('全局默认规则，现已支持：coc7'),
  logSaveDir:Schema.string().default('circledice-log').description('保存log的目录'),
  netcutPwd:Schema.string().default('pwd').description('分享到 netcut 时的密码'),
  netcutOn:Schema.boolean().default(true).description('是否上传')
})
