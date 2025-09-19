import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';

let isEnabled = true;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Ghost Stage');
    outputChannel.show();
    outputChannel.appendLine('Ghost Stage extension activated!');
    console.log('Ghost Stage extension activated!');

    isEnabled = context.globalState.get<boolean>('ghostStageEnabled', true);
    outputChannel.appendLine(`Initial state: ${isEnabled ? 'enabled' : 'disabled'}`);

    context.subscriptions.push(
        vscode.commands.registerCommand('ghost-stage.enable', () => {
            isEnabled = true;
            context.globalState.update('ghostStageEnabled', true);
            vscode.window.showInformationMessage('Ghost Stage enabled - new files will be automatically staged');
            outputChannel.appendLine('Ghost Stage enabled by user command');
        }),

        vscode.commands.registerCommand('ghost-stage.disable', () => {
            isEnabled = false;
            context.globalState.update('ghostStageEnabled', false);
            vscode.window.showInformationMessage('Ghost Stage disabled - new files will not be automatically staged');
            outputChannel.appendLine('Ghost Stage disabled by user command');
        }),

        vscode.commands.registerCommand('ghost-stage.status', () => {
            const status = isEnabled ? 'enabled' : 'disabled';
            vscode.window.showInformationMessage(`Ghost Stage is currently ${status}`);
            outputChannel.appendLine(`Status requested: ${status}`);
        }),

        vscode.workspace.onDidRenameFiles(event => {
            if (isEnabled) {
                event.files.forEach(file => {
                    void addFileToGit(file.oldUri.fsPath);
                    void addFileToGit(file.newUri.fsPath);
                });
            }
        }),

        vscode.workspace.onDidCreateFiles(event => {
            if (isEnabled) {
                event.files.forEach(file => {
                    void addFileToGit(file.fsPath);
                });
            }
        }),

        vscode.workspace.onDidDeleteFiles(event => {
            if (isEnabled) {
                event.files.forEach(file => {
                    void addFileToGit(file.fsPath);
                });
            }
        }),

        vscode.workspace.onDidSaveTextDocument(document => {
            if (isEnabled) {
                const filePath = document.fileName;
                void addFileToGit(filePath);
            }
        })
    );
}

let gitAddPromise: Promise<void> | undefined = undefined;
function addFileToGit(filePath: string) {
    const parentPath = path.dirname(filePath);
    exec(`git rev-parse --show-toplevel`, { cwd: parentPath }, async (rootError, rootStdout) => {
        if (rootError) {
            outputChannel.appendLine(`Folder ${parentPath} not under git`);
            return;
        }

        const gitRepoPath = rootStdout.trim();
        const relativePath = path.relative(gitRepoPath, filePath);

        outputChannel.appendLine(`[Git add][${gitRepoPath}] add ${relativePath}`);

        // wait previous git add to complete
        if (gitAddPromise) {
            await gitAddPromise;
        }
        gitAddPromise = new Promise((resolve, reject) => {
            exec(`git add "${relativePath}"`, { cwd: gitRepoPath }, (addError, addStdout, addStderr) => {
                if (addError) {
                    outputChannel.appendLine(`Git add error: ${addStderr}`);
                } else {
                    vscode.commands.executeCommand('git.refresh');
                }
                resolve();
            });
        });
    });
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.appendLine('Ghost Stage extension deactivated');
        outputChannel.dispose();
    }
    console.log('Ghost Stage extension deactivated');
}