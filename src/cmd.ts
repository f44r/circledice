// 快捷指令，可以被 r 取代。
import { Context, Logger, Schema, Session } from 'koishi'
import { circle, Config } from './index'

export const name = 'cmd'
const log = new Logger('CircleDice/cmd:')

export function apply(ctx: Context, config: Config) {
  ctx.command('ra [skill]')
    .channelFields(['gameSpace'])
    .userFields(['id', 'player'])
    .action(async (argv, skill) => {
      const { user, channel } = argv.session
      let ch = await circle.getCh(user, channel ? channel.gameSpace : null)
      log.info(ch.assets)
      if(!Number.isNaN(+ch.get(skill))){
        //没写房规，小子
        let r = Math.ceil(Math.random()*100)
        let said = ch.name + '进行的' + skill + '鉴定为：' + r + '/' + ch.get(skill)
        if(r == 100){
          said += '大失败'
        }else if(r == 1){
          said += '大成功'
        }else if(r > +ch.get(skill)){
          said += '失败'
        }else if(r < Math.floor(+ch.get(skill)/5)){
          said += '极难成功'
        }else if(r < Math.floor(+ch.get(skill)/2)){
          said += '困难成功'
        }else{
          said += '成功'
        }
        return said
      }else{
        //这是复杂skill，如枪械
      }
    })
  ctx.command('roll [text]')
    .action((_, text) => {
      return JSON.stringify(circle.roll(text))
    })
  ctx.command('save')
    .action(async (_, text) => {
      let a = await ctx.database.create('circledice_pc', {
        'master': 0,
        'assets': [
          ['maxPcId', { type: 1, value: 1 }],
          ['name', { type: 4, value: 'knight' }]
        ],
        'history': {}
      })
      log.info(JSON.stringify(a))
    })
}
