import { Character } from "./Character";
import { coc7_attribute_base, coc7_attribute_other } from "./coc7_config";

export function view(ch: Character, rule = 'coc7') {
  switch (rule) {
    case 'coc7':
      return view_coc7(ch)
  }
}

function view_coc7(ch: Character) {
  let arr = {
    'base': [],
    'other': [],
    'skill': [],
    'wq': []
  }
  for (let [k, v] of ch.assets.entries()) {
    if (k[0] == '_')
      continue;
    if (coc7_attribute_base.includes(k)) {
      arr['base'].push(k + ':' + v)
      continue
    }
    if (coc7_attribute_other.includes(k)) {
      arr['other'].push(k + ":" + v)
    }
  }

  let ret = ch.name + '\n';
  ret += '【基石属性】\n' + format(arr['base'])
  ret += '【其他属性】\n' + format(arr['other'])
  ret += '【技能】\n' + format(arr['skill'])
  ret += arr['wq'].length == 0 ? '' : '【武器】\n' + format(arr['wq'])
  return ret
}

function format(arr: Array<string>, n = 3) {
  let i = 1,str = ''
  for (const a of arr){
    if (i == n){
      str += a + '\n'
      i = 1
    }else{
      str += a + ' '
    }
  }
  return str
}
