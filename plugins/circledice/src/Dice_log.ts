import { Argv, Context } from 'koishi'
import { logis } from './Dice_class'

export function apply(ctx: Context) {
  ctx.command('log')
    .option('new', '-n [name] 新建名为[name]的log')
    .option('on', '-o 开启之前关闭的log')
    .option('off', '-s 关闭之前开启的log')
    .option('list', '-l 查看本群所有log')
    .usage('记录日志指令：\non 开启\noff 关闭\nlist 所有记录\nget 获取日志')
    .action((_, message) => {
        ctx.logger('CD-log <<').info(_.args)
        Dice_log(_, ctx)
    })
}

function Dice_log(argv: Argv, ctx: Context) {
  //if (argv.session.subsubtype === 'private'){return argv.session.send('这里只有你我二人，有何意义？')}
  if(argv.args[0]){
    switch (argv.args[0]) {
      case 'new':
        DiceLognew(argv, ctx)
        break;
      case 'on':
        DiceLogon(argv, ctx)
        //argv.session.send(argv.args[1] ? `那么，${argv.args[1]}，开始记录！` : '记录开始！')
        break;
      case 'off':
        break;
      case 'list':
        break;
      case 'get':
        break;
      default:
        argv.session.send('请注意空格')
    }
  }else{
    if(argv.options.new) {
      DiceLognew(argv, ctx)
    }else if(argv.options.on) {
      DiceLogon(argv, ctx)
    }
  }
}

async function DiceLognew(argv: Argv, ctx: Context) {
  let [GameSpaceData] = await ctx.database.get('channel', { id: argv.session.channelId })
  let tmp = GameSpaceData.GameSpace.loglist.find(logis => logis.tag == true)
  if (tmp){
    return argv.session.send('已有开启的 log ：'+JSON.stringify(tmp))
  };tmp=null;
  let name = '默认日志名'
  if (argv.args[1]){
    name= argv.args[1]
  }else if(argv.options.new !== true){
    name= argv.options.new
  }
  let [dice] = await ctx.database.get('Dice',{id:1})
  let log:logis = {
    'logid':dice.maxLogId+1,
    'name':name,
    'tag':true
  }
  GameSpaceData.GameSpace.loglist.push(log)
  await ctx.database.set('Dice',{id:1},{maxLogId:dice.maxLogId+1})
  await ctx.database.set('channel',{id:argv.session.channelId},
  {"GameSpace.hiy.lastlogid":dice.maxLogId+1,'GameSpace.loglist':GameSpaceData.GameSpace.loglist})
  await ctx.database.create('Gamelog',{id:dice.maxLogId+1})

  ctx.logger('log-new').info(log)
}

async function DiceLogon(argv: Argv, ctx: Context) {
  ctx.logger('log-on').info('开始记录', argv.session.channelId)
  let [GameSpaceData] = await ctx.database.get('channel', { id: argv.session.channelId })
  if (!GameSpaceData.GameSpace.loglist[0]) {
    return '当前无任何log'
  }

  ctx.logger('log-new').info(
    await ctx.database.get('channel', { id: argv.session.channelId }),
    await ctx.database.get('Dice',{id:1})
  )

}

async function DiceLogoff(argv: Argv, ctx: Context) {
    
}

async function DiceLoglist(argv: Argv, ctx: Context) {
    
}

async function DiceLogget(argv: Argv, ctx: Context) {
    
}
