import { Context } from 'koishi'

export const name = 'circledice'

export function apply(ctx: Context) {
  ctx.command('r [message:text]')
    .option('result', '-r [r] 骰点理由（可选）', {fallback: ""})
    .option('dice', '-d [d] 骰点式（默认为1d100）', { fallback: "1d100"})
    .option('check', '-c [c] 技能、武器鉴定(未实现)', {fallback: ""})
    .action((_, message) => Dice_return(_,message))

  ctx.command('st <message>')
    .action((_, message) => 'st录卡尚未实现')
}

function Dice_parsing(DiceString){
  let patt = /([\(\)])|([+\-*\/])|(\d+)|([a-z])/ig
  return DiceString.match(patt)
}

function Dice_d_random(time,range){
  let r = 0;
  for(let i = 0;i < time;i++){
    r += Math.ceil(Math.random()*range)
  }
  return String(r)
}

function Dice_analyze(Arr){
  let Dice_Number = new Array()
  for(let i = 0 ; i < Arr.length-2 ; ){
    if(String(Number(Arr[i])) != "NaN" && String(Number(Arr[i+2])) != "NaN"){
      if(Arr[i+1] == "d" || Arr[i+1] == "D"){
        Dice_Number = Arr.splice(i,3)
	Arr.splice(i,0,Dice_d_random(Dice_Number[0],Dice_Number[2]))
      }else{
        i++
      }
    }else{
      i++
    }
  }
  return Arr
}

function Dice_ter(Dice){
  let Dice_Arr = Dice_parsing(Dice.dice)
  Dice_Arr = Dice_analyze(Dice_Arr)
  let pattErr = /[^0-9+\-*\/]/i
  if(!pattErr.test(Dice_Arr.join(""))){
    let fun = new Function("return " + Dice_Arr.join(""))
    if(Dice_Arr.length > 2){
      if(Dice.result == ""){
        return Dice.dice + "=" + Dice_Arr.join("") + "=" + Math.ceil(fun())
      }else{
        return "因" + Dice.result + "进行的骰点结果为：" + Dice.dice + "=" + Dice_Arr.join("") + "=" + Math.ceil(fun())
      }
    }else{
      if(Dice.result == ""){
        return Dice.dice + "=" + Dice_Arr[0]
      }else{
        return "因" + Dice.result + "进行的骰点结果为：" + Dice.dice + "=" + Dice_Arr[0]
      }
    }
  }else{
    return "好笨哦，骰点式写错了呀~"
  }
}

function Dice_msg(message){
  let Dicepatt = /^[\(\)+\-*\/\da-z]+$/ig
  let Dice = new Object;
  if(String(Number(message)) != "NaN"){
    return "1d"+ message + "="+ Dice_d_random(1,message)
  }else if(Dicepatt.test(message)){
    Dice.result = ""
    Dice.dice = message
    return Dice_ter(Dice)
  }else if(message.indexOf(" ") != -1){
    let msgArr = message.split(" ")
    if(Dicepatt.test(msgArr[0])){
      Dice.result = msgArr[1]
      if(String(Number(msgArr[0])) == "NaN"){
        Dice.dice = msgArr[0]
      }else{
        Dice.dice = "1d" + msgArr[0]
      }
    }else{
      Dice.result = msgArr[0]
      if(String(Number(msgArr[1])) == "NaN"){
        Dice.dice = msgArr[1]
      }else{
        Dice.dice = "1d" + msgArr[1]
      }
    }
    return Dice_ter(Dice)
  }else{
    
  }
}

function Dice_return(Dice, message){
  if(message == undefined){
    Dice.session.send('<quote id="' + Dice.session.messageId + '"/>' + Dice_ter(Dice.options))
  }else{
    Dice.session.send('<quote id="' + Dice.session.messageId + '"/>' + Dice_msg(message))
  }
}
