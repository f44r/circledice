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
      const { session } = argv
      let i18 = function (text: string, arr?: string[]) {
        return arr ? session.text('circledice.ra.' + text, arr) : session.text('circledice.ra.' + text)
      }
      let ch = await circle.getCh(user, channel ? channel.gameSpace : null)
      let gamerule = channel.gameSpace.rule
      if (gamerule == undefined) {
        gamerule = 'coc7/1'
      }

      log.info(ch.assets)
      if (!Number.isNaN(+ch.get(skill))) {
        let r = Math.ceil(Math.random() * 100)
        let ra = [ch.name, skill, r + '/' + ch.get(skill)]
        if ((gamerule == 'coc7/1' && ((ch.get(skill) < 50 && r > 95) || (ch.get(skill) >= 50 && r == 100))) ||
          (gamerule == 'coc7/2' && (r == 100 || (r > 95 && r > ch.get(skill)))) ||
          (gamerule == 'coc7/3' && r > 95)
        ) {
          session.sendQueued(i18('raBigFail', ra))
        } else if (
          (gamerule == 'coc7/1' && ((ch.get(skill) < 50 && r == 1) || (ch.get(skill) >= 50 && r < 6))) ||
          (gamerule == 'coc7/2' && (r == 1 || (r < 6 && r < ch.get(skill)))) ||
          (gamerule == 'coc7/3' && r < 6)
        ) {
          session.sendQueued(i18('raBigSuccess', ra))
        } else if (r > +ch.get(skill)) {
          session.sendQueued(i18('raFail', ra))
        } else if (r < Math.floor(+ch.get(skill) / 5)) {
          session.sendQueued(i18('raDifficultSuccess', ra))
        } else if (r < Math.floor(+ch.get(skill) / 2)) {
          session.sendQueued(i18('raHardSuccess', ra))
        } else {
          session.sendQueued(i18('raSuccess', ra))
        }
      } else {
        //这是复杂skill，如枪械
      }
    })
	
	ctx.command('rb [text]')
    .action(async (argv ,text) => {
		const { session } = argv
		var num : string[]
		var res : number[]
		var num0 : number
		var num1 : number
		var freq : number
		
		if(Number(text)){
			num = [Number(text)]
		}
		else{
			num = text.match(/[0-9]+/g);  // 获取骰点表达式中全部的数字，储存在数组num中
		}
		
		if(num == undefined){
			num = ["1"]
		}
		
		if(Number(num[0]) > 9 || Number(num[0]) < 0){
			session.send("错误：奖励骰次数应为0-9之间的正整数")
		}
		else if(num[1] != undefined){
			session.send("错误：检测到复数个奖励骰次数")
		}
		else{
			freq = Number(num[0]) //freq为奖励骰次数
			res = new Array(freq + 1)  
			num0 = Math.ceil(Math.random() * 100) //确定个位数的第一次骰点
			res[0] = (num0 - (num0 % 10)) / 10 
			for (i = 1; i <= freq; i++) {
				let r = Math.ceil(Math.random() * 100)
				res[i] = (r - (r % 10)) / 10 //获取随机结果的十位数
			}
			
			said = "奖励骰计算结果为1d100 = " + num0 + "[奖励骰:"
			for (i = 1; i < res.length - 1; i++) {
				said = said + res[i] + ","
			}res.length - 1
			said += res[res.length - 1]
			
			for (let i = 0; i < res.length; i++) {
				for (let j = i + 1; j < res.length; j++) {
					if (res[j] < res[i]) {
					let temp = res[j];
					res[j] = res[i];
					res[i] = temp; //冒泡排序
					}
				}
			}
			
			num1 = res[0] * 10 + num0 % 10 //num1为奖励骰最终计算结果
			

			said = said + "]=" + num1 //said为发送信息
			
			session.send(said)
		}
	})
	
	ctx.command('rp [text]')
    .action(async (argv ,text) => {
		const { session } = argv
		var num : string[]
		var res : number[]
		var num0 : number
		var num1 : number
		var freq : number
		
		if(Number(text)){
			num = [Number(text)]
		}
		else{
			num = text.match(/[0-9]+/g);  // 获取骰点表达式中全部的数字，储存在数组num中
		}
		
		if(num == undefined){
			num = ["1"]
		}
		
		if(Number(num[0]) > 9 || Number(num[0]) < 0){
			session.send("错误：奖励骰次数应为0-9之间的正整数")
		}
		else if(num[1] != undefined){
			session.send("错误：检测到复数个奖励骰次数")
		}
		else{
			freq = Number(num[0]) //freq为惩罚骰次数
			res = new Array(freq + 1)  
			num0 = Math.ceil(Math.random() * 100) //确定个位数的第一次骰点
			res[0] = (num0 - (num0 % 10)) / 10 
			for (i = 1; i <= freq; i++) {
				let r = Math.ceil(Math.random() * 100)
				res[i] = (r - (r % 10)) / 10 //获取随机结果的十位数
			}
			
			said = "惩罚骰计算结果为1d100 = " + num0 + "[惩罚骰:"
			for (i = 1; i < res.length - 1; i++) {
				said = said + res[i] + ","
			}res.length - 1
			said += res[res.length - 1]
			
			for (let i = 0; i < res.length; i++) {
				for (let j = i + 1; j < res.length; j++) {
					if (res[j] < res[i]) {
					let temp = res[j];
					res[j] = res[i];
					res[i] = temp; //冒泡排序
					}
				}
			}
			
			num1 = res[res.length - 1] * 10 + num0 % 10 //num1为惩罚骰最终计算结果
			

			said = said + "]=" + num1 //said为发送信息
			
			session.send(said)
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
