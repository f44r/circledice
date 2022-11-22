// 提供 roll 指令
// 计划：骰点部分封装一下

import { Context } from 'koishi'

export const name = 'Dice_r'

export function apply(ctx: Context) {
  ctx.command('r [message:text]')
    .option('result', '-r [r] 骰点理由（可选）', { fallback: "" })
    .option('dice', '-d [d] 骰点式（默认为1d100）', { fallback: "1d100" })
    .option('check', '-c [c] 技能、武器鉴定(未实现)', { fallback: "" })
    .action((_, message) => Dice_return(_, message))
}

function Dice_parsing(DiceString) {
  let patt = /([\(\)])|([+\-*\/])|(\d+)|([a-z])/ig
  return DiceString.match(patt)
}

function Dice_d_random(time, range) {
  let r = 0;
  for (let i = 0; i < time; i++) {
    r += Math.ceil(Math.random() * range)
  }
  return String(r)
}

function Dice_analyze(Arr) {
  let Dice_Number = new Array()
  for (let i = 0; i < Arr.length - 2;) {
    if (String(Number(Arr[i])) != "NaN" && String(Number(Arr[i + 2])) != "NaN") {
      if (Arr[i + 1] == "d" || Arr[i + 1] == "D") {
        Dice_Number = Arr.splice(i, 3)
        Arr.splice(i, 0, Dice_d_random(Dice_Number[0], Dice_Number[2]))
      } else {
        i++
      }
    } else {
      i++
    }
  }
  return Arr
}

function Dice_format(dice, index) {
  // 应该给自定义文案留下空间 但目前没有实现
  // 没有实际意义 后期或许需要一个总的替换系统
  let config: string[] = [
    "dice=dicearr=res",
    "因result进行的骰点结果为：dice=dicearr=res",
    "dice=res",
    "因result进行的骰点结果为：dice=res",
    "好笨哦，骰点式写错了呀~"
  ] // getDiceConfig('r') 大概是想要这种函数?
  let format = {
    "result": dice.result,
    "dice": dice.dice,
    "dicearr": dice.dicearr,
    "res": dice.ret
  }
  let reStr = '(' + Object.keys(format).join('|') + ')'
  let re = new RegExp(reStr, 'g')
  return config[index].replace(re, it => format[it])
}


function Dice_ter(Dice) {
  let Dice_Arr = Dice_parsing(Dice.dice)
  Dice_Arr = Dice_analyze(Dice_Arr)
  let pattErr = /[^0-9+\-*\/]/i
  if (!pattErr.test(Dice_Arr.join(""))) {
    let fun = new Function("return " + Dice_Arr.join(""))
    if (Dice_Arr.length > 2) {
      if (Dice.result == "") {
        Dice.ret = Math.ceil(fun())
        return Dice_format(Dice, 0)
        //Dice.dice + "=" + Dice_Arr.join("") + "=" + Dice.res
      } else {
        Dice.ret = Math.ceil(fun())
        return Dice_format(Dice, 1)
        //"因" + Dice.result + "进行的骰点结果为：" + Dice.dice + "=" + Dice_Arr.join("") + "=" + Math.ceil(fun())
      }
    } else {
      if (Dice.result == "") {
        Dice.ret = Math.ceil(fun())
        return Dice_format(Dice, 2)
        // Dice.dice + "=" + Dice_Arr[0]
      } else {
        Dice.ret = Math.ceil(fun())
        return Dice_format(Dice, 3)
        // "因" + Dice.result + "进行的骰点结果为：" + Dice.dice + "=" + Dice_Arr[0]
      }
    }
  } else {
    return Dice_format(Dice, 4)
  }
}


function Dice_msg(message) {
  let Dicepatt = /^[\(\)+\-*\/\da-z]+$/ig
  let Dice: { [key: string]: any } = {}; // 修改此处是为了符合 ts 强类型检查的要求，不会产生实际影响
  // let Dice = new Object;
  if (String(Number(message)) != "NaN") {
    return "1d" + message + "=" + Dice_d_random(1, message)
  } else if (Dicepatt.test(message)) {
    Dice.result = ""
    Dice.dice = message
    return Dice_ter(Dice)
  } else if (message.indexOf(" ") != -1) {
    let msgArr = message.split(" ")
    if (Dicepatt.test(msgArr[0])) {
      Dice.result = msgArr[1]
      if (String(Number(msgArr[0])) == "NaN") {
        Dice.dice = msgArr[0]
      } else {
        Dice.dice = "1d" + msgArr[0]
      }
    } else {
      Dice.result = msgArr[0]
      if (String(Number(msgArr[1])) == "NaN") {
        Dice.dice = msgArr[1]
      } else {
        Dice.dice = "1d" + msgArr[1]
      }
    }
    return Dice_ter(Dice)
  } else {
    Dice.result = message
    Dice.dice = "1d100"
    return Dice_ter(Dice)
  }
}


function Dice_return(argv, message) {
  if (message == undefined) {
    argv.session.send('<quote id="' + argv.session.messageId + '"/>' + Dice_ter(argv.options))
  } else {
    argv.session.send('<quote id="' + argv.session.messageId + '"/>' + Dice_msg(message))
  }
}

/*  修改此处是防止 同名的作用却截然不同的两个对象 增加他人的理解难难度，不会产生实际影响
function Dice_return(Dice, message){
  if(message == undefined){
    Dice.session.send('<quote id="' + Dice.session.messageId + '"/>' + Dice_ter(Dice.options))
  }else{
    Dice.session.send('<quote id="' + Dice.session.messageId + '"/>' + Dice_msg(message))
  }
}*/
