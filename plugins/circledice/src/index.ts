import { Context, Logger, Schema } from 'koishi'
import * as Dice_r from './Dice_r'
import * as Dice_pc from './Dice_pc'
import { Config } from './config'

export const name = 'circledice'

export { Config }

export function apply(ctx: Context, config: Config) {
  ctx.plugin(Dice_r)
  ctx.plugin(Dice_pc)

  ctx.middleware( async (session) => {
    if (session.channelId && session.guildId) {
      let GameSpaceData = await ctx.database.getChannel(session.platform, session.channelId, ['GameSpace'])
      if (!GameSpaceData){return}
      if (!Object.keys(GameSpaceData.GameSpace).length) {
        GameSpaceData.GameSpace = {
          'set': {
            'bot': false,
            'rule': 'coc7'
          },
          'pclist':{},
          'loglist':[],
          'hiy':{
            'lastTime':Date.now(),
            'lastlogid':''
          },
          'token':data.gettoken(session.channelId),
          'version':0
        }
        await ctx.database.setChannel(session.platform, session.channelId, { 'GameSpace': GameSpaceData.GameSpace })
        ctx.logger('>>').info(`<${GameSpaceData.id}> |`, GameSpaceData.GameSpace)
      }else{
        GameSpaceData.GameSpace.hiy.lastTime = Date.now()
        await ctx.database.setChannel(session.platform, session.channelId, { 'GameSpace': GameSpaceData.GameSpace })
      }
    }
  })
  
  ctx.command('uploadpc [message]')
    .action((_, message) => {
      let log = new Logger('circledice <<')
      log.info(`[${_.session.userId}]${_.session.content}`)
      _.session.onebot.uploadGroupFile(_.session.guildId, config.uploadPC, "COC7空白卡.xlsx")
    })
}
