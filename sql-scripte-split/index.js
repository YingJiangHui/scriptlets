var fs = require("fs")
var path = require("path")

process.env.NODE_ENV;
const config = {
    target: process.env.NODE_ENV?.target||'data.txt',
    output:process.env.NODE_ENV?.output||'output',
    suffix: '.sql'
}

const read = (path)=>{
    const data = fs.readFileSync(path)
    return data.toString()
}

const toJSON = (data)=>{
    return data.split(';').map((item)=>item.trim()).filter(Boolean).map((item)=>item+';')
}

const classify = (list)=>{
    return list.reduce((map,item)=>{
        const key = item.match(/[a-z_]*(_service_)/)?.[0]?.split('_').map((str)=>str.replace(/(localized)/,'')).filter(Boolean).join('_')
        if(!key) return map
        
        const cache = map[key]||[]
        return {
            ...map,
            [key.split('-').join('_')]: cache.concat(item)
        }
    },{})
}

const sort = (group)=>{
    return Object.keys(group).reduce((map,groupName)=>{
        return {
            ...map,
            [groupName]: group[groupName].sort((a,b)=>{
                const aIsCreate = new RegExp(/create/).test(a)
                const bIsCreate = new RegExp(/create/).test(b)
                return aIsCreate ? 1 : -1
            })
        }
    },{})
}
const toFileData = (group)=>{
    return Object.keys(group).reduce((map,groupName)=>{
        return {
            ...map,
            [groupName]: group[groupName].join('\n')
        }
    },{})
}
const writeEachFiles = (map,targetPath,customFilename)=>{
    const needCustomFilename = !!customFilename
    try{
        fs.mkdirSync(targetPath)
    }catch(e){
        console.log('查找到'+targetPath+'文件夹')
    }
    for(let key in map){
        const filename = key+config.suffix
        write(path.join(targetPath,needCustomFilename?customFilename(filename):filename),map[key])
    }
}

const write=(filename,data)=>{
    return fs.writeFileSync(filename,data)
}
const print = (message) => {
    const createDivideLine = ()=>new Array((16 - message.length)).fill('=').join('')
    console.log(createDivideLine()+message+createDivideLine())
}
const main = ()=>{
    print('读取数据');
    const data = read(config.target)
    // 1.to json [a,b]
    print('转换为可操作模式')
    const json = toJSON(data)
    // 2.分类 {a_service:[]}
    print('代码分类')
    const map = classify(json)
    /* 3.
    按顺序排列
    {a_service:[
        drop view,
        drop table,
        create table,
        insert into,
        create view,
    ]}
    */
    print('代码排序')
    const mapClassed = sort(map)
    // 4. to string
    print('转换为文件格式')
    const mapString = toFileData(mapClassed)
    // write each files
    print('生成文件')
    writeEachFiles(mapString,config.output,(oldName)=>{
        return 'R__'+oldName
    })
		console.log('Succeed')
}
main()