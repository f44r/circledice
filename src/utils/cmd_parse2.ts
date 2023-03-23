const cmdroot = {
  r: null,
  rp: null,
  rb: null,
  sc: null,
  st: ['del', 'rm', 'clr'],
  pc: ['new', 'list', 'bind', 'nn', 'rm'],
  log: ['new', 'on', 'off', 'list', 'get'],
  deck: null
};

const isPrefix = (a: string, b: string) => a.slice(0, b.length) == b



function parse(content: string, arr: string[] | null) {
  if (arr) {
    for (const a of arr) {
      if (typeof a === 'object')
        return parse2(content, a);
      if (isPrefix(content, a))
        return a + ' ' + content.slice(a.length)
    }
  }
  return content
}

export function parse2(content: string, cmds2 = null): string | false {
  const cmds = cmds2 ?? cmdroot
  for (const cmd in cmds) {
    if (isPrefix(content, cmd)) {
      return cmd + ' ' + parse(content.slice(cmd.length), cmds[cmd])
    }
  }
  return false
}
