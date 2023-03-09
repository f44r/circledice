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
	  let gamerule = channel.gameSpace.rule
	  if(gamerule == undefined){
		let gamerule = 'coc7/1'
	  }

      log.info(ch.assets)
      if(!Number.isNaN(+ch.get(skill))){
        let r = Math.ceil(Math.random()*100)
        let said = ch.name + '进行的' + skill + '鉴定为：' + r + '/' + ch.get(skill)
        if((gamerule == 'coc7/1' && ((ch.get(skill) < 50 && r >95)||(ch.get(skill) >= 50 && r == 100)))||
		   (gamerule == 'coc7/2' && (r == 100 || (r > 95 && r > ch.get(skill))))||
		   (gamerule == 'coc7/3' && r > 95)
		){
          said += '大失败'
        }else if(
			(gamerule == 'coc7/1' && ((ch.get(skill) < 50 && r == 1)||(ch.get(skill) >= 50 && r < 6)))||
			(gamerule == 'coc7/2' && (r == 1 || (r < 6 && r < ch.get(skill))))||
			(gamerule == 'coc7/3' && r < 6)
		){
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
	
  ctx.command('setrule [text]')
    .channelFields(['gameSpace'])
    .userFields(['id', 'player'])
    .action(async (argv, text) => {
      const { user, channel } = argv.session
	  let said = ''
		if(text == 'coc7/1' || text == 'COC7/1'){
			channel.gameSpace.rule = 'coc7/1'
			said += '已设置房间规则为coc7/1'
		}
		else if(text == 'coc7/2' || text == 'COC7/2'){
			channel.gameSpace.rule = 'coc7/2'
			said += '已设置房间规则为coc7/2'
		}
		else if(text == 'coc7/3' || text == 'COC7/3'){
			channel.gameSpace.rule = 'coc7/3'
			said += '已设置房间规则为coc7/3'
		}
		else{
			said += '请输入正确的房间规则，如coc7/1'
		}
		await ctx.database.set('channel', channel.Id ,{gameSpace:channel.gameSpace})
		return said
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
