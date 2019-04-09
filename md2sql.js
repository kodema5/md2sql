#!/usr/bin/env node
const Args = require('commander')
const Fs = require('fs')
const Path = require('path')

Args
    .version('0.0.1', '-v, --version')
    .usage('[options] <dir...>')
    .option('-d, --destination [dir]', 'destination dir', '.sql')
    .option('-e, --extension [file-extension]', 'destination file-extension', '.sql')
    .option('-f, --force', 'parse all, not just newer files')
    .option('-i, --ignore [folder]', 'ignore folders', (s,m) => m.concat(s.split(',')), ['node_modules'])
    .option('-m, --md-extension [file-extension]', 'source file-extension', '.md')
    .option('-p, --prefix [prefix]', 'bird-style prefix to indicate code', '> ')
    .parse(process.argv)

Args.prefixLength = Args.prefix.length

async function getFiles(dir) {

    function walk_(dir, done) {
        let files = {}

        if (Args.ignore.indexOf(dir)>=0) return done(null, files)

        Fs.readdir(dir, (err, fs) => {
            if (err) return done(err)

            var n = fs.length
            if (!n) return done(null, files)

            fs.forEach( (f) => {
                let fp = Path.join(dir, f)
                Fs.stat(fp, (err, stats) => {
                    if (err) return done(err)

                    if (stats.isDirectory()) {
                        walk_(fp, (err, subFiles) => {
                            if (err) return done(err)
                            Object.assign(files, subFiles)
                            if (!(--n)) done(null, files)
                        })
                    }
                    else if (stats.isFile()) {
                        files[fp] = stats
                        if (!(--n)) done(null, files)
                    }
                })
            })
        })
    }

    return new Promise( (done, cancel) => {
        walk_(dir, (err, files) => err ? cancel(err) : done(files))
    })
}


async function processFile(fn, fn_sql, onWrite) {
    return new Promise( (done, cancel) => {
        Fs.readFile(fn, async function (err, txt)  {
            if (err) return cancel(err)

            txt = txt.toString()
                .split('\n')
                .map((s) => s.slice(0,Args.prefixLength)==Args.prefix ? s.slice(Args.prefixLength) : (''))
                .join('\n')

            if (txt.trim().length==0) return done()


            let d = Path.join(Args.destination, Path.dirname(fn))
            try { await Fs.promises.mkdir(d, { recursive:true })  } catch(e) {}

            Fs.writeFile(fn_sql, txt, (err) => {
                if (onWrite) onWrite(fn_sql)
                return err ? cancel(err) : done(fn_sql)
            })
        })
    })
}

async function processFiles(dir, extNames) {
    let files = await getFiles(dir)
    let ps = []
    for (let fn in files) {
        if (extNames.indexOf(Path.extname(fn))<0) continue


        let fn_sql = Path.join(Args.destination,
            fn.split('.').slice(0, -1).join('.') + Args.extension)

        if (!Args.force
            && files[fn_sql]
            && files[fn_sql].mtimeMs > files[fn].mtimeMs) continue

        ps.push(processFile(fn, fn_sql, (f) => f ? console.log('-', f) : null))
    }
    return Promise.all(ps)
}


Args.args = Args.args.length > 0 ? Args.args : ['.']

;(async () => {

    let dir = Args.destination
    if (!Fs.existsSync(dir)) { Fs.mkdirSync(dir) }

    let n = 0
    for (let a of Args.args) {
        let files = await processFiles(a, [Args.mdExtension])
        n = n + files.length
    }

    process.exit(n)
    // if (files.filter(Boolean).length==0) return
})()

