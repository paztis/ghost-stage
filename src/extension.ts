import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");

    watcher.onDidCreate(uri => {
        addFileToGit(uri.fsPath);
    });

    context.subscriptions.push(watcher);
}

// Function to add a file to Git and update the UI
function addFileToGit(filePath: string) {
    console.log(`File created: ${filePath}`);

    // Get the workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder found.");
        return;
    }

    exec(`git status --short "${filePath}"`, { cwd: workspaceFolder }, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showErrorMessage(`Error checking Git status: ${stderr}`);
            return;
        }

        const isNewFile = stdout.startsWith('??');

        exec(`git add "${filePath}"`, { cwd: workspaceFolder }, (addError, addStdout, addStderr) => {
            if (addError) {
                vscode.window.showErrorMessage(`Error adding file to Git: ${addStderr}`);
                return;
            }

            vscode.commands.executeCommand('git.refresh');

            if (isNewFile) {
                vscode.window.showInformationMessage(`File staged (A): ${filePath}`);
            }
        });
    });
}

export function deactivate() {}