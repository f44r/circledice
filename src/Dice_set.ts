import { Context, Logger } from 'koishi'

export const name = 'Dice_set'

export function apply(ctx: Context) {
  ctx.command('set')
    .channelFields(['gameSpace'])
    .userFields(['id', 'player'])
    .option('rule', '-u [rule]')
    .option('room', '-o [room]')
    .action(async (argv) => {
      if (argv.options.rule) argv.args = ['rule', argv.options.rule]
      if (argv.options.room) argv.args = ['room', argv.options.room]
      const { session, args } = argv
      const { channel } = argv.session

      let rule = channel.gameSpace.rule
      let ruleArr = rule.split('/')
      if(args[1]){
        args[1].toLowerCase()
      }else if(args[0] == 'rule'){
        args[1] = 'coc7'
      }else{
        args[1] = '1'
      }

      switch(args[0]){
        case 'rule':
          switch(args[1]){
            case 'coc7':
              ruleArr[0] = args[1]
              break;
            case 'coc6':
              ruleArr[0] = args[1]
              break;
            case 'dnd':
              ruleArr[0] = args[1]
              break;
            default:
              return '请输出正确的规则，现已支持“coc7”、“coc6”和“dnd”,不限大小写'
          }
          break;
        case 'room':
          switch(args[1]){
            case '1':
              ruleArr[1] = args[1]
              break;
            case '2':
              ruleArr[1] = args[1]
              break;
            case '3':
              ruleArr[1] = args[1]
              break;
            default:
              return '请输出正确的房规，现已支持“1”、“2”和“3”，其中1为1<2~99>100，2为1~5<6~95>96~100，3为1<2~95/99>96~100/100（即官方规则）'
          }
          break;
          default:
            return '请注意空格'
      }
      rule = ruleArr.join('/')
      channel.gameSpace.rule = rule
      session.sendQueued('修改成功')
    })
}
