import * as vscode from 'vscode';
import * as fs from 'fs';
import * as config from '../config';
import * as stdperiph from '../treeProviders/stdperiph';
import * as path from 'path';

export function register(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('kstm32.configure', function () {
        let root: vscode.Uri | undefined = config.getWorkspaceRoot();
        if (root) {
            configure(root);
        }
    }));
}

function configure(root: vscode.Uri) {
    let kstm32cfg: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('kstm32');
    let cppcfg = vscode.workspace.getConfiguration('C_Cpp.default');
    let conf: config.Kstm32Config = config.getConfig() || {};
    let makefilePath = vscode.Uri.parse(`${root}/Makefile`).fsPath;
    let gccHome: string | undefined = kstm32cfg.get('gccHome');

    if (!gccHome) {
        let gcc: string | undefined = config.getExePath(`arm-none-eabi-gcc`);
        if (gcc) {
            gccHome = path.join(gcc, '../');
            gccHome = gccHome.substring(0, gccHome.length - 1);
        } else {
            vscode.window.showWarningMessage('没有找到正确的GCC根路径');
        }
    }

    cppcfg.update('compilerPath', `${gccHome}/bin/arm-none-eabi-gcc${config.isWindows() ? '.exe' : ''}`.replace(/\\/g, '/'), vscode.ConfigurationTarget.Workspace);
    
    fs.readFile(makefilePath, { encoding: 'UTF-8' }, (err, makefile) => {
        if (err) {
            vscode.window.showErrorMessage(`读取 ./Makefile 出错: ${err.message}`);
            return;
        }

        let libPath: stdperiph.LibPath | undefined = stdperiph.getLibPath(kstm32cfg, conf);
        let type = conf.type || '';
        let type_s = type.substr(10, 11);

        // autoconf
        let sources: string[] = [];
        let includes: string[] = [];
        let defines: string[] = [];
        let asm: string[] = [];
        // project c h s
        lsRecursion(root.fsPath, '/src').forEach(filename => {
            if (filename.endsWith('.c') || filename.endsWith('.C')) {
                sources.push(filename);
            } else if (filename.endsWith('.h') || filename.endsWith('.H')) {
                config.myArrayAdd(includes, filename.substring(0, filename.lastIndexOf('/')));
            } else if (filename.endsWith('.s') || filename.endsWith('.S')) {
                asm.push(filename);
            }
        });
        // libs
        if (libPath) {
            // StdPeriph
            let useLib = conf.useLib || [];
            if (useLib.length > 0) {
                useLib.forEach(lib => {
                    sources.push(`${(libPath || {}).stdperiph}/src/${lib}`.replace(/\\/g, '/'));
                });
                defines.push('USE_STDPERIPH_DRIVER');
                includes.push(`${(libPath || {}).stdperiph}/inc`.replace(/\\/g, '/'));
            }
            // core
            if (type.startsWith('STM32F103')) {
                sources.push(`${(libPath || {}).root}/CMSIS/CM3/CoreSupport/core_cm3.c`.replace(/\\/g, '/'));
                includes.push(`${(libPath || {}).root}/CMSIS/CM3/CoreSupport`.replace(/\\/g, '/'));
            } else if (type.startsWith('STM32F407')) {
                // TODO 407
            }
        }
        // type define
        if (type_s == '8') {
            defines.push('STM32F10X_MD');
        } else if (type_s == 'C') {
            defines.push('STM32F10X_HD');
        }


        // sources
        let makefileSources: string = '';
        sources.forEach(source => makefileSources = `${makefileSources} \\\r\n${source}`);
        let msarr = makefile.match(/#--kstm32-autoconf:sources\r?\n([a-zA-Z0-9_]+) *=(.*\\\r?\n)*.*/);
        if (msarr) {
            makefile = makefile.replace(msarr[0], `#--kstm32-autoconf:sources\r\n${msarr[1]} =${makefileSources}`);
        }

        // defines
        (conf.defines || []).forEach(define => defines.push(define));
        let makefileDefines: string = '';
        defines.forEach(define => makefileDefines = `${makefileDefines} \\\r\n-D${define}`);
        let mdarr = makefile.match(/#--kstm32-autoconf:defines\r?\n([a-zA-Z0-9_]+) *=(.*\\\r?\n)*.*/);
        if (mdarr) {
            makefile = makefile.replace(mdarr[0], `#--kstm32-autoconf:defines\r\n${mdarr[1]} =${makefileDefines}`);
        }
        cppcfg.update('defines', defines, vscode.ConfigurationTarget.Workspace);

        // includes
        (conf.includes || []).forEach(include => includes.push(include));
        let makefileIncludes: string = '';
        includes.forEach(include => makefileIncludes = `${makefileIncludes} \\\r\n-I${include}`);
        let miarr = makefile.match(/#--kstm32-autoconf:includes\r?\n([a-zA-Z0-9_]+) *=(.*\\\r?\n)*.*/);
        if (miarr) {
            makefile = makefile.replace(miarr[0], `#--kstm32-autoconf:includes\r\n${miarr[1]} =${makefileIncludes}`);
        }
        if (gccHome) {
            includes.push(`${gccHome}/arm-none-eabi/include/*`.replace(/\\/g, '/'));
        }
        cppcfg.update('includePath', includes, vscode.ConfigurationTarget.Workspace);

        // asm
        let makefileAsm: string = '';
        asm.forEach(a => makefileAsm = `${makefileAsm} \\\r\n${a}`);
        let maarr = makefile.match(/#--kstm32-autoconf:asm\r?\n([a-zA-Z0-9_]+) *=(.*\\\r?\n)*.*/);
        if (maarr) {
            makefile = makefile.replace(maarr[0], `#--kstm32-autoconf:asm\r\n${maarr[1]} =${makefileAsm}`);
        }

        // name
        let mnarr = makefile.match(/#--kstm32-autoconf:name\r?\n([a-zA-Z0-9_]+) *=(.*\\\r?\n)*.*/);
        if (mnarr && conf.name) {
            makefile = makefile.replace(mnarr[0], `#--kstm32-autoconf:name\r\n${mnarr[1]} = ${conf.name}`);
        }

        // write Makefile
        fs.writeFile(makefilePath, makefile, { encoding: 'UTF-8' }, err => {
            if (err) {
                vscode.window.showErrorMessage(`写入 ./Makefile 出错: ${err.message}`);
            }
        });
    });
}

/**
 * 递归列目录内容
 */
function lsRecursion(basePath: string, subPath?: string): string[] {
    let result: string[] = [];
    fs.readdirSync(`${basePath}${subPath}`).forEach(filename => {
        if (filename != '.vscode') {
            let stat = fs.statSync(basePath + '/' + subPath + '/' + filename);
            let r = (subPath + '/' + filename).substring(1);
            if (stat.isFile()) {
                result.push(r);
            } else if (stat.isDirectory()) {
                result.push(r + '/');
                lsRecursion(basePath, subPath + '/' + filename).forEach(_name => {
                    result.push(_name);
                });
            }
        }
    });
    return result;
}
