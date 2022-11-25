import { Schema } from 'koishi'

export const name = 'config'

export interface Config {
  uploadPC: string
  normalRule: string
}

export const Config = Schema.object({
  uploadPC: Schema.string().description('上传空白人物卡绝对路径'),
  normalRule: Schema.string().default('coc7').description('全局默认规则，现已支持：coc7'),
})
