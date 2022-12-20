export function setPcskill(session, message) {
    //let groupConfig = data.getgroupConfig(session.groupId)
    let rules = 'coc7'; //groupConfig.rules
    let res = [];
    let st = message;
    let name = [];
    switch (rules) {
        case "coc7":
            let limit = [];
            let i = 0;
            let tmp = "";
            while (i <= st.length) {
                if (st.charAt(i).match(/\D/)) {
                    tmp += st.charAt(i);
                    if (st.charAt(i + 1).match(/\d/)) {
                        name.push(tmp);
                        tmp = "";
                    }
                } else {
                    tmp += st.charAt(i);
                    if (st.charAt(i + 1).match(/\D/) || i == st.length) {
                        limit.push(tmp);
                        tmp = "";
                    }
                }
                i++;
            }
            res = [name, limit];
            if (res[0]) {
                if (name.length == limit.length) {
                    let i = 0;
                    let tmp = [];
                    let skill = {};
                    while (i < name.length) {
                        skill = {};
                        skill.name = name[i];
                        skill.limit = limit[i];
                        tmp.push(skill);
                        i++;
                    }
                    res = [true, tmp];
                } else {
                    res = [false, "error = 解析失败 技能名与技能值数量不等"];
                }
            }
            break;
        case "dnd5e":
            let exp = [];
            break;
        default:
            res = [false, "error = 解析失败 疑似群配置文件缺失"];
    }
    return res;
}
