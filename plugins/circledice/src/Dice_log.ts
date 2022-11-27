import { Argv, Context ,segment} from 'koishi'
import { logis } from './Dice_class'

export function apply(ctx: Context) {
    ctx.command('log')
        .option('new', '-n [name] 新建名为[name]的log')
        .option('on', '-o [id] 开启之前关闭或者指定的log')
        .option('off', '-s 关闭开启的log')
        .option('list', '-l 查看本群所有log')
        .option('get', '-g [id] ')
        .usage('记录日志指令')
        .action((_, message) => {
            ctx.logger('CD-log <<').info(_.args)
            if (_.options.new) _.args = ['new', _.options.new];
            if (_.options.on) _.args = ['on', _.options.on];
            if (_.options.get) _.args = ['get', _.options.get];
            Dice_log(_, ctx)
        })
}

function Dice_log(argv: Argv, ctx: Context) {
    if (argv.session.subsubtype === 'private'){return argv.session.send('这里只有你我二人，有何意义？')}
    switch (argv.args[0]) {
        case 'new':
            DiceLognew(argv, ctx)
            break;
        case 'on':
            DiceLogon(argv, ctx)
            break;
        case 'off':
            DiceLogoff(argv, ctx)
            break;
        case 'list':
            DiceLoglist(argv, ctx)
            break;
        case 'get':
            DiceLogget(argv, ctx)
            break;
        default:
            argv.session.send('请注意空格')
    }
}

async function DiceLognew(argv: Argv, ctx: Context) {
    let [GameSpaceData] = await ctx.database.get('channel', { id: argv.session.channelId })
    if (GameSpaceData.GameSpace.loglist.find(logis => logis.tag == true)) {
        return argv.session.send('已有开启的 log .')
    };
    let name = '默认日志名'
    if (argv.args[1]) {
        name = argv.args[1]
    }
    let [dice] = await ctx.database.get('Dice', { id: 1 })
    let log: logis = {
        'logid': dice.maxLogId + 1,
        'name': name,
        'tag': true
    }
    GameSpaceData.GameSpace.loglist.push(log)
    await ctx.database.set('Dice', { id: 1 }, { maxLogId: dice.maxLogId + 1 })
    await ctx.database.set('channel', { id: argv.session.channelId },
        { "GameSpace.hiy.lastlogid": dice.maxLogId + 1, 'GameSpace.loglist': GameSpaceData.GameSpace.loglist })
    await ctx.database.create('Gamelog', { id: dice.maxLogId + 1 })

    argv.session.send('新建 log 成功' + JSON.stringify(log))
    ctx.logger('log-new').info(log)
}

async function DiceLogon(argv: Argv, ctx: Context) {
    let [GameSpaceData] = await ctx.database.get('channel', { id: argv.session.channelId })

    if (!GameSpaceData.GameSpace.loglist[0]) {
        argv.session.send('> log list 中没有任何 log ，是否发送 n 以外字符新建一份日志？')
        let prompt = await argv.session.prompt()
        ctx.logger('log-on').info(prompt)
        if (prompt == "" || prompt == "n") {
            return argv.session.send('将不会进行 log 的创建。')
        } else {
            argv.args[1] = prompt;
            return DiceLognew(argv, ctx)
        }
    }

    if (GameSpaceData.GameSpace.loglist.find(logis => logis.tag == true)) {
        return argv.session.send('已有开启的 log .')
    };
    const id:number = argv.args[1] || GameSpaceData.GameSpace.hiy.lastlogid
    GameSpaceData.GameSpace.loglist[GameSpaceData.GameSpace.loglist.map(logis => logis.logid).indexOf(Number(id))].tag = true
    await ctx.database.set('channel', { id: argv.session.channelId },
    {"GameSpace.hiy.lastlogid": id,'GameSpace.loglist': GameSpaceData.GameSpace.loglist })

    argv.session.send('记录开始！')
}

async function DiceLogoff(argv: Argv, ctx: Context) {
    let [GameSpaceData] = await ctx.database.get('channel', { id: argv.session.channelId })
    GameSpaceData.GameSpace.loglist.forEach((logis)=>logis.tag = false)
    await ctx.database.set('channel', { id: argv.session.channelId },
    {'GameSpace.loglist': GameSpaceData.GameSpace.loglist})
    argv.session.send('所有 Log 已关闭。')
}

async function DiceLoglist(argv: Argv, ctx: Context) {
    let text = '> loglist\n'
    let [GameSpaceData] = await ctx.database.get('channel',{id:argv.session.channelId})
    GameSpaceData.GameSpace.loglist.forEach((logis)=>{
        text += `${logis.logid} | ${logis.name} - ${logis.tag?'开':'关'}\n`
    })
    argv.session.send(text)
}

async function DiceLogget(argv: Argv, ctx: Context) { 
}
 