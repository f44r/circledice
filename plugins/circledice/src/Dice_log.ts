import { Argv, Context, Logger } from 'koishi'
import { Gamelog } from './Dice_class'


declare module 'koishi' {
    interface Tables {
        Gamelog:Gamelog,
        Recall:Gamelog
    }
}

export function apply(ctx:Context){
    ctx.model.extend('Gamelog', {
    })
/*
    ctx.command('log')
    .option('on','-on [name] 开启 log')
    .option('off','-off 关闭开启的 log')
    .option('list','-ls 当前群组的 log 列表')
    .option('new','-new [name] 新建一份log')
    .action((argv)=>Dice_log(argv))*/
}

function Dice_log(argv:Argv){
    let session = argv.session
    session.cid

}