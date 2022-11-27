import { Argv, Context, Logger } from 'koishi'
import { Gamelog } from './Dice_class'


declare module 'koishi' {
    interface Tables {
        Gamelog: Gamelog,
        Recall: Gamelog
    }
}

export function apply(ctx: Context) {
    ctx.model.extend('Gamelog', {
        id: 'unsigned',
        name: 'string',
        context: 'list'
    })
    ctx.command('log')
        .usage('记录日志指令：\non 开启\noff 关闭\nlist 所有记录\nget 获取日志')
        .action((argv) => {
            ctx.logger('CD-log >>').info(argv.args)
            Dice_log(argv, ctx)
        })
}

function Dice_log(argv: Argv, ctx: Context) {
    //if (argv.session.subsubtype === 'private'){return argv.session.send('这里只有你我二人，有何意义？')}
    switch (argv.args[0]) {
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
}

async function DiceLogon(argv: Argv, ctx: Context) {
    ctx.logger('log-on').info('开始记录', argv.session.channelId)
    let [GameSpaceData] = await ctx.database.get('channel',{id:argv.session.channelId})
    ctx.logger('log-on').info(GameSpaceData)

}